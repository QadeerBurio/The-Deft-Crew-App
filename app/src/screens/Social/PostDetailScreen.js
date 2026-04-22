import React, { useState, useEffect, useContext } from 'react';
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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function PostDetailScreen({ route, navigation }) {
  const { postId, onGoBack } = route.params || {};
  const { token, user } = useContext(AuthContext);
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/posts/${postId}`, config);
      setPost(response.data);
      
      // Check if current user liked the post
      const isLiked = response.data.likes?.some(
        like => like._id === user._id
      );
      setLiked(isLiked);
      setLikesCount(response.data.likes?.length || 0);
      
      // Mark post as viewed (optional)
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
    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      setLiked(response.data.liked);
      setLikesCount(response.data.likes);
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Failed to like post");
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
        // Update post with new comments
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
              // Refresh post to get updated comments
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

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.user?.profileImage || 'https://via.placeholder.com/150' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.user?.name || "Unknown"}</Text>
          <Text style={styles.commentTime}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
      {item.user?._id === user._id && (
        <TouchableOpacity
          onPress={() => handleDeleteComment(item._id)}
          style={styles.deleteCommentBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color="#CCC" />
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          {post.author?._id === user._id && (
            <TouchableOpacity onPress={handleDeletePost}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          {/* Post Author */}
          <View style={styles.authorSection}>
            <Image
              source={{ uri: post.author?.profileImage || 'https://via.placeholder.com/150' }}
              style={styles.authorAvatar}
            />
            <View>
              <Text style={styles.authorName}>{post.author?.name || "Unknown"}</Text>
              <Text style={styles.postTime}>
                {new Date(post.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Post Content */}
          {post.content && (
            <Text style={styles.postContent}>{post.content}</Text>
          )}
          
          {post.image && (
            <Image
              source={{ uri: post.image }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}

          {/* Likes Section */}
          <View style={styles.statsSection}>
            <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
              <Ionicons 
                name={liked ? "heart" : "heart-outline"} 
                size={24} 
                color={liked ? "#FF3B30" : "#666"} 
              />
              <Text style={[styles.likeCount, liked && styles.likedText]}>
                {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({post.comments?.length || 0})
            </Text>
            
            <FlatList
              data={post.comments || []}
              keyExtractor={(item) => item._id}
              renderItem={renderComment}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first to comment!</Text>
                </View>
              }
            />
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={submitting || !commentText.trim()}
            style={[
              styles.sendButton,
              (!commentText.trim() || submitting) && styles.sendButtonDisabled
            ]}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={commentText.trim() && !submitting ? "#6C63FF" : "#CCC"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF"
  },
  flex: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFF"
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingTop: Platform.OS === 'android' ? 45 : 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A'
  },
  content: {
    flex: 1
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  authorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#EEE'
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  postTime: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    paddingHorizontal: 15,
    paddingVertical: 12
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F0F0F0'
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  likeCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666'
  },
  likedText: {
    color: '#FF3B30'
  },
  commentsSection: {
    padding: 15
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 15
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#EEE'
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  commentTime: {
    fontSize: 10,
    color: '#AAA'
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20
  },
  deleteCommentBtn: {
    padding: 8,
    marginLeft: 5
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 30
  },
  emptyCommentsText: {
    color: '#999',
    fontSize: 14
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF'
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: '#FFF'
  },
  sendButton: {
    marginLeft: 10,
    padding: 8
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20
  },
  backButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600'
  }
});