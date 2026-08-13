// UserProfile.js - COMPLETE FIXED VERSION with Block/Report Status and Like Fix

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  FlatList, Dimensions, Platform, StatusBar,
  ActivityIndicator, Alert, Share, BackHandler, RefreshControl,
  Modal, Animated, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";
import { TouchableWithoutFeedback } from 'react-native';

const { width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// Skeleton Component
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

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
            <Animated.View style={[styles.skeletonLine, { width: 180, height: 22, opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: 220, height: 14, marginTop: 6, opacity }]} />
            <Animated.View style={[styles.skeletonBio, { opacity }]} />
            <Animated.View style={[styles.skeletonStats, { opacity }]} />
            <Animated.View style={[styles.skeletonBtn, { opacity }]} />
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
            <Animated.View style={[styles.skeletonLine, { width: 120, height: 14, opacity }]} />
          </View>
          <Animated.View style={[styles.skeletonLine, { width: '90%', height: 12, marginTop: 8, opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, marginTop: 6, opacity }]} />
        </View>
      ))}
    </SafeAreaView>
  );
};

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;

  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetId = userId || currentUser?._id;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ============ EFFECTS ============
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (showMenu) {
      menuSlide.setValue(200);
      Animated.spring(menuSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    }
  }, [showMenu]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (navigation.canGoBack()) { navigation.goBack(); return true; }
        return false;
      });
      return () => subscription.remove();
    }, [targetId])
  );

  // ============ CHECK BLOCK STATUS ============
  const checkBlockStatus = useCallback(async () => {
    try {
      const blockedRes = await axios.get(`${API_URL}/user/blocked`, config);
      const blockedUsers = blockedRes.data.blockedUsers || [];
      const isBlocked = blockedUsers.some(b => b._id === targetId);
      setIsBlocked(isBlocked);
      if (isBlocked) {
        setBlockStatus('blocked');
      }
      return isBlocked;
    } catch (err) {
      console.error("Check block status error:", err);
      return false;
    }
  }, [targetId, config]);

  // ============ FETCH PROFILE ============
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const isBlockedByCurrentUser = await checkBlockStatus();
      
      if (isBlockedByCurrentUser) {
        setLoading(false);
        return;
      }
      
      const res = await axios.get(`${API_URL}/profile/${targetId}`, config);
      
      if (res.data.isBlockedByUser) {
        setIsBlockedByUser(true);
        setBlockStatus('blocked_by_user');
        setLoading(false);
        return;
      }
      
      setProfileData(res.data.profile);
      
      // FIX: Ensure posts have proper likes array
      const posts = (res.data.posts || []).map(post => ({
        ...post,
        likes: Array.isArray(post.likes) ? post.likes : [],
        comments: Array.isArray(post.comments) ? post.comments : [],
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0
      }));
      
      setUserPosts(posts);
      setConnections(res.data.connections || []);

      const states = checkConnectionStates(targetId);
      setIsConnected(states.isConnected);
      setIsPending(states.isPending);
      setIsReceived(states.isReceived);
      setIsBlocked(false);
      setBlockStatus('none');
      
    } catch (err) { 
      console.error("Fetch profile error:", err);
      
      if (err.response?.data?.isBlocked) {
        setIsBlocked(true);
        setBlockStatus('blocked');
        Alert.alert("Blocked", "You have blocked this user");
      } else if (err.response?.data?.error?.includes('blocked')) {
        setIsBlockedByUser(true);
        setBlockStatus('blocked_by_user');
        Alert.alert("Blocked", "You have been blocked by this user");
      } else {
        Alert.alert("Error", "Failed to load profile");
      }
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  // ============ CHECK CONNECTION STATES ============
  const checkConnectionStates = useCallback((targetUserId) => {
    if (!currentUser) return { isConnected: false, isPending: false, isReceived: false };
    if (targetUserId === currentUser._id) return { isConnected: true, isPending: false, isReceived: false };

    const isConnected = currentUser.connections?.some(id => id === targetUserId) || false;
    const isPending = currentUser.sentRequests?.some(id => id === targetUserId) || false;
    const isReceived = currentUser.receivedRequests?.some(id => id === targetUserId) || false;

    return { isConnected, isPending, isReceived };
  }, [currentUser]);

  // ============ CONNECTION HANDLERS ============
  const handleAcceptRequest = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const notificationsRes = await axios.get(`${API_URL}/notifications`, config);
      const pendingRequest = notificationsRes.data.find(
        n => n.sender?._id === targetId && 
             n.type === 'request' && 
             n.status === 'pending' && 
             !n.isProcessed
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
        
        if (currentUser && setUser) {
          const updatedUser = {
            ...currentUser,
            connections: [...(currentUser.connections || []), targetId],
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetId),
            sentRequests: (currentUser.sentRequests || []).filter(id => id !== targetId)
          };
          setUser(updatedUser);
        }
        await fetchProfile();
      }
    } catch (err) {
      console.error("Accept request error:", err);
      
      try {
        const directResponse = await axios.post(`${API_URL}/user/accept/${targetId}`, {}, config);
        if (directResponse.data.success) {
          Alert.alert("Success", "Connection request accepted!");
          setIsConnected(true);
          setIsReceived(false);
          setIsPending(false);
          
          if (currentUser && setUser) {
            const updatedUser = {
              ...currentUser,
              connections: [...(currentUser.connections || []), targetId],
              receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetId),
              sentRequests: (currentUser.sentRequests || []).filter(id => id !== targetId)
            };
            setUser(updatedUser);
          }
          await fetchProfile();
          return;
        }
      } catch (fallbackErr) {
        console.error("Fallback accept error:", fallbackErr);
      }
      
      Alert.alert("Error", err.response?.data?.error || "Failed to accept request");
    }
    finally { setIsActionLoading(false); }
  };

  const handleRejectRequest = async () => {
    Alert.alert("Decline Request", "Are you sure you want to decline this connection request?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Decline", 
        style: "destructive",
        onPress: async () => {
          if (isActionLoading) return;
          setIsActionLoading(true);
          try {
            const notificationsRes = await axios.get(`${API_URL}/notifications`, config);
            const pendingRequest = notificationsRes.data.find(
              n => n.sender?._id === targetId && 
                   n.type === 'request' && 
                   n.status === 'pending' && 
                   !n.isProcessed
            );

            if (pendingRequest) {
              await axios.post(`${API_URL}/notifications/respond`, {
                notificationId: pendingRequest._id,
                action: 'declined'
              }, config);
            } else {
              await axios.post(`${API_URL}/user/reject/${targetId}`, {}, config);
            }
            
            setIsReceived(false);
            
            if (currentUser && setUser) {
              const updatedUser = {
                ...currentUser,
                receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetId)
              };
              setUser(updatedUser);
            }
            await fetchProfile();
            Alert.alert("Request declined");
          } catch (err) {
            console.error("Reject request error:", err);
            Alert.alert("Error", "Failed to decline request");
          }
          finally { setIsActionLoading(false); }
        }
      }
    ]);
  };

  const handleCancelRequest = async () => {
    Alert.alert("Cancel Request", "Are you sure you want to cancel your connection request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes", 
        style: "destructive",
        onPress: async () => {
          if (isActionLoading) return;
          setIsActionLoading(true);
          try {
            await axios.post(`${API_URL}/user/cancel-request/${targetId}`, {}, config);
            setIsPending(false);
            
            if (currentUser && setUser) {
              const updatedUser = {
                ...currentUser,
                sentRequests: (currentUser.sentRequests || []).filter(id => id !== targetId)
              };
              setUser(updatedUser);
            }
            await fetchProfile();
            Alert.alert("Request cancelled");
          } catch (err) {
            console.error("Cancel request error:", err);
            Alert.alert("Error", "Failed to cancel request");
          }
          finally { setIsActionLoading(false); }
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
        
        if (currentUser && setUser) {
          const updatedSentRequests = [...(currentUser.sentRequests || []), targetId];
          const updatedUser = {
            ...currentUser,
            sentRequests: updatedSentRequests
          };
          setUser(updatedUser);
        }
        await fetchProfile();
      }
    } catch (err) { 
      console.error("Connect error:", err);
      const errorMsg = err.response?.data?.error || err.message || "";
      
      if (errorMsg.includes("Already connected") || errorMsg.includes("already connected")) {
        setIsConnected(true);
        setIsPending(false);
        setIsReceived(false);
        
        if (currentUser && setUser) {
          const updatedUser = {
            ...currentUser,
            connections: [...(currentUser.connections || []), targetId],
            sentRequests: (currentUser.sentRequests || []).filter(id => id !== targetId),
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetId)
          };
          setUser(updatedUser);
        }
        Alert.alert("Info", "You are already connected with this user");
      } else if (errorMsg.includes("Request already sent")) {
        setIsPending(true);
        Alert.alert("Info", "Connection request already sent");
      } else if (errorMsg.includes("Request already received")) {
        setIsReceived(true);
        Alert.alert("Info", "You have a pending request from this user");
      } else {
        Alert.alert("Error", errorMsg || "Failed to send connection request");
      }
    }
    finally { setIsActionLoading(false); }
  };

  const handleDisconnect = async () => {
    Alert.alert("Remove Connection", `Remove ${profileData?.name} from your connections?`, [
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
            
            if (currentUser && setUser) {
              const updatedUser = {
                ...currentUser,
                connections: (currentUser.connections || []).filter(id => id !== targetId),
                sentRequests: (currentUser.sentRequests || []).filter(id => id !== targetId),
                receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetId)
              };
              setUser(updatedUser);
            }
            await fetchProfile(); 
          }
          catch (err) { 
            console.error("Disconnect error:", err);
            Alert.alert("Error", "Failed to remove connection"); 
          }
          finally { setIsActionLoading(false); }
        }
      }
    ]);
  };

  // ============ BLOCK USER HANDLER ============
  const handleBlockUser = () => {
    setShowMenu(false);
    if (isOwnProfile) {
      Alert.alert("Info", "You cannot block yourself");
      return;
    }
    
    if (isBlocked) {
      Alert.alert(
        "Unblock User",
        `Do you want to unblock ${profileData?.name || 'this user'}? They will be able to interact with you again.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Unblock", 
            onPress: handleUnblockUser
          }
        ]
      );
      return;
    }
    
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${profileData?.name || 'this user'}? They won't be able to interact with you.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive",
          onPress: performBlock
        }
      ]
    );
  };

  const performBlock = async () => {
    try {
      const res = await axios.post(`${API_URL}/user/block/${targetId}`, {}, config);
      if (res.data.success) {
        setIsBlocked(true);
        setBlockStatus('blocked');
        Alert.alert(
          "Blocked", 
          `You have blocked ${profileData?.name || 'this user'}. Their content will be hidden.`,
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error("Block error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not block user. Please try again.");
    }
  };

  const handleUnblockUser = async () => {
    try {
      const res = await axios.post(`${API_URL}/user/unblock/${targetId}`, {}, config);
      if (res.data.success) {
        setIsBlocked(false);
        setBlockStatus('none');
        Alert.alert("Unblocked", `You have unblocked ${profileData?.name || 'this user'}`);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Unblock error:", err);
      Alert.alert("Error", "Could not unblock user. Please try again.");
    }
  };

  // ============ REPORT USER HANDLER ============
  const handleReportUser = () => {
    setShowMenu(false);
    if (isOwnProfile) {
      Alert.alert("Info", "You cannot report yourself");
      return;
    }
    
    if (isBlocked) {
      Alert.alert("Info", "You have blocked this user. Unblock them first to report.");
      return;
    }
    
    Alert.alert(
      "Report Account",
      `Why do you want to report ${profileData?.name || 'this user'}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Spam",
          onPress: () => submitReport("Spam")
        },
        {
          text: "Harassment",
          onPress: () => submitReport("Harassment")
        },
        {
          text: "Hate Speech",
          onPress: () => submitReport("Hate Speech")
        },
        {
          text: "Inappropriate Content",
          onPress: () => submitReport("Inappropriate Content")
        },
        {
          text: "Fake Account",
          onPress: () => submitReport("Fake Account")
        },
        {
          text: "Other",
          onPress: () => submitReport("Other")
        }
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      const res = await axios.post(`${API_URL}/user/report/${targetId}`, { reason }, config);
      if (res.data.success) {
        Alert.alert(
          "Report Submitted", 
          "Thank you for your report. Our moderation team will review it within 24 hours."
        );
      }
    } catch (err) {
      console.error("Report error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not submit report. Please try again.");
    }
  };

  // ============ SHARE PROFILE ============
  const handleShareProfile = async () => {
    setShowMenu(false);
    try {
      await Share.share({ 
        message: `Check out ${profileData?.name}'s profile on TDC!\n\nJoin TDC app to connect with us!` 
      });
    } catch (error) { 
      console.error("Share error:", error);
    }
  };

  // ============ MESSAGE HANDLER ============
  const handleMessagePress = async () => {
    if (isBlocked) {
      Alert.alert("Blocked", "You have blocked this user. Unblock to send a message.");
      return;
    }
    
    if (!isConnected && !isOwnProfile) { 
      Alert.alert("Not Connected", "You need to be connected to send a message."); 
      return; 
    }
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/conversations/get-or-create`, { recipientId: targetId }, config);
      if (res.data.conversationId) {
        navigation.navigate('ChatDetailScreen', { 
          conversationId: res.data.conversationId, 
          recipient: profileData 
        });
      }
    } catch (err) { 
      console.error("Message error:", err);
      Alert.alert("Error", "Could not initiate chat."); 
    }
    finally { setIsActionLoading(false); }
  };

  // ============ VIEW CONNECTIONS ============
  const handleViewConnections = async () => {
    if (isBlocked) return;
    
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await axios.get(`${API_URL}/user/connections/${targetId}`, config);
      setConnectionsList(res.data.connections || []);
      setShowConnectionsModal(true);
    } catch (err) { 
      console.error("View connections error:", err);
      Alert.alert("Error", "Failed to load connections"); 
    }
    finally { setIsActionLoading(false); }
  };

  // ============ POST HANDLERS - FIXED ============
  const handleLikePost = async (postId, index) => {
    if (isBlocked) return;
    if (likingItems[postId]) return;
    
    setLikingItems(prev => ({ ...prev, [postId]: true }));
    
    const currentPost = userPosts[index];
    if (!currentPost) return;
    
    // Ensure likes is an array
    const currentLikes = Array.isArray(currentPost.likes) ? currentPost.likes : [];
    const wasLiked = currentLikes.some(like => {
      const likeId = like._id || like;
      return likeId === currentUser._id;
    });
    
    // Update local state optimistically
    const updatedPosts = [...userPosts];
    if (wasLiked) {
      updatedPosts[index] = {
        ...updatedPosts[index],
        likes: currentLikes.filter(l => {
          const likeId = l._id || l;
          return likeId !== currentUser._id;
        }),
        likeCount: Math.max(0, (updatedPosts[index].likeCount || currentLikes.length) - 1)
      };
    } else {
      updatedPosts[index] = {
        ...updatedPosts[index],
        likes: [...currentLikes, currentUser._id],
        likeCount: (updatedPosts[index].likeCount || currentLikes.length) + 1
      };
    }
    setUserPosts(updatedPosts);

    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      if (response.data.success) {
        const serverLikes = Array.isArray(response.data.likes) ? response.data.likes : [];
        const finalPosts = [...userPosts];
        finalPosts[index] = {
          ...finalPosts[index],
          likes: serverLikes,
          likeCount: serverLikes.length
        };
        setUserPosts(finalPosts);
      }
    } catch (error) { 
      console.error("Like post error:", error);
      // Revert on error
      fetchProfile();
    }
    finally { 
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
            console.error("Delete post error:", error);
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
    if (profileData?.connections) {
      return profileData.connections.length || 0;
    }
    return connections.length || 0;
  };

  const formatJoinedDate = (dateString) => {
    if (!dateString) return "Member";
    const date = new Date(dateString);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `Joined ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // ==================== RENDER BUTTON ====================
  const renderButton = () => {
    if (isBlocked) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.blockedBtn} onPress={handleBlockUser}>
            <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.btnGradient}>
              <Ionicons name="ban-outline" size={16} color="#fff" />
              <Text style={styles.blockedBtnText}>Blocked</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (isActionLoading) {
      return (
        <View style={styles.btnRow}>
          <View style={[styles.connectBtn, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#1a1a1a" />
          </View>
        </View>
      );
    }

    if (isOwnProfile) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.editGradient}>
              <Ionicons name="create-outline" size={16} color="#f9c349" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isConnected) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.connectedBtn} onPress={handleDisconnect}>
            <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.btnGradient}>
              <Ionicons name="checkmark-circle" size={16} color="#1a1a1a" />
              <Text style={styles.connectedBtnText}>Connected</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
            <Ionicons name="chatbubble-outline" size={16} color="#f9c349" />
            <Text style={styles.msgBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isReceived) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRequest}>
            <LinearGradient colors={['#000', '#000']} style={styles.btnGradient}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept Request</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={handleRejectRequest}>
            <Ionicons name="close" size={16} color="#ff3b30" />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isPending) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.pendingBtn} onPress={handleCancelRequest}>
            <LinearGradient colors={['#f0f0f0', '#f0f0f0']} style={styles.btnGradient}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.pendingBtnText}>Request Sent</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.msgBtnDisabled} disabled>
            <Ionicons name="chatbubble-outline" size={16} color="#ccc" />
            <Text style={styles.msgBtnDisabledText}>Message</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
          <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.btnGradient}>
            <Ionicons name="person-add" size={16} color="#1a1a1a" />
            <Text style={styles.connectedBtnText}>Connect</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
          <Ionicons name="chatbubble-outline" size={16} color="#f9c349" />
          <Text style={styles.msgBtnText}>Message</Text>
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
          <Ionicons name="ban-outline" size={60} color="#e74c3c" />
          <Text style={styles.blockedTitle}>User Blocked</Text>
          <Text style={styles.blockedSubtext}>
            You have blocked this user. Their content is not visible.
          </Text>
          <TouchableOpacity style={styles.unblockBtn} onPress={handleBlockUser}>
            <Text style={styles.unblockBtnText}>Unblock User</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContentContainer}>
        {profileData?.bio && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="person-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Bio</Text>
              <Text style={styles.aboutText}>{profileData.bio}</Text>
            </View>
          </View>
        )}

        {profileData?.university?.name && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="school-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>University</Text>
              <View style={styles.universityRow}>
                <Text style={styles.aboutText}>{profileData.university.name}</Text>
                {profileData.university.isVIP && (
                  <View style={styles.vipBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.vipText}>VIP</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {profileData?.location && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="location-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Location</Text>
              <Text style={styles.aboutText}>{profileData.location}</Text>
            </View>
          </View>
        )}

        {profileData?.headline && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="briefcase-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Headline</Text>
              <Text style={styles.aboutText}>{profileData.headline}</Text>
            </View>
          </View>
        )}

        {profileData?.email && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="mail-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Email</Text>
              <Text style={styles.aboutText}>{profileData.email}</Text>
            </View>
          </View>
        )}

        {profileData?.createdAt && (
          <View style={styles.aboutSection}>
            <View style={styles.aboutIcon}>
              <Ionicons name="calendar-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Joined</Text>
              <Text style={styles.aboutText}>{formatJoinedDate(profileData.createdAt)}</Text>
            </View>
          </View>
        )}

        {(!profileData?.bio && !profileData?.university?.name && !profileData?.location && !profileData?.headline && !profileData?.email) && (
          <View style={styles.emptyAbout}>
            <Ionicons name="information-circle-outline" size={50} color="#cfd9de" />
            <Text style={styles.emptyAboutText}>No information available</Text>
          </View>
        )}

        <View style={styles.connectionSummary}>
          <TouchableOpacity 
            style={styles.connectionSummaryItem} 
            onPress={handleViewConnections}
            activeOpacity={0.7}
          >
            <Text style={styles.connectionSummaryNumber}>{connectionsCount}</Text>
            <Text style={styles.connectionSummaryLabel}>Connections</Text>
          </TouchableOpacity>
          <View style={styles.connectionDivider} />
          <View style={styles.connectionSummaryItem}>
            <Text style={styles.connectionSummaryNumber}>{userPosts.length}</Text>
            <Text style={styles.connectionSummaryLabel}>Posts</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============ RENDER POST - FIXED ============
  const renderPost = ({ item, index }) => {
    if (isBlocked) return null;
    
    // FIX: Ensure likes is always an array
    const likesArray = Array.isArray(item.likes) ? item.likes : [];
    const isLiked = likesArray.some(like => {
      const likeId = like._id || like;
      return likeId === currentUser._id;
    });
    const likeCount = item.likeCount || likesArray.length || 0;
    
    const textContent = item.content || '';
    const isExpanded = showFullText[item._id] || false;
    const truncatedText = textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent;

    return (
      <Animated.View style={[styles.postCard, { opacity: fadeAnim }]}>
        <View style={styles.postHeader}>
          {profileData?.profileImage ? (
            <Image source={{ uri: profileData.profileImage }} style={styles.postAvatar} />
          ) : (
            <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.postAvatarPlaceholder}>
              <Text style={styles.postAvatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={styles.postInfo}>
            <Text style={styles.postName}>{profileData?.name}</Text>
          </View>
          <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          {isOwnProfile && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#f9c349" />
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
                <Text style={styles.showMoreText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLikePost(item._id, index)}>
            <Animated.View style={{ transform: [{ scale: isLiked ? likeScale : 1 }] }}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#f9c349" : "#71767b"} />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && { color: "#f9c349" }]}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#71767b" />
            <Text style={styles.actionText}>{Array.isArray(item.comments) ? item.comments.length : 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="repeat-outline" size={18} color="#71767b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={18} color="#71767b" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ============ LOADING STATE ============
  if (loading) return <ProfileSkeleton />;

  // ============ BLOCKED STATE ============
  if (isBlocked) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Blocked User</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.blockedFullContainer}>
          <View style={styles.blockedIconContainer}>
            <Ionicons name="ban-outline" size={80} color="#e74c3c" />
          </View>
          <Text style={styles.blockedFullTitle}>User Blocked</Text>
          <Text style={styles.blockedFullSubtext}>
            You have blocked this user. They cannot interact with you.
          </Text>
          <TouchableOpacity style={styles.unblockFullBtn} onPress={handleUnblockUser}>
            <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.unblockFullGradient}>
              <Ionicons name="person-add" size={20} color="#1a1a1a" />
              <Text style={styles.unblockFullBtnText}>Unblock User</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isBlockedByUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Blocked</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.blockedFullContainer}>
          <View style={styles.blockedIconContainer}>
            <Ionicons name="ban-outline" size={80} color="#e74c3c" />
          </View>
          <Text style={styles.blockedFullTitle}>Account Blocked</Text>
          <Text style={styles.blockedFullSubtext}>
            You have been blocked by this user. You cannot view their profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const connectionCount = getConnectionCount();

  // ============ MAIN RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <FlatList
        data={activeTab === 'Posts' ? userPosts : []}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListEmptyComponent={
          activeTab === 'Posts' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#cfd9de" />
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubText}>When they post, you'll see it here</Text>
            </View>
          ) : activeTab === 'About' ? renderAboutTab() : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>{profileData?.name}</Text>
                <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
                  <Ionicons name="ellipsis-vertical" size={22} color="#1a1a1a" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileContent}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarContainer}>
                    {profileData?.profileImage ? (
                      <Image source={{ uri: profileData.profileImage }} style={styles.avatar} />
                    ) : (
                      <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>

                <Text style={styles.fullName}>{profileData?.name}</Text>
                
                {profileData?.bio && <Text style={styles.bio}>{profileData.bio}</Text>}

                <TouchableOpacity onPress={handleViewConnections} style={styles.connectionTouchable}>
                  <Text style={styles.connectionCount}>
                    <Text style={styles.connectionNum}>{connectionCount}</Text> Connections
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
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                  {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Three-Dot Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.menuBox, { transform: [{ translateY: menuSlide }] }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuHeaderText}>Profile Options</Text>
                </View>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleShareProfile}>
                  <View style={styles.menuIconCircle}>
                    <Ionicons name="share-social-outline" size={20} color="#1a1a1a" />
                  </View>
                  <Text style={styles.menuText}>Share Profile</Text>
                </TouchableOpacity>
                
                {!isOwnProfile && (
                  <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                    <View style={[styles.menuIconCircle, isBlocked ? styles.menuUnblockCircle : styles.menuBlockCircle]}>
                      <Ionicons 
                        name={isBlocked ? "person-add" : "ban-outline"} 
                        size={20} 
                        color={isBlocked ? "#f9c349" : "#e74c3c"} 
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
                      <Ionicons name="flag-outline" size={20} color="#e74c3c" />
                    </View>
                    <Text style={[styles.menuText, styles.menuBlockText]}>Report Account</Text>
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
                <Ionicons name="close" size={22} color="#1a1a1a" />
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
                  <Ionicons name="chevron-forward" size={18} color="#cfd9de" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyConnectionsContainer}>
                  <Ionicons name="people-outline" size={50} color="#cfd9de" />
                  <Text style={styles.emptyConnections}>No connections yet</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  skeletonContainer: { flex: 1, backgroundColor: '#ffffff' },
  skeletonTopNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  skeletonNavBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff3f4' },
  skeletonNavTitle: { width: 100, height: 20, borderRadius: 4, backgroundColor: '#eff3f4' },
  skeletonHeader: { padding: 16 },
  skeletonHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff3f4' },
  skeletonHeaderRight: { flex: 1, marginLeft: 16 },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: '#eff3f4' },
  skeletonBio: { width: '90%', height: 40, borderRadius: 4, backgroundColor: '#eff3f4', marginTop: 8 },
  skeletonStats: { width: '100%', height: 30, borderRadius: 8, backgroundColor: '#eff3f4', marginTop: 12 },
  skeletonBtn: { width: '100%', height: 40, borderRadius: 20, backgroundColor: '#eff3f4', marginTop: 12 },
  skeletonTabs: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#eff3f4', paddingTop: 8 },
  skeletonTab: { flex: 1, height: 32, borderRadius: 16, backgroundColor: '#eff3f4', marginHorizontal: 4 },
  skeletonCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  skeletonCardHeader: { flexDirection: 'row', alignItems: 'center' },
  skeletonCardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff3f4', marginRight: 12 },
  skeletonImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#eff3f4', marginTop: 12 },
  profileHeader: { backgroundColor: '#fff' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1, textAlign: 'center' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileContent: { paddingHorizontal: 16, paddingBottom: 12 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatarContainer: { marginTop: -30 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 8 },
  handle: { fontSize: 15, color: '#71767b', marginTop: 2 },
  bio: { fontSize: 15, color: '#1a1a1a', marginTop: 10, lineHeight: 20 },
  connectionTouchable: { marginTop: 10 },
  connectionCount: { fontSize: 15, color: '#71767b' },
  connectionNum: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  btnRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  editBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  editGradient: { flexDirection: 'row', height: 40, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 20 },
  editBtnText: { color: '#f9c349', fontWeight: '700', fontSize: 14 },
  connectBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  connectedBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', height: 40, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 20 },
  connectedBtnText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  msgBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#eff3f4' },
  msgBtnText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  acceptBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  declineBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2' },
  declineBtnText: { color: '#ff3b30', fontWeight: '700', fontSize: 14 },
  pendingBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  pendingBtnText: { color: '#666', fontWeight: '700', fontSize: 14 },
  msgBtnDisabled: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#f5f5f5' },
  msgBtnDisabledText: { color: '#ccc', fontWeight: '700', fontSize: 14 },
  blockedBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  blockedBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eff3f4' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  activeTab: { position: 'relative' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#71767b' },
  activeTabText: { color: '#1a1a1a', fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: 0, width: 56, height: 4, borderRadius: 2, backgroundColor: '#f9c349' },
  tabContentContainer: { padding: 16 },
  aboutSection: { flexDirection: 'row', marginBottom: 18, alignItems: 'flex-start' },
  aboutIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff3f4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  aboutContent: { flex: 1 },
  aboutLabel: { fontSize: 11, color: '#71767b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  aboutText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22 },
  universityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700' },
  vipText: { fontSize: 10, fontWeight: '700', color: '#FFD700', marginLeft: 2 },
  emptyAbout: { alignItems: 'center', paddingVertical: 40 },
  emptyAboutText: { color: '#71767b', fontSize: 14, marginTop: 10 },
  connectionSummary: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#eff3f4' },
  connectionSummaryItem: { flex: 1, alignItems: 'center' },
  connectionSummaryNumber: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  connectionSummaryLabel: { fontSize: 12, color: '#71767b', marginTop: 2 },
  connectionDivider: { width: 1, backgroundColor: '#eff3f4', marginHorizontal: 8 },
  postCard: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  postAvatarText: { color: '#1a1a1a', fontWeight: '700', fontSize: 18 },
  postInfo: { flex: 1, marginLeft: 10 },
  postName: { fontWeight: '700', fontSize: 15, color: '#1a1a1a' },
  postHandle: { fontSize: 14, color: '#71767b' },
  postDate: { fontSize: 14, color: '#71767b', marginRight: 8 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff3f4', justifyContent: 'center', alignItems: 'center' },
  postText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22, marginBottom: 4 },
  showMoreBtn: { marginTop: 2 },
  showMoreText: { color: '#f9c349', fontSize: 14, fontWeight: '500' },
  postImage: { width: '100%', height: 250, borderRadius: 16, backgroundColor: '#eff3f4', marginTop: 8 },
  postActions: { flexDirection: 'row', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eff3f4', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 4 },
  actionText: { fontSize: 14, color: '#71767b', fontWeight: '400' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#71767b', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: '40%' },
  dragHandle: { width: 36, height: 4, backgroundColor: '#cfd9de', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff3f4', justifyContent: 'center', alignItems: 'center' },
  connectionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  connectionAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  connectionHeadline: { fontSize: 13, color: '#71767b', marginTop: 1 },
  emptyConnectionsContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyConnections: { textAlign: 'center', color: '#71767b', padding: 40 },
  blockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  blockedFullContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  blockedIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fef0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  blockedFullTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  blockedFullSubtext: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  unblockFullBtn: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  unblockFullGradient: { flexDirection: 'row', paddingHorizontal: 32, paddingVertical: 14, alignItems: 'center', gap: 10 },
  unblockFullBtnText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  unblockBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#f9c349', borderRadius: 10 },
  unblockBtnText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
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
  menuHeader: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    paddingBottom: 12, 
    marginBottom: 4,
  },
  menuHeaderText: { 
    fontSize: 13, 
    color: '#999', 
    fontWeight: '600', 
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  menuItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  menuBlockCircle: {
    backgroundColor: '#fef0f0',
  },
  menuUnblockCircle: {
    backgroundColor: '#f0faf0',
  },
  menuReportCircle: {
    backgroundColor: '#fef0f0',
  },
  menuCancelCircle: { 
    backgroundColor: '#f8f8f8' 
  },
  menuText: { 
    fontSize: 15, 
    color: "#1a1a1a", 
    fontWeight: '500',
    flex: 1,
  },
  menuBlockText: {
    color: '#e74c3c',
  },
  menuUnblockText: {
    color: '#2ecc71',
  },
  menuCancelText: { 
    color: '#999',
    fontWeight: '400',
  },
  menuDivider: { 
    height: 1, 
    backgroundColor: '#f0f0f0', 
    marginVertical: 4,
  },
});