// ConfessionScreen.js - Optimized with fast skeleton & auto-fetch + full sound kit

import React, { useState, useContext, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share, Animated,
  Keyboard, TouchableWithoutFeedback, ScrollView, AppState
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

// ═══════════════════════════════════════════
// TDC SOUND KIT
// ═══════════════════════════════════════════
import {
  soundLike,
  soundTap,
  soundSend,
  soundSheetUp,
  soundSheetDown,
  soundSuccess,
  soundError,
  soundNope,
  soundConfirm,
  soundSwipe,
  soundPopupOpen,
  soundPopupClose,
} from "../../lib/tdcSounds";

// 🆕 engagement
import { engagementBus, ENGAGEMENT_EVENTS } from '../../engagement/engagementBus';

import { color as T, font as F } from "../../theme/tokens";
const { height, width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

const CONFESSIONS_POLL_INTERVAL = 8000;

// Last list per tab, kept for the whole app session, so switching tabs or
// coming back to the screen shows posts instantly (no skeleton).
const feedCache = { all: null, campus: null };
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
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

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

export default function ConfessionScreen({ navigation, focusPostId = null }) {
  const { token, user } = useContext(AuthContext);
  
  const [confessions, setConfessions] = useState(() => feedCache.all || []);
  const [loading, setLoading] = useState(() => !feedCache.all);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [textLayouts, setTextLayouts] = useState({});

  // Feed tab: 'all' (everyone) | 'campus' (my university)
  const [scope, setScope] = useState('all');
  const scopeRef = useRef('all');
  useEffect(() => { scopeRef.current = scope; }, [scope]);

  // Composer: who sees this post
  const [postVisibility, setPostVisibility] = useState('public');
  const myUniName = user?.university?.name || null;

  const [modalVisible, setModalVisible] = useState(false);
  const [newConfession, setNewConfession] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const selectedPostRef = useRef(null);
  useEffect(() => { selectedPostRef.current = selectedPost; }, [selectedPost]);
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

  // Daily Drop / push → this confession is pinned on top and highlighted
  const [pinnedId, setPinnedId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    if (!focusPostId) return;
    setPinnedId(String(focusPostId));
    setHighlightId(String(focusPostId));
    requestAnimationFrame(() => flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true }));
    const t = setTimeout(() => setHighlightId(null), 5000);
    return () => clearTimeout(t);
  }, [focusPostId]);

  const listData = useMemo(() => {
    if (!pinnedId) return confessions;
    const idx = confessions.findIndex((c) => String(c._id) === pinnedId);
    if (idx <= 0) return confessions;
    return [confessions[idx], ...confessions.slice(0, idx), ...confessions.slice(idx + 1)];
  }, [confessions, pinnedId]);
  const commentFlatListRef = useRef(null);

  // Polling
  const confessionsPollRef = useRef(null);
  const commentsPollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(true);
  const lastConfessionsFetchRef = useRef(0);
  const lastCommentsFetchRef = useRef(0);
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
      // 🔔 popup open sound
      soundPopupOpen();
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
      // 🔔 bottom sheet opening sound
      soundSheetUp();
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
    
    // Ref, not state: the 8s poll always uses the tab that is open now
    const requestScope = scopeRef.current;
    try {
      const response = await fetch(`${API_URL}/confessions/feed?scope=${requestScope}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!isMountedRef.current) return;
      // Tab changed while this request was in flight → drop the old answer
      if (requestScope !== scopeRef.current) return;
      
      const data = await response.json();
      const freshData = Array.isArray(data) ? data : [];
      feedCache[requestScope] = freshData;

      setConfessions(prev => {
        if (silent && !confessionsChanged(prev, freshData)) return prev;
        return freshData;
      });
      
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (!silent) console.error("Fetch Error:", err);
    } finally {
      if (!silent && isMountedRef.current && requestScope === scopeRef.current) {
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
      // Fetch the feed the post lives in, or a campus post would vanish
      const postScope = selectedPostRef.current?.visibility === 'campus' ? 'campus' : 'all';
      const res = await fetch(`${API_URL}/confessions/feed?scope=${postScope}`, {
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
      if (!hasLoadedOnceRef.current) setLoading(true);
      fetchConfessions(false); 
    }
  }, [token, fetchConfessions]);

  // Tab switch → clear list, show skeleton, fetch that tab
  const firstScopeRunRef = useRef(true);
  useEffect(() => {
    if (firstScopeRunRef.current) { firstScopeRunRef.current = false; return; }
    const cached = feedCache[scope];
    // Cached list shows instantly; first visit shows a small loader only
    setConfessions(cached || []);
    setLoading(!cached);
    lastConfessionsFetchRef.current = 0; // allow an immediate refresh
    fetchConfessions(!!cached); // first visit: loader is cleared when the fetch ends
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchScope = useCallback((next) => {
    if (next === scopeRef.current) return;
    soundTap();
    setScope(next);
  }, []);

  // Deep link to a post that isn't in "everyone" (e.g. a mention on a campus
  // post) → look in "my campus" once
  const focusFallbackDoneRef = useRef(null);
  useEffect(() => {
    if (!focusPostId || loading || !hasLoadedOnceRef.current) return;
    if (focusFallbackDoneRef.current === focusPostId) return;
    const found = confessions.some((c) => String(c._id) === String(focusPostId));
    if (!found && scopeRef.current === 'all' && myUniName) {
      focusFallbackDoneRef.current = focusPostId;
      setScope('campus');
    } else if (found) {
      focusFallbackDoneRef.current = focusPostId;
    }
  }, [focusPostId, confessions, loading, myUniName]);

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
      if (token) fetchConfessions(true);
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
    soundTap();       // 🔔 small tap on expand/collapse
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

  // ============ LIKE — with sound branching ============
  const handleLike = useCallback(async (id) => {
    if (!token) {
      soundNope();
      return;
    }

    // Find the current confession to know if we're liking or unliking
    const current = confessions.find(c => c._id === id);
    const wasLiked = current?.likedByCurrentUser;

    // 🔔 Sound: like vs unlike
    if (wasLiked) {
      soundTap();     // subtle tap for unlike
    } else {
      soundLike();    // happy pop for like
    }

    // Optimistic update
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
      soundError();
      fetchConfessions(false);
    }
  }, [token, confessions, fetchConfessions]);

  // ============ OPEN / CLOSE COMMENTS ============
  // Note: sound is played in the useEffect watching commentModalVisible
  const openComments = useCallback((post) => {
    setSelectedPost(post);
    setCommentText("");
    setReplyTo(null);
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    setCommentModalVisible(true);
  }, []);

  const closeComments = useCallback(() => {
    // 🔔 bottom sheet closing sound
    soundSheetDown();
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
  // ⚠️ No sound on typing — only on select
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
    // 🔔 small tap on mention pick
    soundTap();

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
    // 🔔 small tap
    soundTap();

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
    // 🔔 small tap for expand/collapse of replies
    soundTap();
    setCollapsedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  // ============ POST COMMENT — send sound ============
  const handlePostComment = useCallback(async () => {
    if (!commentText.trim() || !selectedPost) {
      soundNope();
      return;
    }
    const text = commentText.trim();

    // 🔔 send sound fires immediately for responsiveness
    soundSend();

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
        if (updated?.engagement?.popups?.length) {
          engagementBus.emit(
            ENGAGEMENT_EVENTS.POPUPS_QUEUED,
            updated.engagement.popups
          );
        }
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
        soundError();
        Alert.alert("Error", "Failed to post comment");
      }
    } catch (err) {
      soundError();
      Alert.alert("Error", "Network error");
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, selectedPost, selectedMentions, replyTo, token]);

  // ============ DELETE COMMENT — swipe sound ============
  const handleDeleteComment = useCallback((comment) => {
    if (!comment.isMyComment) return;

    soundConfirm();   // 🔔 confirm dialog sound
    Alert.alert(
      "Delete Comment",
      "Are you sure? All replies to this comment will also be deleted.",
      [
        { text: "Cancel", style: "cancel", onPress: () => soundTap() },
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
                soundSwipe();   // 🔔 removal sound
                const updated = await res.json();
                setSelectedPost(prev => ({ ...prev, comments: updated.comments || [] }));
                setConfessions(prev => prev.map(c => 
                  c._id === selectedPost._id ? { ...c, comments: updated.comments || [] } : c
                ));
              } else {
                soundError();
                Alert.alert("Error", "Could not delete comment");
              }
            } catch (err) {
              soundError();
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  }, [selectedPost, token]);

  // ============ POST CONFESSION — send + success sounds ============
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
      soundNope();
      Alert.alert("Error", "Please add text or an image");
      return;
    }

    // 🔔 send sound on submit
    soundSend();

    setPosting(true);
    try {
      let imageUrl = "";
      if (selectedImage) imageUrl = await uploadToCloudinary(selectedImage);

      const response = await fetch(`${API_URL}/confessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newConfession.trim(), image: imageUrl, visibility: postVisibility })
      });

      if (response.ok) {
        const result = await response.json();

        // 🔔 success sound
        soundSuccess();

        if (result?.engagement?.popups?.length) {
          engagementBus.emit(
            ENGAGEMENT_EVENTS.POPUPS_QUEUED,
            result.engagement.popups
          );
        }

        const postedToCampus = postVisibility === 'campus';
        resetForm();
        if (postedToCampus && scopeRef.current !== 'campus') {
          setScope('campus'); // the tab switch fetches and shows the new post
        } else {
          fetchConfessions(false);
        }
      } else {
        soundError();
        try {
          const err = await response.json();
          if (err?.error) Alert.alert("Couldn't post", err.error);
        } catch (e) {}
      }
    } catch (err) {
      soundError();
      Alert.alert("Error", "Check your connection");
    } finally {
      setPosting(false);
    }
  }, [newConfession, selectedImage, token, fetchConfessions, postVisibility]);

  const resetForm = useCallback(() => {
    setNewConfession("");
    setSelectedImage(null);
    setPostVisibility('public');
    setModalVisible(false);
    Keyboard.dismiss();
  }, []);

  const handleFabPress = useCallback(() => {
    // 🔔 popup open sound (the useEffect also fires one — this is the initial)
    soundPopupOpen();

    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  }, [fabScale]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status) {
      soundNope();
      return Alert.alert("Permission required", "Allow access to your photos.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setSelectedImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (!status) {
      soundNope();
      return Alert.alert("Permission required", "Allow access to your camera.");
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setSelectedImage(result.assets[0].uri);
  };

  const showImageOptions = useCallback(() => {
    soundTap();
    Alert.alert("Add Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel", onPress: () => soundTap() }
    ]);
  }, []);

  // ============ RENDER COMMENT ============
  const renderComment = useCallback(({ item }) => {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;

    return (
      <View style={styles.threadContainer}>
        <View style={styles.parentRow}>
          <View style={styles.avatarLg}>
            <Ionicons name="person" size={16} color={T.yellow} />
          </View>
          <View style={styles.parentContent}>
            <View style={styles.bubbleLg}>
              <Text style={styles.authorNameLg}>anonymous</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatPostTime(item.createdAt)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                <Text style={styles.replyBtn}>reply</Text>
              </TouchableOpacity>
              {item.isMyComment && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                    <Text style={[styles.replyBtn, styles.deleteBtnText]}>delete</Text>
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
                color={T.ink}
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
                    <Ionicons name="person" size={12} color={T.yellow} />
                  </View>
                  <View style={styles.replyContent}>
                    <View style={styles.bubbleSm}>
                      <Text style={styles.authorNameSm}>anonymous</Text>
                      <Text style={styles.replyTextContent}>
                        {mention && <Text style={styles.mentionText}>@{mention} </Text>}
                        {displayText}
                      </Text>
                    </View>
                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatPostTime(reply.createdAt)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                        <Text style={styles.replyBtnSm}>reply</Text>
                      </TouchableOpacity>
                      {reply.isMyComment && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <TouchableOpacity onPress={() => handleDeleteComment(reply)}>
                            <Text style={[styles.replyBtnSm, styles.deleteBtnText]}>delete</Text>
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
    const isCampus = item.visibility === 'campus';

    return (
      <Animated.View style={[styles.card, highlightId === String(item._id) && styles.cardHighlight, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarQ}>?</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.anonymousName}>anon.</Text>
                <Text style={styles.nameDot}>·</Text>
                <Text style={[styles.postTime, { marginTop: 0 }]}>{formatPostTime(item.createdAt)}</Text>
              </View>
              {/* University name only in the "my campus" tab */}
              {scope === 'campus' && !!item.campusName && (
                <View style={styles.campusPill}>
                  <Ionicons name="school" size={11} color={T.onInkMuted} />
                  <Text style={styles.campusPillText} numberOfLines={1}>
                    {item.campusName}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.confessionBadge}>
            <Ionicons name="lock-closed" size={10} color={isCampus ? T.yellow : T.onInkMuted} />
            <Text style={[styles.badgeText, isCampus && { color: T.yellow }]}>
              {isCampus ? 'campus only' : 'confession'}
            </Text>
          </View>
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
                <Text style={styles.showMoreText}>{isExpanded ? 'show less' : 'show more'}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.yellow} />
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
            accessibilityRole="button"
            accessibilityLabel={isLiked ? `liked, ${item.likes || 0}` : `like, ${item.likes || 0}`}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? T.yellow : T.onInkMuted} />
            <Text style={[styles.actionText, isLiked && { color: T.yellow }]}>
              {item.likes > 0 ? item.likes : 'like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openComments(item)}
            accessibilityRole="button"
            accessibilityLabel="comments"
          >
            <Ionicons name="chatbubble-outline" size={18} color={T.onInkMuted} />
            <Text style={styles.actionText}>
              {item.comments?.length > 0 ? item.comments.length : 'comment'}
            </Text>
          </TouchableOpacity>

          {/* No share on campus posts: it would leak them outside the campus */}
          {!isCampus && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                soundTap();   // 🔔 tap before share
                Share.share({
                  message: `💭 Anonymous Confession: "${item.text}"\n\nShared via TDC`
                });
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={T.onInkMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }, [expandedPosts, textLayouts, fadeAnim, formatPostTime, handleTextLayout, toggleExpand, handleLike, openComments, highlightId, scope]);

  // No skeleton: tabs + list render right away, a small loader only while
  // a tab is loading for the very first time.
  const firstLoad = loading && confessions.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={listData}
        extraData={`${highlightId}-${scope}`}
        renderItem={renderConfession}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={
          <View style={styles.scopeTabs}>
            {[
              { key: 'all', label: 'everyone', icon: 'earth-outline' },
              { key: 'campus', label: 'my campus', icon: 'school-outline' },
            ].map((t) => {
              const active = scope === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.scopeTab, active && styles.scopeTabActive]}
                  onPress={() => switchScope(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={14} color={active ? T.ink : T.onInkMuted} />
                  <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]} numberOfLines={1}>
                    {t.key === 'campus' && myUniName && active ? myUniName : t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchConfessions(false); }}
            tintColor={T.yellow}
            colors={[T.ink]}
          />
        }
        ListEmptyComponent={
          firstLoad ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator size="small" color={T.yellow} />
            </View>
          ) : scope === 'campus' && !myUniName ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="school-outline" size={40} color={T.yellow} />
              </View>
              <Text style={styles.emptyTitle}>add your university</Text>
              <Text style={styles.emptySubtitle}>
                add your university in your profile to see your campus
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { soundTap(); navigation?.navigate?.('EditProfileScreen'); }}
              >
                <LinearGradient colors={[T.yellow]} style={styles.emptyBtnGradient}>
                  <Text style={styles.emptyBtnText}>edit profile</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.ink} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={T.yellow} />
            </View>
            <Text style={styles.emptyTitle}>
              {scope === 'campus' ? 'nothing from your campus yet' : 'no confessions yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {scope === 'campus' ? `be the first from ${myUniName || 'your campus'}.` : "confess. nobody will know it's you."}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleFabPress}>
              <LinearGradient colors={[T.yellow]} style={styles.emptyBtnGradient}>
                <Text style={styles.emptyBtnText}>create confession</Text>
                <Ionicons name="arrow-forward" size={18} color={T.ink} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          )
        }
      />

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity style={styles.fab} onPress={handleFabPress} accessibilityRole="button" accessibilityLabel="confess">
          <LinearGradient colors={[T.yellow]} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color={T.ink} />
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
                  <Text style={styles.modalTitle}>share confession</Text>
                  <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={T.ink} />
                  </TouchableOpacity>
                </View>
                <View style={styles.anonymityBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={T.yellow} />
                  <Text style={styles.anonymityText}>Your identity is 100% anonymous</Text>
                </View>
                <View style={styles.visibilityRow}>
                  <Text style={styles.visibilityLabel}>who sees this?</Text>
                  <View style={styles.visibilityChips}>
                    {[
                      { key: 'public', label: 'everyone', icon: 'earth-outline' },
                      { key: 'campus', label: 'my campus', icon: 'school-outline' },
                    ].map((c) => {
                      const active = postVisibility === c.key;
                      const disabled = c.key === 'campus' && !myUniName;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          disabled={disabled}
                          onPress={() => { soundTap(); setPostVisibility(c.key); }}
                          style={[
                            styles.visibilityChip,
                            active && styles.visibilityChipActive,
                            disabled && styles.visibilityChipDisabled,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={c.icon} size={13} color={active ? T.yellow : T.textMuted} />
                          <Text style={[styles.visibilityChipText, active && styles.visibilityChipTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!myUniName ? (
                    <Text style={styles.visibilityHint}>add your university first to post to your campus</Text>
                  ) : postVisibility === 'campus' ? (
                    <Text style={styles.visibilityHint}>only {myUniName} students will see this</Text>
                  ) : null}
                </View>
                <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                  <TextInput
                    ref={confessionInputRef}
                    style={styles.input}
                    placeholder="What's on your mind? 🤔"
                    placeholderTextColor={T.textFaint}
                    multiline
                    value={newConfession}
                    onChangeText={setNewConfession}
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{newConfession.length}/1000</Text>
                  {selectedImage && (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImage}
                        onPress={() => { soundTap(); setSelectedImage(null); }}
                      >
                        <View style={styles.removeImageBtn}>
                          <Ionicons name="close-circle" size={28} color={T.white} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity style={styles.submitBtn} onPress={handlePost} disabled={posting}>
                    <LinearGradient colors={[T.ink, T.ink]} style={styles.submitGradient}>
                      {posting ? <ActivityIndicator color={T.yellow} /> : (
                        <>
                          <Text style={styles.submitText}>post confession</Text>
                          <Ionicons name="send" size={18} color={T.yellow} />
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
                    <Ionicons name="chatbubbles" size={20} color={T.yellow} />
                    <Text style={styles.commentTitle}>comments</Text>
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountBadgeText}>{selectedPost?.comments?.length || 0}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeComments} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={T.ink} />
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
                        <Ionicons name="chatbubble-outline" size={50} color={T.textFaint} />
                        <Text style={styles.emptyCommentTitle}>no comments yet</Text>
                        <Text style={styles.emptyCommentSub}>be the first to comment!</Text>
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
                          <Ionicons name="return-down-forward" size={14} color={T.yellow} />
                          <Text style={styles.replyNotifierText}>
                            replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                          soundTap();
                          setReplyTo(null);
                          setCommentText("");
                          setSelectedMentions([]);
                        }}>
                          <Ionicons name="close-circle" size={18} color={T.textFaint} />
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
                                <LinearGradient colors={[T.yellow, '#e6b800']} style={styles.mentionAvatarPlaceholder}>
                                  <Text style={styles.mentionAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                                </LinearGradient>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mentionName}>{item.name}</Text>
                                {item.username && <Text style={styles.mentionUsername}>@{item.username}</Text>}
                              </View>
                              <Ionicons name="at" size={18} color={T.ink} />
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
                        placeholderTextColor={T.textFaint}
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
                          colors={commentText.trim() ? [T.yellow, '#e6b800'] : [T.textFaint, T.sand]}
                          style={styles.postBtnGradient}
                        >
                          {commentLoading ? (
                            <ActivityIndicator size="small" color={T.white} />
                          ) : (
                            <Ionicons name="send" size={18} color={T.white} />
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
  container: { flex: 1, backgroundColor: T.paper },
  skeletonContainer: { padding: 12, paddingTop: 4 },
  skeletonCard: { 
    backgroundColor: T.card, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: T.line 
  },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.sand, marginRight: 12 },
  skeletonHeaderText: { flex: 1 },
  skeletonLine: { backgroundColor: T.sand, borderRadius: 4 },
  skeletonFooter: { 
    flexDirection: 'row', 
    marginTop: 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: T.line, 
    gap: 24 
  },
  skeletonAction: { width: 60, height: 20, backgroundColor: T.sand, borderRadius: 10 },
  
  listContent: { padding: 12, paddingBottom: 100, paddingTop: 4 },

  card: { backgroundColor: T.card, borderRadius: 16, marginBottom: 12, marginTop: 8, padding: 16, borderWidth: 1, borderColor: T.line },
  inlineLoader: { paddingVertical: 40, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameDot: { marginHorizontal: 5, color: T.textFaint, fontSize: 12, fontFamily: F.body },
  campusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: T.yellowSoft,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    maxWidth: '100%',
  },
  campusPillText: { fontSize: 11, color: T.textMuted, fontFamily: F.bodyBold, flexShrink: 1 },
  scopeTabs: {
    flexDirection: 'row',
    backgroundColor: T.sand,
    borderRadius: 14,
    padding: 4,
    marginTop: 10,
    marginBottom: 6,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  scopeTabActive: { backgroundColor: T.ink },
  scopeTabText: { fontSize: 13, fontFamily: F.bodyBold, color: T.textMuted, flexShrink: 1 },
  scopeTabTextActive: { color: T.yellow },
  visibilityRow: { marginTop: 10, marginBottom: 4 },
  visibilityLabel: { fontSize: 12, fontFamily: F.bodyBold, color: T.ink, marginBottom: 6 },
  visibilityChips: { flexDirection: 'row', gap: 8 },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.card,
  },
  visibilityChipActive: { backgroundColor: T.ink, borderColor: T.ink },
  visibilityChipDisabled: { opacity: 0.4 },
  visibilityChipText: { fontSize: 12.5, fontFamily: F.bodySemi, color: T.textMuted },
  visibilityChipTextActive: { color: T.yellow, fontFamily: F.bodyBold },
  visibilityHint: { fontSize: 11.5, fontFamily: F.body, color: T.textMuted, marginTop: 6 },
  cardHighlight: { borderColor: T.yellow, borderWidth: 2, backgroundColor: T.yellowSoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  anonymousName: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  postTime: { fontSize: 11, color: T.textFaint, marginTop: 2, fontFamily: F.bodyMedium },
  confessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  badgeText: { color: T.white, fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.5 },
  confessionText: { fontSize: 15, fontFamily: F.body, color: T.ink, lineHeight: 24 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  showMoreText: { fontSize: 13, color: T.yellow, fontFamily: F.bodyBold },
  imageContainer: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: T.sand },
  postImage: { width: '100%', height: 280, borderRadius: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: T.line, paddingTop: 12, gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.sand, gap: 6 },
  actionBtnLiked: { backgroundColor: T.yellowSoft },
  actionText: { color: T.textMuted, fontSize: 13, fontFamily: F.bodySemi },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fdebd0', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontFamily: F.heading, color: T.ink, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: F.body, color: T.textFaint, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  emptyBtnText: { color: T.white, fontFamily: F.bodyBold, fontSize: 15 },

  fabContainer: { position: 'absolute', bottom: 160, right: 17, elevation: 2 },
  fab: { borderRadius: 16, overflow: 'hidden' },
  fabGradient: { width: 47, height: 47, borderRadius: 47, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: height * 0.85 },
  modalScrollView: { maxHeight: height * 0.6 },
  dragHandle: { width: 40, height: 4, backgroundColor: T.sand, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: F.heading, color: T.ink },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  anonymityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.yellowSoft, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 16 },
  anonymityText: { fontSize: 12, color: T.yellow, fontFamily: F.bodySemi },
  input: { fontSize: 15, fontFamily: F.body, minHeight: 120, maxHeight: 200, textAlignVertical: 'top', borderWidth: 2, borderColor: T.line, borderRadius: 14, padding: 14, marginBottom: 6, color: T.ink, backgroundColor: T.sand },
  charCount: { fontSize: 11, fontFamily: F.body, color: T.textFaint, textAlign: 'right', marginBottom: 12 },
  previewContainer: { position: 'relative', marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  previewImage: { width: '100%', height: 180, borderRadius: 12 },
  removeImage: { position: 'absolute', top: 8, right: 8 },
  removeImageBtn: { backgroundColor: T.overlay, borderRadius: 12, padding: 4 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  submitGradient: { paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  submitText: { color: T.white, fontFamily: F.bodyBold, fontSize: 16 },

  commentModalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' },
  commentSheet: { backgroundColor: T.card, height: height * 0.85, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  commentSheetContent: { flex: 1, backgroundColor: T.card },
  keyboardAvoidingView: { flexShrink: 0, backgroundColor: T.card },
  commentInputWrapper: { flexShrink: 0, backgroundColor: T.card },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: T.line, alignItems: "center" },
  commentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  commentCountBadge: { backgroundColor: T.sand, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commentCountBadgeText: { fontSize: 12, fontFamily: F.bodySemi, color: T.textMuted },
  commentListContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  emptyComments: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
  emptyCommentTitle: { fontSize: 16, fontFamily: F.bodyBold, color: T.textFaint, marginTop: 12 },
  emptyCommentSub: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginTop: 4 },

  threadContainer: { marginBottom: 20 },
  parentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarLg: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center' },
  parentContent: { flex: 1, marginLeft: 10 },
  bubbleLg: { backgroundColor: T.sand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  authorNameLg: { fontFamily: F.bodyBold, fontSize: 13, marginBottom: 3, color: T.ink },
  commentText: { fontSize: 14, fontFamily: F.body, color: T.ink, lineHeight: 20 },
  metaRowLg: { flexDirection: 'row', marginTop: 5, marginLeft: 14, alignItems: 'center' },
  metaText: { fontSize: 11, color: T.textMuted, fontFamily: F.bodyMedium },
  metaDot: { fontSize: 11, fontFamily: F.body, color: T.textMuted, marginHorizontal: 6 },
  replyBtn: { fontSize: 12, color: T.ink, fontFamily: F.bodyBold },
  deleteBtnText: { color: T.danger },

  treeWrapper: { marginTop: 4, marginLeft: 18, paddingLeft: 20, position: 'relative' },
  verticalLine: { position: 'absolute', left: 0, top: -8, bottom: 18, width: 2, backgroundColor: T.sand, borderRadius: 1 },
  viewRepliesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: T.sand, alignSelf: 'flex-start', marginBottom: 12, marginLeft: -4 },
  viewRepliesText: { fontSize: 12, color: T.ink, fontFamily: F.bodyBold },

  treeBranch: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, position: 'relative' },
  branchConnector: { position: 'absolute', left: -20, top: 0, width: 18, height: 15, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: T.line, borderBottomLeftRadius: 10 },
  branchConnectorLast: {},
  avatarSm: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  replyContent: { flex: 1 },
  bubbleSm: { backgroundColor: T.sand, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  authorNameSm: { fontFamily: F.bodyBold, fontSize: 12, marginBottom: 2, color: T.ink },
  replyTextContent: { fontSize: 13, fontFamily: F.body, color: T.ink, lineHeight: 18 },
  mentionText: { color: T.ink, fontFamily: F.bodySemi },
  metaRowSm: { flexDirection: 'row', marginTop: 4, marginLeft: 12, alignItems: 'center' },
  metaTextSm: { fontSize: 10, color: T.textMuted, fontFamily: F.bodyMedium },
  replyBtnSm: { fontSize: 11, color: T.ink, fontFamily: F.bodyBold },

  replyNotifier: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.yellowSoft, borderBottomWidth: 1, borderBottomColor: T.line },
  replyNotifierLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyNotifierText: { fontSize: 12, fontFamily: F.body, color: T.textMuted },
  replyNotifierName: { fontFamily: F.bodyBold, color: T.yellow },

  mentionSuggestions: { backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.line, maxHeight: 200 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16 },
  mentionAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mentionAvatarText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 13 },
  mentionName: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },
  mentionUsername: { fontSize: 12, fontFamily: F.body, color: T.textFaint, marginTop: 1 },

  inputArea: { flexDirection: "row", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: T.line, alignItems: "center", gap: 10, paddingBottom: 12 },
  commentInput: { flex: 1, backgroundColor: T.paper, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: F.body, color: T.ink, maxHeight: 100, minHeight: 40 },
  postBtn: { borderRadius: 20, overflow: 'hidden' },
  postBtnGradient: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  postBtnDisabled: { opacity: 0.5 },
});

// Confessions list is dark (Confessions design; contrast checked: white and onInkMuted text on ink).
// The create sheet and comment sheet keep the light system styles above.
Object.assign(
  styles,
  StyleSheet.create({
    container: { flex: 1, backgroundColor: T.ink },
    listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
    card: { backgroundColor: T.inkSoft, borderRadius: 24, marginTop: 10, padding: 16 },
    cardHighlight: { borderColor: T.yellow, borderWidth: 2 },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: T.inkLine,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    avatarQ: { fontFamily: F.heading, fontSize: 14, color: T.yellow },
    anonymousName: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.onInkMuted },
    nameDot: { marginHorizontal: 5, color: T.onInkMuted, fontSize: 12, fontFamily: F.body },
    postTime: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted },
    campusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: T.inkLine,
      paddingHorizontal: 8,
      height: 22,
      borderRadius: 11,
      marginTop: 4,
      maxWidth: '100%',
    },
    campusPillText: { fontFamily: F.bodyBold, fontSize: 11, color: T.onInkMuted, flexShrink: 1 },
    confessionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 24,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: T.inkLine,
      flexShrink: 0,
    },
    badgeText: { fontFamily: F.bodyBold, fontSize: 11, color: T.onInkMuted },
    confessionText: { fontFamily: F.headingBold, fontSize: 18, lineHeight: 24, color: T.white },
    showMoreText: { fontFamily: F.bodyBold, fontSize: 13, color: T.yellow },
    imageContainer: { marginTop: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: T.inkLine },
    cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 14 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 6 },
    actionBtnLiked: {},
    actionText: { fontFamily: F.bodyBold, fontSize: 13, color: T.onInkMuted },
    scopeTabs: {
      flexDirection: 'row',
      backgroundColor: T.inkSoft,
      borderRadius: 24,
      padding: 4,
      marginTop: 10,
      marginBottom: 4,
      gap: 4,
    },
    scopeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 20,
    },
    scopeTabActive: { backgroundColor: T.yellow },
    scopeTabText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.onInkMuted, flexShrink: 1 },
    scopeTabTextActive: { fontFamily: F.bodyBold, color: T.ink },
    inlineLoader: { paddingVertical: 40, alignItems: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 48 },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: T.inkSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyTitle: { fontFamily: F.headingBold, fontSize: 18, color: T.white, marginBottom: 6, textAlign: 'center' },
    emptySubtitle: { fontFamily: F.body, fontSize: 14, color: T.onInkMuted, textAlign: 'center', marginBottom: 18 },
    emptyBtn: { borderRadius: 26, overflow: 'hidden' },
    emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 22, gap: 8 },
    emptyBtnText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
    fab: { borderRadius: 26, overflow: 'hidden' },
    fabGradient: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  })
);
