import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
   TouchableWithoutFeedback, Dimensions, BackHandler
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function PostCard({ post }) {
  const { user, token, setUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const inputRef = useRef(null);

  // --- LOCAL STATES ---
  const [likes, setLikes] = useState(post.likes || []);
  const [favorites, setFavorites] = useState(post.favorites || []);
  const [commentsList, setCommentsList] = useState(post.comments || []);
  
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const config = { headers: { Authorization: `Bearer ${token}` } };

  // --- DATE FORMATTER ---
  const formatPostTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    // Relative time for recent posts
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;

    // Professional Date Formatting
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    // Check if it's yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    // If same year, just show Day/Month, otherwise show full year
    if (year === now.getFullYear()) {
      return `${month} ${day < 10 ? '0' + day : day}`;
    } else {
      return `${month} ${day}, ${year}`;
    }
  };

  // --- ANDROID BACK BUTTON HANDLING ---
  useEffect(() => {
    const backAction = () => {
      if (showComments) {
        setShowComments(false);
        setReplyTo(null);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [showComments]);

  // Helpers
  const isLiked = likes.some(id => id.toString() === user?._id.toString());
  const isSaved = favorites.some(id => id.toString() === user?._id.toString());
  const isOwnPost = user?._id === post.author?._id;
  const isConnected = user?.connections?.includes(post.author?._id);
  const isPending = user?.sentRequests?.includes(post.author?._id);

  // Don't render if it's the user's own post
  if (post.author?._id === user?._id) {
    return null;
  }
  // --- ACTIONS ---
  const handleLike = async () => {
    try {
      const res = await axios.put(`${API_URL}/posts/like/${post._id}`, {}, config);
      if (res.data.success) setLikes(res.data.likes);
    } catch (err) { console.error("Like Error:", err); }
  };

  const handleSave = async () => {
    try {
      const res = await axios.post(`${API_URL}/posts/favorite/${post._id}`, {}, config);
      if (res.data.success) {
        setFavorites(res.data.favorites);
        setShowMenu(false);
      }
    } catch (err) { Alert.alert("Error", "Save action failed"); }
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
    } catch (err) { 
      console.error("Comment failed:", err);
      Alert.alert("Error", "Comment failed to post."); 
    }
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
    setCommentText(`@${targetUser.name.split(' ')[0].toLowerCase()} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const navigateToProfile = (userId) => {
    setShowComments(false);
    navigation.navigate("UserProfile", { userId });
  };

  // --- RENDER COMMENT ITEM ---
  const renderComment = ({ item }) => {
    const isReply = item.text.startsWith('@');
    return (
      <View style={styles.commentContainer}>
        {isReply && <View style={styles.threadLine} />}
        <View style={[styles.commentItem, isReply && { marginLeft: 20 }]}>
          <TouchableOpacity onPress={() => navigateToProfile(item.user?._id)}>
            {item.user?.profileImage ? (
              <Image source={{ uri: item.user.profileImage }} style={styles.commentAvatar} />
            ) : (
              <View style={styles.commentAvatarPlaceholder}>
                <Text style={styles.commentAvatarText}>{item.user?.name?.charAt(0)}</Text>
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
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.userInfo} onPress={() => navigateToProfile(post.author?._id)}>
          <View style={styles.avatarContainer}>
            {post.author?.profileImage ? (
              <Image source={{ uri: post.author.profileImage }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{post.author?.name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {!isOwnPost && !isConnected && !isPending && (
              <TouchableOpacity style={styles.plusBadge} onPress={handleConnect} disabled={isConnecting}>
                {isConnecting ? <ActivityIndicator size={10} color="#6C63FF" /> : <Ionicons name="add-circle" size={18} color="#6C63FF" />}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.userMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.userName}>{post.author?.name || "TDC User"}</Text>
                {!isOwnPost && (isConnected || isPending) && (
                   <Text style={[styles.statusText, { color: isConnected ? "#4CAF50" : "#FF9800" }]}>
                     • {isConnected ? "Connected" : "Connecting"}
                   </Text>
                )}
            </View>
            <Text style={styles.subText}>{post.author?.university?.name || "MUET"} • {formatPostTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMenu(true)}><Ionicons name="ellipsis-horizontal" size={20} color="#888" /></TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.contentContainer}>
        {post.content && <Text style={styles.postText}>{post.content}</Text>}
        {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
      </View>

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#FF4444" : "#444"} />
            <Text style={[styles.actionCount, isLiked && {color: "#FF4444"}]}>{likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
            <Ionicons name="chatbubble-outline" size={22} color="#444" />
            <Text style={styles.actionCount}>{commentsList.length}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave}><Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? "#6C63FF" : "#444"} /></TouchableOpacity>
      </View>

      {/* COMMENTS MODAL */}
      <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowComments(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments ({commentsList.length})</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          </View>

          <FlatList
            data={commentsList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderComment}
            ListEmptyComponent={<Text style={styles.emptyText}>No comments yet. Be the first!</Text>}
            contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
            {replyTo && (
              <View style={styles.replyNotifier}>
                <Text style={styles.replyNotifierText}>Replying to <Text style={{fontWeight: 'bold'}}>{replyTo.name}</Text></Text>
                <TouchableOpacity onPress={() => {setReplyTo(null); setCommentText("");}}><Ionicons name="close-circle" size={16} color="#888" /></TouchableOpacity>
              </View>
            )}
            <View style={styles.inputArea}>
              <TextInput 
                ref={inputRef}
                style={styles.commentInput} 
                placeholder="Write a comment..." 
                value={commentText} 
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity onPress={handleComment} disabled={isSubmitting || !commentText.trim()}>
                {isSubmitting ? <ActivityIndicator size="small" color="#6C63FF" /> : <Text style={[styles.postBtnText, !commentText.trim() && {opacity: 0.5}]}>Post</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MENU MODAL */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuBox}>
              <TouchableOpacity style={styles.menuItem} onPress={handleSave}>
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color="#444" />
                <Text style={styles.menuText}>{isSaved ? "Remove from Saved" : "Save Post"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <Ionicons name="share-social-outline" size={20} color="#444" />
                <Text style={styles.menuText}>Share Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", marginBottom: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 15, alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative" },
  avatarImg: { width: 45, height: 45, borderRadius: 22.5 },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: "#6C63FF", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  plusBadge: { position: "absolute", bottom: -2, right: -2, backgroundColor: "#FFF", borderRadius: 10 },
  userMeta: { marginLeft: 12 },
  userName: { fontWeight: "bold", fontSize: 16, color: "#1A1A1A" },
  statusText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  subText: { fontSize: 12, color: "#777", marginTop: 2 },
  contentContainer: { paddingHorizontal: 15, marginTop: 10 },
  postText: { fontSize: 15, color: "#333", lineHeight: 22 },
  postImage: { width: "100%", height: 300, borderRadius: 15, marginTop: 12, backgroundColor: "#F9F9F9" },
  actionBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 15, borderTopWidth: 1, borderTopColor: "#F5F5F5", paddingTop: 10 },
  leftActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 25 },
  actionCount: { marginLeft: 6, fontSize: 14, color: "#444", fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#EEE", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  commentContainer: { position: 'relative' },
  threadLine: { position: 'absolute', left: 18, top: -10, bottom: 20, width: 2, backgroundColor: '#EEE' },
  commentItem: { flexDirection: "row", marginBottom: 18 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#6C63FF20", justifyContent: "center", alignItems: "center" },
  commentAvatarText: { fontWeight: "bold", color: "#6C63FF" },
  commentContentWrapper: { flex: 1, marginLeft: 12 },
  commentBubble: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 18, alignSelf: 'flex-start', maxWidth: '95%' },
  commentUser: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  commentTextContent: { fontSize: 14, color: "#333" },
  commentActionRow: { flexDirection: 'row', marginTop: 4, marginLeft: 8 },
  commentDate: { fontSize: 12, color: '#888', marginRight: 15 },
  replyText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  replyNotifier: { backgroundColor: '#F0F0F0', padding: 8, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  replyNotifierText: { fontSize: 12, color: '#555' },
  inputArea: { flexDirection: "row", padding: 15, borderTopWidth: 1, borderTopColor: "#EEE", alignItems: "center", backgroundColor: "#FFF" },
  commentInput: { flex: 1, backgroundColor: "#F0F2F5", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, maxHeight: 100 },
  postBtnText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menuBox: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 15 },
  menuText: { marginLeft: 15, fontSize: 16, color: "#444" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 20 }
});