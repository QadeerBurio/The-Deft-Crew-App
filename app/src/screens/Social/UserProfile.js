// UserProfile.js - Complete Fixed Version
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo, memo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  FlatList, Dimensions, Platform, StatusBar,
  ActivityIndicator, Alert, Share, BackHandler, RefreshControl,
  Modal, Animated, Linking, TextInput, KeyboardAvoidingView, Keyboard,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, HeaderIconButton, EmptyState } from '../../ui';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";
import { TouchableWithoutFeedback } from 'react-native';
import { soundLike, soundTap } from "../../lib/tdcSounds";
import { color as T, font as F } from "../../theme/tokens";
const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";
const COMMENTS_POLL_INTERVAL = 6000;

// ============ HELPERS ============
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

// ============ SKELETON ============
const SkeletonLine = memo(({ width: w, height: h, opacity, style }) => (
  <Animated.View style={[styles.skeletonLine, { width: w, height: h, opacity }, style]} />
));

const ProfileSkeleton = memo(() => {
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
    <SafeAreaView style={styles.skeletonContainer} edges={['top']}>
      <View style={styles.skeletonTopNav}>
        <Animated.View style={[styles.skeletonNavBtn, { opacity }]} />
        <Animated.View style={[styles.skeletonNavTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonNavBtn, { opacity }]} />
      </View>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonHeaderRow}>
          <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
          <View style={styles.skeletonHeaderRight}>
            <SkeletonLine width={180} height={22} opacity={opacity} />
            <SkeletonLine width={220} height={14} opacity={opacity} style={{ marginTop: 6 }} />
            <SkeletonLine width="90%" height={40} opacity={opacity} style={{ marginTop: 8 }} />
            <SkeletonLine width="100%" height={30} opacity={opacity} style={{ marginTop: 12 }} />
            <SkeletonLine width="100%" height={40} opacity={opacity} style={{ marginTop: 12, borderRadius: 20 }} />
          </View>
        </View>
        <View style={styles.skeletonTabs}>
          <Animated.View style={[styles.skeletonTab, { opacity }]} />
          <Animated.View style={[styles.skeletonTab, { opacity }]} />
        </View>
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonCardHeader}>
            <Animated.View style={[styles.skeletonCardAvatar, { opacity }]} />
            <SkeletonLine width={120} height={14} opacity={opacity} />
          </View>
          <SkeletonLine width="90%" height={12} opacity={opacity} style={{ marginTop: 8 }} />
          <SkeletonLine width="70%" height={12} opacity={opacity} style={{ marginTop: 6 }} />
        </View>
      ))}
    </SafeAreaView>
  );
});

