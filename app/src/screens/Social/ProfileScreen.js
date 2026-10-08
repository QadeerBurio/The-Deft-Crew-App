// ProfileScreen.js - Optimized with Cache & Fast Loading (No Connections Tab)

import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  FlatList, StatusBar, Dimensions, Platform,
  RefreshControl, Alert, Modal,
  TextInput, Animated, Share
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import { soundLike, soundTap } from "../../lib/tdcSounds";
import { color as T, font as F } from "../../theme/tokens";
import { ScreenHeader, HeaderIconButton, EmptyState, SkeletonBlock } from "../../ui";
const { width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// ============ IN-MEMORY CACHE ============
const profileCache = {
  posts: {},
  confessions: {},
  connections: {},
};

const CACHE_TTL = 60 * 1000;

const getCached = (bucket, userId) => {
  const entry = profileCache[bucket]?.[userId];
  if (!entry) return null;
  const isFresh = Date.now() - entry.timestamp < CACHE_TTL;
  return { data: entry.data, isFresh };
};

const setCache = (bucket, userId, data) => {
  if (!profileCache[bucket]) profileCache[bucket] = {};
  profileCache[bucket][userId] = { data, timestamp: Date.now() };
};

const clearCache = (userId) => {
  if (!userId) return;
  delete profileCache.posts[userId];
  delete profileCache.confessions[userId];
  delete profileCache.connections[userId];
};

// ============ PostItem ============
const PostItem = React.memo(({ item, index, isPublic, user, onLike, onComment, onShare, onOptions }) => {
  const likeScale = useRef(new Animated.Value(1)).current;
  const [showFullText, setShowFullText] = useState(false);

  const textContent = item.content || item.text || '';
  const truncatedText = textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent;

  const isLiked = item.likedByCurrentUser || false;
  const likeCount = typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likes) ? item.likes.length : 0);
  const commentCount = item.comments?.length || 0;

  const avatarUri = useMemo(
    () => user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=111111&color=f9c349&size=64`,
    [user?.profileImage, user?.name]
  );

  const handleLocalLike = () => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onLike(item._id, isLiked, isPublic ? 'post' : 'confession');
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.cardUserHeader}>
        <View style={styles.cardAvatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardUserName}>{isPublic ? user?.name : "anonymous"}</Text>
            <Text style={styles.cardHandle}>@{isPublic ? user?.username || 'user' : 'anonymous'}</Text>
            <Text style={styles.cardTime}>· {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          {!isPublic && item.visibility === 'campus' && (
            <View style={styles.campusOnlyTag}>
              <Ionicons name="lock-closed" size={9} color={T.yellow} />
              <Text style={styles.campusOnlyTagText}>campus only</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => onOptions(item)} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="post options">
          <Ionicons name="ellipsis-horizontal" size={20} color={T.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.postTextContent} numberOfLines={showFullText ? undefined : 4}>
          {showFullText ? textContent : truncatedText}
        </Text>
        {textContent.length > 100 && (
          <TouchableOpacity onPress={() => setShowFullText(!showFullText)} style={styles.showMoreBtn}>
            <Text style={styles.showMoreText}>{showFullText ? 'show less' : 'show more'}</Text>
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
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? T.yellow : T.textMuted} />
          </Animated.View>
          <Text style={[styles.actionText, isLiked && { color: T.ink, fontFamily: F.bodyBold }]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item, isPublic ? 'post' : 'confession')} activeOpacity={0.6}>
          <Ionicons name="chatbubble-outline" size={18} color={T.textMuted} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)} activeOpacity={0.6}>
          <Ionicons name="paper-plane-outline" size={18} color={T.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ============ Inline Loader ============
const InlineLoader = () => (
  <View style={styles.inlineLoader} accessibilityLabel="loading">
    <SkeletonBlock height={120} radius={22} />
    <SkeletonBlock height={120} radius={22} style={{ marginTop: 10 }} />
  </View>
);

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, token } = useContext(AuthContext);

  // Hydrate initial state from cache for INSTANT render
  const initialPosts = useMemo(() => getCached('posts', user?._id)?.data || [], [user?._id]);
  const initialConfessions = useMemo(() => getCached('confessions', user?._id)?.data || [], [user?._id]);
  const initialConnections = useMemo(() => getCached('connections', user?._id)?.data || [], [user?._id]);

  const [activeTab, setActiveTab] = useState("posts");
  const [userPosts, setUserPosts] = useState(initialPosts);
  const [userConfessions, setUserConfessions] = useState(initialConfessions);
  const [connections, setConnections] = useState(initialConnections);
  const [loading, setLoading] = useState(initialPosts.length === 0 && initialConfessions.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [likingItems, setLikingItems] = useState({});
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState('post');
  const [commentText, setCommentText] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [connectionsList, setConnectionsList] = useState([]);
  const [connectionCount, setConnectionCount] = useState(initialConnections.length);

  const connectionsModalSlide = useRef(new Animated.Value(400)).current;
  const isMountedRef = useRef(true);
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ============ OPTIMIZED FETCH ============
  const fetchProfileContent = useCallback(async ({ force = false } = {}) => {
    if (!user?._id || !token) return;
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    const userId = user._id;

    const postsCache = getCached('posts', userId);
    const confCache = getCached('confessions', userId);
    const connCache = getCached('connections', userId);

    if (!force && postsCache?.isFresh && confCache?.isFresh && connCache?.isFresh) {
      fetchInFlightRef.current = false;
      setLoading(false);
      return;
    }

    if (userPosts.length === 0 && userConfessions.length === 0) {
      setLoading(true);
    }

    try {
      const [profileRes, confRes] = await Promise.all([
        fetch(`${API_URL}/profile/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => { console.error('Profile fetch err', err); return null; }),
        fetch(`${API_URL}/confessions/my-confessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => { console.error('Confessions fetch err', err); return null; }),
      ]);

      if (profileRes?.ok) {
        const data = await profileRes.json();
        const posts = data.posts || [];
        const conns = data.connections || [];

        if (isMountedRef.current) {
          setUserPosts(posts);
          setConnections(conns);
          setConnectionCount(conns.length);
        }
        setCache('posts', userId, posts);
        setCache('connections', userId, conns);
      }

      if (confRes?.ok) {
        const confData = await confRes.json();
        const formattedConfessions = (confData || []).map(c => ({
          ...c,
          likedByCurrentUser: c.likedBy?.some(id => id === userId) || false,
          comments: c.comments || [],
          likes: c.likes || 0
        }));
        if (isMountedRef.current) setUserConfessions(formattedConfessions);
        setCache('confessions', userId, formattedConfessions);
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    } finally {
      fetchInFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?._id, token, userPosts.length, userConfessions.length]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileContent();
    }, [fetchProfileContent])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileContent({ force: true });
  }, [fetchProfileContent]);

  // ============ CONNECTIONS MODAL ============
  const handleViewConnections = async () => {
    const cached = getCached('connections', user._id);
    if (cached?.data?.length) {
      setConnectionsList(cached.data);
      setShowConnectionsModal(true);
      Animated.spring(connectionsModalSlide, {
        toValue: 0, friction: 6, tension: 40, useNativeDriver: true,
      }).start();
    }

    try {
      const res = await fetch(`${API_URL}/user/connections/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.connections || [];
        setConnectionsList(list);
        setCache('connections', user._id, list);
        if (!cached?.data?.length) {
          setShowConnectionsModal(true);
          Animated.spring(connectionsModalSlide, {
            toValue: 0, friction: 6, tension: 40, useNativeDriver: true,
          }).start();
        }
      }
    } catch (err) {
      console.error("View connections error:", err);
      if (!cached?.data?.length) Alert.alert("Error", "Failed to load connections");
    }
  };

  // ============ LIKE (optimistic) ============
  const handleLike = async (itemId, isCurrentlyLiked, type = 'post') => {
    soundLike();   
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
        clearCache(user._id);
      }
    } catch (error) {
      fetchProfileContent({ force: true });
    } finally {
      setLikingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // ============ COMMENTS ============
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
        clearCache(user._id);
      }
    } catch (error) { }
  };

  // ============ DELETE ============
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
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                if (type === 'post') {
                  setUserPosts(prev => prev.filter(p => p._id !== item._id));
                } else {
                  setUserConfessions(prev => prev.filter(c => c._id !== item._id));
                }
                setShowOptionsModal(false);
                clearCache(user._id);
                Alert.alert("Success", `${type === 'post' ? 'Post' : 'Confession'} deleted successfully`);
              } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.error || "Failed to delete");
              }
            } catch (err) {
              console.error("Delete Error:", err);
              Alert.alert("Error", "Network error. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleShare = async (item) => {
    try { await Share.share({ message: item.content || item.text || "Check out this post on TDC!" }); } catch (err) { }
  };

  const handleOptions = (item) => {
    setSelectedPost(item);
    setShowOptionsModal(true);
  };

  // ============ RENDER ============
  const renderPostItem = useCallback(({ item, index }) => (
    <PostItem
      item={item}
      index={index}
      isPublic={true}
      user={user}
      onLike={handleLike}
      onComment={showComments}
      onShare={handleShare}
      onOptions={handleOptions}
    />
  ), [user, handleLike, showComments, handleShare, handleOptions]);

  const renderConfessionItem = useCallback(({ item, index }) => (
    <PostItem
      item={item}
      index={index}
      isPublic={false}
      user={user}
      onLike={handleLike}
      onComment={showComments}
      onShare={handleShare}
      onOptions={handleOptions}
    />
  ), [user, handleLike, showComments, handleShare, handleOptions]);

  const renderPostsTab = () => (
    <FlatList
      data={userPosts}
      keyExtractor={(item) => item._id}
      renderItem={renderPostItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} colors={[T.yellow]} />}
      ListEmptyComponent={
        loading ? <InlineLoader /> : (
          <View style={styles.emptyContainer}>
            <EmptyState mood="sleepy" title="no posts yet." line="share your thoughts with the community." />
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContentContainer}
      removeClippedSubviews={Platform.OS === 'android'}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={11}
    />
  );

  const renderSecretsTab = () => (
    <FlatList
      data={userConfessions}
      keyExtractor={(item) => item._id}
      renderItem={renderConfessionItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} colors={[T.yellow]} />}
      ListEmptyComponent={
        loading ? <InlineLoader /> : (
          <View style={styles.emptyContainer}>
            <EmptyState mood="cheeky" title="no secrets yet." line="share anonymously with the community." />
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContentContainer}
      removeClippedSubviews={Platform.OS === 'android'}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={11}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Top Navigation */}
      <ScreenHeader
        title="profile"
        right={<HeaderIconButton icon="settings-outline" label="settings" onPress={() => navigation.navigate("SettingsScreen")} />}
      />

      {/* Profile Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=111111&color=f9c349&size=128` }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.name}>{user?.name || "you"}</Text>
            <Text style={styles.handle}>@{user?.username || 'student'}</Text>
            {user?.bio && <Text style={styles.bioText}>{user.bio}</Text>}
            {!!(user?.university?.name || user?.education?.[0]?.school) && (
              <Text style={styles.uniText}>
                <Ionicons name="school-outline" size={14} color={T.textMuted} />
                {" "}{user?.university?.name || user?.education?.[0]?.school}
              </Text>
            )}

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statBox} onPress={handleViewConnections} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${connectionCount} connections`}>
                <Text style={styles.statNum}>{connectionCount}</Text>
                <Text style={styles.statLab}>connections</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBox} onPress={() => setActiveTab("posts")} activeOpacity={0.7}>
                <Text style={styles.statNum}>{userPosts.length}</Text>
                <Text style={styles.statLab}>posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBox} onPress={() => setActiveTab("secrets")} activeOpacity={0.7}>
                <Text style={styles.statNum}>{userConfessions.length}</Text>
                <Text style={styles.statLab}>secrets</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfileScreen")} activeOpacity={0.8}>
              <LinearGradient colors={[T.ink, T.ink]} style={styles.gradientBtn}>
                <Ionicons name="create-outline" size={16} color={T.yellow} />
                <Text style={styles.editBtnText}>edit profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs — Posts & Secrets only */}
        <View style={styles.tabWrapper}>
          {['posts', 'secrets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'posts' && renderPostsTab()}
        {activeTab === 'secrets' && renderSecretsTab()}
      </View>

      {/* Likes Modal */}
      <Modal visible={showLikesModal} transparent animationType="slide" onRequestClose={() => setShowLikesModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLikesModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>likes</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.likedBy || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.likeUserItem} onPress={() => { setShowLikesModal(false); navigation.navigate("UserProfile", { userId: item._id }); }}>
                  <Image source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=111111&color=f9c349` }} style={styles.likeUserAvatar} />
                  <Text style={styles.likeUserName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.noDataText}>no likes yet</Text>}
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
              <Text style={styles.modalTitle}>comments</Text>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedItem?.comments || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image source={{ uri: item.user?.profileImage || `https://ui-avatars.com/api/?name=${item.user?.name}&background=111111&color=f9c349` }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUserName}>{item.user?.name || 'Anonymous'}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                    <Text style={styles.commentTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noDataText}>no comments yet</Text>}
              style={{ maxHeight: 300 }}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={T.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity style={[styles.sendCommentBtn, !commentText.trim() && styles.sendDisabled]} onPress={addComment} disabled={!commentText.trim()}>
                <Ionicons name="send" size={18} color={T.white} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Connections Modal */}
      <Modal visible={showConnectionsModal} transparent animationType="none" onRequestClose={() => setShowConnectionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowConnectionsModal(false)}>
          <Animated.View style={[styles.connectionsModalContent, { transform: [{ translateY: connectionsModalSlide }] }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="people-outline" size={20} color={T.yellow} />
                <Text style={styles.modalTitle}>{connectionsList.length} Connections</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConnectionsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.connectionModalItem}
                  onPress={() => {
                    setShowConnectionsModal(false);
                    navigation.navigate('UserProfile', { userId: item._id });
                  }}
                >
                  <View style={styles.connectionModalAvatar}>
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.connectionModalAvatarImg} />
                    ) : (
                      <LinearGradient colors={[T.yellow, T.yellow]} style={styles.connectionModalAvatarPlaceholder}>
                        <Text style={styles.connectionModalAvatarText}>
                          {item.name?.charAt(0)?.toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                    {item.isOnline && <View style={styles.connectionModalOnlineDot} />}
                  </View>
                  <View style={styles.connectionModalInfo}>
                    <Text style={styles.connectionModalName}>{item.name}</Text>
                    <Text style={styles.connectionModalHeadline} numberOfLines={1}>
                      {item.headline || "TDC Member"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyConnectionsModal}>
                  <Ionicons name="people-outline" size={50} color={T.textFaint} />
                  <Text style={styles.emptyConnectionsText}>no connections yet</Text>
                </View>
              }
              contentContainerStyle={styles.connectionsModalList}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={10}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                if (selectedPost) {
                  const type = activeTab === 'posts' ? 'post' : 'confession';
                  deleteItem(selectedPost, type);
                }
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: T.dangerBg }]}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </View>
              <Text style={[styles.optionText, { color: T.danger }]}>delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => setShowOptionsModal(false)}>
              <View style={[styles.optionIcon, { backgroundColor: T.sand }]}>
                <Ionicons name="close-outline" size={20} color={T.textMuted} />
              </View>
              <Text style={styles.optionText}>cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  campusOnlyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    backgroundColor: T.ink,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  campusOnlyTagText: { color: T.yellow, fontSize: 10, fontFamily: F.bodyBold },
  container: { flex: 1, backgroundColor: T.paper, paddingBottom: 20 },

  inlineLoader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // Top Nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  navBtn: {
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 20, fontFamily: F.headingBold, color: T.ink },

  // Header
  headerSection: { backgroundColor: T.paper },
  headerRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 4, padding: 16, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  avatarContainer: { marginRight: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: T.white },
  headerRight: { flex: 1 },
  name: { fontSize: 20, fontFamily: F.headingBold, color: T.ink },
  handle: { fontSize: 15, fontFamily: F.body, color: T.textMuted, marginTop: 1 },
  bioText: { fontSize: 15, fontFamily: F.body, color: T.ink, marginTop: 8, lineHeight: 20 },
  uniText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginTop: 4 },

  // Stats
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 20 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink },
  statLab: { fontSize: 14, fontFamily: F.body, color: T.textMuted },

  // Edit Button
  editBtn: { marginTop: 12, alignSelf: 'flex-start' },
  gradientBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 40, borderRadius: 20 },
  editBtnText: { color: T.yellow, fontFamily: F.bodyBold, fontSize: 14 },

  // Tabs
  tabWrapper: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: T.sand,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 20,
  },
  activeTab: { backgroundColor: T.ink },
  tabText: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },
  activeTabText: { color: T.white, fontFamily: F.bodyBold },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.yellow,
  },

  tabContent: { flex: 1 },

  // Post Card
  postCard: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line,
  },
  cardUserHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatarWrapper: { marginRight: 12 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20 },
  cardHeaderText: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  cardUserName: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink },
  cardHandle: { fontSize: 14, fontFamily: F.body, color: T.textMuted },
  cardTime: { fontSize: 14, fontFamily: F.body, color: T.textMuted },
  menuBtn: { padding: 4 },
  cardBody: { marginTop: 4 },
  postTextContent: { fontSize: 15, fontFamily: F.body, color: T.ink, lineHeight: 22 },
  showMoreBtn: { marginTop: 4 },
  showMoreText: { color: T.yellow, fontFamily: F.body, fontSize: 14 },
  imageWrapper: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  postImage: { width: '100%', height: 220, backgroundColor: T.sand },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, color: T.textMuted, fontFamily: F.body },

  // Empty State
  emptyContainer: { paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink, marginTop: 12 },
  emptySubText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginTop: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" },
  modalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', minHeight: '40%' },
  connectionsModalContent: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '40%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: { width: 36, height: 4, backgroundColor: T.sand, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },

  // Connection Modal Items
  connectionsModalList: { paddingBottom: 20 },
  connectionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  connectionModalAvatar: { position: 'relative' },
  connectionModalAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  connectionModalAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  connectionModalAvatarText: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  connectionModalOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: T.success,
    borderWidth: 2,
    borderColor: T.white,
  },
  connectionModalInfo: { flex: 1, marginLeft: 12 },
  connectionModalName: { fontSize: 15, fontFamily: F.bodySemi, color: T.ink },
  connectionModalHeadline: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginTop: 1 },
  emptyConnectionsModal: { alignItems: 'center', paddingVertical: 40 },
  emptyConnectionsText: { fontSize: 16, fontFamily: F.body, color: T.textMuted, marginTop: 12 },

  // Like Modal
  likeUserItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: T.line },
  likeUserAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  likeUserName: { fontSize: 15, fontFamily: F.bodySemi, color: T.ink, flex: 1 },

  // Comment Modal
  commentItem: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: T.sand },
  commentContent: { flex: 1 },
  commentBubble: { backgroundColor: T.sand, padding: 10, borderRadius: 14, borderTopLeftRadius: 4 },
  commentUserName: { fontSize: 13, fontFamily: F.bodyBold, color: T.ink, marginBottom: 2 },
  commentText: { fontSize: 14, fontFamily: F.body, color: T.ink, lineHeight: 20 },
  commentTime: { fontSize: 10, fontFamily: F.body, color: T.textMuted, marginTop: 4, marginLeft: 4 },
  commentInputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: T.line, alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: T.paper, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: F.body, color: T.ink, maxHeight: 80 },
  sendCommentBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.yellow, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: T.sand },
  noDataText: { textAlign: 'center', color: T.textMuted, padding: 30, fontFamily: F.bodyMedium },

  // Options Modal
  optionsOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: T.card, borderRadius: 16, width: width * 0.6, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  optionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 15, fontFamily: F.bodySemi, color: T.ink },

  listContentContainer: { paddingBottom: 40, flexGrow: 1 },
});