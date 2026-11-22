// ConfessionScreen.js - Optimized with fast skeleton & auto-fetch + full sound kit

import React, { useState, useContext, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share, Animated,
  Keyboard, TouchableWithoutFeedback, ScrollView, AppState
} from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
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
import { metaEvents } from "../../analytics/metaEvents";
import { SERVER_ORIGIN } from "../../config/server";
import { fetchWithTimeout } from "../../config/timeouts";
import styles from "./confessionStyles";
import ConfessionCard from "./ConfessionCard";
import ConfessionCommentThread from "./ConfessionCommentThread";
import ConfessionComposer from "./ConfessionComposer";
import ConfessionComments from "./ConfessionComments";
// confession safety (plan P4-1): everything below is used only while useFlag(FLAGS.confessionSafety) is true
import useFlag from "../../hooks/useFlag";
import { FLAGS } from "../../api/upgradeFlags";
import { funnel } from "../../analytics/funnel";
import { reportError } from "../../utils/reportError";
import ReportModal from "./ReportModal";
import ConfessionSupportSheet from "./ConfessionSupportSheet";
import ConfessionRulesSheet from "./ConfessionRulesSheet";
import { safetyMe, acceptRules, muteAuthor, deleteMyConfession, myConfessionIds } from "./confessionSafetyApi";
const { height, width } = Dimensions.get('window');
const API_URL = `${SERVER_ORIGIN}/api/social`;

// One poll while the confessions are on screen. It also refreshes the open comments sheet
// (was: the whole feed every 8 s, plus the whole feed again every 6 s for open comments).
const CONFESSIONS_POLL_INTERVAL = 20000;

