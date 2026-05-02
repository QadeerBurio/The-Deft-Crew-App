import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  FlatList, StatusBar, Dimensions, Platform,
  ActivityIndicator, RefreshControl, Alert, Modal, 
  TextInput, Animated, Share
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext"; 

const { width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social'; 

// ✅ Skeleton component (top-level)
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 150, height: 20, marginTop: 15, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 200, height: 12, marginTop: 8, opacity }]} />
        <Animated.View style={[styles.skeletonStats, { opacity }]} />
        <Animated.View style={[styles.skeletonBtn, { opacity }]} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Animated.View style={[styles.skeletonLine, { width: '90%', height: 12, opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, marginTop: 8, opacity }]} />
          <Animated.View style={[styles.skeletonImage, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

// ✅ PostItem component (top-level)
const PostItem = React.memo(({ item, index, isPublic, user, onLike, onComment, onShare, onOptions }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 300, 
      delay: index * 50, 
      useNativeDriver: true 
    }).start();
  }, []);

  const isLiked = item.likedByCurrentUser || false;
  const likeCount = typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likes) ? item.likes.length : 0);
  const commentCount = item.comments?.length || 0;

  const handleLocalLike = () => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onLike(item._id, isLiked, isPublic ? 'post' : 'confession');
  };

  return (
    <Animated.View style={[
      styles.postCard, 
      { 
        opacity: fadeAnim, 
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
      }
    ]}>
      <View style={styles.cardUserHeader}>
        <LinearGradient colors={isPublic ? ['#f9c349', '#1a1a1a'] : ['#666', '#333']} style={styles.cardAvatarGradient}>
          <Image 
            source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=1a1a1a&color=f9c349` }} 
            style={styles.cardAvatar} 
          />
        </LinearGradient>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardUserName}>{isPublic ? user?.name : "Anonymous"}</Text>
          <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={() => onOptions(item)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#999" />
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
          <TouchableOpacity style={styles.actionBtn} onPress={handleLocalLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#f9c349" : "#666"} />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && {color: "#f9c349"}]}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item, isPublic ? 'post' : 'confession')} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionText}>{commentCount}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={() => onShare(item)}>
          <Ionicons name="paper-plane-outline" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileContent();
    }, [user])
  );

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileContent();
  };

  const handleLike = async (itemId, isCurrentlyLiked, type = 'post') => {
    if (likingItems[itemId]) return;
    setLikingItems(prev => ({ ...prev, [itemId]: true }));

    const updateList = type === 'post' ? setUserPosts : setUserConfessions;
    updateList(prev => 
      prev.map(item => {
        if (item._id === itemId) {
          const likeCount = typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likes) ? item.likes.length : 0);
          const newLiked = !item.likedByCurrentUser;
          return { ...item, likedByCurrentUser: newLiked, likes: newLiked ? likeCount + 1 : Math.max(0, likeCount - 1) };
        }
        return item;
      })
    );

    try {
      const endpoint = type === 'post' ? `${API_URL}/posts/like/${itemId}` : `${API_URL}/confessions/like/${itemId}`;
      const response = await fetch(endpoint, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) {
        updateList(prev => prev.map(item => item._id === itemId ? { ...item, likes: data.likes, likedByCurrentUser: data.liked } : item));
      }
    } catch (error) {
      fetchProfileContent();
    } finally {
      setLikingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const showLikes = async (item, type = 'post') => {
    try {
      const endpoint = type === 'post' ? `${API_URL}/posts/likes/${item._id}` : `${API_URL}/confessions/likes/${item._id}`;
      const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) {
        setSelectedItem({ ...item, likedBy: data.likes });
        setSelectedItemType(type);
        setShowLikesModal(true);
      }
    } catch (error) {}
  };

  const showComments = (item, type = 'post') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setShowCommentsModal(true);
    setCommentText('');
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      const endpoint = selectedItemType === 'post' ? `${API_URL}/posts/comment/${selectedItem._id}` : `${API_URL}/confessions/comment/${selectedItem._id}`;
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText })
      });
      const data = await response.json();
      if (response.ok) {
        const updateList = selectedItemType === 'post' ? setUserPosts : setUserConfessions;
        updateList(prev => prev.map(item => item._id === selectedItem._id ? { ...item, comments: data.comments } : item));
        setSelectedItem(prev => ({ ...prev, comments: data.comments }));
        setCommentText('');
      }
    } catch (error) {}
  };

  const deleteItem = async (item, type = 'post') => {
    Alert.alert("Delete", `Delete this ${type === 'post' ? 'post' : 'confession'}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const endpoint = type === 'post' ? `${API_URL}/posts/${item._id}` : `${API_URL}/confessions/${item._id}`;
          const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (response.ok) {
            if (type === 'post') setUserPosts(prev => prev.filter(p => p._id !== item._id));
            else setUserConfessions(prev => prev.filter(c => c._id !== item._id));
            setShowOptionsModal(false);
          }
      }}
    ]);
  };

  const handleShare = async (item) => {
    try { await Share.share({ message: item.content || item.text || "Check out this post on TDC!" }); } catch (err) {}
  };

  const handleOptions = (item) => {
    setSelectedPost(item);
    setShowOptionsModal(true);
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Animated.View style={[styles.topNav, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("SettingsScreen")} style={styles.navBtn}>
          <Ionicons name="settings-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={activeTab === "public" ? userPosts : userConfessions}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <PostItem 
            item={item} 
            index={index} 
            isPublic={activeTab === 'public'} 
            user={user} 
            onLike={handleLike} 
            onComment={showComments} 
            onShare={handleShare} 
            onOptions={handleOptions} 
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name={activeTab === "public" ? "newspaper-outline" : "lock-closed-outline"} size={50} color="#ccc" />
            </View>
            <Text style={styles.emptyText}>No {activeTab === "public" ? "posts" : "secrets"} yet</Text>
          </View>
        }
        ListHeaderComponent={
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarRing}>
                <Image 
                  source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=1a1a1a&color=f9c349` }} 
                  style={styles.avatar} 
                />
              </LinearGradient>
            </View>
            <Text style={styles.name}>{user?.name || "Student"}</Text>
            <Text style={styles.uniText}>
              <Ionicons name="school-outline" size={14} color="#f9c349" />
              {" "}{user?.university?.name || user?.education?.[0]?.school || "TDC Student"}
            </Text>
            {user?.bio && <Text style={styles.bioText}>{user.bio}</Text>}
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
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfileScreen")} activeOpacity={0.8}>
              <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.gradientBtn}>
                <Ionicons name="create-outline" size={18} color="#f9c349" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.tabWrapper}>
              <TouchableOpacity style={[styles.tab, activeTab === "public" && styles.activeTab]} onPress={() => setActiveTab("public")}>
                <Ionicons name="grid-outline" size={18} color={activeTab === "public" ? "#f9c349" : "#999"} />
                <Text style={[styles.tabText, activeTab === "public" && styles.activeTabText]}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === "confession" && styles.activeTabConfession]} onPress={() => setActiveTab("confession")}>
                <Ionicons name="eye-off-outline" size={18} color={activeTab === "confession" ? "#f9c349" : "#999"} />
                <Text style={[styles.tabText, activeTab === "confession" && styles.activeTabConfText]}>Secrets</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Likes Modal */}
      <Modal visible={showLikesModal} transparent animationType="slide" onRequestClose={() => setShowLikesModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLikesModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Likes</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.likedBy || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.likeUserItem} onPress={() => { setShowLikesModal(false); navigation.navigate("UserProfile", { userId: item._id }); }}>
                  <Image source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}` }} style={styles.likeUserAvatar} />
                  <Text style={styles.likeUserName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.noDataText}>No likes yet</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} transparent animationType="slide" onRequestClose={() => setShowCommentsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCommentsModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.comments || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image source={{ uri: item.user?.profileImage || `https://ui-avatars.com/api/?name=${item.user?.name}` }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUserName}>{item.user?.name || 'Anonymous'}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                    <Text style={styles.commentTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noDataText}>No comments yet</Text>}
              style={{ maxHeight: 300 }}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity style={[styles.sendCommentBtn, !commentText.trim() && styles.sendDisabled]} onPress={addComment} disabled={!commentText.trim()}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={styles.optionsMenu}>
            <TouchableOpacity style={styles.optionItem} onPress={() => deleteItem(selectedPost, activeTab === 'public' ? 'post' : 'confession')}>
              <View style={[styles.optionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </View>
              <Text style={[styles.optionText, { color: '#F44336' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => setShowOptionsModal(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="close-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  skeletonContainer: { flex: 1, backgroundColor: '#fff' },
  skeletonHeader: { alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  skeletonAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e8e8e8' },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  skeletonStats: { width: '85%', height: 60, borderRadius: 16, backgroundColor: '#e8e8e8', marginTop: 20 },
  skeletonBtn: { width: '85%', height: 44, borderRadius: 14, backgroundColor: '#e8e8e8', marginTop: 20 },
  skeletonCard: { marginHorizontal: 14, marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#f0f0f0' },
  skeletonImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#e8e8e8', marginTop: 12 },
  
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  headerSection: { alignItems: "center", backgroundColor: '#fff', paddingBottom: 5 },
  avatarContainer: { marginTop: 15 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#fff' },
  name: { fontSize: 22, fontWeight: "900", marginTop: 12, color: "#1a1a1a" },
  uniText: { color: "#666", fontSize: 13, marginTop: 4, fontWeight: '600' },
  bioText: { color: "#999", fontSize: 13, marginTop: 8, paddingHorizontal: 30, textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  
  statsRow: { flexDirection: 'row', marginTop: 18, width: width * 0.85, backgroundColor: '#f8f8f8', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#f0f0f0' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  statLab: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: '60%', backgroundColor: '#e0e0e0', alignSelf: 'center' },
  
  editBtn: { marginTop: 20, width: width * 0.85, borderRadius: 14, overflow: 'hidden', elevation: 5 },
  gradientBtn: { height: 46, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  editBtnText: { color: '#f9c349', fontWeight: '800', fontSize: 14 },
  
  tabWrapper: { flexDirection: 'row', width: width, marginTop: 20, borderBottomWidth: 2, borderBottomColor: '#f0f0f0' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 6 },
  tabText: { fontWeight: '700', color: '#999', fontSize: 14 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#f9c349', marginBottom: -2 },
  activeTabText: { color: '#1a1a1a' },
  activeTabConfession: { borderBottomWidth: 3, borderBottomColor: '#f9c349', marginBottom: -2 },
  activeTabConfText: { color: '#1a1a1a' },
  
  postCard: { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 12, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#f0f0f0' },
  cardUserHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardAvatarGradient: { width: 38, height: 38, borderRadius: 12, padding: 2 },
  cardAvatar: { width: 34, height: 34, borderRadius: 10 },
  cardHeaderText: { flex: 1, marginLeft: 10 },
  cardUserName: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  cardTime: { fontSize: 10, color: '#999', fontWeight: '500', marginTop: 1 },
  menuBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  cardBody: { marginBottom: 10 },
  postTextContent: { fontSize: 15, color: '#1a1a1a', lineHeight: 22, fontWeight: '500' },
  imageWrapper: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  postImage: { width: '100%', height: 220, backgroundColor: '#f8f8f8' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 5 },
  actionText: { fontSize: 13, color: '#666', fontWeight: '600' },
  shareBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16 },
  emptyText: { color: '#999', fontSize: 15, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', minHeight: '40%' },
  dragHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  likeUserItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  likeUserAvatar: { width: 42, height: 42, borderRadius: 14, marginRight: 12 },
  likeUserName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  
  commentItem: { flexDirection: 'row', marginBottom: 16 },
  commentAvatar: { width: 34, height: 34, borderRadius: 10, marginRight: 10, backgroundColor: '#f0f0f0' },
  commentContent: { flex: 1 },
  commentBubble: { backgroundColor: '#f8f8f8', padding: 10, borderRadius: 14, borderTopLeftRadius: 4 },
  commentUserName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#666', lineHeight: 20 },
  commentTime: { fontSize: 10, color: '#999', marginTop: 4, marginLeft: 4 },
  
  commentInputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: '#f8f8f8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', maxHeight: 80 },
  sendCommentBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#ccc' },
  noDataText: { textAlign: 'center', color: '#999', padding: 30, fontWeight: '500' },
  
  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: '#fff', borderRadius: 16, width: width * 0.6, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
});

