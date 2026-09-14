// PostCard.js - Complete with auto-refresh + fixed mention search

import React, { useState, useContext, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  TouchableWithoutFeedback, Dimensions, BackHandler, Animated, Share,
  Keyboard, AppState
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from '../../context/AuthContext';
import ReportModal from "./ReportModal";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const COMMENT_POLL_INTERVAL = 6000; // Poll comments every 6 seconds while open

// ============ SKELETON ============
export const PostCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
        <View style={styles.skeletonHeaderText}>
          <Animated.View style={[styles.skeletonLine, { width: 120, height: 12, opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: 80, height: 10, marginTop: 6, opacity: shimmerOpacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12, opacity: shimmerOpacity }]} />
      <Animated.View style={[styles.skeletonLine, { width: '70%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
      <Animated.View style={[styles.skeletonLine, { width: '60%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
      <View style={styles.skeletonFooter}>
        <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
      </View>
    </View>
  );
};

// ============ HELPER: Normalize likes ============
const normalizeLikes = (likesData) => {
  if (!likesData) return [];
  if (Array.isArray(likesData)) {
    return likesData.map(item => {
      if (item && typeof item === 'object' && item._id) return item._id.toString();
      return item ? item.toString() : null;
    }).filter(Boolean);
  }
  if (typeof likesData === 'object') {
    return Object.values(likesData).map(item => {
      if (item && typeof item === 'object' && item._id) return item._id.toString();
      return item ? item.toString() : null;
    }).filter(Boolean);
  }
  return [];
};

// ============ HELPER: Normalize comments ============
const normalizeComments = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map(c => ({
    ...c,
    _id: c._id?.toString(),
    user: c.user ? { ...c.user, _id: c.user._id?.toString() } : c.user,
    parentComment: c.parentComment ? c.parentComment.toString() : null,
  }));
};

// ============ HELPER: Compare comments for changes ============
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

export default function PostCard({ post, onBlock, onReport, onPostUpdate }) {
  const { user, token, setUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  const [likes, setLikes] = useState(() => normalizeLikes(post.likes));
  const [favorites, setFavorites] = useState(() => Array.isArray(post.favorites) ? post.favorites : []);
  const [commentsList, setCommentsList] = useState(() => normalizeComments(post.comments));
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [likeCount, setLikeCount] = useState(() => {
    const normalizedLikes = normalizeLikes(post.likes);
    return post.likeCount || normalizedLikes.length || 0;
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [textLines, setTextLines] = useState(0);
  const [collapsedThreads, setCollapsedThreads] = useState({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ============ MENTION STATE ============
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]); // [{_id, name}]
  const mentionSearchTimeout = useRef(null);

  // ============ POLLING REFS ============
  const pollIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const lastCommentsFetchRef = useRef(0);

  const [connectionStatus, setConnectionStatus] = useState(() => {
    const userId = user?._id;
    const authorId = post.author?._id;
    if (userId && authorId && userId === authorId) return 'self';
    if (post.author?.connectionStatus) return post.author.connectionStatus;
    if (userId && user?.sentRequests?.includes(authorId)) return 'pending';
    if (userId && user?.receivedRequests?.includes(authorId)) return 'received';
    if (post.author?.isConnected) return 'connected';
    if (post.author?.isPending) return 'pending';
    if (post.author?.isReceived) return 'received';
    return 'none';
  });

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const commentSlide = useRef(new Animated.Value(height)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // ============ ORGANIZE COMMENTS INTO TREE ============
  const organizedComments = useMemo(() => {
    if (!Array.isArray(commentsList)) return [];

    const parents = [];
    const repliesMap = {};

    commentsList.forEach(comment => {
      const parentId = comment.parentComment || comment.parentId;
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

  const totalCommentsCount = useMemo(() => commentsList.length, [commentsList]);

  // ============ FETCH COMMENTS (silent for polling) ============
  const fetchComments = useCallback(async (silent = false) => {
    if (!token || !post?._id || !isMountedRef.current) return;

    // Prevent duplicate silent fetches within 2s
    const now = Date.now();
    if (silent && now - lastCommentsFetchRef.current < 2000) return;
    lastCommentsFetchRef.current = now;

    try {
      const res = await axios.get(`${API_URL}/posts/${post._id}`, config);
      if (!isMountedRef.current) return;

      const freshComments = normalizeComments(res.data?.comments || []);

      setCommentsList(prev => {
        if (commentsChanged(prev, freshComments)) {
          return freshComments;
        }
        return prev;
      });

      // Also sync likes silently
      if (res.data?.likes) {
        const normalizedLikes = normalizeLikes(res.data.likes);
        setLikes(prev => {
          const same = prev.length === normalizedLikes.length &&
            prev.every((id, i) => id === normalizedLikes[i]);
          return same ? prev : normalizedLikes;
        });
      }
    } catch (err) {
      if (!silent) {
        console.error("Fetch comments error:", err);
      }
    }
  }, [token, post?._id, config]);

  // ============ EFFECTS ============
  useEffect(() => {
    Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showComments) { closeComments(); return true; }
      if (showReportModal) { setShowReportModal(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [showComments, showReportModal]);

  useEffect(() => {
    if (showComments) {
      commentSlide.setValue(height);
      Animated.spring(commentSlide, {
        toValue: 0,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [showComments]);

  useEffect(() => {
    if (showMenu) {
      menuSlide.setValue(200);
      Animated.spring(menuSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    }
  }, [showMenu]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const userId = user?._id;
    const authorId = post.author?._id;
    if (!userId || !authorId || userId === authorId) {
      setConnectionStatus('self');
      return;
    }
    if (user?.sentRequests?.includes(authorId)) { setConnectionStatus('pending'); return; }
    if (user?.receivedRequests?.includes(authorId)) { setConnectionStatus('received'); return; }
    if (post.author?.connectionStatus) setConnectionStatus(post.author.connectionStatus);
    else if (post.author?.isConnected) setConnectionStatus('connected');
    else if (post.author?.isPending) setConnectionStatus('pending');
    else if (post.author?.isReceived) setConnectionStatus('received');
    else setConnectionStatus('none');
  }, [user, post.author]);

  useEffect(() => {
    if (post.likes !== undefined) {
      const normalizedLikes = normalizeLikes(post.likes);
      setLikes(normalizedLikes);
      if (post.likeCount !== undefined && post.likeCount !== null) setLikeCount(post.likeCount);
      else setLikeCount(normalizedLikes.length);
    }
    if (post.favorites) setFavorites(Array.isArray(post.favorites) ? post.favorites : []);
    if (post.comments) {
      const normalized = normalizeComments(post.comments);
      setCommentsList(prev => commentsChanged(prev, normalized) ? normalized : prev);
    }
  }, [post.likes, post.likeCount, post.favorites, post.comments]);

  // ============ COMMENT POLLING (only while comments are open) ============
  useEffect(() => {
    if (!showComments || !token || !post?._id) {
      // Stop polling when comments closed
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Fetch immediately when opening
    fetchComments(true);

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        fetchComments(true);
      }
    }, COMMENT_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [showComments, token, post?._id, fetchComments]);

  // ============ APP STATE LISTENER ============
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      // If app returns to foreground and comments are open → refresh
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (showComments) {
          fetchComments(true);
        }
      }
    });

    return () => subscription.remove();
  }, [showComments, fetchComments]);

  // ============ CLEANUP ON UNMOUNT ============
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (mentionSearchTimeout.current) {
        clearTimeout(mentionSearchTimeout.current);
      }
    };
  }, []);

  // ============ HELPERS ============
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
    const day = date.getDate();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    if (year === now.getFullYear()) return `${month} ${day < 10 ? '0' + day : day}`;
    return `${month} ${day}, ${year}`;
  };

  const userId = user?._id;
  const isLoggedIn = !!userId && !!token;
  const uid = userId?.toString();

  const isLiked = isLoggedIn && Array.isArray(likes) && likes.some(id => id?.toString() === uid);
  const isSaved = isLoggedIn && Array.isArray(favorites) && favorites.some(id => id?.toString() === uid);
  const isOwnPost = isLoggedIn && post.author?._id === userId;

  const showConnectButton = isLoggedIn && !isOwnPost &&
    connectionStatus !== 'connected' && connectionStatus !== 'pending' &&
    connectionStatus !== 'received' && connectionStatus !== 'self';

  const getStatusDisplay = () => {
    if (isOwnPost) return null;
    if (connectionStatus === 'connected') return { text: 'Connected', color: '#f9c349' };
    if (connectionStatus === 'pending') return { text: 'Request Sent', color: '#f9c349' };
    if (connectionStatus === 'received') return { text: 'Request Received', color: '#4CAF50' };
    return null;
  };
  const statusDisplay = getStatusDisplay();

  // ============ LIKE ============
  const handleLike = async () => {
    if (!isLoggedIn) { Alert.alert("Sign In", "Please sign in to like posts"); return; }
    const wasLiked = isLiked;
    const currentLikes = [...likes];
    const currentCount = likeCount;

    if (wasLiked) {
      setLikes(prev => prev.filter(id => id?.toString() !== uid));
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setLikes(prev => [...prev, uid]);
      setLikeCount(prev => prev + 1);
      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    try {
      const res = await axios.put(`${API_URL}/posts/like/${post._id}`, {}, config);
      if (res.data.success) {
        if (typeof res.data.likes === 'number') setLikeCount(res.data.likes);
        if (res.data.likedBy && Array.isArray(res.data.likedBy)) {
          setLikes(res.data.likedBy.map(u => (u?._id || u).toString()).filter(Boolean));
        }
        if (onPostUpdate) onPostUpdate();
      }
    } catch (err) {
      setLikes(currentLikes);
      setLikeCount(currentCount);
    }
  };

  // ============ SAVE / SHARE ============
  const handleSave = async () => {
    if (!isLoggedIn) { Alert.alert("Sign In", "Please sign in to save posts"); return; }
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      const res = await axios.post(`${API_URL}/posts/favorite/${post._id}`, {}, config);
      if (res.data.success) {
        setFavorites(Array.isArray(res.data.favorites) ? res.data.favorites : []);
        setShowMenu(false);
      }
    } catch (err) {
      Alert.alert("Error", "Save action failed");
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `${post.content || 'Check out this post on TDC!'}\n\nShared from TDC App`,
      });
    } catch (err) {}
  };

  // ============ BLOCK / REPORT ============
  const handleBlockUser = () => {
    setShowMenu(false);
    if (isOwnPost) { Alert.alert("Info", "You cannot block yourself"); return; }
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${post.author?.name || 'this user'}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: performBlock },
      ]
    );
  };

  const performBlock = async () => {
    try {
      const res = await axios.post(`${API_URL}/user/block/${post.author._id}`, {}, config);
      if (res.data.success) {
        setIsBlocked(true);
        Alert.alert("Blocked", `You have blocked ${post.author?.name || 'this user'}.`,
          [{ text: "OK", onPress: () => { if (onBlock) onBlock(post.author._id); navigation.goBack(); } }]
        );
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not block user.");
    }
  };

  const handleReportPost = () => {
    setShowMenu(false);
    if (isOwnPost) { Alert.alert("Info", "You cannot report your own post"); return; }
    setShowReportModal(true);
  };

  // ============ COMMENTS ============
  const openComments = () => {
    setReplyTo(null);
    setCommentText("");
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    setShowComments(true);
  };

  const closeComments = useCallback(() => {
    setShowComments(false);
    setReplyTo(null);
    setCommentText("");
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    Keyboard.dismiss();
  }, []);

  // ============ MENTION SEARCH (FIXED) ============
  const handleCommentTextChange = (text) => {
    setCommentText(text);

    // Find the last '@' in the text
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowMentionSuggestions(false);
      setMentionResults([]);
      return;
    }

    // Check what comes after @ — must not have space/newline/other @
    const afterAt = text.substring(lastAtIndex + 1);

    // If there's a space, newline, or another @, mention is complete/invalid
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

    // Show suggestions and search after short debounce
    setShowMentionSuggestions(true);

    if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    mentionSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/users/mention-search?q=${encodeURIComponent(afterAt)}`,
          config
        );
        if (!isMountedRef.current) return;
        setMentionResults(res.data.users || []);
      } catch (err) {
        console.error("Mention search error:", err);
        if (isMountedRef.current) setMentionResults([]);
      }
    }, 200);
  };

  const handleMentionSelect = (user) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    const firstName = user.name.split(' ')[0];
    const before = commentText.substring(0, lastAtIndex);
    const newText = `${before}@${firstName} `;
    setCommentText(newText);

    // Track selected mention
    setSelectedMentions(prev => {
      if (prev.some(m => m._id === user._id)) return prev;
      return [...prev, { _id: user._id, name: user.name }];
    });

    setShowMentionSuggestions(false);
    setMentionResults([]);

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ============ SUBMIT COMMENT ============
  const handleComment = async () => {
    if (!isLoggedIn) { Alert.alert("Sign In", "Please sign in to comment"); return; }
    if (!commentText.trim()) { Alert.alert("Info", "Please write a comment"); return; }

    setIsSubmitting(true);
    try {
      // Extract mentions actually present in the text
      const mentionIdsInText = selectedMentions
        .filter(m => {
          const firstName = m.name.split(' ')[0];
          return commentText.includes(`@${firstName}`);
        })
        .map(m => m._id);

      const payload = {
        text: commentText.trim(),
        mentions: mentionIdsInText,
      };
      if (replyTo?.commentId) payload.parentComment = replyTo.commentId;

      const res = await axios.post(
        `${API_URL}/posts/comment/${post._id}`,
        payload,
        config
      );

      if (res.data.success && res.data.comments) {
        const normalizedComments = normalizeComments(res.data.comments);

        setCommentsList(normalizedComments);
        setCommentText("");
        setSelectedMentions([]);
        setShowMentionSuggestions(false);
        const replyTargetId = replyTo?.commentId;
        setReplyTo(null);
        Keyboard.dismiss();

        if (replyTargetId) {
          setCollapsedThreads(prev => ({ ...prev, [replyTargetId]: false }));
        }

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);

        if (onPostUpdate) onPostUpdate();
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Comment failed to post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ DELETE COMMENT ============
  const handleDeleteComment = (commentId) => {
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
                `${API_URL}/posts/comment/${post._id}/${commentId}`,
                config
              );

              if (res.data.success && res.data.comments) {
                const normalized = normalizeComments(res.data.comments);
                setCommentsList(normalized);
                if (onPostUpdate) onPostUpdate();
              }
            } catch (err) {
              Alert.alert("Error", err.response?.data?.error || "Could not delete comment");
            }
          }
        }
      ]
    );
  };

  const onReplyPress = (comment, parentCommentId) => {
    const authorName = comment.user?.name || "User";
    const targetId = parentCommentId || comment._id;

    const parentComment = commentsList.find(
      c => c._id?.toString() === targetId?.toString()
    );
    const mentionName = parentComment?.user?.name || authorName;

    setReplyTo({
      commentId: targetId?.toString(),
      userName: mentionName,
      userId: parentComment?.user?._id || comment.user?._id,
    });
    setCommentText(`@${mentionName.split(' ')[0]} `);
    setSelectedMentions(prev => {
      const mentionUserId = parentComment?.user?._id || comment.user?._id;
      if (!mentionUserId) return prev;
      if (prev.some(m => m._id === mentionUserId)) return prev;
      return [...prev, { _id: mentionUserId, name: mentionName }];
    });
    setCollapsedThreads(prev => ({ ...prev, [targetId]: false }));
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const toggleThread = (commentId) => {
    setCollapsedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const navigateToProfile = (id) => {
    if (!id) return;
    closeComments();
    navigation.navigate("UserProfile", { userId: id });
  };

  // ============ CONNECTION ============
  const handleConnect = async () => {
    if (!isLoggedIn) { Alert.alert("Sign In", "Please sign in to connect"); return; }
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const res = await axios.post(`${API_URL}/user/connect/${post.author._id}`, {}, config);
      if (res.data.success) {
        setConnectionStatus('pending');
        if (setUser && user) {
          setUser({ ...user, sentRequests: [...(user.sentRequests || []), post.author._id] });
        }
        Alert.alert("Success", "Connection request sent!");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "";
      if (msg.includes("Already connected")) { setConnectionStatus('connected'); Alert.alert("Info", "Already connected"); }
      else if (msg.includes("Request already sent")) { setConnectionStatus('pending'); Alert.alert("Info", "Request already sent"); }
      else if (msg.includes("Request already received")) { setConnectionStatus('received'); Alert.alert("Info", "Pending request from user"); }
      else Alert.alert("Error", msg || "Could not send request");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!isLoggedIn) return;
    setIsConnecting(true);
    try {
      const res = await axios.post(`${API_URL}/user/accept/${post.author._id}`, {}, config);
      if (res.data.success) {
        setConnectionStatus('connected');
        if (setUser && user) {
          setUser({
            ...user,
            receivedRequests: (user.receivedRequests || []).filter(id => id !== post.author._id),
            connections: [...(user.connections || []), post.author._id],
          });
        }
        Alert.alert("Success", "Connected!");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not accept request");
    } finally {
      setIsConnecting(false);
    }
  };

  // ============ RENDER COMMENT ============
  const renderComment = ({ item }) => {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;
    const isMyComment = item.user?._id?.toString() === uid;

    return (
      <View style={styles.threadContainer}>
        <View style={styles.parentRow}>
          <TouchableOpacity onPress={() => navigateToProfile(item.user?._id)} activeOpacity={0.8}>
            {item.user?.profileImage ? (
              <Image source={{ uri: item.user.profileImage }} style={styles.avatarLg} />
            ) : (
              <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.avatarLgPlaceholder}>
                <Text style={styles.avatarLgText}>
                  {item.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.parentContent}>
            <View style={styles.bubbleLg}>
              <Text style={styles.authorNameLg}>{item.user?.name || "User"}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>

            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatPostTime(item.createdAt)}</Text>
              {isLoggedIn && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                    <Text style={styles.replyBtn}>Reply</Text>
                  </TouchableOpacity>
                </>
              )}
              {isMyComment && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
                    <Text style={[styles.replyBtn, styles.deleteBtnText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

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
                color="#1a1a1a"
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
              const isMyReply = reply.user?._id?.toString() === uid;

              return (
                <View key={reply._id} style={styles.treeBranch}>
                  <View style={[
                    styles.branchConnector,
                    isLast && styles.branchConnectorLast,
                  ]} />

                  <TouchableOpacity
                    onPress={() => navigateToProfile(reply.user?._id)}
                    activeOpacity={0.8}
                    style={styles.replyAvatarWrap}
                  >
                    {reply.user?.profileImage ? (
                      <Image source={{ uri: reply.user.profileImage }} style={styles.avatarSm} />
                    ) : (
                      <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.avatarSmPlaceholder}>
                        <Text style={styles.avatarSmText}>
                          {replyAuthorName.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>

                  <View style={styles.replyContent}>
                    <View style={styles.bubbleSm}>
                      <Text style={styles.authorNameSm}>{replyAuthorName}</Text>
                      <Text style={styles.replyTextContent}>
                        {mention && (
                          <Text style={styles.mentionText}>@{mention} </Text>
                        )}
                        {displayText}
                      </Text>
                    </View>

                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatPostTime(reply.createdAt)}</Text>
                      {isLoggedIn && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                            <Text style={styles.replyBtnSm}>Reply</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {isMyReply && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <TouchableOpacity onPress={() => handleDeleteComment(reply._id)}>
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

  if (isBlocked) return null;

  // ============ MAIN RENDER ============
  return (
    <Animated.View style={[styles.card, { opacity: cardFade }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigateToProfile(post.author?._id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {post.author?.profileImage ? (
              <Image source={{ uri: post.author.profileImage }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={['#2d2d2d', '#1a1a1a']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{post.author?.name?.charAt(0)?.toUpperCase()}</Text>
              </LinearGradient>
            )}
            {isLoggedIn && !isOwnPost && connectionStatus === 'received' && (
              <TouchableOpacity
                style={[styles.plusBadge, styles.acceptBadge]}
                onPress={handleAcceptRequest}
                disabled={isConnecting}
              >
                <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.plusBadgeGradient}>
                  {isConnecting ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
            )}
            {showConnectButton && (
              <TouchableOpacity style={styles.plusBadge} onPress={handleConnect} disabled={isConnecting}>
                <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.plusBadgeGradient}>
                  {isConnecting ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="add" size={14} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.userMeta}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{post.author?.name || "TDC User"}</Text>
              {statusDisplay && (
                <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color + '20' }]}>
                  <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                    {statusDisplay.text}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.subText}>
              {post.author?.university?.name || "TDC"} • {formatPostTime(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {isLoggedIn && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {post.content && (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.9}>
            <Text
              style={styles.postText}
              numberOfLines={isExpanded ? undefined : 10}
              onTextLayout={(e) => {
                if (e.nativeEvent.lines.length > 10) setTextLines(e.nativeEvent.lines.length);
              }}
            >
              {post.content}
            </Text>
            {textLines > 10 && (
              <Text style={styles.showMoreText}>{isExpanded ? "Show less" : "Show more"}</Text>
            )}
          </TouchableOpacity>
        )}
        {post.image && (
          <View style={styles.imageContainer}>
            {!imageLoaded && (
              <View style={styles.imageLoading}>
                <ActivityIndicator color="#f9c349" />
              </View>
            )}
            <Image
              source={{ uri: post.image }}
              style={styles.postImage}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
            />
          </View>
        )}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? "#f9c349" : "#666"}
              />
            </Animated.View>
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={openComments} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionCount}>{totalCommentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        {isLoggedIn && (
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={20}
                color={isSaved ? "#f9c349" : "#666"}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* ============ COMMENTS MODAL ============ */}
      <Modal
        visible={showComments}
        animationType="none"
        transparent
        onRequestClose={closeComments}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeComments}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.commentSheet,
              {
                height: height * 0.85,
                transform: [{ translateY: commentSlide }],
                paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
              },
            ]}
          >
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="chatbubbles" size={20} color="#f9c349" />
                <Text style={styles.modalTitle}>Comments</Text>
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountBadgeText}>{totalCommentsCount}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeComments} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={organizedComments}
              keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
              renderItem={renderComment}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.commentListContent}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                  </View>
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                </View>
              }
            />

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={styles.inputWrapper}>
                {replyTo && (
                  <View style={styles.replyNotifier}>
                    <View style={styles.replyNotifierLeft}>
                      <Ionicons name="return-down-forward" size={14} color="#f9c349" />
                      <Text style={styles.replyNotifierText}>
                        Replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setReplyTo(null);
                        setCommentText("");
                        setSelectedMentions([]);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* @MENTION SUGGESTIONS */}
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
                          activeOpacity={0.7}
                        >
                          {item.profileImage ? (
                            <Image source={{ uri: item.profileImage }} style={styles.mentionAvatar} />
                          ) : (
                            <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.mentionAvatarPlaceholder}>
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
                          <Ionicons name="at" size={18} color="#1877f2" />
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                <View style={styles.inputArea}>
                  <TextInput
                    ref={inputRef}
                    style={styles.commentInput}
                    placeholder={isLoggedIn ? "Write a comment... Use @ to mention" : "Sign in to comment"}
                    placeholderTextColor="#999"
                    value={commentText}
                    onChangeText={handleCommentTextChange}
                    multiline
                    maxLength={500}
                    editable={isLoggedIn}
                  />
                  {isLoggedIn && (
                    <TouchableOpacity
                      onPress={handleComment}
                      disabled={isSubmitting || !commentText.trim()}
                      style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                    >
                      <LinearGradient
                        colors={commentText.trim() ? ['#f9c349', '#e6b800'] : ['#e0e0e0', '#e0e0e0']}
                        style={styles.postBtnGradient}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="send" size={16} color="#fff" />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* ============ MENU MODAL ============ */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.menuBox, { transform: [{ translateY: menuSlide }] }]}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderText}>Post Options</Text>
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={handleSave}>
                <View style={styles.menuIconCircle}>
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={isSaved ? "#f9c349" : "#1a1a1a"}
                  />
                </View>
                <Text style={styles.menuText}>{isSaved ? "Remove from Saved" : "Save Post"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name="share-social-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.menuText}>Share Post</Text>
              </TouchableOpacity>

              {!isOwnPost && (
                <TouchableOpacity style={styles.menuItem} onPress={handleReportPost}>
                  <View style={[styles.menuIconCircle, styles.menuReportCircle]}>
                    <Ionicons name="flag-outline" size={20} color="#e74c3c" />
                  </View>
                  <Text style={[styles.menuText, styles.menuBlockText]}>Report Post</Text>
                </TouchableOpacity>
              )}

              {!isOwnPost && (
                <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                  <View style={[styles.menuIconCircle, styles.menuBlockCircle]}>
                    <Ionicons name="ban-outline" size={20} color="#e74c3c" />
                  </View>
                  <Text style={[styles.menuText, styles.menuBlockText]}>Block User</Text>
                </TouchableOpacity>
              )}

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <View style={[styles.menuIconCircle, styles.menuCancelCircle]}>
                  <Ionicons name="close-outline" size={20} color="#999" />
                </View>
                <Text style={[styles.menuText, styles.menuCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="Post"
        contentId={post._id}
        reportedUserId={post.author?._id}
        onSuccess={() => {
          Alert.alert("Report Submitted", "Thank you for your report.");
          if (onReport) onReport(post._id);
        }}
      />
    </Animated.View>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginTop: 10,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e8e8e8' },
  skeletonHeaderText: { marginLeft: 12, flex: 1 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  skeletonFooter: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 24 },
  skeletonAction: { width: 60, height: 20, backgroundColor: '#e8e8e8', borderRadius: 10 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { position: "relative" },
  avatarImg: { width: 44, height: 44, borderRadius: 14 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  plusBadge: { position: "absolute", bottom: -3, right: -3, borderRadius: 9, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  acceptBadge: { bottom: -3, right: -3 },
  plusBadgeGradient: { width: 20, height: 20, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  userMeta: { marginLeft: 12, flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontWeight: "700", fontSize: 15, color: "#1a1a1a" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "600" },
  subText: { fontSize: 11, color: "#999", marginTop: 2, fontWeight: '500' },
  menuBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },

  contentContainer: { paddingHorizontal: 16, marginTop: 10 },
  postText: { fontSize: 15, color: "#1a1a1a", lineHeight: 22, fontWeight: '400' },
  showMoreText: { fontSize: 14, color: '#f9c349', fontWeight: '700', marginTop: 4, paddingVertical: 4 },
  imageContainer: { marginTop: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f8f8f8', position: 'relative' },
  imageLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  postImage: { width: "100%", height: 280, borderRadius: 14 },

  actionBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  leftActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, gap: 5 },
  actionBtnActive: { backgroundColor: '#fef9f0' },
  actionCount: { fontSize: 13, color: "#666", fontWeight: "600" },
  actionCountActive: { color: "#f9c349" },
  saveBtn: { padding: 6, borderRadius: 20 },
  saveBtnActive: { backgroundColor: '#fef9f0' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },

  commentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  commentCountBadge: { backgroundColor: '#f8f8f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commentCountBadgeText: { fontSize: 12, fontWeight: "600", color: '#666' },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  commentListContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },

  threadContainer: { marginBottom: 20 },

  parentRow: { flexDirection: "row", alignItems: "flex-start" },
  avatarLg: { width: 38, height: 38, borderRadius: 19 },
  avatarLgPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  avatarLgText: { fontWeight: "700", color: "#1a1a1a", fontSize: 14 },
  parentContent: { flex: 1, marginLeft: 10 },
  bubbleLg: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  authorNameLg: { fontWeight: "700", fontSize: 13, marginBottom: 3, color: '#1a1a1a' },
  commentText: { fontSize: 14, color: "#1a1a1a", lineHeight: 20 },
  metaRowLg: { flexDirection: 'row', marginTop: 5, marginLeft: 14, alignItems: 'center' },
  metaText: { fontSize: 11, color: '#65676b', fontWeight: '500' },
  metaDot: { fontSize: 11, color: '#65676b', marginHorizontal: 6 },
  replyBtn: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },
  deleteBtnText: { color: '#e74c3c' },

  treeWrapper: {
    marginTop: 4,
    marginLeft: 18,
    paddingLeft: 20,
    position: 'relative',
  },
  verticalLine: {
    position: 'absolute',
    left: 0,
    top: -8,
    bottom: 18,
    width: 2,
    backgroundColor: '#d0d4d9',
    borderRadius: 1,
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f0f2f5',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginLeft: -4,
  },
  viewRepliesText: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },

  treeBranch: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, position: 'relative' },
  branchConnector: {
    position: 'absolute',
    left: -20,
    top: 0,
    width: 18,
    height: 15,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#d0d4d9',
    borderBottomLeftRadius: 10,
  },
  branchConnectorLast: {},

  replyAvatarWrap: { marginRight: 8 },
  avatarSm: { width: 30, height: 30, borderRadius: 15 },
  avatarSmPlaceholder: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  avatarSmText: { fontWeight: "700", color: "#1a1a1a", fontSize: 12 },
  replyContent: { flex: 1 },
  bubbleSm: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  authorNameSm: { fontWeight: "700", fontSize: 12, marginBottom: 2, color: '#1a1a1a' },
  replyTextContent: { fontSize: 13, color: "#1a1a1a", lineHeight: 18 },
  mentionText: { color: '#1877f2', fontWeight: '600' },
  metaRowSm: { flexDirection: 'row', marginTop: 4, marginLeft: 12, alignItems: 'center' },
  metaTextSm: { fontSize: 10, color: '#65676b', fontWeight: '500' },
  replyBtnSm: { fontSize: 11, color: '#1a1a1a', fontWeight: '700' },

  emptyComments: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 4 },
  emptySubtext: { fontSize: 13, color: '#ccc', marginTop: 2 },

  inputWrapper: { borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  replyNotifier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef9f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  replyNotifierLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyNotifierText: { fontSize: 12, color: '#666' },
  replyNotifierName: { fontWeight: '700', color: '#f9c349' },
  inputArea: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, alignItems: "flex-end", gap: 8 },
  commentInput: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 100,
    minHeight: 40,
  },
  postBtn: { borderRadius: 20, overflow: 'hidden' },
  postBtnGradient: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 19 },
  postBtnDisabled: { opacity: 0.5 },

  mentionSuggestions: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16 },
  mentionAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionAvatarText: { color: '#1a1a1a', fontWeight: '700', fontSize: 13 },
  mentionName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mentionUsername: { fontSize: 12, color: '#999', marginTop: 1 },

  menuBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  menuHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 12, marginBottom: 4 },
  menuHeaderText: { fontSize: 13, color: '#999', fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuBlockCircle: { backgroundColor: '#fef0f0' },
  menuReportCircle: { backgroundColor: '#fef0f0' },
  menuCancelCircle: { backgroundColor: '#f8f8f8' },
  menuText: { fontSize: 15, color: "#1a1a1a", fontWeight: '500', flex: 1 },
  menuBlockText: { color: '#e74c3c' },
  menuCancelText: { color: '#999', fontWeight: '400' },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
});