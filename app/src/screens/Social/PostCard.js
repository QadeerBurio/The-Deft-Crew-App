import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  TouchableWithoutFeedback, Dimensions, BackHandler, Animated, Share
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
          <View style={{ marginLeft: 12 }}>
            <Animated.View style={[styles.skeletonLine, { width: 120, height: 14, opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: 80, height: 10, marginTop: 4, opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.skeletonLine, { width: '90%', height: 12, marginBottom: 8, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, marginBottom: 8, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonImage, { opacity: shimmerOpacity }]} />
      </View>
    </View>
  );
};

export default function PostCard({ post }) {
  const { user, token, setUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const inputRef = useRef(null);

  // ✅ FIXED: Ensure likes is always an array
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || likes.length || 0);

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const commentSlide = useRef(new Animated.Value(300)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const backAction = () => {
      if (showComments) { setShowComments(false); setReplyTo(null); return true; }
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

  // ✅ Update likes when post changes
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

  // ✅ FIXED: Safe check for liked state
  const isLiked = Array.isArray(likes) && likes.some(id => id?.toString() === user?._id?.toString());
  const isSaved = Array.isArray(favorites) && favorites.some(id => id?.toString() === user?._id?.toString());
  const isOwnPost = user?._id === post.author?._id;
  const isConnected = user?.connections?.includes(post.author?._id);
  const isPending = user?.sentRequests?.includes(post.author?._id);

  if (post.author?._id === user?._id) return null;

  // ✅ FIXED: Like/Unlike with proper state management
  const handleLike = async () => {
    const wasLiked = isLiked;
    const currentLikes = [...likes];
    const uid = user?._id;

    // Optimistic update
    if (wasLiked) {
      setLikes(prev => prev.filter(id => id?.toString() !== uid?.toString()));
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setLikes(prev => [...prev, uid]);
      setLikeCount(prev => prev + 1);
    }

    // Heart animation when liking
    if (!wasLiked) {
      heartOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
      Animated.timing(heartOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    }

    try {
      const res = await axios.put(`${API_URL}/posts/like/${post._id}`, {}, config);
      if (res.data.success) {
        // Backend returns likes as array of IDs
        const serverLikes = Array.isArray(res.data.likes) ? res.data.likes : [];
        setLikes(serverLikes);
        setLikeCount(res.data.likes?.length || serverLikes.length);
      }
    } catch (err) {
      // Revert on error
      setLikes(currentLikes);
      setLikeCount(currentLikes.length);
      console.error("Like Error:", err);
    }
  };

  const handleSave = async () => {
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
    } catch (err) { Alert.alert("Error", "Save action failed"); }
  };

  const handleShare = async () => {
    setShowMenu(false);
    try {
      await Share.share({ message: `Check out this post on TDC!` });
    } catch (err) {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/posts/comment/${post._id}`, { text: commentText }, config);
      if (res.data.success && res.data.comments) {
        setCommentsList(res.data.comments);
        setCommentText("");
        setReplyTo(null);
      }
    } catch (err) { Alert.alert("Error", "Comment failed to post."); }
    finally { setIsSubmitting(false); }
  };

  const handleConnect = async () => {
    if (isPending || isConnected || isConnecting) return;
    setIsConnecting(true);
    try {
      const res = await axios.post(`${API_URL}/user/connect/${post.author._id}`, {}, config);
      if (res.data.success) {
        setUser({ ...user, sentRequests: [...(user.sentRequests || []), post.author._id] });
      }
    } catch (err) { Alert.alert("Error", "Could not send request"); }
    finally { setIsConnecting(false); }
  };

  const onReplyPress = (targetUser) => {
    setReplyTo(targetUser);
    setCommentText(`@${targetUser.name?.split(' ')[0]?.toLowerCase() || 'user'} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const navigateToProfile = (userId) => {
    setShowComments(false);
    navigation.navigate("UserProfile", { userId });
  };

  const renderComment = ({ item }) => (
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
          <TouchableOpacity onPress={() => navigateToProfile(item.user?._id)}>
            <Text style={styles.commentUser}>{item.user?.name || "User"}</Text>
          </TouchableOpacity>
          <Text style={styles.commentTextContent}>{item.text}</Text>
        </View>
        <View style={styles.commentActionRow}>
          <Text style={styles.commentDate}>{formatPostTime(item.createdAt) || "Now"}</Text>
          <TouchableOpacity onPress={() => onReplyPress(item.user)}>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.userInfo} onPress={() => navigateToProfile(post.author?._id)} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            {post.author?.profileImage ? (
              <Image source={{ uri: post.author.profileImage }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={['#747065', '#2d2d2d']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{post.author?.name?.charAt(0)?.toUpperCase()}</Text>
              </LinearGradient>
            )}
            {!isOwnPost && !isConnected && !isPending && (
              <TouchableOpacity style={styles.plusBadge} onPress={handleConnect} disabled={isConnecting}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.plusBadgeGradient}>
                  {isConnecting ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="add" size={14} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.userMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.userName}>{post.author?.name || "TDC User"}</Text>
              {(isConnected || isPending) && (
                <Text style={[styles.statusText, { color: isConnected ? "#f9c349" : "#999" }]}>
                  • {isConnected ? "Connected" : "Pending"}
                </Text>
              )}
            </View>
            <Text style={styles.subText}>{post.author?.university?.name || "TDC"} • {formatPostTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.contentContainer}>
        {post.content && <Text style={styles.postText}>{post.content}</Text>}
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

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#f9c349" : "#666"} />
            </Animated.View>
            <Text style={[styles.actionCount, isLiked && {color: "#f9c349"}]}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionCount}>{commentsList.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? "#f9c349" : "#666"} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* COMMENTS MODAL */}
      <Modal visible={showComments} animationType="fade" transparent onRequestClose={() => setShowComments(false)}>
        <TouchableWithoutFeedback onPress={() => setShowComments(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.commentSheet, { transform: [{ translateY: commentSlide }] }]}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Comments ({commentsList.length})</Text>
                  <TouchableOpacity onPress={() => setShowComments(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={commentsList}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderComment}
                  ListEmptyComponent={
                    <View style={styles.emptyComments}>
                      <Ionicons name="chatbubble-outline" size={50} color="#ccc" />
                      <Text style={styles.emptyText}>No comments yet</Text>
                      <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                    </View>
                  }
                  contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                  {replyTo && (
                    <View style={styles.replyNotifier}>
                      <Text style={styles.replyNotifierText}>
                        Replying to <Text style={{fontWeight: '700', color: '#f9c349'}}>{replyTo.name}</Text>
                      </Text>
                      <TouchableOpacity onPress={() => {setReplyTo(null); setCommentText("");}}>
                        <Ionicons name="close-circle" size={18} color="#999" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.inputArea}>
                    <TextInput 
                      ref={inputRef}
                      style={styles.commentInput} 
                      placeholder="Write a comment..." 
                      placeholderTextColor="#999"
                      value={commentText} 
                      onChangeText={setCommentText}
                      multiline
                    />
                    <TouchableOpacity 
                      onPress={handleComment} 
                      disabled={isSubmitting || !commentText.trim()}
                      style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MENU MODAL */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.menuBox, { transform: [{ translateY: menuSlide }] }]}>
              <TouchableOpacity style={styles.menuItem} onPress={handleSave}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#f9c349" : "#1a1a1a"} />
                </View>
                <Text style={styles.menuText}>{isSaved ? "Remove from Saved" : "Save Post"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name="share-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.menuText}>Share Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name="close-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.menuText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", marginBottom: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e8e8e8' },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  skeletonImage: { width: '100%', height: 280, borderRadius: 14, backgroundColor: '#e8e8e8', marginTop: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { position: "relative" },
  avatarImg: { width: 44, height: 44, borderRadius: 14 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  plusBadge: { position: "absolute", bottom: -3, right: -3, borderRadius: 9, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  plusBadgeGradient: { width: 20, height: 20, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  userMeta: { marginLeft: 10, flex: 1 },
  userName: { fontWeight: "800", fontSize: 15, color: "#1a1a1a" },
  statusText: { fontSize: 11, fontWeight: "600", marginLeft: 4 },
  subText: { fontSize: 11, color: "#999", marginTop: 2, fontWeight: '500' },
  menuBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { paddingHorizontal: 14, marginTop: 10 },
  postText: { fontSize: 15, color: "#1a1a1a", lineHeight: 22, fontWeight: '500' },
  imageContainer: { marginTop: 10, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f8f8f8' },
  imageLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  postImage: { width: "100%", height: 320, borderRadius: 14 },
  actionBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  leftActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 18, gap: 5 },
  actionCount: { fontSize: 13, color: "#666", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  commentSheet: { backgroundColor: "#fff", height: height * 0.7, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  dragHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  commentItem: { flexDirection: "row", marginBottom: 16 },
  commentAvatar: { width: 36, height: 36, borderRadius: 12 },
  commentAvatarPlaceholder: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f8f8f8", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: '#f0f0f0' },
  commentAvatarText: { fontWeight: "800", color: "#f9c349" },
  commentContentWrapper: { flex: 1, marginLeft: 10 },
  commentBubble: { backgroundColor: "#f8f8f8", padding: 11, borderRadius: 14, borderTopLeftRadius: 4 },
  commentUser: { fontWeight: "700", fontSize: 13, marginBottom: 2, color: '#1a1a1a' },
  commentTextContent: { fontSize: 14, color: "#666", lineHeight: 20 },
  commentActionRow: { flexDirection: 'row', marginTop: 4, marginLeft: 6 },
  commentDate: { fontSize: 11, color: '#999', marginRight: 14, fontWeight: '500' },
  replyText: { fontSize: 11, color: '#f9c349', fontWeight: '700' },
  replyNotifier: { backgroundColor: '#f8f8f8', padding: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  replyNotifierText: { fontSize: 12, color: '#666' },
  inputArea: { flexDirection: "row", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0", alignItems: "center", backgroundColor: "#fff", gap: 10 },
  commentInput: { flex: 1, backgroundColor: "#f8f8f8", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', maxHeight: 100 },
  postBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  postBtnDisabled: { backgroundColor: '#ccc' },
  emptyComments: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#ccc', marginTop: 4 },
  menuBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  menuIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { fontSize: 15, color: "#1a1a1a", fontWeight: '600' },
});

