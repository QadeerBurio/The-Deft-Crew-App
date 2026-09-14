// PostDetailScreen.js - Complete with proper keyboard handling & auto-fetch
// ✅ Like color matched to PostCard (#f9c349)

import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  AppState,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// ✅ Same API URL as PostCard / FeedScreen
const API_URL = "https://the-deft-crew-production.up.railway.app/api/api/social";

const COMMENTS_POLL_INTERVAL = 6000;

const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e6b800',
  primaryLight: '#fef9f0',
  white: '#ffffff',
  black: '#1a1a1a',
  dark: '#0f1419',
  gray: '#666666',
  lightGray: '#f5f6f8',
  border: '#eef0f2',
  danger: '#ff4757',
  success: '#2ecc71',
  mention: '#1877f2',
  text: '#1a1a1a',
  textSecondary: '#71767b',
  textLight: '#8899a6',
  shadow: 'rgba(0,0,0,0.05)',
};

// ============ HELPERS ============
const normalizeComments = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map(c => ({
    ...c,
    _id: c._id?.toString(),
    user: c.user ? { ...c.user, _id: c.user._id?.toString() } : c.user,
    parentComment: c.parentComment ? c.parentComment.toString() : null,
  }));
};

const commentsChanged = (oldComments, newComments) => {
  if (!Array.isArray(oldComments) || !Array.isArray(newComments)) return true;
  if (oldComments.length !== newComments.length) return true;
  for (let i = 0; i < newComments.length; i++) {
    const a = oldComments[i];
    const b = newComments[i];
    if (!a || !b) return true;
    if (a._id !== b._id) return true;
    if (a.text !== b.text) return true;
    if (a.parentComment !== b.parentComment) return true;
  }
  return false;
};

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const { token, user } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Mention state
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const mentionSearchTimeout = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const inputSlide = useRef(new Animated.Value(50)).current;
  const commentBounce = useRef(new Animated.Value(0)).current;

  // Refs
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Polling refs
  const pollIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(true);
  const lastFetchRef = useRef(0);

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ============ ORGANIZE COMMENTS INTO TREE ============
  const organizedComments = useMemo(() => {
    if (!Array.isArray(commentsList)) return [];

    const parents = [];
    const repliesMap = {};

    commentsList.forEach(comment => {
      const parentId = comment.parentComment;
      if (!parentId) {
        parents.push(comment);
      } else {
        const pid = parentId.toString();
        if (!repliesMap[pid]) repliesMap[pid] = [];
        repliesMap[pid].push(comment);
      }
    });

    parents.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return parents.map(parent => ({
      ...parent,
      replies: (repliesMap[parent._id.toString()] || []).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  }, [commentsList]);

  const totalCommentsCount = commentsList.length;

  // ============ FETCH POST DETAILS ============
  const fetchPostDetails = useCallback(async (silent = false) => {
    if (!token || !postId || !isMountedRef.current) return;

    const now = Date.now();
    if (silent && now - lastFetchRef.current < 2000) return;
    if (silent) lastFetchRef.current = now;

    try {
      if (!silent) setLoading(true);
      const response = await axios.get(`${API_URL}/posts/${postId}`, config);
      if (!isMountedRef.current) return;

      const freshComments = normalizeComments(response.data.comments || []);
      const freshPost = response.data;

      setPost(freshPost);
      setCommentsList(prev => {
        if (silent && !commentsChanged(prev, freshComments)) {
          return prev;
        }
        return freshComments;
      });

      const isLiked = freshPost.likes?.some(
        like => (like._id || like) === user._id
      );
      setLiked(isLiked);
      setLikesCount(freshPost.likes?.length || 0);

      if (!silent) {
        await axios.post(`${API_URL}/posts/view/${postId}`, {}, config);
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      if (!silent) {
        if (error.response?.status === 404) {
          Alert.alert("Error", "Post not found", [
            { text: "Go Back", onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert("Error", "Failed to load post");
        }
      }
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  }, [postId, token, config, user?._id, navigation]);

  // Initial fetch + entrance animations
  useEffect(() => {
    if (postId) {
      fetchPostDetails(false);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(inputSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [postId]);

  // ============ KEYBOARD HANDLING ============
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Comments polling (only while screen focused & app active)
  useEffect(() => {
    if (!token || !postId) return;

    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        if (
          appStateRef.current === 'active' &&
          isScreenFocusedRef.current
        ) {
          fetchPostDetails(true);
        }
      }, COMMENTS_POLL_INTERVAL);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [token, postId, fetchPostDetails]);

  // AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (isScreenFocusedRef.current) {
          fetchPostDetails(true);
        }
      }
    });
    return () => subscription.remove();
  }, [fetchPostDetails]);

  // Screen focus
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      isMountedRef.current = true;
      if (token && postId) fetchPostDetails(true);
      return () => {
        isScreenFocusedRef.current = false;
        Keyboard.dismiss();
      };
    }, [token, postId, fetchPostDetails])
  );

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    };
  }, []);

  // ============ LIKE ============
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, friction: 2, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 2, useNativeDriver: true }),
    ]).start();

    if (!liked) {
      Animated.sequence([
        Animated.timing(heartPulse, { toValue: 1.5, duration: 200, useNativeDriver: true }),
        Animated.spring(heartPulse, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    const wasLiked = liked;
    const currentCount = likesCount;

    setLiked(!wasLiked);
    setLikesCount(wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      if (response.data.success) {
        setLiked(response.data.liked);
        setLikesCount(response.data.likes);
      }
    } catch (error) {
      console.error("Like error:", error);
      setLiked(wasLiked);
      setLikesCount(currentCount);
    } finally {
      setIsLiking(false);
    }
  };

  // ============ MENTION SEARCH ============
  const handleCommentTextChange = useCallback((text) => {
    setCommentText(text);

    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowMentionSuggestions(false);
      setMentionResults([]);
      return;
    }

    const afterAt = text.substring(lastAtIndex + 1);
    if (
      afterAt.includes(' ') ||
      afterAt.includes('\n') ||
      afterAt.includes('@') ||
      afterAt.length === 0
    ) {
      setShowMentionSuggestions(false);
      setMentionResults([]);
      return;
    }

    setShowMentionSuggestions(true);

    if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    mentionSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/users/mention-search?q=${encodeURIComponent(afterAt)}`,
          config
        );
        if (isMountedRef.current) setMentionResults(res.data.users || []);
      } catch (err) {
        console.error("Mention search error:", err);
        if (isMountedRef.current) setMentionResults([]);
      }
    }, 200);
  }, [config]);

  const handleMentionSelect = useCallback((u) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    const firstName = u.name.split(' ')[0];
    const before = commentText.substring(0, lastAtIndex);
    setCommentText(`${before}@${firstName} `);

    setSelectedMentions(prev =>
      prev.some(m => m._id === u._id) ? prev : [...prev, { _id: u._id, name: u.name }]
    );

    setShowMentionSuggestions(false);
    setMentionResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [commentText]);

  // ============ REPLY ============
  const onReplyPress = useCallback((comment, parentCommentId) => {
    const targetId = parentCommentId || comment._id;
    const parentComment = commentsList.find(
      c => c._id?.toString() === targetId?.toString()
    );
    const mentionName = parentComment?.user?.name || comment.user?.name || "User";

    setReplyTo({
      commentId: targetId?.toString(),
      userName: mentionName,
      userId: parentComment?.user?._id || comment.user?._id,
    });

    setCommentText(`@${mentionName.split(' ')[0]} `);

    const mentionId = parentComment?.user?._id || comment.user?._id;
    if (mentionId) {
      setSelectedMentions(prev =>
        prev.some(m => m._id === mentionId)
          ? prev
          : [...prev, { _id: mentionId, name: mentionName }]
      );
    }

    setCollapsedThreads(prev => ({ ...prev, [targetId]: false }));
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [commentsList]);

  const toggleThread = useCallback((commentId) => {
    setCollapsedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  // ============ SUBMIT COMMENT ============
  const handleComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    setSubmitting(true);

    Animated.sequence([
      Animated.spring(commentBounce, { toValue: -10, friction: 2, useNativeDriver: true }),
      Animated.spring(commentBounce, { toValue: 0, friction: 2, useNativeDriver: true }),
    ]).start();

    try {
      const mentionIdsInText = selectedMentions
        .filter(m => commentText.includes(`@${m.name.split(' ')[0]}`))
        .map(m => m._id);

      const payload = {
        text: commentText.trim(),
        mentions: mentionIdsInText,
      };
      if (replyTo?.commentId) payload.parentComment = replyTo.commentId;

      const response = await axios.post(
        `${API_URL}/posts/comment/${postId}`,
        payload,
        config
      );

      if (response.data.success) {
        const fresh = normalizeComments(response.data.comments);
        setCommentsList(fresh);
        setCommentText('');
        setReplyTo(null);
        setSelectedMentions([]);
        setShowMentionSuggestions(false);
        Keyboard.dismiss();
        if (scrollRef.current) {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        }
      }
    } catch (error) {
      console.error("Comment error:", error);
      Alert.alert("Error", error.response?.data?.error || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ DELETE COMMENT ============
  const handleDeleteComment = (comment) => {
    const isMyComment = comment.user?._id?.toString() === user?._id?.toString();
    if (!isMyComment) return;

    Keyboard.dismiss();

    Alert.alert(
      "Delete Comment",
      "Are you sure? All replies to this comment will also be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.delete(
                `${API_URL}/posts/comment/${postId}/${comment._id}`,
                config
              );
              if (res.data.success && res.data.comments) {
                setCommentsList(normalizeComments(res.data.comments));
              }
            } catch (err) {
              Alert.alert("Error", err.response?.data?.error || "Could not delete comment");
            }
          }
        }
      ]
    );
  };

  const navigateToProfile = (userId) => {
    Keyboard.dismiss();
    if (userId) navigation.navigate('UserProfile', { userId });
  };

  const formatPostTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    const days = Math.floor(diff / 86400);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ============ RENDER COMMENT ============
  const renderComment = ({ item }) => {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;
    const isMyComment = item.user?._id?.toString() === user?._id?.toString();

    return (
      <View style={styles.threadContainer}>
        {/* Parent Comment */}
        <View style={styles.parentRow}>
          <TouchableOpacity onPress={() => navigateToProfile(item.user?._id)} activeOpacity={0.7}>
            {item.user?.profileImage ? (
              <Image source={{ uri: item.user.profileImage }} style={styles.avatarLg} />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.avatarLgPlaceholder}
              >
                <Text style={styles.avatarLgText}>
                  {item.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.parentContent}>
            <View style={styles.bubbleLg}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.authorNameLg}>{item.user?.name || "User"}</Text>
                {isMyComment && (
                  <View style={styles.ownBadge}>
                    <Text style={styles.ownBadgeText}>You</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>

            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatPostTime(item.createdAt)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                <Text style={styles.replyBtn}>Reply</Text>
              </TouchableOpacity>
              {isMyComment && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                    <Text style={[styles.replyBtn, styles.deleteBtnText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Replies with tree connectors */}
        {hasReplies && (
          <View style={styles.treeWrapper}>
            <View style={styles.verticalLine} />

            <TouchableOpacity
              style={styles.viewRepliesBtn}
              onPress={() => toggleThread(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={COLORS.black}
              />
              <Text style={styles.viewRepliesText}>
                {isCollapsed
                  ? `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                  : `Hide ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>

            {visibleReplies.map((reply, index) => {
              const replyAuthorName = reply.user?.name || "User";
              const mentionMatch = reply.text?.match(/^@(\S+)\s/);
              const mention = mentionMatch ? mentionMatch[1] : null;
              const displayText = mention
                ? reply.text.replace(/^@\S+\s/, '')
                : reply.text;
              const isLast = index === visibleReplies.length - 1;
              const isMyReply = reply.user?._id?.toString() === user?._id?.toString();

              return (
                <View key={reply._id} style={styles.treeBranch}>
                  <View style={[
                    styles.branchConnector,
                    isLast && styles.branchConnectorLast,
                  ]} />

                  <TouchableOpacity
                    onPress={() => navigateToProfile(reply.user?._id)}
                    activeOpacity={0.7}
                    style={styles.replyAvatarWrap}
                  >
                    {reply.user?.profileImage ? (
                      <Image source={{ uri: reply.user.profileImage }} style={styles.avatarSm} />
                    ) : (
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.avatarSmPlaceholder}
                      >
                        <Text style={styles.avatarSmText}>
                          {replyAuthorName.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>

                  <View style={styles.replyContent}>
                    <View style={styles.bubbleSm}>
                      <View style={styles.bubbleHeader}>
                        <Text style={styles.authorNameSm}>{replyAuthorName}</Text>
                        {isMyReply && (
                          <View style={styles.ownBadgeSmall}>
                            <Text style={styles.ownBadgeTextSmall}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.replyTextContent}>
                        {mention && (
                          <Text style={styles.mentionText}>@{mention} </Text>
                        )}
                        {displayText}
                      </Text>
                    </View>

                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatPostTime(reply.createdAt)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                        <Text style={styles.replyBtnSm}>Reply</Text>
                      </TouchableOpacity>
                      {isMyReply && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <TouchableOpacity onPress={() => handleDeleteComment(reply)}>
                            <Text style={[styles.replyBtnSm, styles.deleteBtnText]}>Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading post...</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ============ NOT FOUND STATE ============
  if (!post) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.errorContainer}>
          <LinearGradient colors={['#fef9f0', '#fff']} style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={COLORS.primary} />
          </LinearGradient>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubText}>The post you're looking for doesn't exist</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.black} />
              <Text style={styles.backButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack();
            }}
            style={styles.headerBackBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerPlaceholder} />
        </Animated.View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            <Animated.View style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              {/* Post Author */}
              <View style={styles.authorSection}>
                <TouchableOpacity
                  style={styles.authorAvatarWrapper}
                  onPress={() => navigateToProfile(post.author?._id)}
                  activeOpacity={0.7}
                >
                  {post.author?.profileImage ? (
                    <Image source={{ uri: post.author.profileImage }} style={styles.authorAvatar} />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.authorAvatarPlaceholder}
                    >
                      <Text style={styles.authorAvatarText}>
                        {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
                <View style={styles.authorInfo}>
                  <TouchableOpacity
                    onPress={() => navigateToProfile(post.author?._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.authorName}>{post.author?.name || "Unknown"}</Text>
                  </TouchableOpacity>
                  <View style={styles.authorMeta}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                    <Text style={styles.postTime}>
                      {formatPostTime(post.createdAt)}
                    </Text>
                    
                  </View>
                </View>
              </View>

              {/* Post Content */}
              {post.content && (
                <Text style={styles.postContent}>{post.content}</Text>
              )}

              {post.image && (
                <TouchableOpacity style={styles.imageWrapper} activeOpacity={0.9}>
                  <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.1)']}
                    style={styles.imageGradient}
                  />
                </TouchableOpacity>
              )}

              {/* Stats Section */}
              <View style={styles.statsSection}>
                <TouchableOpacity
                  onPress={handleLike}
                  style={styles.likeButton}
                  activeOpacity={0.6}
                  disabled={isLiking}
                >
                  <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                    <Animated.View style={{ transform: [{ scale: heartPulse }] }}>
                      <LinearGradient
                        colors={
                          liked
                            ? [COLORS.primary, COLORS.primaryDark]   // ✅ brand yellow gradient
                            : ['transparent', 'transparent']
                        }
                        style={[styles.likeIconWrapper, liked && styles.likeIconActive]}
                      >
                        <Ionicons
                          name={liked ? "heart" : "heart-outline"}
                          size={24}
                          color={liked ? COLORS.white : COLORS.textSecondary}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Animated.View>
                  <Text style={[styles.likeCount, liked && styles.likedText]}>
                    {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.commentStat}>
                  <View style={styles.commentIconWrapper}>
                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
                  </View>
                  <Text style={styles.commentStatText}>
                    {totalCommentsCount} Comments
                  </Text>
                </View>
              </View>

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <View style={styles.commentsHeader}>
                  <View style={styles.commentsHeaderLeft}>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.commentsIconWrapper}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={COLORS.black} />
                    </LinearGradient>
                    <Text style={styles.commentsTitle}>Comments</Text>
                  </View>
                  <View style={styles.commentsCount}>
                    <Text style={styles.commentsCountText}>{totalCommentsCount}</Text>
                  </View>
                </View>

                {organizedComments.length > 0 ? (
                  <FlatList
                    data={organizedComments}
                    keyExtractor={(item) => item._id}
                    renderItem={renderComment}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <View style={styles.emptyComments}>
                    <LinearGradient colors={['#fef9f0', '#fff']} style={styles.emptyIconCircle}>
                      <Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                    <Text style={styles.emptyCommentsText}>Be the first to share your thoughts!</Text>
                  </View>
                )}
              </View>

              <View style={styles.bottomSpacer} />
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Comment Input */}
        <Animated.View style={[
          styles.commentInputContainer,
          { transform: [{ translateY: inputSlide }] }
        ]}>
          {replyTo && (
            <View style={styles.replyNotifier}>
              <View style={styles.replyNotifierLeft}>
                <Ionicons name="return-down-forward" size={14} color={COLORS.primary} />
                <Text style={styles.replyNotifierText}>
                  Replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(null);
                  setCommentText("");
                  setSelectedMentions([]);
                  Keyboard.dismiss();
                }}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          )}

          {showMentionSuggestions && mentionResults.length > 0 && (
            <View style={styles.mentionSuggestions}>
              <FlatList
                data={mentionResults}
                keyExtractor={(u) => u._id}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mentionItem}
                    onPress={() => handleMentionSelect(item)}
                  >
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.mentionAvatar} />
                    ) : (
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.mentionAvatarPlaceholder}
                      >
                        <Text style={styles.mentionAvatarText}>
                          {item.name?.charAt(0)?.toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mentionName}>{item.name}</Text>
                      {item.username && (
                        <Text style={styles.mentionUsername}>@{item.username}</Text>
                      )}
                    </View>
                    <Ionicons name="at" size={18} color={COLORS.mention} />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={styles.inputRow}>
            <Animated.View style={[
              styles.commentInputWrapper,
              { transform: [{ translateY: commentBounce }] }
            ]}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.inputAvatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.inputAvatarPlaceholder}
                >
                  <Text style={styles.inputAvatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <TextInput
                ref={inputRef}
                style={styles.commentInput}
                placeholder="Write a comment... Use @ to mention"
                placeholderTextColor={COLORS.textLight}
                value={commentText}
                onChangeText={handleCommentTextChange}
                multiline
                maxLength={500}
                blurOnSubmit={false}
              />
              {commentText.length > 0 && (
                <Text style={styles.charCount}>{commentText.length}/500</Text>
              )}
            </Animated.View>

            <TouchableOpacity
              onPress={handleComment}
              disabled={submitting || !commentText.trim()}
              style={[
                styles.sendButton,
                (!commentText.trim() || submitting) && styles.sendButtonDisabled
              ]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  commentText.trim() && !submitting
                    ? [COLORS.primary, COLORS.primaryDark]
                    : ['#e0e0e0', '#e0e0e0']
                }
                style={styles.sendButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.black} />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={commentText.trim() && !submitting ? COLORS.black : COLORS.textLight}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },

  loaderContainer: { alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  errorContainer: { alignItems: 'center', paddingHorizontal: 30 },
  errorIconContainer: {
    width: 100, height: 100, borderRadius: 30, justifyContent: 'center',
    alignItems: 'center', marginBottom: 20,
  },
  errorText: { fontSize: 20, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  errorSubText: { fontSize: 14, color: COLORS.textLight, marginBottom: 24, textAlign: 'center' },
  backButton: {
    borderRadius: 12, overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  backButtonGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 14, gap: 8,
  },
  backButtonText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBackBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, letterSpacing: 0.3 },
  headerPlaceholder: { width: 40, height: 40 },

  content: { flex: 1, backgroundColor: COLORS.white },
  contentContainer: { paddingBottom: 20 },

  authorSection: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  authorAvatarWrapper: { marginRight: 14 },
  authorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.lightGray },
  authorAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  authorAvatarText: { color: COLORS.black, fontWeight: '700', fontSize: 20 },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postTime: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  metaDot: { fontSize: 11, color: COLORS.textLight, marginHorizontal: 4 },
  metaDotSmall: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textLight },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  categoryText: {
    fontSize: 10, color: COLORS.primary, fontWeight: '600', textTransform: 'capitalize',
  },

  postContent: {
    fontSize: 16, color: COLORS.text, lineHeight: 28,
    paddingHorizontal: 16, paddingVertical: 16, fontWeight: '400',
  },
  imageWrapper: {
    marginHorizontal: 16, marginVertical: 8, borderRadius: 16, overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  postImage: { width: '100%', height: 350, backgroundColor: COLORS.lightGray },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },

  statsSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeIconWrapper: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  // ✅ Active like uses brand yellow shadow (matches PostCard)
  likeIconActive: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  likeCount: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  likedText: { color: COLORS.primary },   // ✅ yellow instead of red
  divider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 16 },
  commentStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentIconWrapper: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  commentStatText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  commentsSection: { padding: 16 },
  commentsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  commentsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentsIconWrapper: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  commentsTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  commentsCount: {
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
  },
  commentsCountText: { fontSize: 13, fontWeight: '700', color: COLORS.black },

  // TREE
  threadContainer: { marginBottom: 20 },
  parentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarLg: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.lightGray },
  avatarLgPlaceholder: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLgText: { fontWeight: '700', color: COLORS.black, fontSize: 14 },
  parentContent: { flex: 1, marginLeft: 10 },
  bubbleLg: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderTopLeftRadius: 4,
    alignSelf: 'flex-start', maxWidth: '100%',
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  authorNameLg: { fontWeight: '700', fontSize: 13, color: COLORS.black },
  ownBadge: {
    backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6,
  },
  ownBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.black },
  commentText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  metaRowLg: {
    flexDirection: 'row', marginTop: 5, marginLeft: 14, alignItems: 'center',
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  replyBtn: { fontSize: 12, color: COLORS.black, fontWeight: '700' },
  deleteBtnText: { color: COLORS.danger },

  treeWrapper: { marginTop: 4, marginLeft: 18, paddingLeft: 20, position: 'relative' },
  verticalLine: {
    position: 'absolute', left: 0, top: -8, bottom: 18,
    width: 2, backgroundColor: '#d0d4d9', borderRadius: 1,
  },
  viewRepliesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'flex-start', marginBottom: 12, marginLeft: -4,
  },
  viewRepliesText: { fontSize: 12, color: COLORS.black, fontWeight: '700' },

  treeBranch: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 12, position: 'relative',
  },
  branchConnector: {
    position: 'absolute', left: -20, top: 0, width: 18, height: 15,
    borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#d0d4d9',
    borderBottomLeftRadius: 10,
  },
  branchConnectorLast: {},
  replyAvatarWrap: { marginRight: 8 },
  avatarSm: { width: 30, height: 30, borderRadius: 15 },
  avatarSmPlaceholder: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarSmText: { fontWeight: '700', color: COLORS.black, fontSize: 12 },
  replyContent: { flex: 1 },
  bubbleSm: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, borderTopLeftRadius: 4,
    alignSelf: 'flex-start', maxWidth: '100%',
  },
  ownBadgeSmall: {
    backgroundColor: COLORS.primary, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  ownBadgeTextSmall: { fontSize: 8, fontWeight: '700', color: COLORS.black },
  authorNameSm: { fontWeight: '700', fontSize: 12, color: COLORS.black },
  replyTextContent: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  mentionText: { color: COLORS.mention, fontWeight: '600' },
  metaRowSm: {
    flexDirection: 'row', marginTop: 4, marginLeft: 12, alignItems: 'center',
  },
  metaTextSm: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  replyBtnSm: { fontSize: 11, color: COLORS.black, fontWeight: '700' },

  emptyComments: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: COLORS.lightGray, borderRadius: 16,
  },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyCommentsTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 4,
  },
  emptyCommentsText: { fontSize: 13, color: COLORS.textLight, fontWeight: '400' },

  bottomSpacer: { height: 20 },

  // INPUT
  commentInputContainer: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 4,
  },
  replyNotifier: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10, marginBottom: 8,
  },
  replyNotifierLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyNotifierText: { fontSize: 12, color: COLORS.gray },
  replyNotifierName: { fontWeight: '700', color: COLORS.primary },

  mentionSuggestions: {
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, marginBottom: 8, maxHeight: 200,
    overflow: 'hidden',
  },
  mentionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16 },
  mentionAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  mentionAvatarText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  mentionName: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  mentionUsername: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  commentInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 24, paddingHorizontal: 4, paddingVertical: 4,
  },
  inputAvatar: {
    width: 32, height: 32, borderRadius: 16, marginLeft: 4,
    backgroundColor: COLORS.border,
  },
  inputAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16, marginLeft: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  inputAvatarText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  commentInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8,
    maxHeight: 100, fontSize: 14, color: COLORS.black,
  },
  charCount: {
    fontSize: 10, color: COLORS.textLight, marginRight: 8, fontWeight: '500',
  },
  sendButton: {
    borderRadius: 24, overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  sendButtonGradient: {
    width: 48, height: 48, justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { shadowOpacity: 0, elevation: 0 },
});