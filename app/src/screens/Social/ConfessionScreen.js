import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share, Animated,
  Keyboard, TouchableWithoutFeedback
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const { height, width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// Modern Skeleton Component
const ConfessionSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { 
          toValue: 1, 
          duration: 1000, 
          useNativeDriver: true 
        }),
        Animated.timing(shimmerAnim, { 
          toValue: 0, 
          duration: 1000, 
          useNativeDriver: true 
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3]
  });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
            <View style={styles.skeletonHeaderText}>
              <Animated.View style={[styles.skeletonLine, { width: 100, height: 12, opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonLine, { width: 70, height: 10, marginTop: 6, opacity: shimmerOpacity }]} />
            </View>
          </View>
          <Animated.View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12, opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonImage, { opacity: shimmerOpacity }]} />
          <View style={styles.skeletonFooter}>
            <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonAction, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default function ConfessionScreen() {
  const { token, user } = useContext(AuthContext);
  
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [textLineCounts, setTextLineCounts] = useState({});

  const [modalVisible, setModalVisible] = useState(false);
  const [newConfession, setNewConfession] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (modalVisible) {
      modalSlide.setValue(300);
      Animated.spring(modalSlide, { 
        toValue: 0, 
        friction: 7, 
        tension: 40, 
        useNativeDriver: true 
      }).start();
    }
  }, [modalVisible]);

  const fetchConfessions = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/confessions/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const userUniversity = user?.university?.name || user?.university?._id;
      const filteredData = data.filter(confession => {
        if (!userUniversity) return true;
        return confession.location === userUniversity || 
               confession.university === user?.university?._id ||
               confession.authorUniversity === userUniversity;
      });
      setConfessions(filteredData);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleTextLayout = (postId, event) => {
    const lines = event.nativeEvent.lines.length;
    // Only set if > 7 lines and not already set
    if (lines > 7 && textLineCounts[postId] !== lines) {
      setTextLineCounts(prev => ({
        ...prev,
        [postId]: lines
      }));
    }
    // If <= 7 lines, ensure it's not in the state
    if (lines <= 7 && textLineCounts[postId] !== undefined) {
      setTextLineCounts(prev => {
        const newState = {...prev};
        delete newState[postId];
        return newState;
      });
    }
  };

  const handleLike = async (id) => {
    if (!token) return;
    
    setConfessions(prevConfessions => 
      prevConfessions.map(confession => 
        confession._id === id 
          ? {
              ...confession,
              likes: confession.likedByCurrentUser 
                ? confession.likes - 1 
                : confession.likes + 1,
              likedByCurrentUser: !confession.likedByCurrentUser
            }
          : confession
      )
    );

    try {
      await fetch(`${API_URL}/confessions/like/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch (err) { 
      fetchConfessions();
    }
  };

  const openComments = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/confessions/comment/${selectedPost._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: commentText.trim() })
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        setSelectedPost(updatedPost);
        setCommentText("");
        setConfessions(prev =>
          prev.map(c => c._id === updatedPost._id ? updatedPost : c)
        );
      }
    } catch (err) { Alert.alert("Error", "Network error"); }
    finally { setCommentLoading(false); }
  };

  const uploadToCloudinary = async (fileUri) => {
    const data = new FormData();
    data.append("file", { uri: fileUri, name: 'upload.jpg', type: 'image/jpeg' });
    data.append("upload_preset", "tdc_profiles");
    const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "POST", body: data });
    const json = await res.json();
    return json.secure_url;
  };

  const handlePost = async () => {
    if (!newConfession.trim() && !selectedImage) {
      Alert.alert("Error", "Please add text or an image");
      return;
    }
    
    setPosting(true);
    try {
      let imageUrl = "";
      if (selectedImage) imageUrl = await uploadToCloudinary(selectedImage);

      const response = await fetch(`${API_URL}/confessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newConfession.trim(), image: imageUrl })
      });

      if (response.ok) {
        resetForm();
        fetchConfessions();
      }
    } catch (err) { Alert.alert("Error", "Check your connection"); }
    finally { setPosting(false); }
  };

  const resetForm = () => {
    setNewConfession("");
    setSelectedImage(null);
    setModalVisible(false);
  };

  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status) return Alert.alert("Permission required", "Allow access to your photos.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const renderConfession = ({ item, index }) => {
    const isLiked = item.likedByCurrentUser;
    const isExpanded = expandedPosts[item._id] || false;
    const lineCount = textLineCounts[item._id] || 0;
    const shouldShowMore = lineCount > 7;
    // Also check if text might be long (fallback check)
    const textLength = item.text?.length || 0;
    const likelyLongText = textLength > 200;

    return (
      <Animated.View 
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0]
              })
            }]
          }
        ]}
      >
        {/* Card Header - Anonymous */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <LinearGradient 
              colors={['#1a1a1a', '#2d2d2d']} 
              style={styles.avatarCircle}
            >
              <Ionicons name="person" size={18} color="#f9c349" />
            </LinearGradient>
            <View>
              <Text style={styles.anonymousName}>Anonymous</Text>
              <Text style={styles.postTime}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#f9c349', '#e6b800']}
              style={styles.confessionBadge}
            >
              <Ionicons name="lock-closed" size={10} color="#fff" />
              <Text style={styles.badgeText}>Confession</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Content with Show More */}
        {item.text && (
          <View>
            <Text 
              style={styles.confessionText}
              numberOfLines={isExpanded ? undefined : 7}
              onTextLayout={(event) => {
                // This will fire when text is measured
                const lines = event.nativeEvent.lines.length;
                if (lines > 7) {
                  setTextLineCounts(prev => ({
                    ...prev,
                    [item._id]: lines
                  }));
                } else {
                  // If 7 or fewer lines, remove from state
                  setTextLineCounts(prev => {
                    const newState = {...prev};
                    delete newState[item._id];
                    return newState;
                  });
                }
              }}
            >
              {item.text}
            </Text>
            {(shouldShowMore || likelyLongText) && (
              <TouchableOpacity 
                onPress={() => toggleExpand(item._id)} 
                style={styles.showMoreBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.showMoreText}>
                  {isExpanded ? 'Show less' : `Show more`}
                </Text>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="#f9c349" 
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {item.image && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.image }} 
              style={styles.postImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.05)']}
              style={styles.imageOverlay}
            />
          </View>
        )}

        {/* Footer Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.actionBtn, isLiked && styles.actionBtnLiked]} 
            onPress={() => handleLike(item._id)} 
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={isLiked ? "#f9c349" : "#666"} 
            />
            <Text style={[styles.actionText, isLiked && {color: "#f9c349"}]}>
              {item.likes > 0 ? item.likes : 'Like'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => openComments(item)} 
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionText}>
              {item.comments?.length > 0 ? item.comments.length : 'Comment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => Share.share({ 
              message: `💭 Anonymous Confession: "${item.text}"\n\nShared via TDC` 
            })}
          >
            <Ionicons name="share-social-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) return <ConfessionSkeleton />;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlatList
          data={confessions}
          renderItem={renderConfession}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { 
                setRefreshing(true); 
                fetchConfessions(); 
              }} 
              tintColor="#f9c349"
              colors={["#f9c349"]}
              progressBackgroundColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={50} color="#f9c349" />
              </View>
              <Text style={styles.emptyTitle}>No Confessions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Share your thoughts anonymously with your campus community
              </Text>
              <TouchableOpacity 
                style={styles.emptyBtn}
                onPress={handleFabPress}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#2d2d2d']}
                  style={styles.emptyBtnGradient}
                >
                  <Text style={styles.emptyBtnText}>Create Confession</Text>
                  <Ionicons name="arrow-forward" size={18} color="#f9c349" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        {/* FAB Button */}
        <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
            <LinearGradient 
              colors={['#1a1a1a', '#2d2d2d']} 
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color="#f9c349" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Create Confession Modal - FIXED */}
        <Modal 
          visible={modalVisible} 
          animationType="fade" 
          transparent 
          onRequestClose={resetForm}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalSlide }] }]}>
                  <View style={styles.dragHandle} />
                  
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Share Confession</Text>
                    <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                      <Ionicons name="close" size={22} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.anonymityBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#f9c349" />
                    <Text style={styles.anonymityText}>
                      Your identity is 100% anonymous
                    </Text>
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="What's on your mind? 🤔"
                    placeholderTextColor="#999"
                    multiline
                    value={newConfession}
                    onChangeText={setNewConfession}
                    maxLength={1000}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  
                  <Text style={styles.charCount}>
                    {newConfession.length}/1000
                  </Text>
                  
                  

                  

                  <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={handlePost} 
                    disabled={posting} 
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={['#1a1a1a', '#2d2d2d']} 
                      style={styles.submitGradient}
                    >
                      {posting ? (
                        <ActivityIndicator color="#f9c349" />
                      ) : (
                        <>
                          <Text style={styles.submitText}>Post Confession</Text>
                          <Ionicons name="send" size={18} color="#f9c349" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Comments Modal - FIXED */}
        <Modal 
          visible={commentModalVisible} 
          animationType="slide" 
          transparent 
          onRequestClose={() => setCommentModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.commentModalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.commentModalOverlay}>
                <View style={styles.commentModalContainer}>
                  <View style={styles.dragHandle} />
                  
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <Ionicons name="chatbubbles" size={20} color="#f9c349" />
                      <Text style={styles.commentTitle}>Comments</Text>
                      {selectedPost?.comments?.length > 0 && (
                        <View style={styles.commentCount}>
                          <Text style={styles.commentCountText}>
                            {selectedPost.comments.length}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setCommentModalVisible(false)} style={styles.closeBtn}>
                      <Ionicons name="close" size={22} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={selectedPost?.comments || []}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    contentContainerStyle={styles.commentList}
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <Ionicons name="chatbubble-outline" size={50} color="#e0e0e0" />
                        <Text style={styles.emptyCommentTitle}>No comments yet</Text>
                        <Text style={styles.emptyCommentSub}>Be the first to comment!</Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.commentItem}>
                        <View style={styles.commentAvatar}>
                          <Ionicons name="person" size={14} color="#f9c349" />
                        </View>
                        <View style={styles.commentBody}>
                          <Text style={styles.commentUser}>Anonymous</Text>
                          <Text style={styles.commentText}>{item.text}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}
                  />

                  <View style={styles.commentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Write an anonymous comment..."
                      placeholderTextColor="#999"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={800}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                    <TouchableOpacity 
                      onPress={handlePostComment} 
                      disabled={commentLoading || !commentText.trim()}
                      style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                    >
                      <LinearGradient
                        colors={commentText.trim() ? ['#1a1a1a', '#2d2d2d'] : ['#ccc', '#ddd']}
                        style={styles.sendBtnGradient}
                      >
                        <Ionicons name="send" size={18} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fa" 
  },

  // Skeleton
  skeletonContainer: { 
    padding: 12,
    paddingTop: 4,
  },
  skeletonCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 12
  },
  skeletonAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f0f0f0', 
    marginRight: 12
  },
  skeletonHeaderText: { flex: 1 },
  skeletonLine: { 
    backgroundColor: '#f0f0f0', 
    borderRadius: 4
  },
  skeletonImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginTop: 12
  },
  skeletonFooter: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    gap: 24
  },
  skeletonAction: {
    width: 60,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10
  },

  // List Content
  listContent: { 
    padding: 12,
    paddingBottom: 100,
    paddingTop: 4,
  },

  // Card Styles
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 12, 
    marginTop:8,
    padding: 16,
    borderWidth: 1, 
    borderColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatarCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  anonymousName: { 
    fontWeight: '700', 
    fontSize: 14, 
    color: '#1a1a1a' 
  },
  postTime: { 
    fontSize: 11, 
    color: '#999', 
    marginTop: 2,
    fontWeight: '500'
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  confessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confessionText: { 
    fontSize: 15, 
    color: '#1a1a1a', 
    lineHeight: 24, 
    marginBottom: 4,
    fontWeight: '400',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
    marginTop: 2,
  },
  showMoreText: {
    fontSize: 13,
    color: '#f9c349',
    fontWeight: '700',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  postImage: { 
    width: '100%', 
    height: 280, 
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#f5f5f5', 
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    gap: 6,
  },
  actionBtnLiked: {
    backgroundColor: '#fef9f0',
  },
  actionText: { 
    color: '#666', 
    fontSize: 13, 
    fontWeight: '600' 
  },

  // Empty State
  emptyContainer: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 20, 
    backgroundColor: '#fef9f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fdebd0',
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: '#999', 
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // FAB
  fabContainer: {
    position: 'absolute', 
    bottom: 140, 
    right:17, 
    elevation: 8,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fab: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fabGradient: { 
    width: 47, 
    height: 47, 
    borderRadius: 47, 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: height * 0.85,
    marginBottom: Platform.OS === 'ios' ? 20 : 0, // Add extra margin for iOS
  },
  dragHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: '#e0e0e0', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 16,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1a1a1a' 
  },
  closeBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  anonymityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef9f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  anonymityText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
  },
  input: { 
    fontSize: 15, 
    minHeight: 120, 
    maxHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 2, 
    borderColor: '#f0f0f0', 
    borderRadius: 14, 
    padding: 14,
    marginBottom: 6, 
    color: '#1a1a1a', 
    backgroundColor: '#fafafa',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginBottom: 12,
  },
  previewContainer: { 
    position: 'relative', 
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: { 
    width: '100%', 
    height: 180, 
    borderRadius: 12,
  },
  removeImage: { 
    position: 'absolute', 
    top: 8, 
    right: 8,
  },
  removeImageBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  imagePickBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    padding: 14, 
    backgroundColor: '#fafafa', 
    borderRadius: 14,
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#f0f0f0', 
    gap: 10,
    borderStyle: 'dashed',
  },
  imagePickText: { 
    color: '#f9c349', 
    fontWeight: '700', 
    fontSize: 14 
  },
  submitBtn: { 
    borderRadius: 14, 
    overflow: 'hidden',
    marginBottom: 10,
  },
  submitGradient: { 
    paddingVertical: 14, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10,
  },
  submitText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
  },

  // Comments Modal
  commentModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  commentModalContainer: { 
    backgroundColor: '#fff', 
    height: height * 0.7, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  commentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1a1a1a' 
  },
  commentCount: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  commentList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyComments: { 
    alignItems: 'center', 
    paddingVertical: 60,
  },
  emptyCommentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
    marginTop: 12,
  },
  emptyCommentSub: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
  },
  commentItem: { 
    flexDirection: 'row', 
    marginBottom: 16,
  },
  commentAvatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  commentBody: { 
    flex: 1, 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 14, 
    borderTopLeftRadius: 6,
  },
  commentUser: { 
    fontWeight: '700', 
    fontSize: 12, 
    marginBottom: 2, 
    color: '#1a1a1a' 
  },
  commentText: { 
    color: '#444', 
    fontSize: 14, 
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 4,
  },
  commentInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    gap: 10,
    backgroundColor: '#fff',
  },
  commentInput: { 
    flex: 1, 
    minHeight: 42, 
    maxHeight: 100, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    fontSize: 14, 
    color: '#1a1a1a' 
  },
  sendBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    overflow: 'hidden',
  },
  sendBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { 
    opacity: 0.5 
  },
});