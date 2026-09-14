// ConfessionScreen.js - Optimized with fast skeleton & auto-fetch

import React, { useState, useContext, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share, Animated,
  Keyboard, TouchableWithoutFeedback, ScrollView, AppState
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const { height, width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

const CONFESSIONS_POLL_INTERVAL = 8000;
const COMMENTS_POLL_INTERVAL = 6000;

// ============ HELPERS ============
const confessionsChanged = (oldList, newList) => {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return true;
  if (oldList.length !== newList.length) return true;
  for (let i = 0; i < newList.length; i++) {
    const a = oldList[i], b = newList[i];
    if (!a || !b || a._id !== b._id) return true;
    if (a.likes !== b.likes) return true;
    if ((a.comments?.length || 0) !== (b.comments?.length || 0)) return true;
    if (a.text !== b.text) return true;
  }
  return false;
};

const commentsChanged = (oldComments, newComments) => {
  if (!Array.isArray(oldComments) || !Array.isArray(newComments)) return true;
  if (oldComments.length !== newComments.length) return true;
  for (let i = 0; i < newComments.length; i++) {
    const a = oldComments[i], b = newComments[i];
    if (!a || !b || a._id !== b._id) return true;
    if (a.text !== b.text) return true;
    if (a.parentComment !== b.parentComment) return true;
  }
  return false;
};

// ============ FAST OPTIMIZED SKELETON ============
// Uses ONE Animated.Value + memoized rows. Runs at 60fps with minimal overhead.
const SkeletonRow = memo(({ opacity }) => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
      <View style={styles.skeletonHeaderText}>
        <Animated.View style={[styles.skeletonLine, { width: 100, height: 12, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 70, height: 10, marginTop: 6, opacity }]} />
      </View>
    </View>
    <Animated.View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12, opacity }]} />
    <Animated.View style={[styles.skeletonLine, { width: '70%', height: 14, marginTop: 8, opacity }]} />
    <Animated.View style={[styles.skeletonLine, { width: '60%', height: 14, marginTop: 8, opacity }]} />
    <View style={styles.skeletonFooter}>
      <Animated.View style={[styles.skeletonAction, { opacity }]} />
      <Animated.View style={[styles.skeletonAction, { opacity }]} />
      <Animated.View style={[styles.skeletonAction, { opacity }]} />
    </View>
  </View>
));

const ConfessionSkeleton = memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 600ms cycle = snappy but smooth
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { 
          toValue: 1, 
          duration: 600, 
          useNativeDriver: true 
        }),
        Animated.timing(shimmerAnim, { 
          toValue: 0, 
          duration: 600, 
          useNativeDriver: true 
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  // ONE interpolated opacity reused by ALL skeleton rows
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <View style={styles.skeletonContainer}>
      <SkeletonRow opacity={opacity} />
      <SkeletonRow opacity={opacity} />
      <SkeletonRow opacity={opacity} />
    </View>
  );
});