// Last list per tab, kept for the whole app session, so switching tabs or
// coming back to the screen shows posts instantly (no skeleton).
const feedCache = { all: null, campus: null };

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

  // ---- confession safety (plan P4-1, flag confessionSafety). Flag off: none of this runs or renders. ----
  const safety = useFlag(FLAGS.confessionSafety) === true;
  const [safetyInfo, setSafetyInfo] = useState(null); // { rulesAcceptedAt, helplines, … } from the server
  const [myIds, setMyIds] = useState(() => new Set()); // my own confessions (for "delete" in the ⋯ menu)
  const [reportTarget, setReportTarget] = useState(null); // { type: 'Confession' | 'ConfessionComment', id }
  const [composerIssues, setComposerIssues] = useState([]); // why the pre-check asked for an edit
  const [support, setSupport] = useState(null); // helplines to show after a self-harm hold
  const [rulesVisible, setRulesVisible] = useState(false);
  const [rulesBusy, setRulesBusy] = useState(false);
  useEffect(() => {
    if (!safety || !token) return;
    let live = true;
    safetyMe(token).then((info) => { if (live) setSafetyInfo(info); }).catch((e) => reportError("confessionSafety", e, { step: "safety-me" }));
    myConfessionIds(token).then((ids) => { if (live && ids) setMyIds(ids); }).catch((e) => reportError("confessionSafety", e, { step: "my-ids" }));
    return () => { live = false; };
  }, [safety, token]);

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
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(false); // set by the focus effect
  const isFocused = useIsFocused();
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
      const response = await fetchWithTimeout(`${API_URL}/confessions/feed?scope=${requestScope}`, {
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

      // The open comments sheet takes its post's comments from the same answer
      const open = selectedPostRef.current;
      const openFresh = open && freshData.find(c => c._id === open._id);
      if (openFresh) {
        setSelectedPost(prev => {
          if (!prev || prev._id !== openFresh._id) return prev;
          if (!commentsChanged(prev.comments || [], openFresh.comments || [])) return prev;
          return { ...prev, comments: openFresh.comments || [] };
        });
      }
      
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
      const res = await fetchWithTimeout(`${API_URL}/confessions/feed?scope=${postScope}`, {
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
  }, [token]); // reads refs only; stable, so the poll below is not restarted on every update

  // Confessions polling: only while on screen
  useEffect(() => {
    if (!token || !isFocused) {
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
  }, [token, isFocused, fetchConfessions]);

  // Comments sheet: fresh comments once when it opens; after that the confessions poll above
  // keeps them current (no second poll)
  useEffect(() => {
    if (!commentModalVisible || !selectedPost?._id) return;
    fetchPostComments(selectedPost._id, true);
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
  const likesInFlight = useRef(new Set()); // confession ids with a like request on its way
  const handleLike = useCallback(async (id) => {
    if (!token) {
      soundNope();
      return;
    }
    if (likesInFlight.current.has(id)) return;
    likesInFlight.current.add(id);

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
      const res = await fetchWithTimeout(`${API_URL}/confessions/like/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      // the server says whether this was a like (true) or an unlike (false); unlikes send nothing
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.liked === true) metaEvents.socialEngaged("like");
      }
    } catch (err) {
      soundError();
      fetchConfessions(false);
    } finally {
      likesInFlight.current.delete(id);
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
        const res = await fetchWithTimeout(
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
      const res = await fetchWithTimeout(`${API_URL}/confessions/comment/${selectedPost._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        metaEvents.socialEngaged("comment"); // type only, no confession id
        if (safety && updated?.held) Alert.alert("under review", updated.message || "your comment is under review. it'll show once it's checked.");
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
        // confession safety: the server's own sentence (needs an edit, banned, too many) instead of a generic error
        let msg = null;
        if (safety) { try { const e = await res.json(); if (typeof e?.error === 'string') msg = e.error; } catch (e2) {} }
        Alert.alert(msg ? "couldn't post" : "Error", msg || "Failed to post comment");
      }
    } catch (err) {
      soundError();
      Alert.alert("Error", "Network error");
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, selectedPost, selectedMentions, replyTo, token, safety]);

  // ============ DELETE COMMENT — swipe sound ============
  const handleDeleteComment = useCallback((comment) => {
    if (!comment.isMyComment) return;

    soundConfirm();   // 🔔 confirm dialog sound
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
              const res = await fetchWithTimeout(
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
    const res = await fetchWithTimeout("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "POST", body: data });
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

      const response = await fetchWithTimeout(`${API_URL}/confessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newConfession.trim(), image: imageUrl, visibility: postVisibility })
      });

      if (response.ok) {
        const result = await response.json();
        metaEvents.confessionCreated(); // no params and no id of any kind
        if (safety) {
          setComposerIssues([]);
          funnel(result?.held ? "confession_precheck_hold" : "confession_precheck_ok");
          if (result?.held) {
            if (result.support?.helplines?.length) setSupport(result.support.helplines);
            else Alert.alert("under review", result.message || "your confession is under review. it'll show once it's checked.");
          }
        }

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
          // the pre-post check asked for an edit (flag confessionSafety): keep the text, show why in the composer
          if (safety && response.status === 422 && err?.code === 'NEEDS_EDIT' && Array.isArray(err.reasons)) {
            setComposerIssues(err.reasons);
            funnel("confession_precheck_edit");
          } else if (err?.error) Alert.alert("Couldn't post", err.error);
        } catch (e) {}
      }
    } catch (err) {
      soundError();
      Alert.alert("Error", "Check your connection");
    } finally {
      setPosting(false);
    }
  }, [newConfession, selectedImage, token, fetchConfessions, postVisibility, safety]);

  const resetForm = useCallback(() => {
    setNewConfession("");
    setSelectedImage(null);
    setPostVisibility('public');
    setModalVisible(false);
    Keyboard.dismiss();
  }, []);

  const handleFabPress = useCallback(() => {
    // confession safety: the rules once, before the first post
    if (safety && safetyInfo && !safetyInfo.rulesAcceptedAt) {
      soundPopupOpen();
      setRulesVisible(true);
      return;
    }
    // 🔔 popup open sound (the useEffect also fires one — this is the initial)
    soundPopupOpen();

    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  }, [fabScale, safety, safetyInfo]);

  // ============ CONFESSION SAFETY (flag confessionSafety) ============
  const handleAgreeRules = useCallback(async () => {
    setRulesBusy(true);
    try {
      if (await acceptRules(token)) setSafetyInfo((prev) => ({ ...(prev || {}), rulesAcceptedAt: new Date().toISOString() }));
      setRulesVisible(false);
      setModalVisible(true); // straight on to the composer
    } catch (e) {
      soundError();
      reportError("confessionSafety", e, { step: "accept-rules" });
      Alert.alert("couldn't save", "check your connection and try again.");
    } finally {
      setRulesBusy(false);
    }
  }, [token]);

  const handleMore = useCallback((item) => {
    soundTap();
    const id = String(item._id);
    if (myIds.has(id)) {
      Alert.alert("your confession", "delete it for everyone?", [
        { text: "cancel", style: "cancel" },
        {
          text: "delete", style: "destructive",
          onPress: async () => {
            try {
              if (!(await deleteMyConfession(token, id))) throw new Error("delete refused");
              soundSwipe();
              setConfessions((prev) => prev.filter((c) => String(c._id) !== id));
              feedCache.all = null; feedCache.campus = null;
            } catch (e) {
              soundError();
              reportError("confessionSafety", e, { step: "delete" });
              Alert.alert("couldn't delete", "please try again.");
            }
          },
        },
      ]);
      return;
    }
    Alert.alert("this confession", undefined, [
      { text: "report", onPress: () => setReportTarget({ type: "Confession", id }) },
      {
        text: "don't show me this person",
        onPress: async () => {
          try {
            const r = await muteAuthor(token, id, true);
            if (!r.ok) throw new Error("mute refused");
            setConfessions((prev) => prev.filter((c) => String(c._id) !== id));
            fetchConfessions(false); // their other posts go too
            Alert.alert("done", r.message || "you won't see posts from this person.");
          } catch (e) {
            soundError();
            reportError("confessionSafety", e, { step: "mute" });
            Alert.alert("couldn't do that", "please try again.");
          }
        },
      },
      { text: "cancel", style: "cancel" },
    ]);
  }, [myIds, token, fetchConfessions]);

  const handleReportComment = useCallback((comment) => {
    if (!selectedPost?._id || !comment?._id) return;
    soundTap();
    setReportTarget({ type: "ConfessionComment", id: `${selectedPost._id}:${comment._id}` });
  }, [selectedPost]);

  const handleConfessionTextChange = useCallback((text) => {
    setNewConfession(text);
    setComposerIssues((prev) => (prev.length ? [] : prev));
  }, []);

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
      { text: "Cancel", style: "cancel" }
    ]);
  }, []);

  // ============ RENDER COMMENT ============
  const renderComment = useCallback(({ item }) => (
    <ConfessionCommentThread
      item={item}
      collapsedThreads={collapsedThreads}
      formatPostTime={formatPostTime}
      onReplyPress={onReplyPress}
      handleDeleteComment={handleDeleteComment}
      toggleThread={toggleThread}
      safety={safety}
      onReport={safety ? handleReportComment : null}
    />
  ), [collapsedThreads, formatPostTime, onReplyPress, handleDeleteComment, toggleThread, safety, handleReportComment]);

  // ============ RENDER CONFESSION CARD ============
  const renderConfession = useCallback(({ item }) => (
    <ConfessionCard
      item={item}
      isExpanded={expandedPosts[item._id] || false}
      lineCount={textLayouts[item._id] || 0}
      scope={scope}
      highlightId={highlightId}
      fadeAnim={fadeAnim}
      formatPostTime={formatPostTime}
      handleTextLayout={handleTextLayout}
      toggleExpand={toggleExpand}
      handleLike={handleLike}
      openComments={openComments}
      safety={safety}
      onMore={safety ? handleMore : null}
    />
  ), [expandedPosts, textLayouts, fadeAnim, formatPostTime, handleTextLayout, toggleExpand, handleLike, openComments, highlightId, scope, safety, handleMore]);

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
                hitSlop={{ top: 2, bottom: 2 }}>
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
      <ConfessionComposer
        modalVisible={modalVisible}
        resetForm={resetForm}
        modalSlide={modalSlide}
        myUniName={myUniName}
        postVisibility={postVisibility}
        setPostVisibility={setPostVisibility}
        confessionInputRef={confessionInputRef}
        newConfession={newConfession}
        setNewConfession={safety ? handleConfessionTextChange : setNewConfession}
        issues={safety ? composerIssues : []}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        handlePost={handlePost}
        posting={posting}
      />

      {/* COMMENTS MODAL */}
      <ConfessionComments
        commentModalVisible={commentModalVisible}
        closeComments={closeComments}
        commentSlide={commentSlide}
        keyboardHeight={keyboardHeight}
        selectedPost={selectedPost}
        commentFlatListRef={commentFlatListRef}
        organizedComments={organizedComments}
        renderComment={renderComment}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        setCommentText={setCommentText}
        setSelectedMentions={setSelectedMentions}
        showMentionSuggestions={showMentionSuggestions}
        mentionResults={mentionResults}
        handleMentionSelect={handleMentionSelect}
        commentInputRef={commentInputRef}
        commentText={commentText}
        handleCommentTextChange={handleCommentTextChange}
        handlePostComment={handlePostComment}
        commentLoading={commentLoading}
      />

      {/* confession safety (flag confessionSafety): report, rules once, support after a self-harm hold */}
      {safety && (
        <>
          <ReportModal
            visible={!!reportTarget}
            contentType={reportTarget?.type || "Confession"}
            contentId={reportTarget?.id}
            onClose={() => setReportTarget(null)}
            onSuccess={() => funnel("confession_reported")}
          />
          <ConfessionRulesSheet visible={rulesVisible} busy={rulesBusy} onAgree={handleAgreeRules} onClose={() => setRulesVisible(false)} />
          <ConfessionSupportSheet visible={!!support} helplines={support || []} onClose={() => setSupport(null)} />
        </>
      )}
    </View>
  );
}

