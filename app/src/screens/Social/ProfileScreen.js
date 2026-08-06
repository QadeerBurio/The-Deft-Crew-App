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

// ✅ Modern Skeleton
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
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
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonCardHeader}>
            <Animated.View style={[styles.skeletonCardAvatar, { opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: 120, height: 14, opacity }]} />
          </View>
          <Animated.View style={[styles.skeletonLine, { width: '90%', height: 12, marginTop: 8, opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, marginTop: 6, opacity }]} />
          <Animated.View style={[styles.skeletonImage, { opacity }]} />
        </View>
      ))}
    </SafeAreaView>
  );
};

// ✅ Modern PostItem with X/Twitter style
const PostItem = React.memo(({ item, index, isPublic, user, onLike, onComment, onShare, onOptions }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const [showFullText, setShowFullText] = useState(false);

  const textContent = item.content || item.text || '';
  const truncatedText = textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 40,
      useNativeDriver: true
    }).start();
  }, []);

  const isLiked = item.likedByCurrentUser || false;
  const likeCount = typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likes) ? item.likes.length : 0);
  const commentCount = item.comments?.length || 0;

  const handleLocalLike = () => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onLike(item._id, isLiked, isPublic ? 'post' : 'confession');
  };

  return (
    <Animated.View style={[
      styles.postCard,
      {
        opacity: fadeAnim,
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
      }
    ]}>
      <View style={styles.cardUserHeader}>
        <TouchableOpacity style={styles.cardAvatarWrapper}>
          <Image
            source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=1a1a1a&color=f9c349&size=64` }}
            style={styles.cardAvatar}
          />
        </TouchableOpacity>
        <View style={styles.cardHeaderText}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardUserName}>{isPublic ? user?.name : "Anonymous"}</Text>
            <Text style={styles.cardHandle}>@{isPublic ? user?.username || 'user' : 'anonymous'}</Text>
            <Text style={styles.cardTime}>· {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onOptions(item)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#71767b" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.postTextContent} numberOfLines={showFullText ? undefined : 4}>
          {showFullText ? textContent : truncatedText}
        </Text>
        {textContent.length > 100 && (
          <TouchableOpacity onPress={() => setShowFullText(!showFullText)} style={styles.showMoreBtn}>
            <Text style={styles.showMoreText}>{showFullText ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
        {item.image && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLocalLike} activeOpacity={0.6}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#f9c349" : "#71767b"} />
          </Animated.View>
          <Text style={[styles.actionText, isLiked && { color: "#f9c349" }]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item, isPublic ? 'post' : 'confession')} activeOpacity={0.6}>
          <Ionicons name="chatbubble-outline" size={18} color="#71767b" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)} activeOpacity={0.6}>
          <Ionicons name="paper-plane-outline" size={18} color="#71767b" />
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
    } catch (error) { }
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
    } catch (error) { }
  };

  const deleteItem = async (item, type = 'post') => {
    Alert.alert("Delete", `Delete this ${type === 'post' ? 'post' : 'confession'}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const endpoint = type === 'post' ? `${API_URL}/posts/${item._id}` : `${API_URL}/confessions/${item._id}`;
          const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (response.ok) {
            if (type === 'post') setUserPosts(prev => prev.filter(p => p._id !== item._id));
            else setUserConfessions(prev => prev.filter(c => c._id !== item._id));
            setShowOptionsModal(false);
          }
        }
      }
    ]);
  };

  const handleShare = async (item) => {
    try { await Share.share({ message: item.content || item.text || "Check out this post on TDC!" }); } catch (err) { }
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
          <Ionicons name="arrow-back" size={24} color="#0f1419" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("SettingsScreen")} style={styles.navBtn}>
          <Ionicons name="settings-outline" size={24} color="#0f1419" />
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
            <Ionicons name={activeTab === "public" ? "document-text-outline" : "lock-closed-outline"} size={48} color="#cfd9de" />
            <Text style={styles.emptyText}>No {activeTab === "public" ? "posts" : "secrets"} yet</Text>
            <Text style={styles.emptySubText}>Share your thoughts with the community</Text>
          </View>
        }
        ListHeaderComponent={
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <View style={styles.headerRow}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=1a1a1a&color=f9c349&size=128` }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.name}>{user?.name || "Student"}</Text>
                <Text style={styles.handle}>@{user?.username || 'student'}</Text>
                {user?.bio && <Text style={styles.bioText}>{user.bio}</Text>}
                <Text style={styles.uniText}>
                  <Ionicons name="school-outline" size={14} color="#71767b" />
                  {" "}{user?.university?.name || user?.education?.[0]?.school || "TDC Student"}
                </Text>
                <View style={styles.statsRow}>
                  <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate("ConnectionsScreen")}>
                    <Text style={styles.statNum}>{user?.connections?.length || 0}</Text>
                    <Text style={styles.statLab}>Connections</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statBox} onPress={() => setActiveTab("public")}>
                    <Text style={styles.statNum}>{userPosts.length}</Text>
                    <Text style={styles.statLab}>Posts</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statBox} onPress={() => setActiveTab("confession")}>
                    <Text style={styles.statNum}>{userConfessions.length}</Text>
                    <Text style={styles.statLab}>Secrets</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfileScreen")} activeOpacity={0.8}>
                  <LinearGradient colors={['#0f1419', '#1a1a1a']} style={styles.gradientBtn}>
                    <Ionicons name="create-outline" size={16} color="#f9c349" />
                    <Text style={styles.editBtnText}>Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.tabWrapper}>
              <TouchableOpacity style={[styles.tab, activeTab === "public" && styles.activeTab]} onPress={() => setActiveTab("public")}>
                <Text style={[styles.tabText, activeTab === "public" && styles.activeTabText]}>Posts</Text>
                {activeTab === "public" && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === "confession" && styles.activeTab]} onPress={() => setActiveTab("confession")}>
                <Text style={[styles.tabText, activeTab === "confession" && styles.activeTabText]}>Secrets</Text>
                {activeTab === "confession" && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
      />

      {/* Likes Modal */}
      <Modal visible={showLikesModal} transparent animationType="slide" onRequestClose={() => setShowLikesModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLikesModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Likes</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#0f1419" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.likedBy || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.likeUserItem} onPress={() => { setShowLikesModal(false); navigation.navigate("UserProfile", { userId: item._id }); }}>
                  <Image source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=1a1a1a&color=f9c349` }} style={styles.likeUserAvatar} />
                  <Text style={styles.likeUserName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#cfd9de" />
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
                <Ionicons name="close" size={22} color="#0f1419" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.comments || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image source={{ uri: item.user?.profileImage || `https://ui-avatars.com/api/?name=${item.user?.name}&background=1a1a1a&color=f9c349` }} style={styles.commentAvatar} />
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
                placeholderTextColor="#71767b"
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
              <View style={[styles.optionIcon, { backgroundColor: '#fde8e8' }]}>
                <Ionicons name="trash-outline" size={20} color="#f4212e" />
              </View>
              <Text style={[styles.optionText, { color: '#f4212e' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => setShowOptionsModal(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#f0f2f5' }]}>
                <Ionicons name="close-outline" size={20} color="#71767b" />
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
  container: { flex: 1, backgroundColor: "#ffffff", paddingBottom:20 },

  // Skeleton styles
  skeletonContainer: { flex: 1, backgroundColor: '#ffffff' },
  skeletonTopNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  skeletonNavBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff3f4' },
  skeletonNavTitle: { width: 100, height: 20, borderRadius: 4, backgroundColor: '#eff3f4' },
  skeletonHeader: { padding: 16, backgroundColor: '#fff' },
  skeletonHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff3f4' },
  skeletonHeaderRight: { flex: 1, marginLeft: 16 },
  skeletonBio: { width: '90%', height: 40, borderRadius: 4, backgroundColor: '#eff3f4', marginTop: 8 },
  skeletonStats: { width: '100%', height: 40, borderRadius: 8, backgroundColor: '#eff3f4', marginTop: 12 },
  skeletonBtn: { width: '100%', height: 40, borderRadius: 20, backgroundColor: '#eff3f4', marginTop: 12 },
  skeletonTabs: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#eff3f4', paddingTop: 8 },
  skeletonTab: { flex: 1, height: 32, borderRadius: 16, backgroundColor: '#eff3f4', marginHorizontal: 4 },
  skeletonCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  skeletonCardHeader: { flexDirection: 'row', alignItems: 'center' },
  skeletonCardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff3f4', marginRight: 12 },
  skeletonImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#eff3f4', marginTop: 12 },

  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eff3f4',
    
  },
  navBtn: {
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 20, fontWeight: '700', color: '#0f1419' },

  headerSection: { backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', padding: 10, paddingBottom: 2 },
  avatarContainer: { marginRight: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff' },
  headerRight: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: '#0f1419' },
  handle: { fontSize: 15, color: '#71767b', marginTop: 1 },
  bioText: { fontSize: 15, color: '#0f1419', marginTop: 8, lineHeight: 20 },
  uniText: { fontSize: 14, color: '#71767b', marginTop: 4 },

  statsRow: { flexDirection: 'row', marginTop: 12, gap: 20 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 17, fontWeight: '700', color: '#0f1419' },
  statLab: { fontSize: 14, color: '#71767b' },

  editBtn: { marginTop: 12, alignSelf: 'flex-start' },
  gradientBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: '#f9c349', fontWeight: '700', fontSize: 14 },

  tabWrapper: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eff3f4',
    marginTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabText: { fontSize: 15, fontWeight: '500', color: '#71767b' },
  activeTabText: { color: '#0f1419', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f9c349',
  },

  postCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eff3f4',
  },
  cardUserHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatarWrapper: { marginRight: 12 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20 },
  cardHeaderText: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  cardUserName: { fontSize: 15, fontWeight: '700', color: '#0f1419' },
  cardHandle: { fontSize: 14, color: '#71767b' },
  cardTime: { fontSize: 14, color: '#71767b' },
  menuBtn: { padding: 4 },

  cardBody: { marginTop: 4 },
  postTextContent: { fontSize: 15, color: '#0f1419', lineHeight: 22 },
  showMoreBtn: { marginTop: 4 },
  showMoreText: { color: '#f9c349', fontWeight: '400', fontSize: 14 },
  imageWrapper: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  postImage: { width: '100%', height: 220, backgroundColor: '#eff3f4' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, color: '#71767b', fontWeight: '400' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#0f1419', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#71767b', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', minHeight: '40%' },
  dragHandle: { width: 36, height: 4, backgroundColor: '#cfd9de', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f1419' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff3f4', justifyContent: 'center', alignItems: 'center' },

  likeUserItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  likeUserAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  likeUserName: { fontSize: 15, fontWeight: '600', color: '#0f1419', flex: 1 },

  commentItem: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eff3f4' },
  commentContent: { flex: 1 },
  commentBubble: { backgroundColor: '#f0f2f5', padding: 10, borderRadius: 14, borderTopLeftRadius: 4 },
  commentUserName: { fontSize: 13, fontWeight: '700', color: '#0f1419', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#0f1419', lineHeight: 20 },
  commentTime: { fontSize: 10, color: '#71767b', marginTop: 4, marginLeft: 4 },

  commentInputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eff3f4', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0f1419', maxHeight: 80 },
  sendCommentBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f9c349', justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#cfd9de' },
  noDataText: { textAlign: 'center', color: '#71767b', padding: 30, fontWeight: '500' },

  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: '#fff', borderRadius: 16, width: width * 0.6, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#eff3f4' },
  optionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#0f1419' },

  listContentContainer: {
    paddingBottom: 40,
    flexGrow: 1,
  },
});