export default function ConfessionScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [textLayouts, setTextLayouts] = useState({});

  const [modalVisible, setModalVisible] = useState(false);
  const [newConfession, setNewConfession] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState({});

  // Mention state
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const mentionSearchTimeout = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(300)).current;
  const commentSlide = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const confessionInputRef = useRef(null);
  const commentInputRef = useRef(null);
  const flatListRef = useRef(null);
  const commentFlatListRef = useRef(null);

  // Polling
  const confessionsPollRef = useRef(null);
  const commentsPollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(true);
  const lastConfessionsFetchRef = useRef(0);
  const lastCommentsFetchRef = useRef(0);
  // Guard: only show skeleton on the VERY FIRST fetch
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Create modal animation
  useEffect(() => {
    if (modalVisible) {
      modalSlide.setValue(300);
      Animated.spring(modalSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
      setTimeout(() => confessionInputRef.current?.focus(), 300);
    } else {
      modalSlide.setValue(300);
    }
  }, [modalVisible, modalSlide]);

  // Comments modal animation
  useEffect(() => {
    if (commentModalVisible) {
      commentSlide.setValue(height);
      Animated.spring(commentSlide, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
      setTimeout(() => commentInputRef.current?.focus(), 500);
    } else {
      commentSlide.setValue(height);
    }
  }, [commentModalVisible, commentSlide]);

  // ============ ORGANIZE COMMENTS INTO TREE ============
  const organizedComments = useMemo(() => {
    if (!selectedPost || !Array.isArray(selectedPost.comments)) return [];
    
    const parents = [];
    const repliesMap = {};
    
    selectedPost.comments.forEach(comment => {
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
  }, [selectedPost]);

  // ============ FETCH ============
  const fetchConfessions = useCallback(async (silent = false) => {
    if (!token || !isMountedRef.current) return;
    const now = Date.now();
    if (silent && now - lastConfessionsFetchRef.current < 2000) return;
    if (silent) lastConfessionsFetchRef.current = now;
    
    try {
      const response = await fetch(`${API_URL}/confessions/feed`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!isMountedRef.current) return;
      
      const data = await response.json();
      const freshData = Array.isArray(data) ? data : [];

      setConfessions(prev => {
        if (silent && !confessionsChanged(prev, freshData)) return prev;
        return freshData;
      });
      
      // ✅ Mark as loaded once — from now on, NO skeleton
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (!silent) console.error("Fetch Error:", err);
    } finally {
      if (!silent && isMountedRef.current) {
        // ✅ IMMEDIATELY hide loading so skeleton disappears fast
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [token]);

  const fetchPostComments = useCallback(async (postId, silent = false) => {
    if (!token || !postId || !isMountedRef.current) return;
    const now = Date.now();
    if (silent && now - lastCommentsFetchRef.current < 2000) return;
    if (silent) lastCommentsFetchRef.current = now;

    try {
      const res = await fetch(`${API_URL}/confessions/feed`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!isMountedRef.current) return;

      const data = await res.json();
      const found = Array.isArray(data) ? data.find(c => c._id === postId) : null;
      if (!found) return;

      setSelectedPost(prev => {
        if (!prev || prev._id !== postId) return prev;
        if (silent && !commentsChanged(prev.comments || [], found.comments || [])) return prev;
        return { ...prev, comments: found.comments || [] };
      });

      setConfessions(prev => prev.map(c => {
        if (c._id !== postId) return c;
        if (silent && !commentsChanged(c.comments || [], found.comments || [])) return c;
        return { ...c, comments: found.comments || [], likes: found.likes, likedByCurrentUser: found.likedByCurrentUser };
      }));
    } catch (err) {
      if (!silent) console.error("Fetch comments error:", err);
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    if (token) { 
      // Only set loading if we haven't loaded before
      if (!hasLoadedOnceRef.current) setLoading(true);
      fetchConfessions(false); 
    }
  }, [token, fetchConfessions]);

  // Confessions polling
  useEffect(() => {
    if (!token || !isScreenFocusedRef.current) {
      if (confessionsPollRef.current) {
        clearInterval(confessionsPollRef.current);
        confessionsPollRef.current = null;
      }
      return;
    }
    confessionsPollRef.current = setInterval(() => {
      if (appStateRef.current === 'active' && isScreenFocusedRef.current) {
        fetchConfessions(true);
      }
    }, CONFESSIONS_POLL_INTERVAL);
    return () => {
      if (confessionsPollRef.current) {
        clearInterval(confessionsPollRef.current);
        confessionsPollRef.current = null;
      }
    };
  }, [token, fetchConfessions]);

  // Comments polling
  useEffect(() => {
    if (!commentModalVisible || !selectedPost?._id) {
      if (commentsPollRef.current) {
        clearInterval(commentsPollRef.current);
        commentsPollRef.current = null;
      }
      return;
    }
    fetchPostComments(selectedPost._id, true);
    commentsPollRef.current = setInterval(() => {
      if (appStateRef.current === 'active' && isScreenFocusedRef.current) {
        fetchPostComments(selectedPost._id, true);
      }
    }, COMMENTS_POLL_INTERVAL);
    return () => {
      if (commentsPollRef.current) {
        clearInterval(commentsPollRef.current);
        commentsPollRef.current = null;
      }
    };
  }, [commentModalVisible, selectedPost?._id, fetchPostComments]);

  // App state
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (isScreenFocusedRef.current) {
          fetchConfessions(true);
          if (commentModalVisible && selectedPost?._id) {
            fetchPostComments(selectedPost._id, true);
          }
        }
      }
    });
    return () => subscription.remove();
  }, [fetchConfessions, fetchPostComments, commentModalVisible, selectedPost?._id]);

  // Screen focus — silent refresh (no skeleton)
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      isMountedRef.current = true;
      if (token) fetchConfessions(true); // SILENT
      return () => { isScreenFocusedRef.current = false; };
    }, [token, fetchConfessions])
  );

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (confessionsPollRef.current) clearInterval(confessionsPollRef.current);
      if (commentsPollRef.current) clearInterval(commentsPollRef.current);
      if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    };
  }, []);

  // ============ UTILS ============
  const formatPostTime = useCallback((dateString) => {
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
  }, []);

  const toggleExpand = useCallback((postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const handleTextLayout = useCallback((postId, event) => {
    const { lines } = event.nativeEvent;
    if (lines.length > 7) {
      setTextLayouts(prev => ({ ...prev, [postId]: lines.length }));
    } else {
      setTextLayouts(prev => {
        const s = { ...prev };
        delete s[postId];
        return s;
      });
    }
  }, []);

  // ============ LIKE ============
  const handleLike = useCallback(async (id) => {
    if (!token) return;
    setConfessions(prev => prev.map(c => 
      c._id === id 
        ? {
            ...c,
            likes: c.likedByCurrentUser ? Math.max(0, (c.likes || 0) - 1) : (c.likes || 0) + 1,
            likedByCurrentUser: !c.likedByCurrentUser
          }
        : c
    ));
    try {
      await fetch(`${API_URL}/confessions/like/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      fetchConfessions(false);
    }
  }, [token, fetchConfessions]);

  const openComments = useCallback((post) => {
    setSelectedPost(post);
    setCommentText("");
    setReplyTo(null);
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    setCommentModalVisible(true);
  }, []);

  const closeComments = useCallback(() => {
    Animated.timing(commentSlide, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCommentModalVisible(false);
      setCommentText("");
      setReplyTo(null);
      setSelectedMentions([]);
      setShowMentionSuggestions(false);
      Keyboard.dismiss();
    });
  }, [commentSlide]);

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
    if (afterAt.includes(' ') || afterAt.includes('\n') || afterAt.includes('@') || afterAt.length === 0) {
      setShowMentionSuggestions(false);
      setMentionResults([]);
      return;
    }

    setShowMentionSuggestions(true);
    if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    mentionSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/users/mention-search?q=${encodeURIComponent(afterAt)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        if (isMountedRef.current) setMentionResults(data.users || []);
      } catch (err) {
        console.error("Mention search error:", err);
        if (isMountedRef.current) setMentionResults([]);
      }
    }, 200);
  }, [token]);

  const handleMentionSelect = useCallback((u) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return;
    const firstName = u.name.split(' ')[0];
    const before = commentText.substring(0, lastAtIndex);
    setCommentText(`${before}@${firstName} `);
    setSelectedMentions(prev => prev.some(m => m._id === u._id) ? prev : [...prev, { _id: u._id, name: u.name }]);
    setShowMentionSuggestions(false);
    setMentionResults([]);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  }, [commentText]);

  // ============ REPLY ============
  const onReplyPress = useCallback((comment, parentCommentId) => {
    const targetId = parentCommentId || comment._id;
    const parentComment = selectedPost?.comments?.find(c => c._id?.toString() === targetId?.toString());
    const mentionName = parentComment?.user?.name || "User";

    setReplyTo({
      commentId: targetId?.toString(),
      userName: mentionName,
      userId: parentComment?.user?._id,
    });
    setCommentText(`@${mentionName.split(' ')[0]} `);
    if (parentComment?.user?._id) {
      setSelectedMentions(prev => prev.some(m => m._id === parentComment.user._id) ? prev : [...prev, { _id: parentComment.user._id, name: mentionName }]);
    }
    setCollapsedThreads(prev => ({ ...prev, [targetId]: false }));
    setTimeout(() => commentInputRef.current?.focus(), 150);
  }, [selectedPost]);

  const toggleThread = useCallback((commentId) => {
    setCollapsedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  // ============ POST COMMENT ============
  const handlePostComment = useCallback(async () => {
    if (!commentText.trim() || !selectedPost) return;
    const text = commentText.trim();
    setCommentLoading(true);

    const mentionIdsInText = selectedMentions
      .filter(m => commentText.includes(`@${m.name.split(' ')[0]}`))
      .map(m => m._id);

    const payload = { text, mentions: mentionIdsInText };
    if (replyTo?.commentId) payload.parentComment = replyTo.commentId;

    try {
      const res = await fetch(`${API_URL}/confessions/comment/${selectedPost._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedPost(prev => ({ ...prev, comments: updated.comments || [] }));
        setConfessions(prev => prev.map(c => 
          c._id === updated._id ? { ...c, comments: updated.comments || [] } : c
        ));
        setCommentText("");
        setReplyTo(null);
        setSelectedMentions([]);
        setShowMentionSuggestions(false);
        Keyboard.dismiss();
        setTimeout(() => commentFlatListRef.current?.scrollToEnd({ animated: true }), 250);
      } else {
        Alert.alert("Error", "Failed to post comment");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, selectedPost, selectedMentions, replyTo, token]);

  // ============ DELETE COMMENT ============
  const handleDeleteComment = useCallback((comment) => {
    if (!comment.isMyComment) return;

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
              const res = await fetch(
                `${API_URL}/confessions/comment/${selectedPost._id}/${comment._id}`,
                { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
              );
              if (res.ok) {
                const updated = await res.json();
                setSelectedPost(prev => ({ ...prev, comments: updated.comments || [] }));
                setConfessions(prev => prev.map(c => 
                  c._id === selectedPost._id ? { ...c, comments: updated.comments || [] } : c
                ));
              } else {
                Alert.alert("Error", "Could not delete comment");
              }
            } catch (err) {
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  }, [selectedPost, token]);

  // ============ POST CONFESSION ============
  const uploadToCloudinary = async (fileUri) => {
    const data = new FormData();
    data.append("file", { uri: fileUri, name: 'upload.jpg', type: 'image/jpeg' });
    data.append("upload_preset", "tdc_profiles");
    const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "POST", body: data });
    const json = await res.json();
    return json.secure_url;
  };

  const handlePost = useCallback(async () => {
    if (!newConfession.trim() && !selectedImage) {
      Alert.alert("Error", "Please add text or an image");
      return;
    }
    setPosting(true);
    try {
      let imageUrl = "";
      if (selectedImage) imageUrl = await uploadToCloudinary(selectedImage);

      const response = await fetch(`${API_URL}/confessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newConfession.trim(), image: imageUrl })
      });

      if (response.ok) {
        resetForm();
        fetchConfessions(false);
      }
    } catch (err) {
      Alert.alert("Error", "Check your connection");
    } finally {
      setPosting(false);
    }
  }, [newConfession, selectedImage, token, fetchConfessions]);

  const resetForm = useCallback(() => {
    setNewConfession("");
    setSelectedImage(null);
    setModalVisible(false);
    Keyboard.dismiss();
  }, []);

  const handleFabPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  }, [fabScale]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status) return Alert.alert("Permission required", "Allow access to your photos.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setSelectedImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (!status) return Alert.alert("Permission required", "Allow access to your camera.");
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setSelectedImage(result.assets[0].uri);
  };

  const showImageOptions = useCallback(() => {
    Alert.alert("Add Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" }
    ]);
  }, []);

  // ============ RENDER COMMENT (memoized-friendly) ============
  const renderComment = useCallback(({ item }) => {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;

    return (
      <View style={styles.threadContainer}>
        <View style={styles.parentRow}>
          <View style={styles.avatarLg}>
            <Ionicons name="person" size={16} color="#f9c349" />
          </View>
          <View style={styles.parentContent}>
            <View style={styles.bubbleLg}>
              <Text style={styles.authorNameLg}>Anonymous</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatPostTime(item.createdAt)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                <Text style={styles.replyBtn}>Reply</Text>
              </TouchableOpacity>
              {item.isMyComment && (
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
              const mentionMatch = reply.text?.match(/^@(\S+)\s/);
              const mention = mentionMatch ? mentionMatch[1] : null;
              const displayText = mention ? reply.text.replace(/^@\S+\s/, '') : reply.text;
              const isLast = index === visibleReplies.length - 1;

              return (
                <View key={reply._id} style={styles.treeBranch}>
                  <View style={[
                    styles.branchConnector,
                    isLast && styles.branchConnectorLast,
                  ]} />
                  <View style={styles.avatarSm}>
                    <Ionicons name="person" size={12} color="#f9c349" />
                  </View>
                  <View style={styles.replyContent}>
                    <View style={styles.bubbleSm}>
                      <Text style={styles.authorNameSm}>Anonymous</Text>
                      <Text style={styles.replyTextContent}>
                        {mention && <Text style={styles.mentionText}>@{mention} </Text>}
                        {displayText}
                      </Text>
                    </View>
                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatPostTime(reply.createdAt)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                        <Text style={styles.replyBtnSm}>Reply</Text>
                      </TouchableOpacity>
                      {reply.isMyComment && (
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
  }, [collapsedThreads, formatPostTime, onReplyPress, handleDeleteComment, toggleThread]);

  // ============ RENDER CONFESSION CARD ============
  const renderConfession = useCallback(({ item }) => {
    const isLiked = item.likedByCurrentUser;
    const isExpanded = expandedPosts[item._id] || false;
    const lineCount = textLayouts[item._id] || 0;
    const shouldShowMore = lineCount > 7 || (item.text?.length || 0) > 250;

    return (
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#f9c349" />
            </LinearGradient>
            <View>
              <Text style={styles.anonymousName}>Anonymous</Text>
              <Text style={styles.postTime}>{formatPostTime(item.createdAt)}</Text>
            </View>
          </View>
          <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.confessionBadge}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
            <Text style={styles.badgeText}>Confession</Text>
          </LinearGradient>
        </View>

        {item.text && (
          <View>
            <Text
              style={styles.confessionText}
              numberOfLines={isExpanded ? undefined : 7}
              onTextLayout={(e) => handleTextLayout(item._id, e)}
            >
              {item.text}
            </Text>
            {shouldShowMore && (
              <TouchableOpacity onPress={() => toggleExpand(item._id)} style={styles.showMoreBtn}>
                <Text style={styles.showMoreText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#f9c349" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
            onPress={() => handleLike(item._id)}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#f9c349" : "#666"} />
            <Text style={[styles.actionText, isLiked && { color: "#f9c349" }]}>
              {item.likes > 0 ? item.likes : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionText}>
              {item.comments?.length > 0 ? item.comments.length : 'Comment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Share.share({
              message: `💭 Anonymous Confession: "${item.text}"\n\nShared via TDC`
            })}
          >
            <Ionicons name="share-social-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }, [expandedPosts, textLayouts, fadeAnim, formatPostTime, handleTextLayout, toggleExpand, handleLike, openComments]);

  // ✅ FAST SKELETON — only on first cold start, and disappears instantly when data arrives
  const showSkeleton = loading && !refreshing && !hasLoadedOnceRef.current;

  if (showSkeleton) {
    return <ConfessionSkeleton />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={confessions}
        renderItem={renderConfession}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        // ✅ Performance props
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchConfessions(false); }}
            tintColor="#f9c349"
            colors={["#f9c349"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={50} color="#f9c349" />
            </View>
            <Text style={styles.emptyTitle}>No Confessions Yet</Text>
            <Text style={styles.emptySubtitle}>Share your thoughts anonymously</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleFabPress}>
              <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.emptyBtnGradient}>
                <Text style={styles.emptyBtnText}>Create Confession</Text>
                <Ionicons name="arrow-forward" size={18} color="#f9c349" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
          <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#f9c349" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* CREATE MODAL */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={resetForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <Animated.View 
                style={[
                  styles.modalContent, 
                  { 
                    transform: [{ translateY: modalSlide }],
                    opacity: modalSlide.interpolate({
                      inputRange: [0, 300],
                      outputRange: [1, 0.3],
                    })
                  }
                ]}
              >
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Share Confession</Text>
                  <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                <View style={styles.anonymityBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#f9c349" />
                  <Text style={styles.anonymityText}>Your identity is 100% anonymous</Text>
                </View>
                <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                  <TextInput
                    ref={confessionInputRef}
                    style={styles.input}
                    placeholder="What's on your mind? 🤔"
                    placeholderTextColor="#999"
                    multiline
                    value={newConfession}
                    onChangeText={setNewConfession}
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{newConfession.length}/1000</Text>
                  {selectedImage && (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                        <View style={styles.removeImageBtn}>
                          <Ionicons name="close-circle" size={28} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity style={styles.submitBtn} onPress={handlePost} disabled={posting}>
                    <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.submitGradient}>
                      {posting ? <ActivityIndicator color="#f9c349" /> : (
                        <>
                          <Text style={styles.submitText}>Post Confession</Text>
                          <Ionicons name="send" size={18} color="#f9c349" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={{ height: Platform.OS === 'ios' ? 20 : 40 }} />
                </ScrollView>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal
        visible={commentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeComments}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeComments}>
          <View style={styles.commentModalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[
                styles.commentSheet,
                {
                  transform: [{ translateY: commentSlide }],
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
                }
              ]}>
                <View style={styles.dragHandle} />
                <View style={styles.commentHeader}>
                  <View style={styles.commentHeaderLeft}>
                    <Ionicons name="chatbubbles" size={20} color="#f9c349" />
                    <Text style={styles.commentTitle}>Comments</Text>
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountBadgeText}>{selectedPost?.comments?.length || 0}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeComments} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>

                <View style={styles.commentSheetContent}>
                  <FlatList
                    ref={commentFlatListRef}
                    data={organizedComments}
                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                    renderItem={renderComment}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <Ionicons name="chatbubble-outline" size={50} color="#e0e0e0" />
                        <Text style={styles.emptyCommentTitle}>No comments yet</Text>
                        <Text style={styles.emptyCommentSub}>Be the first to comment!</Text>
                      </View>
                    }
                    contentContainerStyle={styles.commentListContent}
                    showsVerticalScrollIndicator={true}
                  />
                </View>

                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={styles.keyboardAvoidingView}
                >
                  <View style={styles.commentInputWrapper}>
                    {replyTo && (
                      <View style={styles.replyNotifier}>
                        <View style={styles.replyNotifierLeft}>
                          <Ionicons name="return-down-forward" size={14} color="#f9c349" />
                          <Text style={styles.replyNotifierText}>
                            Replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => { setReplyTo(null); setCommentText(""); setSelectedMentions([]); }}>
                          <Ionicons name="close-circle" size={18} color="#999" />
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
                                <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.mentionAvatarPlaceholder}>
                                  <Text style={styles.mentionAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                                </LinearGradient>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mentionName}>{item.name}</Text>
                                {item.username && <Text style={styles.mentionUsername}>@{item.username}</Text>}
                              </View>
                              <Ionicons name="at" size={18} color="#1877f2" />
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}

                    <View style={styles.inputArea}>
                      <TextInput
                        ref={commentInputRef}
                        style={styles.commentInput}
                        placeholder="Write an anonymous comment... Use @ to mention"
                        placeholderTextColor="#999"
                        value={commentText}
                        onChangeText={handleCommentTextChange}
                        multiline
                        maxHeight={100}
                      />
                      <TouchableOpacity
                        onPress={handlePostComment}
                        disabled={commentLoading || !commentText.trim()}
                        style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                      >
                        <LinearGradient
                          colors={commentText.trim() ? ['#f9c349', '#e6b800'] : ['#ccc', '#ddd']}
                          style={styles.postBtnGradient}
                        >
                          {commentLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  skeletonContainer: { padding: 12, paddingTop: 4 },
  skeletonCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#f0f0f0' 
  },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f0f0', marginRight: 12 },
  skeletonHeaderText: { flex: 1 },
  skeletonLine: { backgroundColor: '#f0f0f0', borderRadius: 4 },
  skeletonFooter: { 
    flexDirection: 'row', 
    marginTop: 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f5f5f5', 
    gap: 24 
  },
  skeletonAction: { width: 60, height: 20, backgroundColor: '#f0f0f0', borderRadius: 10 },
  
  listContent: { padding: 12, paddingBottom: 100, paddingTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, marginTop: 8, padding: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  anonymousName: { fontWeight: '700', fontSize: 14, color: '#1a1a1a' },
  postTime: { fontSize: 11, color: '#999', marginTop: 2, fontWeight: '500' },
  confessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  confessionText: { fontSize: 15, color: '#1a1a1a', lineHeight: 24 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  showMoreText: { fontSize: 13, color: '#f9c349', fontWeight: '700' },
  imageContainer: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8f8f8' },
  postImage: { width: '100%', height: 280, borderRadius: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12, gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f8f9fa', gap: 6 },
  actionBtnLiked: { backgroundColor: '#fef9f0' },
  actionText: { color: '#666', fontSize: 13, fontWeight: '600' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fdebd0', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  fabContainer: { position: 'absolute', bottom: 160, right: 17, elevation: 8 },
  fab: { borderRadius: 16, overflow: 'hidden' },
  fabGradient: { width: 47, height: 47, borderRadius: 47, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: height * 0.85 },
  modalScrollView: { maxHeight: height * 0.6 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  anonymityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef9f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 16 },
  anonymityText: { fontSize: 12, color: '#f9c349', fontWeight: '600' },
  input: { fontSize: 15, minHeight: 120, maxHeight: 200, textAlignVertical: 'top', borderWidth: 2, borderColor: '#f0f0f0', borderRadius: 14, padding: 14, marginBottom: 6, color: '#1a1a1a', backgroundColor: '#fafafa' },
  charCount: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 12 },
  previewContainer: { position: 'relative', marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  previewImage: { width: '100%', height: 180, borderRadius: 12 },
  removeImage: { position: 'absolute', top: 8, right: 8 },
  removeImageBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  submitGradient: { paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  commentModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentSheet: { backgroundColor: "#fff", height: height * 0.85, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  commentSheetContent: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoidingView: { flexShrink: 0, backgroundColor: '#fff' },
  commentInputWrapper: { flexShrink: 0, backgroundColor: '#fff' },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  commentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  commentCountBadge: { backgroundColor: '#f8f8f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commentCountBadgeText: { fontSize: 12, fontWeight: "600", color: '#666' },
  commentListContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  emptyComments: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
  emptyCommentTitle: { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 12 },
  emptyCommentSub: { fontSize: 13, color: '#ccc', marginTop: 4 },

  // TREE CONNECTORS
  threadContainer: { marginBottom: 20 },
  parentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarLg: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center' },
  parentContent: { flex: 1, marginLeft: 10 },
  bubbleLg: { backgroundColor: '#f0f2f5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  authorNameLg: { fontWeight: '700', fontSize: 13, marginBottom: 3, color: '#1a1a1a' },
  commentText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  metaRowLg: { flexDirection: 'row', marginTop: 5, marginLeft: 14, alignItems: 'center' },
  metaText: { fontSize: 11, color: '#65676b', fontWeight: '500' },
  metaDot: { fontSize: 11, color: '#65676b', marginHorizontal: 6 },
  replyBtn: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },
  deleteBtnText: { color: '#e74c3c' },

  treeWrapper: { marginTop: 4, marginLeft: 18, paddingLeft: 20, position: 'relative' },
  verticalLine: { position: 'absolute', left: 0, top: -8, bottom: 18, width: 2, backgroundColor: '#d0d4d9', borderRadius: 1 },
  viewRepliesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f0f2f5', alignSelf: 'flex-start', marginBottom: 12, marginLeft: -4 },
  viewRepliesText: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },

  treeBranch: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, position: 'relative' },
  branchConnector: { position: 'absolute', left: -20, top: 0, width: 18, height: 15, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#d0d4d9', borderBottomLeftRadius: 10 },
  branchConnectorLast: {},
  avatarSm: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  replyContent: { flex: 1 },
  bubbleSm: { backgroundColor: '#f0f2f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  authorNameSm: { fontWeight: '700', fontSize: 12, marginBottom: 2, color: '#1a1a1a' },
  replyTextContent: { fontSize: 13, color: '#1a1a1a', lineHeight: 18 },
  mentionText: { color: '#1877f2', fontWeight: '600' },
  metaRowSm: { flexDirection: 'row', marginTop: 4, marginLeft: 12, alignItems: 'center' },
  metaTextSm: { fontSize: 10, color: '#65676b', fontWeight: '500' },
  replyBtnSm: { fontSize: 11, color: '#1a1a1a', fontWeight: '700' },

  replyNotifier: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fef9f0', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  replyNotifierLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyNotifierText: { fontSize: 12, color: '#666' },
  replyNotifierName: { fontWeight: '700', color: '#f9c349' },

  mentionSuggestions: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', maxHeight: 200 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16 },
  mentionAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mentionAvatarText: { color: '#1a1a1a', fontWeight: '700', fontSize: 13 },
  mentionName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mentionUsername: { fontSize: 12, color: '#999', marginTop: 1 },

  inputArea: { flexDirection: "row", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0", alignItems: "center", gap: 10, paddingBottom: 12 },
  commentInput: { flex: 1, backgroundColor: "#f8f9fa", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', maxHeight: 100, minHeight: 40 },
  postBtn: { borderRadius: 20, overflow: 'hidden' },
  postBtnGradient: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  postBtnDisabled: { opacity: 0.5 },
});