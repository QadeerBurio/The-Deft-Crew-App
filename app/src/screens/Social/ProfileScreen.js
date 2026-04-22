import React, { useState, useContext, useEffect } from "react";
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  FlatList,  StatusBar, Dimensions, Platform,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView, 
  TextInput 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext"; 

const { width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social'; 

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, token } = useContext(AuthContext); 

  const [activeTab, setActiveTab] = useState("public");
  const [userPosts, setUserPosts] = useState([]);
  const [userConfessions, setUserConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likingItems, setLikingItems] = useState({});
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState('post');
  const [commentText, setCommentText] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchProfileContent = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/profile/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUserPosts(data.posts || []);

      const confRes = await fetch(`${API_URL}/confessions/my-confessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const confData = await confRes.json();
      if (confRes.ok) setUserConfessions(confData || []);

    } catch (err) {
      console.error("Profile Fetch Error:", err);
      Alert.alert("Error", "Failed to load profile content");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileContent();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileContent();
  };

  const handleLike = async (itemId, isCurrentlyLiked, type = 'post') => {
    if (likingItems[itemId]) return;
    
    setLikingItems(prev => ({ ...prev, [itemId]: true }));
    
    try {
      const endpoint = type === 'post' 
        ? `${API_URL}/posts/like/${itemId}`
        : `${API_URL}/confessions/like/${itemId}`;
        
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (type === 'post') {
          setUserPosts(prevPosts => 
            prevPosts.map(post => 
              post._id === itemId 
                ? { ...post, likes: data.likes, likedByCurrentUser: data.liked }
                : post
            )
          );
        } else {
          setUserConfessions(prevConfessions => 
            prevConfessions.map(confession => 
              confession._id === itemId 
                ? { ...confession, likes: data.likes, likedByCurrentUser: data.liked }
                : confession
            )
          );
        }
      } else {
        Alert.alert("Error", data.message || "Failed to like");
      }
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Network error while liking");
    } finally {
      setLikingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const showLikes = async (item, type = 'post') => {
    try {
      const endpoint = type === 'post' 
        ? `${API_URL}/posts/likes/${item._id}`
        : `${API_URL}/confessions/likes/${item._id}`;
        
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        setSelectedItem({ ...item, likedBy: data.likes });
        setSelectedItemType(type);
        setShowLikesModal(true);
      }
    } catch (error) {
      console.error("Fetch likes error:", error);
      Alert.alert("Error", "Failed to load likes");
    }
  };

  const showComments = (item, type = 'post') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setShowCommentsModal(true);
    setCommentText('');
  };

  const addComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    try {
      const endpoint = selectedItemType === 'post'
        ? `${API_URL}/posts/comment/${selectedItem._id}`
        : `${API_URL}/confessions/comment/${selectedItem._id}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: commentText })
      });

      const data = await response.json();

      if (response.ok) {
        if (selectedItemType === 'post') {
          setUserPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === selectedItem._id
                ? { ...post, comments: data.comments }
                : post
            )
          );
          setSelectedItem(prev => ({ ...prev, comments: data.comments }));
        } else {
          setUserConfessions(prevConfessions =>
            prevConfessions.map(confession =>
              confession._id === selectedItem._id
                ? { ...confession, comments: data.comments || data.comments }
                : confession
            )
          );
          setSelectedItem(prev => ({ ...prev, comments: data.comments || data.comments }));
        }
        setCommentText('');
      } else {
        Alert.alert("Error", data.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Comment error:", error);
      Alert.alert("Error", "Network error while adding comment");
    }
  };

  const deleteComment = async (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const endpoint = selectedItemType === 'post'
                ? `${API_URL}/posts/comment/${selectedItem._id}/${commentId}`
                : `${API_URL}/confessions/comment/${selectedItem._id}/${commentId}`;

              const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                const updatedComments = selectedItem.comments.filter(c => c._id !== commentId);
                
                if (selectedItemType === 'post') {
                  setUserPosts(prevPosts =>
                    prevPosts.map(post =>
                      post._id === selectedItem._id
                        ? { ...post, comments: updatedComments }
                        : post
                    )
                  );
                } else {
                  setUserConfessions(prevConfessions =>
                    prevConfessions.map(confession =>
                      confession._id === selectedItem._id
                        ? { ...confession, comments: updatedComments }
                        : confession
                    )
                  );
                }
                setSelectedItem(prev => ({ ...prev, comments: updatedComments }));
                Alert.alert("Success", "Comment deleted");
              } else {
                Alert.alert("Error", "Failed to delete comment");
              }
            } catch (error) {
              console.error("Delete comment error:", error);
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  };

  const deleteItem = async (item, type = 'post') => {
    Alert.alert(
      "Delete",
      `Are you sure you want to delete this ${type === 'post' ? 'post' : 'confession'}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const endpoint = type === 'post'
                ? `${API_URL}/posts/${item._id}`
                : `${API_URL}/confessions/${item._id}`;

              const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                if (type === 'post') {
                  setUserPosts(prevPosts => prevPosts.filter(p => p._id !== item._id));
                } else {
                  setUserConfessions(prevConfessions => prevConfessions.filter(c => c._id !== item._id));
                }
                Alert.alert("Success", `${type === 'post' ? 'Post' : 'Confession'} deleted`);
                setShowOptionsModal(false);
              } else {
                Alert.alert("Error", `Failed to delete ${type}`);
              }
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  };

  const renderPost = ({ item }) => {
    const isPublic = activeTab === 'public';
    const accentColor = '#FF4444';
    const isLiked = item.likedByCurrentUser || (item.likes && typeof item.likes === 'number' && item.likedByCurrentUser);
    const likeCount = typeof item.likes === 'number' ? item.likes : (item.likes?.length || 0);
    const commentCount = item.comments?.length || 0;

    return (
      <View style={styles.postCard}>
        <View style={styles.cardUserHeader}>
          <Image 
            source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=${accentColor.replace('#','')}&color=fff` }} 
            style={styles.cardAvatar} 
          />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardUserName}>{isPublic ? user?.name : "Anonymous Secret"}</Text>
            <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            setSelectedPost(item);
            setShowOptionsModal(true);
          }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.postTextContent}>{item.content || item.text}</Text>
          {item.image && (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <TouchableOpacity 
              style={styles.interactionBtn}
              onPress={() => handleLike(item._id, isLiked, isPublic ? 'post' : 'confession')}
              disabled={likingItems[item._id]}
            >
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={accentColor} />
              <Text style={styles.interactionText}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.interactionBtn}
              onPress={() => showComments(item, isPublic ? 'post' : 'confession')}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.interactionText}>{commentCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.interactionBtn}
              onPress={() => showLikes(item, isPublic ? 'post' : 'confession')}
            >
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.interactionText}>Likes</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="paper-plane-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const LikesModal = () => (
    <Modal
      visible={showLikesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLikesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Liked by</Text>
            <TouchableOpacity onPress={() => setShowLikesModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {selectedItem?.likedBy?.map((likeUser) => (
              <View key={likeUser._id} style={styles.likeUserItem}>
                <Image 
                  source={{ uri: likeUser.profileImage || `https://ui-avatars.com/api/?name=${likeUser.name}` }}
                  style={styles.likeUserAvatar}
                />
                <Text style={styles.likeUserName}>{likeUser.name}</Text>
              </View>
            ))}
            {(!selectedItem?.likedBy || selectedItem.likedBy.length === 0) && (
              <Text style={styles.noDataText}>No likes yet</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const CommentsModal = () => (
    <Modal
      visible={showCommentsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCommentsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.commentsList}>
            {selectedItem?.comments?.map((comment) => (
              <View key={comment._id} style={styles.commentItem}>
                <Image 
                  source={{ uri: comment.user?.profileImage || `https://ui-avatars.com/api/?name=${comment.user?.name}` }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUserName}>{comment.user?.name || 'Anonymous'}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {comment.user?._id === user?._id && (
                  <TouchableOpacity onPress={() => deleteComment(comment._id)}>
                    <Ionicons name="trash-outline" size={18} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {(!selectedItem?.comments || selectedItem.comments.length === 0) && (
              <Text style={styles.noDataText}>No comments yet</Text>
            )}
          </ScrollView>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity style={styles.sendCommentBtn} onPress={addComment}>
              <Ionicons name="send" size={22} color="#6C63FF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const OptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <TouchableOpacity 
        style={styles.optionsOverlay} 
        activeOpacity={1} 
        onPress={() => setShowOptionsModal(false)}
      >
        <View style={styles.optionsMenu}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              setShowOptionsModal(false);
              deleteItem(selectedPost, activeTab === 'public' ? 'post' : 'confession');
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#FF4444" />
            <Text style={[styles.optionText, { color: '#FF4444' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              setShowOptionsModal(false);
              Alert.alert("Report", "Report this content?");
            }}
          >
            <Ionicons name="flag-outline" size={22} color="#666" />
            <Text style={styles.optionText}>Report</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("SettingsScreen")}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "public" ? userPosts : userConfessions}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? <ActivityIndicator color="#6C63FF" /> : <Text style={styles.emptyText}>No activities yet.</Text>}
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={styles.headerSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#6C63FF', '#FF4444']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.avatarRing}>
                <Image 
                  source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}` }} 
                  style={styles.avatar} 
                />
              </LinearGradient>
            </View>

            <Text style={styles.name}>{user?.name || "Student"}</Text>
            
            <Text style={styles.uniText}>
              {user?.university?.name || user?.education?.[0]?.school || "Engineering Student"} 
              {user?.rollNo ? ` • ${user.rollNo}` : ""}
            </Text>

            {user?.bio ? (
              <Text style={styles.bioText}>{user.bio}</Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{user?.connections?.length || 0}</Text>
                <Text style={styles.statLab}>Connections</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{userPosts.length}</Text>
                <Text style={styles.statLab}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{userConfessions.length}</Text>
                <Text style={styles.statLab}>Secrets</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => navigation.navigate("EditProfile")}
            >
              <LinearGradient colors={['#1A1A1A', '#333']} style={styles.gradientBtn}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.tabWrapper}>
              <TouchableOpacity style={[styles.tab, activeTab === "public" && styles.activeTab]} onPress={() => setActiveTab("public")}>
                <Ionicons name="grid-outline" size={20} color={activeTab === "public" ? "#292397" : "#AAA"} />
                <Text style={[styles.tabText, activeTab === "public" && styles.activeTabText]}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === "confession" && styles.activeTabConfession]} onPress={() => setActiveTab("confession")}>
                <Ionicons name="lock-closed-outline" size={20} color={activeTab === "confession" ? "#FF4444" : "#AAA"} />
                <Text style={[styles.tabText, activeTab === "confession" && styles.activeTabTextConfession]}>Secrets</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}
      />

      <LikesModal />
      <CommentsModal />
      <OptionsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 10 : 10, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF' },
  navTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  headerSection: { alignItems: "center", backgroundColor: '#FFF', paddingBottom: 5, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatarContainer: { marginTop: 10 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 94, height: 94, borderRadius: 47, borderWidth: 3, borderColor: '#FFF' },
  name: { fontSize: 22, fontWeight: "900", marginTop: 15, color: "#1A1A1A" },
  uniText: { color: "#666", fontSize: 14, marginTop: 4, fontWeight: '700' },
  bioText: { color: "#888", fontSize: 13, marginTop: 10, paddingHorizontal: 40, textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginTop: 20, width: width * 0.85, backgroundColor: '#F0F2F8', borderRadius: 20, padding: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },
  statLab: { fontSize: 11, color: '#999', fontWeight: '700', textTransform: 'uppercase' },
  statDivider: { width: 1, height: '60%', backgroundColor: '#DDE0E9', alignSelf: 'center' },
  editBtn: { marginTop: 25, width: width * 0.85, borderRadius: 15, overflow: 'hidden' },
  gradientBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  tabWrapper: { flexDirection: 'row', width: width, marginTop: 25 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { marginLeft: 8, fontWeight: '800', color: '#BBB', fontSize: 14 },
  activeTab: { borderBottomColor: '#000000' },
  activeTabText: { color: '#000000' },
  activeTabConfession: { borderBottomColor: '#FF4444' },
  activeTabTextConfession: { color: '#FF4444' },
  postCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 20, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardUserHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardAvatar: { width: 38, height: 38, borderRadius: 19 },
  cardHeaderText: { flex: 1, marginLeft: 12 },
  cardUserName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  cardTime: { fontSize: 12, color: '#AAA', fontWeight: '500' },
  cardBody: { marginBottom: 15 },
  postTextContent: { fontSize: 15, color: '#333', lineHeight: 22 },
  imageWrapper: { marginTop: 12, borderRadius: 15, overflow: 'hidden', backgroundColor: '#F0F0F0' },
  postImage: { width: '100%', height: 220 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8F8F8', paddingTop: 12 },
  footerLeft: { flexDirection: 'row' },
  interactionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20, backgroundColor: '#F9F9F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  interactionText: { marginLeft: 6, fontSize: 13, color: '#444', fontWeight: '700' },
  shareBtn: { backgroundColor: '#F9F9F9', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { color: '#CCC', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  likeUserItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  likeUserAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  likeUserName: { fontSize: 16, fontWeight: '600', color: '#333' },
  commentsList: { padding: 15, maxHeight: '70%' },
  commentItem: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  commentAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 12 },
  commentContent: { flex: 1 },
  commentUserName: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#666', lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#999', marginTop: 4 },
  commentInputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 80, fontSize: 14 },
  sendCommentBtn: { marginLeft: 10, padding: 10 },
  noDataText: { textAlign: 'center', color: '#999', padding: 40, fontSize: 14 },
  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: '#FFF', borderRadius: 15, width: width * 0.7, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  optionText: { marginLeft: 15, fontSize: 16, color: '#333' }
});