export default function UserProfile({ route, navigation }) {
  const { userId } = route.params || {};
  const { user: currentUser, token, setUser } = useContext(AuthContext);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isReceived, setIsReceived] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState([]);
  const [likingItems, setLikingItems] = useState({});
  const [showFullText, setShowFullText] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState('none');

  // Comment modal state
  const [showComments, setShowComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState({});

  // Mention state
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const mentionSearchTimeout = useRef(null);

  const commentInputRef = useRef(null);
  const flatListRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;
  const commentSlide = useRef(new Animated.Value(height)).current;

  // Polling refs
  const pollIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(true);
  const lastCommentsFetchRef = useRef(0);

  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetId = userId || currentUser?._id;
  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ============ EFFECTS ============
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideUpAnim]);

  useEffect(() => {
    if (showMenu) {
      menuSlide.setValue(200);
      Animated.spring(menuSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    }
  }, [showMenu, menuSlide]);

  useEffect(() => {
    if (showComments) {
      commentSlide.setValue(height);
      Animated.spring(commentSlide, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
    } else {
      commentSlide.setValue(height);
    }
  }, [showComments, commentSlide]);

  // Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Back handler
  useEffect(() => {
    const backAction = () => {
      if (showComments) {
        setShowComments(false);
        Keyboard.dismiss();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [showComments]);

  // ============ CHECK CONNECTION STATES (null-safe) ============
  const checkConnectionStates = useCallback((targetUserId) => {
    if (!currentUser || !targetUserId) {
      return { isConnected: false, isPending: false, isReceived: false };
    }

    const targetStr = targetUserId.toString();
    const currentIdStr = currentUser._id?.toString();

    if (targetStr === currentIdStr) {
      return { isConnected: true, isPending: false, isReceived: false };
    }

    const isConnected = (currentUser.connections || []).some(
      id => id?.toString() === targetStr
    );
    const isPending = (currentUser.sentRequests || []).some(
      id => id?.toString() === targetStr
    );
    const isReceived = (currentUser.receivedRequests || []).some(
      id => id?.toString() === targetStr
    );

    return { isConnected, isPending, isReceived };
  }, [currentUser]);

  // ============ REFRESH CURRENT USER FROM BACKEND ============
  const refreshCurrentUser = useCallback(async () => {
    try {
      const meRes = await axios.get(`${API_URL}/user/me`, config);
      if (meRes.data?.user && setUser) {
        setUser(meRes.data.user);
        return meRes.data.user;
      }
    } catch (err) {
      console.warn("Refresh current user failed:", err.message);
    }
    return null;
  }, [config, setUser]);

  // ============ CHECK BLOCK STATUS ============
  const checkBlockStatus = useCallback(async () => {
    try {
      const blockedRes = await axios.get(`${API_URL}/user/blocked`, config);
      const blockedUsers = blockedRes.data.blockedUsers || [];
      const isBlocked = blockedUsers.some(b => b._id === targetId);
      setIsBlocked(isBlocked);
      if (isBlocked) setBlockStatus('blocked');
      return isBlocked;
    } catch (err) {
      console.error("Check block status error:", err);
      return false;
    }
  }, [targetId, config]);

  // ============ FETCH PROFILE ============
  // - me, block list and profile load in parallel (was 3 calls one after another)
  // - skeleton only on the first load; later refreshes are silent
  // - stable callback, so it no longer re-runs every time setUser() or a
  //   connect/accept action changes state (that caused the reload loop)
  const isActionLoadingRef = useRef(false);
  isActionLoadingRef.current = isActionLoading;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const hasProfileRef = useRef(false);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!targetId || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (!hasProfileRef.current) setLoading(true);

      const [meRes, blockRes, profRes] = await Promise.allSettled([
        refreshCurrentUser(),
        checkBlockStatus(),
        axios.get(`${API_URL}/profile/${targetId}`, config),
      ]);

      if (blockRes.status === 'fulfilled' && blockRes.value) return; // I blocked them
      if (profRes.status === 'rejected') throw profRes.reason;

      const res = profRes.value;
      if (res.data.isBlockedByUser) {
        setIsBlockedByUser(true);
        setBlockStatus('blocked_by_user');
        return;
      }

      setProfileData(res.data.profile);
      hasProfileRef.current = true;

      const posts = (res.data.posts || []).map(post => {
        const normalizedLikes = normalizeLikes(post.likes);
        return {
          ...post,
          likes: normalizedLikes,
          comments: Array.isArray(post.comments) ? post.comments : [],
          likeCount: normalizedLikes.length,
        };
      });

      setUserPosts(posts);
      setConnections(res.data.connections || []);

      // Backend-computed connectionStatus first, local arrays as fallback
      if (!isActionLoadingRef.current) {
        const status = res.data.profile?.connectionStatus || res.data.connectionStatus;
        if (status) {
          setIsConnected(status === 'connected' || status === 'self');
          setIsPending(status === 'pending');
          setIsReceived(status === 'received');
        } else {
          const me = (meRes.status === 'fulfilled' && meRes.value) || currentUserRef.current;
          const t = targetId.toString();
          if (t === me?._id?.toString()) {
            setIsConnected(true); setIsPending(false); setIsReceived(false);
          } else {
            setIsConnected((me?.connections || []).some(id => id?.toString() === t));
            setIsPending((me?.sentRequests || []).some(id => id?.toString() === t));
            setIsReceived((me?.receivedRequests || []).some(id => id?.toString() === t));
          }
        }
      }

      setIsBlocked(false);
      setBlockStatus('none');
    } catch (err) {
      console.error("Fetch profile error:", err?.message);
      if (err?.response?.data?.isBlocked) {
        setIsBlocked(true);
        setBlockStatus('blocked');
        if (!hasProfileRef.current) Alert.alert("Blocked", "You have blocked this user");
      } else if (err?.response?.data?.error?.includes?.('blocked')) {
        setIsBlockedByUser(true);
        setBlockStatus('blocked_by_user');
        if (!hasProfileRef.current) Alert.alert("Blocked", "You have been blocked by this user");
      } else if (!hasProfileRef.current) {
        Alert.alert("Error", "Failed to load profile");
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetId, config, checkBlockStatus, refreshCurrentUser]);

  // opening another person's profile → show the skeleton again
  useEffect(() => {
    hasProfileRef.current = false;
  }, [targetId]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      isMountedRef.current = true;
      fetchProfile();
      return () => {
        isScreenFocusedRef.current = false;
        Keyboard.dismiss();
      };
    }, [fetchProfile])
  );

  // ============ SOCKET LISTENER FOR REAL-TIME ACCEPT ============
  useEffect(() => {
    const socket = global.socket;
    if (!socket) return;

    const handleConnectionAccepted = (data) => {
      if (!data?.userId) return;
      if (data.userId.toString() === targetId?.toString()) {
        setIsPending(false);
        setIsConnected(true);
        setIsReceived(false);
        setIsActionLoading(false);
        // Refresh from backend to keep state consistent
        refreshCurrentUser();
      }
    };

    const handleConnectionDeclined = (data) => {
      if (!data?.userId) return;
      if (data.userId.toString() === targetId?.toString()) {
        setIsPending(false);
        setIsConnected(false);
        setIsReceived(false);
      }
    };

    const handleConnectionUpdated = (data) => {
      // Someone accepted us / our request accepted
      refreshCurrentUser();
    };

    socket.on('connection_accepted', handleConnectionAccepted);
    socket.on('connection_declined', handleConnectionDeclined);
    socket.on('connection_updated', handleConnectionUpdated);

    return () => {
      socket.off('connection_accepted', handleConnectionAccepted);
      socket.off('connection_declined', handleConnectionDeclined);
      socket.off('connection_updated', handleConnectionUpdated);
    };
  }, [targetId, refreshCurrentUser]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
    };
  }, []);

  // ============ ORGANIZE COMMENTS ============
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

  // ============ FETCH POST COMMENTS ============
  const fetchPostComments = useCallback(async (postId, silent = false) => {
    if (!token || !postId || !isMountedRef.current) return;
    const now = Date.now();
    if (silent && now - lastCommentsFetchRef.current < 2000) return;
    if (silent) lastCommentsFetchRef.current = now;

    try {
      const res = await axios.get(`${API_URL}/posts/${postId}`, config);
      if (!isMountedRef.current) return;

      const freshComments = normalizeComments(res.data.comments || []);

      setCommentsList(prev => {
        if (silent && !commentsChanged(prev, freshComments)) return prev;
        return freshComments;
      });

      setUserPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        return {
          ...p,
          comments: freshComments,
          likes: normalizeLikes(res.data.likes || []),
          likeCount: (res.data.likes || []).length,
        };
      }));
    } catch (err) {
      if (!silent) console.error("Fetch comments error:", err);
    }
  }, [token, config]);

  useEffect(() => {
    if (!showComments || !selectedPost?._id) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    fetchPostComments(selectedPost._id, true);

    pollIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active' && isScreenFocusedRef.current) {
        fetchPostComments(selectedPost._id, true);
      }
    }, COMMENTS_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [showComments, selectedPost?._id, fetchPostComments]);

  // AppState listener — refreshes user on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        // ✅ Refresh current user to catch server-side changes
        await refreshCurrentUser();

        if (isScreenFocusedRef.current && showComments && selectedPost?._id) {
          fetchPostComments(selectedPost._id, true);
        }
      }
    });
    return () => subscription.remove();
  }, [fetchPostComments, showComments, selectedPost?._id, refreshCurrentUser]);

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  // ============ ACCEPT REQUEST (FIXED) ============
  const handleAcceptRequest = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const notificationsRes = await axios.get(`${API_URL}/notifications`, config);
      const pendingRequest = notificationsRes.data.find(
        n => n.sender?._id === targetId && n.type === 'request' && n.status === 'pending' && !n.isProcessed
      );

      if (!pendingRequest) {
        Alert.alert("Error", "No pending request found");
        setIsActionLoading(false);
        return;
      }

      const response = await axios.post(`${API_URL}/notifications/respond`, {
        notificationId: pendingRequest._id,
        action: 'accepted'
      }, config);

      if (response.data.success) {
        Alert.alert("Success", "Connection request accepted!");
        setIsConnected(true);
        setIsReceived(false);
        setIsPending(false);
        // ✅ Refresh current user from backend — the source of truth
        await refreshCurrentUser();
      }
    } catch (err) {
      console.error("Accept request error:", err);
      Alert.alert("Error", err.response?.data?.error || "Failed to accept request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    Alert.alert("Decline Request", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline", style: "destructive", onPress: async () => {
          if (isActionLoading) return;
          setIsActionLoading(true);
          try {
            const notificationsRes = await axios.get(`${API_URL}/notifications`, config);
            const pendingRequest = notificationsRes.data.find(
              n => n.sender?._id === targetId && n.type === 'request' && n.status === 'pending' && !n.isProcessed
            );

            if (pendingRequest) {
              await axios.post(`${API_URL}/notifications/respond`, {
                notificationId: pendingRequest._id, action: 'declined'
              }, config);
            }

            setIsReceived(false);
            setIsConnected(false);
            setIsPending(false);
            await refreshCurrentUser();
            Alert.alert("Request declined");
          } catch (err) {
            Alert.alert("Error", "Failed to decline request");
          } finally {
            setIsActionLoading(false);
          }
        }
      }
    ]);
  };

  const handleCancelRequest = async () => {
    Alert.alert("Cancel Request", "Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes", style: "destructive", onPress: async () => {
          if (isActionLoading) return;
          setIsActionLoading(true);
          try {
            await axios.post(`${API_URL}/user/cancel-request/${targetId}`, {}, config);
            setIsPending(false);
            setIsConnected(false);
            setIsReceived(false);
            await refreshCurrentUser();
            Alert.alert("Request cancelled");
          } catch (err) {
            Alert.alert("Error", "Failed to cancel request");
          } finally {
            setIsActionLoading(false);
          }
        }
      }
    ]);
  };

  const handleConnect = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/user/connect/${targetId}`, {}, config);
      if (response.data.success) {
        Alert.alert("Success", "Connection request sent!");
        setIsPending(true);
        setIsConnected(false);
        setIsReceived(false);
        await refreshCurrentUser();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "";
      if (errorMsg.includes("already connected")) {
        setIsConnected(true);
        setIsPending(false);
        setIsReceived(false);
      } else if (errorMsg.includes("Request already sent")) {
        setIsPending(true);
      } else if (errorMsg.includes("Request already received")) {
        setIsReceived(true);
      }
      Alert.alert("Info", errorMsg || "Could not send request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert("Remove Connection", `Remove ${profileData?.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          if (isActionLoading) return;
          setIsActionLoading(true);
          try {
            await axios.post(`${API_URL}/user/disconnect/${targetId}`, {}, config);
            setIsConnected(false);
            setIsPending(false);
            setIsReceived(false);
            await refreshCurrentUser();
          } catch (err) {
            Alert.alert("Error", "Failed to remove connection");
          } finally {
            setIsActionLoading(false);
          }
        }
      }
    ]);
  };

  // ============ BLOCK USER ============
  const handleBlockUser = () => {
    setShowMenu(false);
    if (isOwnProfile) {
      Alert.alert("Info", "You cannot block yourself");
      return;
    }

    if (isBlocked) {
      Alert.alert("Unblock User", `Do you want to unblock ${profileData?.name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unblock", onPress: handleUnblockUser }
      ]);
      return;
    }

    Alert.alert("Block User", `Block ${profileData?.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: performBlock }
    ]);
  };

  const performBlock = async () => {
    try {
      const res = await axios.post(`${API_URL}/user/block/${targetId}`, {}, config);
      if (res.data.success) {
        setIsBlocked(true);
        setBlockStatus('blocked');
        await refreshCurrentUser();
        Alert.alert("Blocked", `You blocked ${profileData?.name}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not block");
    }
  };

  const handleUnblockUser = async () => {
    try {
      const res = await axios.post(`${API_URL}/user/unblock/${targetId}`, {}, config);
      if (res.data.success) {
        setIsBlocked(false);
        setBlockStatus('none');
        Alert.alert("Unblocked", `You unblocked ${profileData?.name}`);
        await fetchProfile();
      }
    } catch (err) {
      Alert.alert("Error", "Could not unblock");
    }
  };

  const handleReportUser = () => {
    setShowMenu(false);
    if (isOwnProfile || isBlocked) return;
    Alert.alert("Report Account", `Why report ${profileData?.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Spam", onPress: () => submitReport("Spam") },
      { text: "Harassment", onPress: () => submitReport("Harassment") },
      { text: "Hate Speech", onPress: () => submitReport("Hate Speech") },
      { text: "Inappropriate Content", onPress: () => submitReport("Inappropriate Content") },
      { text: "Fake Account", onPress: () => submitReport("Fake Account") },
      { text: "Other", onPress: () => submitReport("Other") }
    ]);
  };

  const submitReport = async (reason) => {
    try {
      const res = await axios.post(`${API_URL}/user/report/${targetId}`, { reason }, config);
      if (res.data.success) {
        Alert.alert("Report Submitted", "We'll review it within 24 hours.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not report");
    }
  };

  const handleShareProfile = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `Check out ${profileData?.name}'s profile on TDC!`
      });
    } catch (error) { }
  };

  const handleMessagePress = async () => {
    if (isBlocked) return Alert.alert("Blocked", "Unblock to send a message.");
    if (!isConnected && !isOwnProfile) return Alert.alert("Not Connected", "You need to be connected.");
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/conversations/get-or-create`, { recipientId: targetId }, config);
      if (res.data.conversationId) {
        navigation.navigate('ChatDetailScreen', {
          conversationId: res.data.conversationId,
          recipient: profileData,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Could not initiate chat.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewConnections = async () => {
    if (isBlocked || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await axios.get(`${API_URL}/user/connections/${targetId}`, config);
      setConnectionsList(res.data.connections || []);
      setShowConnectionsModal(true);
    } catch (err) {
      Alert.alert("Error", "Failed to load connections");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ============ COMMENT MODAL ============
  const openComments = (post) => {
    setSelectedPost(post);
    setCommentsList(normalizeComments(post.comments || []));
    setCommentText("");
    setReplyTo(null);
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    setShowComments(true);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 300);
  };

  const closeComments = () => {
    setShowComments(false);
    setSelectedPost(null);
    setCommentsList([]);
    setCommentText("");
    setReplyTo(null);
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
    Keyboard.dismiss();
  };

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
        const res = await axios.get(
          `${API_URL}/users/mention-search?q=${encodeURIComponent(afterAt)}`,
          config
        );
        if (isMountedRef.current) setMentionResults(res.data.users || []);
      } catch (err) {
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
    setTimeout(() => commentInputRef.current?.focus(), 100);
  }, [commentText]);

  const onReplyPress = useCallback((comment, parentCommentId) => {
    const targetId_ = parentCommentId || comment._id;
    const parentComment = commentsList.find(
      c => c._id?.toString() === targetId_?.toString()
    );
    const mentionName = parentComment?.user?.name || comment.user?.name || "User";

    setReplyTo({
      commentId: targetId_?.toString(),
      userName: mentionName,
      userId: parentComment?.user?._id || comment.user?._id,
    });
    setCommentText(`@${mentionName.split(' ')[0]} `);

    const mentionId = parentComment?.user?._id || comment.user?._id;
    if (mentionId) {
      setSelectedMentions(prev =>
        prev.some(m => m._id === mentionId) ? prev : [...prev, { _id: mentionId, name: mentionName }]
      );
    }
    setCollapsedThreads(prev => ({ ...prev, [targetId_]: false }));
    setTimeout(() => commentInputRef.current?.focus(), 150);
  }, [commentsList]);

  const toggleThread = useCallback((commentId) => {
    setCollapsedThreads(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    const text = commentText.trim();
    setIsSubmittingComment(true);

    try {
      const mentionIdsInText = selectedMentions
        .filter(m => commentText.includes(`@${m.name.split(' ')[0]}`))
        .map(m => m._id);

      const payload = { text, mentions: mentionIdsInText };
      if (replyTo?.commentId) payload.parentComment = replyTo.commentId;

      const res = await axios.post(
        `${API_URL}/posts/comment/${selectedPost._id}`,
        payload,
        config
      );

      if (res.data.success && res.data.comments) {
        const fresh = normalizeComments(res.data.comments);
        setCommentsList(fresh);
        setUserPosts(prev => prev.map(p => {
          if (p._id === selectedPost._id) return { ...p, comments: fresh };
          return p;
        }));
        setSelectedPost(prev => ({ ...prev, comments: fresh }));
        setCommentText("");
        setReplyTo(null);
        setSelectedMentions([]);
        setShowMentionSuggestions(false);
        Keyboard.dismiss();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Comment failed to post.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = (comment) => {
    const isMyComment = comment.user?._id?.toString() === currentUser?._id?.toString();
    if (!isMyComment) return;

    Alert.alert("Delete Comment", "Are you sure? All replies to this comment will also be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await axios.delete(
              `${API_URL}/posts/comment/${selectedPost._id}/${comment._id}`,
              config
            );
            if (res.data.success && res.data.comments) {
              const fresh = normalizeComments(res.data.comments);
              setCommentsList(fresh);
              setUserPosts(prev => prev.map(p => {
                if (p._id === selectedPost._id) return { ...p, comments: fresh };
                return p;
              }));
            }
          } catch (err) {
            Alert.alert("Error", err.response?.data?.error || "Could not delete comment");
          }
        }
      }
    ]);
  };

  const formatCommentTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // ============ RENDER COMMENT ============
  const renderComment = ({ item }) => {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;
    const isMyComment = item.user?._id?.toString() === currentUser?._id?.toString();

    return (
      <View style={styles.threadContainer}>
        <View style={styles.parentRow}>
          <TouchableOpacity
            onPress={() => {
              closeComments();
              navigation.push('UserProfile', { userId: item.user?._id });
            }}
            activeOpacity={0.7}
          >
            {item.user?.profileImage ? (
              <Image source={{ uri: item.user.profileImage }} style={styles.avatarLg} />
            ) : (
              <LinearGradient colors={[T.yellow, T.yellow]} style={styles.avatarLgPlaceholder}>
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
                    <Text style={styles.ownBadgeText}>you</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>

            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatCommentTime(item.createdAt)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                <Text style={styles.replyBtn}>reply</Text>
              </TouchableOpacity>
              {isMyComment && (
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
              const replyAuthorName = reply.user?.name || "User";
              const mentionMatch = reply.text?.match(/^@(\S+)\s/);
              const mention = mentionMatch ? mentionMatch[1] : null;
              const displayText = mention ? reply.text.replace(/^@\S+\s/, '') : reply.text;
              const isLast = index === visibleReplies.length - 1;
              const isMyReply = reply.user?._id?.toString() === currentUser?._id?.toString();

              return (
                <View key={reply._id} style={styles.treeBranch}>
                  <View style={[styles.branchConnector, isLast && styles.branchConnectorLast]} />
                  <TouchableOpacity
                    onPress={() => {
                      closeComments();
                      navigation.push('UserProfile', { userId: reply.user?._id });
                    }}
                    activeOpacity={0.7}
                    style={styles.replyAvatarWrap}
                  >
                    {reply.user?.profileImage ? (
                      <Image source={{ uri: reply.user.profileImage }} style={styles.avatarSm} />
                    ) : (
                      <LinearGradient colors={[T.yellow, T.yellow]} style={styles.avatarSmPlaceholder}>
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
                            <Text style={styles.ownBadgeTextSmall}>you</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.replyTextContent}>
                        {mention && <Text style={styles.mentionText}>@{mention} </Text>}
                        {displayText}
                      </Text>
                    </View>

                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatCommentTime(reply.createdAt)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                        <Text style={styles.replyBtnSm}>reply</Text>
                      </TouchableOpacity>
                      {isMyReply && (
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
  };

  // ============ POST HANDLERS ============
  const handleLikePost = async (postId, index) => {
    soundLike();   
    if (isBlocked || likingItems[postId]) return;
    setLikingItems(prev => ({ ...prev, [postId]: true }));

    const currentPost = userPosts[index];
    if (!currentPost) return;

    const currentLikes = normalizeLikes(currentPost.likes);
    const currentUserId = currentUser._id.toString();
    const wasLiked = currentLikes.some(id => id === currentUserId);

    const updatedPosts = [...userPosts];
    if (wasLiked) {
      updatedPosts[index] = {
        ...updatedPosts[index],
        likes: currentLikes.filter(id => id !== currentUserId),
        likeCount: Math.max(0, (updatedPosts[index].likeCount || currentLikes.length) - 1),
      };
    } else {
      updatedPosts[index] = {
        ...updatedPosts[index],
        likes: [...currentLikes, currentUserId],
        likeCount: (updatedPosts[index].likeCount || currentLikes.length) + 1,
      };
    }
    setUserPosts(updatedPosts);

    if (!wasLiked) {
      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      if (response.data.success) {
        let finalLikes;
        let finalCount;

        if (response.data.likedBy && Array.isArray(response.data.likedBy)) {
          finalLikes = response.data.likedBy.map(u => {
            if (u && typeof u === 'object' && u._id) return u._id.toString();
            return u ? u.toString() : null;
          }).filter(Boolean);
          finalCount = finalLikes.length;
        } else if (typeof response.data.likes === 'number') {
          finalCount = response.data.likes;
          finalLikes = updatedPosts[index].likes;
        } else {
          finalLikes = updatedPosts[index].likes;
          finalCount = updatedPosts[index].likeCount;
        }

        setUserPosts(prev => {
          const newPosts = [...prev];
          newPosts[index] = { ...newPosts[index], likes: finalLikes, likeCount: finalCount };
          return newPosts;
        });
      }
    } catch (error) {
      setUserPosts(prev => {
        const revertedPosts = [...prev];
        revertedPosts[index] = currentPost;
        return revertedPosts;
      });
    } finally {
      setLikingItems(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/posts/${postId}`, config);
            setUserPosts(prev => prev.filter(post => post._id !== postId));
          } catch (error) {
            Alert.alert("Error", "Failed to delete post");
          }
        }
      }
    ]);
  };

  const toggleShowFullText = (postId) => {
    setShowFullText(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const getConnectionCount = () => {
    if (profileData?.connections) return profileData.connections.length || 0;
    return connections.length || 0;
  };

  const formatJoinedDate = (dateString) => {
    if (!dateString) return "Member";
    const date = new Date(dateString);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `joined ${monthNames[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
  };

  // ============ RENDER BUTTON ============
  const renderButton = () => {
    if (isBlocked) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.blockedBtn} onPress={handleBlockUser}>
            <LinearGradient colors={[T.danger, T.danger]} style={styles.btnGradient}>
              <Ionicons name="ban-outline" size={16} color={T.white} />
              <Text style={styles.blockedBtnText}>blocked</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (isActionLoading) {
      return (
        <View style={styles.btnRow}>
          <View style={[styles.connectBtn, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={T.ink} />
          </View>
        </View>
      );
    }

    if (isOwnProfile) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <LinearGradient colors={[T.ink, T.ink]} style={styles.editGradient}>
              <Ionicons name="create-outline" size={16} color={T.yellow} />
              <Text style={styles.editBtnText}>edit profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (isConnected) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.connectedBtn} onPress={handleDisconnect}>
            <LinearGradient colors={[T.yellow, T.yellow]} style={styles.btnGradient}>
              <Ionicons name="checkmark-circle" size={16} color={T.ink} />
              <Text style={styles.connectedBtnText}>connected</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
            <Ionicons name="chatbubble-outline" size={16} color={T.yellow} />
            <Text style={styles.msgBtnText}>message</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isReceived) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRequest}>
            <LinearGradient colors={[T.ink, T.ink]} style={styles.btnGradient}>
              <Ionicons name="checkmark" size={16} color={T.white} />
              <Text style={styles.acceptBtnText}>accept request</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={handleRejectRequest}>
            <Ionicons name="close" size={16} color={T.danger} />
            <Text style={styles.declineBtnText}>decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isPending) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.pendingBtn} onPress={handleCancelRequest}>
            <LinearGradient colors={[T.sand, T.sand]} style={styles.btnGradient}>
              <Ionicons name="time-outline" size={16} color={T.textMuted} />
              <Text style={styles.pendingBtnText}>request sent</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.msgBtnDisabled} disabled>
            <Ionicons name="chatbubble-outline" size={16} color={T.textFaint} />
            <Text style={styles.msgBtnDisabledText}>message</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
          <LinearGradient colors={[T.yellow, T.yellow]} style={styles.btnGradient}>
            <Ionicons name="person-add" size={16} color={T.ink} />
            <Text style={styles.connectedBtnText}>connect</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
          <Ionicons name="chatbubble-outline" size={16} color={T.yellow} />
          <Text style={styles.msgBtnText}>message</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============ ABOUT TAB ============
  const renderAboutTab = () => {
    const connectionsCount = getConnectionCount();

    if (isBlocked) {
      return (
        <View style={styles.blockedContainer}>
          <EmptyState mood="sus" title="user blocked." line="their content is hidden." actionLabel="unblock user" onAction={handleBlockUser} />
        </View>
      );
    }

    return (
      <View style={styles.tabContentContainer}>
        {profileData?.bio && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="person-outline" size={20} color={T.yellow} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>bio</Text>
              <Text style={styles.aboutText}>{profileData.bio}</Text>
            </View>
          </View>
        )}

        {profileData?.university?.name && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="school-outline" size={20} color={T.yellow} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>university</Text>
              <View style={styles.universityRow}>
                <Text style={styles.aboutText}>{profileData.university.name}</Text>
                {profileData.university.isVIP && (
                  <View style={styles.vipBadge}>
                    <Ionicons name="star" size={12} color={T.yellow} />
                    <Text style={styles.vipText}>vip</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {profileData?.location && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="location-outline" size={20} color={T.yellow} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>location</Text>
              <Text style={styles.aboutText}>{profileData.location}</Text>
            </View>
          </View>
        )}

        {profileData?.headline && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="briefcase-outline" size={20} color={T.yellow} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>headline</Text>
              <Text style={styles.aboutText}>{profileData.headline}</Text>
            </View>
          </View>
        )}

        {profileData?.createdAt && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="calendar-outline" size={20} color={T.yellow} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>joined</Text>
              <Text style={styles.aboutText}>{formatJoinedDate(profileData.createdAt)}</Text>
            </View>
          </View>
        )}

        <View style={styles.connectionSummary}>
          <TouchableOpacity
            style={styles.connectionSummaryItem}
            onPress={handleViewConnections}
            activeOpacity={0.7}
          >
            <Text style={styles.connectionSummaryNumber}>{connectionsCount}</Text>
            <Text style={styles.connectionSummaryLabel}>connections</Text>
          </TouchableOpacity>
          <View style={styles.connectionDivider} />
          <View style={styles.connectionSummaryItem}>
            <Text style={styles.connectionSummaryNumber}>{userPosts.length}</Text>
            <Text style={styles.connectionSummaryLabel}>posts</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============ RENDER POST ============
  const renderPost = ({ item, index }) => {
    if (isBlocked) return null;

    const likesArray = normalizeLikes(item.likes);
    const currentUserId = currentUser?._id?.toString();
    const isLiked = likesArray.some(id => id === currentUserId);
    const likeCount = item.likeCount || likesArray.length || 0;

    const textContent = item.content || '';
    const isExpanded = showFullText[item._id] || false;
    const truncatedText = textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent;
    const commentsCount = Array.isArray(item.comments) ? item.comments.length : 0;

    return (
      <Animated.View style={[styles.postCard, { opacity: fadeAnim }]}>
        <View style={styles.postHeader}>
          {profileData?.profileImage ? (
            <Image source={{ uri: profileData.profileImage }} style={styles.postAvatar} />
          ) : (
            <LinearGradient colors={[T.yellow, T.yellow]} style={styles.postAvatarPlaceholder}>
              <Text style={styles.postAvatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={styles.postInfo}>
            <Text style={styles.postName}>{profileData?.name}</Text>
          </View>
          <Text style={styles.postDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          {isOwnProfile && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={T.danger} />
            </TouchableOpacity>
          )}
        </View>

        {textContent && (
          <View>
            <Text style={styles.postText} numberOfLines={isExpanded ? undefined : 4}>
              {isExpanded ? textContent : truncatedText}
            </Text>
            {textContent.length > 100 && (
              <TouchableOpacity onPress={() => toggleShowFullText(item._id)} style={styles.showMoreBtn}>
                <Text style={styles.showMoreText}>{isExpanded ? 'show less' : 'show more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLikePost(item._id, index)}
            disabled={likingItems[item._id]}
          >
            <Animated.View style={{ transform: [{ scale: isLiked ? likeScale : 1 }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={18}
                color={isLiked ? T.yellow : T.textMuted}
              />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && { color: T.ink, fontFamily: F.bodyBold }]}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
            <Ionicons name="chatbubble-outline" size={18} color={T.textMuted} />
            <Text style={styles.actionText}>{commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ============ LOADING ============
  if (loading) return <ProfileSkeleton />;

  // ============ BLOCKED STATES ============
  if (isBlocked) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ScreenHeader title="blocked user" />
        <View style={styles.blockedFullContainer}>
          <EmptyState
            mood="sus"
            title="user blocked."
            line="you blocked this user. they can't interact with you."
            actionLabel="unblock user"
            onAction={handleUnblockUser}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isBlockedByUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ScreenHeader title="blocked" />
        <View style={styles.blockedFullContainer}>
          <EmptyState mood="sus" title="not available." line="this user has blocked you." />
        </View>
      </SafeAreaView>
    );
  }

  const connectionCount = getConnectionCount();

  // ============ MAIN RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <FlatList
        data={activeTab === 'Posts' ? userPosts : []}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListEmptyComponent={
          activeTab === 'Posts' ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                mood="sleepy"
                title="no posts yet."
                line={isOwnProfile ? "your posts will show up here." : "when they post, you'll see it here."}
              />
            </View>
          ) : activeTab === 'About' ? renderAboutTab() : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
            colors={[T.yellow]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <ScreenHeader
                title="profile"
                right={<HeaderIconButton icon="ellipsis-horizontal" label="profile options" onPress={() => setShowMenu(true)} />}
              />

              <View style={styles.profileContent}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarContainer}>
                    {profileData?.profileImage ? (
                      <Image source={{ uri: profileData.profileImage }} style={styles.avatar} />
                    ) : (
                      <LinearGradient colors={[T.yellow, T.yellow]} style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>

                <Text style={styles.fullName}>{profileData?.name}</Text>
                {profileData?.bio && <Text style={styles.bio}>{profileData.bio}</Text>}

                <TouchableOpacity
                  onPress={handleViewConnections}
                  style={styles.connectionTouchable}
                  accessibilityRole="button"
                  accessibilityLabel={`${connectionCount} connections, view all`}
                >
                  <Text style={styles.connectionCount}>
                    <Text style={styles.connectionNum}>{connectionCount}</Text> connections
                  </Text>
                </TouchableOpacity>

                {renderButton()}
              </View>
            </View>

            <View style={styles.tabBar}>
              {['Posts', 'About'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabItem, activeTab === tab && styles.activeTab]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
      />

      {/* Three-Dot Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.menuBox, { transform: [{ translateY: menuSlide }] }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuHeaderText}>profile options</Text>
                </View>

                <TouchableOpacity style={styles.menuItem} onPress={handleShareProfile}>
                  <View style={styles.menuIconCircle}>
                    <Ionicons name="share-social-outline" size={20} color={T.ink} />
                  </View>
                  <Text style={styles.menuText}>share profile</Text>
                </TouchableOpacity>

                {!isOwnProfile && (
                  <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                    <View style={[styles.menuIconCircle, isBlocked ? styles.menuUnblockCircle : styles.menuBlockCircle]}>
                      <Ionicons
                        name={isBlocked ? "person-add" : "ban-outline"}
                        size={20}
                        color={isBlocked ? T.yellow : T.danger}
                      />
                    </View>
                    <Text style={[styles.menuText, isBlocked ? styles.menuUnblockText : styles.menuBlockText]}>
                      {isBlocked ? "Unblock User" : "Block User"}
                    </Text>
                  </TouchableOpacity>
                )}

                {!isOwnProfile && !isBlocked && (
                  <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
                    <View style={[styles.menuIconCircle, styles.menuReportCircle]}>
                      <Ionicons name="flag-outline" size={20} color={T.danger} />
                    </View>
                    <Text style={[styles.menuText, styles.menuBlockText]}>report account</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <View style={[styles.menuIconCircle, styles.menuCancelCircle]}>
                    <Ionicons name="close-outline" size={20} color={T.textFaint} />
                  </View>
                  <Text style={[styles.menuText, styles.menuCancelText]}>cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Connections Modal */}
      <Modal visible={showConnectionsModal} transparent animationType="slide" onRequestClose={() => setShowConnectionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowConnectionsModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Connections ({connectionsList.length})
              </Text>
              <TouchableOpacity onPress={() => setShowConnectionsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.connectionItem}
                  onPress={() => {
                    setShowConnectionsModal(false);
                    navigation.push('UserProfile', { userId: item._id });
                  }}
                >
                  <Image
                    source={{
                      uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=f9c349&color=1a1a1a`
                    }}
                    style={styles.connectionAvatar}
                  />
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{item.name}</Text>
                    <Text style={styles.connectionHeadline}>@{item.username || 'user'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyConnectionsContainer}>
                  <Ionicons name="people-outline" size={50} color={T.textFaint} />
                  <Text style={styles.emptyConnections}>no connections yet</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showComments}
        animationType="fade"
        transparent
        onRequestClose={closeComments}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeComments}>
          <View style={styles.commentModalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.commentSheet, { transform: [{ translateY: commentSlide }] }]}>
                <View style={styles.dragHandle} />
                <View style={styles.commentModalHeader}>
                  <View style={styles.commentModalHeaderLeft}>
                    <Ionicons name="chatbubbles" size={20} color={T.yellow} />
                    <Text style={styles.commentModalTitle}>comments</Text>
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountBadgeText}>{commentsList.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeComments} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={22} color={T.ink} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <FlatList
                    ref={flatListRef}
                    data={organizedComments}
                    keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                    renderItem={renderComment}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.commentListContent}
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="chatbubble-outline" size={40} color={T.textFaint} />
                        </View>
                        <Text style={styles.emptyText}>no comments yet</Text>
                        <Text style={styles.emptySubtext}>be the first to comment!</Text>
                      </View>
                    }
                    onContentSizeChange={() => {
                      if (commentsList.length > 0) {
                        flatListRef.current?.scrollToEnd({ animated: false });
                      }
                    }}
                  />
                </View>

                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                  style={{ flexShrink: 0 }}
                >
                  <View style={[
                    styles.commentInputWrapper,
                    keyboardHeight > 0 && { paddingBottom: Platform.OS === 'ios' ? 0 : keyboardHeight }
                  ]}>
                    {replyTo && (
                      <View style={styles.replyNotifier}>
                        <View style={styles.replyNotifierLeft}>
                          <Ionicons name="return-down-forward" size={14} color={T.yellow} />
                          <Text style={styles.replyNotifierText}>
                            replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setReplyTo(null);
                            setCommentText("");
                            setSelectedMentions([]);
                          }}
                        >
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
                                <LinearGradient
                                  colors={[T.yellow, T.yellow]}
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
                              <Ionicons name="at" size={18} color={T.ink} />
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}

                    <View style={styles.commentInputArea}>
                      <TextInput
                        ref={commentInputRef}
                        style={styles.commentInput}
                        placeholder="Write a comment... Use @ to mention"
                        placeholderTextColor={T.textFaint}
                        value={commentText}
                        onChangeText={handleCommentTextChange}
                        multiline
                        maxHeight={100}
                      />
                      <TouchableOpacity
                        onPress={handleSubmitComment}
                        disabled={isSubmittingComment || !commentText.trim()}
                        style={[styles.postCommentBtn, !commentText.trim() && styles.postCommentBtnDisabled]}
                      >
                        <LinearGradient
                          colors={commentText.trim() ? [T.yellow, T.yellow] : [T.textFaint, T.sand]}
                          style={styles.postCommentBtnGradient}
                        >
                          {isSubmittingComment ? (
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
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  skeletonContainer: { flex: 1, backgroundColor: T.paper },
  skeletonTopNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  skeletonNavBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.sand },
  skeletonNavTitle: { width: 100, height: 20, borderRadius: 4, backgroundColor: T.sand },
  skeletonHeader: { padding: 16 },
  skeletonHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: T.sand },
  skeletonHeaderRight: { flex: 1, marginLeft: 16 },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: T.sand },
  skeletonTabs: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 8 },
  skeletonTab: { flex: 1, height: 32, borderRadius: 16, backgroundColor: T.sand, marginHorizontal: 4 },
  skeletonCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  skeletonCardHeader: { flexDirection: 'row', alignItems: 'center' },
  skeletonCardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.sand, marginRight: 12 },

  profileHeader: { backgroundColor: T.paper },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink, flex: 1, textAlign: 'center' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileContent: { marginHorizontal: 16, marginTop: 4, padding: 16, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatarContainer: { marginTop: -30 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: T.white },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: T.white, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontFamily: F.heading, color: T.ink },
  fullName: { fontSize: 20, fontFamily: F.headingBold, color: T.ink, marginTop: 8 },
  bio: { fontSize: 15, fontFamily: F.body, color: T.ink, marginTop: 10, lineHeight: 20 },
  connectionTouchable: { marginTop: 10 },
  connectionCount: { fontSize: 15, fontFamily: F.body, color: T.textMuted },
  connectionNum: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink },
  btnRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  editBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  editGradient: { flexDirection: 'row', height: 40, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 20 },
  editBtnText: { color: T.yellow, fontFamily: F.bodyBold, fontSize: 14 },
  connectBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  connectedBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', height: 40, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 20 },
  connectedBtnText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 14 },
  msgBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: T.sand },
  msgBtnText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 14 },
  acceptBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  acceptBtnText: { color: T.white, fontFamily: F.bodyBold, fontSize: 14 },
  declineBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: T.dangerBg },
  declineBtnText: { color: T.danger, fontFamily: F.bodyBold, fontSize: 14 },
  pendingBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  pendingBtnText: { color: T.textMuted, fontFamily: F.bodyBold, fontSize: 14 },
  msgBtnDisabled: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: T.paper },
  msgBtnDisabledText: { color: T.textFaint, fontFamily: F.bodyBold, fontSize: 14 },
  blockedBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  blockedBtnText: { color: T.white, fontFamily: F.bodyBold, fontSize: 14 },

  tabBar: { flexDirection: 'row', gap: 4, padding: 4, marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 24, backgroundColor: T.sand },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 20 },
  activeTab: { backgroundColor: T.ink },
  tabText: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },
  activeTabText: { color: T.white, fontFamily: F.bodyBold },
  tabIndicator: { position: 'absolute', bottom: 0, width: 56, height: 4, borderRadius: 2, backgroundColor: T.yellow },
  tabContentContainer: { margin: 16, marginTop: 8, padding: 16, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  aboutSection: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  aboutIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  aboutContent: { flex: 1 },
  aboutLabel: { fontSize: 11, color: T.textMuted, fontFamily: F.bodySemi, textTransform: 'none', letterSpacing: 0.5, marginBottom: 2 },
  aboutText: { fontSize: 15, fontFamily: F.body, color: T.ink, lineHeight: 22 },
  universityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.yellowSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: T.yellow },
  vipText: { fontSize: 10, fontFamily: F.bodyBold, color: T.yellow, marginLeft: 2 },
  connectionSummary: { flexDirection: 'row', backgroundColor: T.sand, borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: T.line },
  connectionSummaryItem: { flex: 1, alignItems: 'center' },
  connectionSummaryNumber: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  connectionSummaryLabel: { fontSize: 12, fontFamily: F.body, color: T.textMuted, marginTop: 2 },
  connectionDivider: { width: 1, backgroundColor: T.sand, marginHorizontal: 8 },

  postCard: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  postAvatarText: { color: T.ink, fontFamily: F.headingBold, fontSize: 18 },
  postInfo: { flex: 1, marginLeft: 10 },
  postName: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  postDate: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginRight: 8 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  postText: { fontSize: 15, fontFamily: F.body, color: T.ink, lineHeight: 22, marginBottom: 4 },
  showMoreBtn: { marginTop: 2 },
  showMoreText: { color: T.yellow, fontSize: 14, fontFamily: F.bodyMedium },
  postImage: { width: '100%', height: 250, borderRadius: 16, backgroundColor: T.sand, marginTop: 8 },
  postActions: { flexDirection: 'row', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.line, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 4 },
  actionText: { fontSize: 14, color: T.textMuted, fontFamily: F.body },
  emptyContainer: { paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink, marginTop: 12 },
  emptySubText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: '40%' },
  dragHandle: { width: 36, height: 4, backgroundColor: T.sand, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  modalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },

  connectionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: T.line },
  connectionAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink },
  connectionHeadline: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginTop: 1 },
  emptyConnectionsContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyConnections: { textAlign: 'center', color: T.textMuted, padding: 40 },

  blockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  blockedFullContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  blockedIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: T.dangerBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  blockedFullTitle: { fontSize: 24, fontFamily: F.heading, color: T.ink, marginTop: 16 },
  blockedFullSubtext: { fontSize: 15, fontFamily: F.body, color: T.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  unblockFullBtn: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  unblockFullGradient: { flexDirection: 'row', paddingHorizontal: 32, paddingVertical: 14, alignItems: 'center', gap: 10 },
  unblockFullBtnText: { fontSize: 16, fontFamily: F.bodyBold, color: T.ink },
  unblockBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: T.yellow, borderRadius: 10 },
  unblockBtnText: { fontSize: 16, fontFamily: F.bodyBold, color: T.ink },

  menuBox: {
    backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: T.ink, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  menuHeader: { borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 12, marginBottom: 4 },
  menuHeaderText: { fontSize: 13, color: T.textFaint, fontFamily: F.bodySemi, textAlign: 'center', letterSpacing: 0.5 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  menuIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuBlockCircle: { backgroundColor: T.dangerBg },
  menuUnblockCircle: { backgroundColor: T.successBg },
  menuReportCircle: { backgroundColor: T.dangerBg },
  menuCancelCircle: { backgroundColor: T.sand },
  menuText: { fontSize: 15, color: T.ink, fontFamily: F.bodyMedium, flex: 1 },
  menuBlockText: { color: T.danger },
  menuUnblockText: { color: T.success },
  menuCancelText: { color: T.textFaint, fontFamily: F.body },
  menuDivider: { height: 1, backgroundColor: T.sand, marginVertical: 4 },

  commentModalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" },
  commentSheet: {
    backgroundColor: T.card, height: height * 0.85,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  commentModalHeader: {
    flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 8,
    borderBottomWidth: 1, borderBottomColor: T.line, alignItems: "center",
  },
  commentModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentModalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  commentCountBadge: { backgroundColor: T.sand, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commentCountBadgeText: { fontSize: 12, fontFamily: F.bodySemi, color: T.textMuted },
  commentListContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },

  threadContainer: { marginBottom: 20 },
  parentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarLg: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.sand },
  avatarLgPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarLgText: { fontFamily: F.bodyBold, color: T.ink, fontSize: 14 },
  parentContent: { flex: 1, marginLeft: 10 },
  bubbleLg: { backgroundColor: T.sand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  authorNameLg: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },
  ownBadge: { backgroundColor: T.yellow, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  ownBadgeText: { fontSize: 9, fontFamily: F.bodyBold, color: T.ink },
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
  replyAvatarWrap: { marginRight: 8 },
  avatarSm: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.sand },
  avatarSmPlaceholder: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarSmText: { fontFamily: F.bodyBold, color: T.ink, fontSize: 12 },
  replyContent: { flex: 1 },
  bubbleSm: { backgroundColor: T.sand, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  ownBadgeSmall: { backgroundColor: T.yellow, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  ownBadgeTextSmall: { fontSize: 8, fontFamily: F.bodyBold, color: T.ink },
  authorNameSm: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },
  replyTextContent: { fontSize: 13, fontFamily: F.body, color: T.ink, lineHeight: 18 },
  mentionText: { color: T.ink, fontFamily: F.bodySemi },
  metaRowSm: { flexDirection: 'row', marginTop: 4, marginLeft: 12, alignItems: 'center' },
  metaTextSm: { fontSize: 10, color: T.textMuted, fontFamily: F.bodyMedium },
  replyBtnSm: { fontSize: 11, color: T.ink, fontFamily: F.bodyBold },

  emptyComments: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 20, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 16, fontFamily: F.bodyBold, color: T.textFaint, marginTop: 4 },
  emptySubtext: { fontSize: 13, fontFamily: F.body, color: T.textFaint, marginTop: 2 },

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

  commentInputWrapper: { flexShrink: 0, backgroundColor: T.card },
  commentInputArea: { flexDirection: "row", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: T.line, alignItems: "center", backgroundColor: T.card, gap: 10, paddingBottom: 12 },
  commentInput: { flex: 1, backgroundColor: T.paper, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: F.body, color: T.ink, maxHeight: 100, minHeight: 40 },
  postCommentBtn: { borderRadius: 20, overflow: 'hidden' },
  postCommentBtnGradient: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  postCommentBtnDisabled: { opacity: 0.5 },
});