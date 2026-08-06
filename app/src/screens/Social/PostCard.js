// PostCard.js - Complete Fixed Version with proper status updates

import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  TouchableWithoutFeedback, Dimensions, BackHandler, Animated, Share,
  Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export const PostCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
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
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { width: '90%', height: 12, marginBottom: 8, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, marginBottom: 8, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonImage, { opacity: shimmerOpacity }]} />
      </View>
      <View style={styles.skeletonFooter}>
        <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
      </View>
    </View>
  );
};

export default function PostCard({ post }) {
  const { user, token, setUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  const [likes, setLikes] = useState(() => {
    if (Array.isArray(post.likes)) return post.likes;
    if (post.likes && typeof post.likes === 'object') return Object.values(post.likes);
    return [];
  });
  
  const [favorites, setFavorites] = useState(() => {
    if (Array.isArray(post.favorites)) return post.favorites;
    return [];
  });
  
  const [commentsList, setCommentsList] = useState(() => {
    if (Array.isArray(post.comments)) return post.comments;
    return [];
  });
  
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0) || 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [textLines, setTextLines] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // FIXED: Comprehensive connection status handling
  const [connectionStatus, setConnectionStatus] = useState(() => {
    const userId = user?._id;
    const authorId = post.author?._id;
    
    // Check if this is the current user's own post
    if (userId && authorId && userId === authorId) {
      return 'self';
    }
    
    // Check from post.author fields first
    if (post.author?.connectionStatus) {
      return post.author.connectionStatus;
    }
    
    // Check from user context for sent requests
    if (userId && user?.sentRequests?.includes(authorId)) {
      return 'pending';
    }
    
    // Check from user context for received requests
    if (userId && user?.receivedRequests?.includes(authorId)) {
      return 'received';
    }
    
    // Check from post.author flags
    if (post.author?.isConnected) return 'connected';
    if (post.author?.isPending) return 'pending';
    if (post.author?.isReceived) return 'received';
    
    return 'none';
  });

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const commentSlide = useRef(new Animated.Value(300)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Animated.timing(cardFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showComments) { 
        setShowComments(false); 
        setReplyTo(null);
        setReplyingToComment(null);
        Keyboard.dismiss();
        return true; 
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [showComments]);

  useEffect(() => {
    if (showComments) {
      commentSlide.setValue(300);
      Animated.spring(commentSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    }
  }, [showComments]);

  useEffect(() => {
    if (showMenu) {
      menuSlide.setValue(200);
      Animated.spring(menuSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    }
  }, [showMenu]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Update local status when user context changes
  useEffect(() => {
    const userId = user?._id;
    const authorId = post.author?._id;
    
    if (!userId || !authorId || userId === authorId) {
      setConnectionStatus('self');
      return;
    }
    
    // Check from user context for sent requests
    if (user?.sentRequests?.includes(authorId)) {
      setConnectionStatus('pending');
      return;
    }
    
    // Check from user context for received requests
    if (user?.receivedRequests?.includes(authorId)) {
      setConnectionStatus('received');
      return;
    }
    
    // Check from post.author
    if (post.author?.connectionStatus) {
      setConnectionStatus(post.author.connectionStatus);
    } else if (post.author?.isConnected) {
      setConnectionStatus('connected');
    } else if (post.author?.isPending) {
      setConnectionStatus('pending');
    } else if (post.author?.isReceived) {
      setConnectionStatus('received');
    } else {
      setConnectionStatus('none');
    }
  }, [user, post.author]);

  useEffect(() => {
    if (post.likes) {
      const likesArray = Array.isArray(post.likes) ? post.likes : Object.values(post.likes);
      setLikes(likesArray);
      setLikeCount(post.likeCount || likesArray.length);
    }
    if (post.favorites) {
      setFavorites(Array.isArray(post.favorites) ? post.favorites : []);
    }
    if (post.comments) {
      setCommentsList(Array.isArray(post.comments) ? post.comments : []);
    }
  }, [post.likes, post.favorites, post.comments]);

  const formatPostTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (year === now.getFullYear()) return `${month} ${day < 10 ? '0' + day : day}`;
    return `${month} ${day}, ${year}`;
  };

  const userId = user?._id;
  const isLoggedIn = !!userId && !!token;

  const isLiked = isLoggedIn && Array.isArray(likes) && likes.some(id => id?.toString() === userId?.toString());
  const isSaved = isLoggedIn && Array.isArray(favorites) && favorites.some(id => id?.toString() === userId?.toString());
  const isOwnPost = isLoggedIn && post.author?._id === userId;
  
  // FIXED: Show connect button logic with all statuses
  const showConnectButton = isLoggedIn && 
    !isOwnPost && 
    connectionStatus !== 'connected' && 
    connectionStatus !== 'pending' && 
    connectionStatus !== 'received' && 
    connectionStatus !== 'self';

  // FIXED: Get status display text
  const getStatusDisplay = () => {
    if (isOwnPost) return null;
    if (connectionStatus === 'connected') return { text: 'Connected', color: '#f9c349' };
    if (connectionStatus === 'pending') return { text: 'Request Sent', color: '#f9c349' };
    if (connectionStatus === 'received') return { text: 'Request Received', color: '#4CAF50' };
    return null;
  };

  const statusDisplay = getStatusDisplay();

  const handleLike = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In", "Please sign in to like posts");
      return;
    }
    
    const wasLiked = isLiked;
    const currentLikes = [...likes];
    const uid = userId;

    if (wasLiked) {
      setLikes(prev => prev.filter(id => id?.toString() !== uid?.toString()));
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setLikes(prev => [...prev, uid]);
      setLikeCount(prev => prev + 1);
    }

    if (!wasLiked) {
      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    try {
      const res = await axios.put(`${API_URL}/posts/like/${post._id}`, {}, config);
      if (res.data.success) {
        const serverLikes = Array.isArray(res.data.likes) ? res.data.likes : [];
        setLikes(serverLikes);
        setLikeCount(res.data.likes?.length || serverLikes.length);
      }
    } catch (err) {
      setLikes(currentLikes);
      setLikeCount(currentLikes.length);
    }
  };

  const handleSave = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In", "Please sign in to save posts");
      return;
    }
    
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      const res = await axios.post(`${API_URL}/posts/favorite/${post._id}`, {}, config);
      if (res.data.success) {
        const favs = Array.isArray(res.data.favorites) ? res.data.favorites : [];
        setFavorites(favs);
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
        message: `${post.content || 'Check out this post on TDC!'}\n\nShared from TDC App` 
      });
    } catch (err) {}
  };

  const handleComment = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In", "Please sign in to comment");
      return;
    }
    
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { 
        text: commentText,
        parentCommentId: replyingToComment?._id || null
      };
      const res = await axios.post(`${API_URL}/posts/comment/${post._id}`, payload, config);
      if (res.data.success && res.data.comments) {
        setCommentsList(res.data.comments);
        setCommentText("");
        setReplyTo(null);
        setReplyingToComment(null);
        Keyboard.dismiss();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      }
    } catch (err) { 
      Alert.alert("Error", err.response?.data?.message || "Comment failed to post."); 
    }
    finally { setIsSubmitting(false); }
  };

  // FIXED: Handle Connect with proper status update
  const handleConnect = async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In", "Please sign in to connect");
      return;
    }
    
    if (isConnecting) return;
    setIsConnecting(true);
    
    try {
      const res = await axios.post(`${API_URL}/user/connect/${post.author._id}`, {}, config);
      if (res.data.success) {
        // Update local state immediately
        setConnectionStatus('pending');
        
        // Update user context with new sent request
        if (setUser && user) {
          const updatedSentRequests = [...(user.sentRequests || []), post.author._id];
          setUser({ 
            ...user, 
            sentRequests: updatedSentRequests 
          });
        }
        
        Alert.alert("Success", "Connection request sent!");
      }
    } catch (err) { 
      // Check for different error scenarios
      if (err.response?.data?.error) {
        const errorMsg = err.response.data.error;
        if (errorMsg === "Already connected" || errorMsg.includes("already connected")) {
          setConnectionStatus('connected');
          Alert.alert("Info", "You are already connected with this user");
        } else if (errorMsg === "Request already sent" || errorMsg.includes("already sent")) {
          setConnectionStatus('pending');
          Alert.alert("Info", "Connection request already sent");
        } else if (errorMsg === "Request already received" || errorMsg.includes("already received")) {
          setConnectionStatus('received');
          Alert.alert("Info", "You have a pending request from this user");
        } else {
          Alert.alert("Error", errorMsg || "Could not send request");
        }
      } else {
        Alert.alert("Error", "Could not send request. Please try again.");
      }
    }
    finally { setIsConnecting(false); }
  };

  // FIXED: Handle Accept Connection Request
  const handleAcceptRequest = async () => {
    if (!isLoggedIn) return;
    setIsConnecting(true);
    
    try {
      const res = await axios.post(`${API_URL}/user/accept/${post.author._id}`, {}, config);
      if (res.data.success) {
        setConnectionStatus('connected');
        
        // Update user context
        if (setUser && user) {
          // Remove from received requests and add to connections
          const updatedReceivedRequests = (user.receivedRequests || []).filter(id => id !== post.author._id);
          const updatedConnections = [...(user.connections || []), post.author._id];
          setUser({
            ...user,
            receivedRequests: updatedReceivedRequests,
            connections: updatedConnections
          });
        }
        Alert.alert("Success", "Connected successfully!");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not accept request");
    }
    finally { setIsConnecting(false); }
  };

  const onReplyPress = (comment, userToReply) => {
    setReplyingToComment(comment);
    setReplyTo(userToReply);
    setCommentText(`@${userToReply.name?.split(' ')[0]?.toLowerCase() || 'user'} `);
    setExpandedReplies(prev => ({ ...prev, [comment._id]: true }));
    setTimeout(() => {
      inputRef.current?.focus();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }, 100);
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const navigateToProfile = (userId) => {
    setShowComments(false);
    navigation.navigate("UserProfile", { userId });
  };

  const toggleTextExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const hasReplies = (comment) => {
    return comment.replies && comment.replies.length > 0;
  };

  const getReplies = (comment) => {
    return comment.replies || [];
  };

  const renderComment = ({ item }) => {
    const replies = getReplies(item);
    const isExpandedReplies = expandedReplies[item._id] || false;
    const hasRepliesCount = replies.length > 0;

    return (
      <View style={styles.commentContainer}>
        <View style={styles.commentItem}>
          <TouchableOpacity onPress={() => navigateToProfile(item.user?._id)}>
            {item.user?.profileImage ? (
              <Image source={{ uri: item.user.profileImage }} style={styles.commentAvatar} />
            ) : (
              <View style={styles.commentAvatarPlaceholder}>
                <Text style={styles.commentAvatarText}>{item.user?.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.commentContentWrapper}>
            <View style={styles.commentBubble}>
              <Text style={styles.commentUser}>{item.user?.name || "User"}</Text>
              <Text style={styles.commentTextContent}>{item.text}</Text>
            </View>
            <View style={styles.commentActionRow}>
              <Text style={styles.commentDate}>{formatPostTime(item.createdAt) || "Now"}</Text>
              {isLoggedIn && (
                <TouchableOpacity onPress={() => onReplyPress(item, item.user)}>
                  <Text style={styles.replyText}>Reply</Text>
                </TouchableOpacity>
              )}
              {hasRepliesCount && (
                <TouchableOpacity onPress={() => toggleReplies(item._id)}>
                  <Text style={styles.replyText}>
                    {isExpandedReplies ? 'Hide' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {hasRepliesCount && isExpandedReplies && (
          <View style={styles.repliesContainer}>
            <View style={styles.replyLine} />
            <View style={styles.repliesList}>
              {replies.map((reply, index) => (
                <View key={index} style={styles.replyItem}>
                  <TouchableOpacity onPress={() => navigateToProfile(reply.user?._id)}>
                    {reply.user?.profileImage ? (
                      <Image source={{ uri: reply.user.profileImage }} style={styles.replyAvatar} />
                    ) : (
                      <View style={styles.replyAvatarPlaceholder}>
                        <Text style={styles.replyAvatarText}>{reply.user?.name?.charAt(0)?.toUpperCase()}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.replyContentWrapper}>
                    <View style={styles.replyBubble}>
                      <Text style={styles.replyUser}>{reply.user?.name || "User"}</Text>
                      <Text style={styles.replyTextContent}>{reply.text}</Text>
                    </View>
                    <View style={styles.replyActionRow}>
                      <Text style={styles.replyDate}>{formatPostTime(reply.createdAt) || "Now"}</Text>
                      {isLoggedIn && (
                        <TouchableOpacity onPress={() => onReplyPress(item, reply.user)}>
                          <Text style={styles.replyText}>Reply</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.card, { opacity: cardFade }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.userInfo} onPress={() => navigateToProfile(post.author?._id)} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            {post.author?.profileImage ? (
              <Image source={{ uri: post.author.profileImage }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={['#2d2d2d', '#1a1a1a']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{post.author?.name?.charAt(0)?.toUpperCase()}</Text>
              </LinearGradient>
            )}
            {/* FIXED: Show appropriate badge based on status */}
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
              <TouchableOpacity 
                style={styles.plusBadge} 
                onPress={handleConnect} 
                disabled={isConnecting}
              >
                <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.plusBadgeGradient}>
                  {isConnecting ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="add" size={14} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.userMeta}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{post.author?.name || "TDC User"}</Text>
              {/* FIXED: Show status badge with correct text */}
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
            <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {post.content && (
          <TouchableOpacity onPress={toggleTextExpansion} activeOpacity={0.9}>
            <Text 
              style={styles.postText} 
              numberOfLines={isExpanded ? undefined : 10}
              onTextLayout={(e) => {
                const lineCount = e.nativeEvent.lines.length;
                if (lineCount > 10) {
                  setTextLines(lineCount);
                }
              }}
            >
              {post.content}
            </Text>
            {textLines > 10 && (
              <Text style={styles.showMoreText}>
                {isExpanded ? "Show less" : "Show more"}
              </Text>
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
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.imageGradient}
            />
          </View>
        )}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={[styles.actionBtn, isLiked && styles.actionBtnActive]} onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#f9c349" : "#666"} />
            </Animated.View>
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>{likeCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionCount}>{commentsList.length}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        {isLoggedIn && (
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={[styles.saveBtn, isSaved && styles.saveBtnActive]}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#f9c349" : "#666"} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Comments Modal */}
      <Modal 
        visible={showComments} 
        animationType="fade" 
        transparent 
        onRequestClose={() => {
          setShowComments(false);
          Keyboard.dismiss();
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowComments(false);
          Keyboard.dismiss();
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.commentSheet, { transform: [{ translateY: commentSlide }] }]}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="chatbubbles" size={20} color="#f9c349" />
                    <Text style={styles.modalTitle}>Comments</Text>
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountBadgeText}>{commentsList.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => {
                    setShowComments(false);
                    Keyboard.dismiss();
                  }} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.commentSheetContent, { flex: 1 }]}>
                  <FlatList
                    ref={flatListRef}
                    data={commentsList}
                    keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                    renderItem={renderComment}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                        </View>
                        <Text style={styles.emptyText}>No comments yet</Text>
                        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                      </View>
                    }
                    contentContainerStyle={styles.commentListContent}
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
                  style={styles.keyboardAvoidingView}
                >
                  <View style={[
                    styles.commentInputWrapper,
                    keyboardHeight > 0 && { paddingBottom: Platform.OS === 'ios' ? 0 : keyboardHeight }
                  ]}>
                    {replyTo && (
                      <View style={styles.replyNotifier}>
                        <Text style={styles.replyNotifierText}>
                          Replying to <Text style={{fontWeight: '700', color: '#f9c349'}}>{replyTo.name}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => {
                          setReplyTo(null);
                          setReplyingToComment(null);
                          setCommentText("");
                          Keyboard.dismiss();
                        }}>
                          <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={styles.inputArea}>
                      <TextInput 
                        ref={inputRef}
                        style={styles.commentInput} 
                        placeholder={isLoggedIn ? "Write a comment..." : "Sign in to comment"} 
                        placeholderTextColor="#999"
                        value={commentText} 
                        onChangeText={setCommentText}
                        multiline
                        maxHeight={100}
                        returnKeyType="send"
                        onSubmitEditing={handleComment}
                        editable={isLoggedIn}
                      />
                      {isLoggedIn && (
                        <TouchableOpacity 
                          onPress={handleComment} 
                          disabled={isSubmitting || !commentText.trim()}
                          style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                        >
                          <LinearGradient
                            colors={commentText.trim() ? ['#f9c349', '#e6b800'] : ['#ccc', '#ddd']}
                            style={styles.postBtnGradient}
                          >
                            {isSubmitting ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Ionicons name="send" size={18} color="#fff" />
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.menuBox, { transform: [{ translateY: menuSlide }] }]}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderText}>Options</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={handleSave}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#f9c349" : "#1a1a1a"} />
                </View>
                <Text style={styles.menuText}>{isSaved ? "Remove from Saved" : "Save Post"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name="share-social-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.menuText}>Share Post</Text>
              </TouchableOpacity>
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
    </Animated.View>
  );
}

// Styles remain the same
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
    marginTop: 10
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
  skeletonContent: { marginTop: 4 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  skeletonImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#e8e8e8', marginTop: 12 },
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
  menuBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { paddingHorizontal: 16, marginTop: 10 },
  postText: { fontSize: 15, color: "#1a1a1a", lineHeight: 22, fontWeight: '400' },
  showMoreText: { fontSize: 14, color: '#f9c349', fontWeight: '700', marginTop: 4, paddingVertical: 4 },
  imageContainer: { marginTop: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f8f8f8', position: 'relative' },
  imageLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  postImage: { width: "100%", height: 280, borderRadius: 14 },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  actionBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  leftActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, gap: 5 },
  actionBtnActive: { backgroundColor: '#fef9f0' },
  actionCount: { fontSize: 13, color: "#666", fontWeight: "600" },
  actionCountActive: { color: "#f9c349" },
  saveBtn: { padding: 6, borderRadius: 20 },
  saveBtnActive: { backgroundColor: '#fef9f0' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  commentSheet: { 
    backgroundColor: "#fff", 
    height: height * 0.75, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  commentSheetContent: { flex: 1 },
  keyboardAvoidingView: { flexShrink: 0 },
  commentInputWrapper: { flexShrink: 0, backgroundColor: '#fff' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  commentCountBadge: { backgroundColor: '#f8f8f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  commentCountBadgeText: { fontSize: 12, fontWeight: "600", color: '#666' },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  commentListContent: { padding: 16, flexGrow: 1 },
  commentContainer: { marginBottom: 4 },
  commentItem: { flexDirection: "row", marginBottom: 8 },
  commentAvatar: { width: 36, height: 36, borderRadius: 12 },
  commentAvatarPlaceholder: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f8f8f8", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: '#f0f0f0' },
  commentAvatarText: { fontWeight: "700", color: "#f9c349", fontSize: 14 },
  commentContentWrapper: { flex: 1, marginLeft: 10 },
  commentBubble: { backgroundColor: "#f8f9fa", padding: 12, borderRadius: 14, borderTopLeftRadius: 4 },
  commentUser: { fontWeight: "600", fontSize: 13, marginBottom: 2, color: '#1a1a1a' },
  commentTextContent: { fontSize: 14, color: "#444", lineHeight: 20 },
  commentActionRow: { flexDirection: 'row', marginTop: 4, marginLeft: 6, gap: 12 },
  commentDate: { fontSize: 11, color: '#999', fontWeight: '500' },
  replyText: { fontSize: 11, color: '#f9c349', fontWeight: '600' },
  repliesContainer: { flexDirection: 'row', marginLeft: 16, marginBottom: 8 },
  replyLine: { width: 2, backgroundColor: '#e8e8e8', marginRight: 12, marginTop: 4 },
  repliesList: { flex: 1 },
  replyItem: { flexDirection: "row", marginBottom: 8 },
  replyAvatar: { width: 30, height: 30, borderRadius: 10 },
  replyAvatarPlaceholder: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#f8f8f8", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: '#f0f0f0' },
  replyAvatarText: { fontWeight: "700", color: "#f9c349", fontSize: 12 },
  replyContentWrapper: { flex: 1, marginLeft: 8 },
  replyBubble: { backgroundColor: "#f0f2f5", padding: 10, borderRadius: 12, borderTopLeftRadius: 4 },
  replyUser: { fontWeight: "600", fontSize: 12, marginBottom: 2, color: '#1a1a1a' },
  replyTextContent: { fontSize: 13, color: "#444", lineHeight: 18 },
  replyActionRow: { flexDirection: 'row', marginTop: 3, marginLeft: 4, gap: 12 },
  replyDate: { fontSize: 10, color: '#999', fontWeight: '500' },
  emptyComments: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 4 },
  emptySubtext: { fontSize: 13, color: '#ccc', marginTop: 2 },
  replyNotifier: { backgroundColor: '#f8f8f8', padding: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  replyNotifierText: { fontSize: 12, color: '#666' },
  inputArea: { flexDirection: "row", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0", alignItems: "center", backgroundColor: "#fff", gap: 10, paddingBottom: 12 },
  commentInput: { flex: 1, backgroundColor: "#f8f9fa", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', maxHeight: 100, minHeight: 40 },
  postBtn: { borderRadius: 20, overflow: 'hidden' },
  postBtnGradient: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  postBtnDisabled: { opacity: 0.5 },
  menuBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  menuHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 12, marginBottom: 8 },
  menuHeaderText: { fontSize: 13, color: '#999', fontWeight: '600', textAlign: 'center' },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  menuIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuCancelCircle: { backgroundColor: '#f8f8f8' },
  menuText: { fontSize: 15, color: "#1a1a1a", fontWeight: '500' },
  menuCancelText: { color: '#999' },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
});