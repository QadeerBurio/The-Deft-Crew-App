import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e6b800',
  primaryLight: '#fef9f0',
  white: '#ffffff',
  black: '#1a1a1a',
  dark: '#0f1419',
  gray: '#666666',
  lightGray: '#f5f6f8',
  border: '#eef0f2',
  danger: '#ff4757',
  success: '#2ecc71',
  text: '#1a1a1a',
  textSecondary: '#71767b',
  textLight: '#8899a6',
  shadow: 'rgba(0,0,0,0.05)',
};

// Modern Comment Item
const CommentItem = React.memo(({ item, currentUserId, onDelete, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const isOwnComment = item.user?._id === currentUserId;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 50,
        useNativeDriver: true,
        tension: 50,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.commentItem,
      { 
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }]
      }
    ]}>
      <Image
        source={{ 
          uri: item.user?.profileImage || 
          `https://ui-avatars.com/api/?name=${item.user?.name || 'User'}&background=f9c349&color=1a1a1a&size=64` 
        }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <View style={styles.commentUserInfo}>
            <Text style={styles.commentUserName}>{item.user?.name || "Unknown"}</Text>
            {isOwnComment && (
              <View style={styles.ownBadge}>
                <Text style={styles.ownBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.commentTime}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
      {isOwnComment && (
        <TouchableOpacity
          onPress={() => onDelete(item._id)}
          style={styles.deleteCommentBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

export default function PostDetailScreen({ route, navigation }) {
  const { postId, onGoBack } = route.params || {};
  const { token, user } = useContext(AuthContext);
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const inputSlide = useRef(new Animated.Value(50)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(inputSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [postId]);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/posts/${postId}`, config);
      setPost(response.data);
      
      const isLiked = response.data.likes?.some(
        like => like._id === user._id
      );
      setLiked(isLiked);
      setLikesCount(response.data.likes?.length || 0);
      
      await axios.post(`${API_URL}/posts/view/${postId}`, {}, config);
    } catch (error) {
      console.error("Error fetching post:", error);
      if (error.response?.status === 404) {
        Alert.alert("Error", "Post not found", [
          { text: "Go Back", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", "Failed to load post");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
    // Animate like button with pulse
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.4,
        friction: 2,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for heart
    if (!liked) {
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(heartPulse, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }

    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      setLiked(response.data.liked);
      setLikesCount(response.data.likes);
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${API_URL}/posts/comment/${postId}`,
        { text: commentText.trim() },
        config
      );
      
      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          comments: response.data.comments
        }));
        setCommentText('');
      }
    } catch (error) {
      console.error("Comment error:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
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
              await axios.delete(
                `${API_URL}/posts/comment/${postId}/${commentId}`,
                config
              );
              fetchPostDetails();
            } catch (error) {
              console.error("Delete comment error:", error);
              Alert.alert("Error", "Failed to delete comment");
            }
          }
        }
      ]
    );
  };

  const handleDeletePost = async () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/posts/${postId}`, config);
              Alert.alert("Success", "Post deleted successfully");
              navigation.goBack();
              if (onGoBack) onGoBack();
            } catch (error) {
              console.error("Delete post error:", error);
              Alert.alert("Error", "Failed to delete post");
            }
          }
        }
      ]
    );
  };

  const renderComment = ({ item, index }) => (
    <CommentItem 
      item={item} 
      currentUserId={user._id} 
      onDelete={handleDeleteComment}
      index={index}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Animated.View style={{ opacity: fadeAnim }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.errorContainer}>
          <LinearGradient colors={['#fef9f0', '#fff']} style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={COLORS.primary} />
          </LinearGradient>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubText}>The post you're looking for doesn't exist</Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.backButtonGradient}>
              <Ionicons name="arrow-back" size={20} color={COLORS.black} />
              <Text style={styles.backButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAuthor = post.author?._id === user._id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.headerBackBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          {isAuthor && (
            <TouchableOpacity 
              onPress={handleDeletePost}
              style={styles.headerDeleteBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
            </TouchableOpacity>
          )}
          {!isAuthor && <View style={styles.headerPlaceholder} />}
        </Animated.View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }}>
            {/* Post Author */}
            <View style={styles.authorSection}>
              <TouchableOpacity 
                style={styles.authorAvatarWrapper}
                onPress={() => navigation.navigate('UserProfile', { userId: post.author?._id })}
              >
                <Image
                  source={{ 
                    uri: post.author?.profileImage || 
                    `https://ui-avatars.com/api/?name=${post.author?.name || 'User'}&background=f9c349&color=1a1a1a&size=128` 
                  }}
                  style={styles.authorAvatar}
                />
                <LinearGradient 
                  colors={['transparent', COLORS.primary]} 
                  style={styles.avatarRing}
                />
              </TouchableOpacity>
              <View style={styles.authorInfo}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.author?._id })}>
                  <Text style={styles.authorName}>{post.author?.name || "Unknown"}</Text>
                </TouchableOpacity>
                <View style={styles.authorMeta}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.postTime}>
                    {new Date(post.createdAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  {post.category && (
                    <>
                      <View style={styles.metaDot} />
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{post.category}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Post Content */}
            {post.content && (
              <Text style={styles.postContent}>{post.content}</Text>
            )}
            
            {post.image && (
              <TouchableOpacity 
                style={styles.imageWrapper}
                activeOpacity={0.9}
                onPress={() => {
                  // Could open fullscreen image viewer
                  Alert.alert("Image", "Fullscreen view coming soon");
                }}
              >
                <Image
                  source={{ uri: post.image }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
                <LinearGradient 
                  colors={['transparent', 'rgba(0,0,0,0.1)']} 
                  style={styles.imageGradient}
                />
              </TouchableOpacity>
            )}

            {/* Stats Section */}
            <View style={styles.statsSection}>
              <TouchableOpacity 
                onPress={handleLike} 
                style={styles.likeButton}
                activeOpacity={0.6}
                disabled={isLiking}
              >
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                  <Animated.View style={{ transform: [{ scale: heartPulse }] }}>
                    <Ionicons 
                      name={liked ? "heart" : "heart-outline"} 
                      size={26} 
                      color={liked ? COLORS.danger : COLORS.textSecondary} 
                    />
                  </Animated.View>
                </Animated.View>
                <Text style={[styles.likeCount, liked && styles.likedText]}>
                  {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <View style={styles.commentStat}>
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.commentStatText}>
                  {post.comments?.length || 0} Comments
                </Text>
              </View>
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <View style={styles.commentsHeader}>
                <View style={styles.commentsHeaderLeft}>
                  <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.commentsTitle}>Comments</Text>
                </View>
                <View style={styles.commentsCount}>
                  <Text style={styles.commentsCountText}>
                    {post.comments?.length || 0}
                  </Text>
                </View>
              </View>
              
              {post.comments && post.comments.length > 0 ? (
                <FlatList
                  data={post.comments}
                  keyExtractor={(item) => item._id}
                  renderItem={renderComment}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyComments}>
                  <LinearGradient colors={['#fef9f0', '#fff']} style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.primary} />
                  </LinearGradient>
                  <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                  <Text style={styles.emptyCommentsText}>Be the first to share your thoughts!</Text>
                </View>
              )}
            </View>

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </Animated.View>
        </ScrollView>

        {/* Comment Input */}
        <Animated.View style={[
          styles.commentInputContainer,
          { transform: [{ translateY: inputSlide }] }
        ]}>
          <View style={styles.commentInputWrapper}>
            <Image
              source={{ 
                uri: user?.profileImage || 
                `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=f9c349&color=1a1a1a&size=64` 
              }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={COLORS.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            {commentText.length > 0 && (
              <Text style={styles.charCount}>{commentText.length}/500</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleComment}
            disabled={submitting || !commentText.trim()}
            style={[
              styles.sendButton,
              (!commentText.trim() || submitting) && styles.sendButtonDisabled
            ]}
            activeOpacity={0.7}
          >
            <LinearGradient 
              colors={commentText.trim() && !submitting ? [COLORS.primary, COLORS.primaryDark] : ['#e0e0e0', '#e0e0e0']} 
              style={styles.sendButtonGradient}
            >
              <Ionicons 
                name="send" 
                size={18} 
                color={commentText.trim() && !submitting ? COLORS.black : COLORS.textLight} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  flex: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  errorSubText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  backButtonText: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  headerDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  authorAvatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  authorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lightGray,
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 29,
    opacity: 0.3,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 2,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textLight,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  categoryText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 28,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontWeight: '400',
  },
  imageWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  postImage: {
    width: '100%',
    height: 350,
    backgroundColor: COLORS.lightGray,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  likedText: {
    color: COLORS.danger,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  commentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentStatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  commentsSection: {
    padding: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  commentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.black,
  },
  commentsCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 12,
    borderTopLeftRadius: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
  ownBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ownBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.black,
  },
  commentTime: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: '400',
  },
  deleteCommentBtn: {
    padding: 6,
    marginLeft: 6,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCommentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  emptyCommentsText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '400',
  },
  bottomSpacer: {
    height: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  commentInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 4,
    backgroundColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.black,
  },
  charCount: {
    fontSize: 10,
    color: COLORS.textLight,
    marginRight: 8,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
});