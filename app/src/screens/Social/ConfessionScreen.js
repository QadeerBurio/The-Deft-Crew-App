import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share, Animated
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const { height, width } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// Enhanced Skeleton Component
const ConfessionSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { 
          toValue: 1, 
          duration: 1200, 
          useNativeDriver: true 
        }),
        Animated.timing(shimmerAnim, { 
          toValue: 0, 
          duration: 1200, 
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

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100]
  });

  const SkeletonCard = ({ hasImage }) => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[
          styles.skeletonAvatar,
          { opacity: shimmerOpacity }
        ]}>
          <Animated.View style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] }
          ]} />
        </Animated.View>
        <View style={styles.skeletonHeaderText}>
          <Animated.View style={[
            styles.skeletonLine,
            { width: 130, height: 14, opacity: shimmerOpacity }
          ]}>
            <Animated.View style={[
              styles.shimmerOverlay,
              { transform: [{ translateX: shimmerTranslate }] }
            ]} />
          </Animated.View>
          <Animated.View style={[
            styles.skeletonLine,
            { width: 90, height: 10, marginTop: 6, opacity: shimmerOpacity }
          ]}>
            <Animated.View style={[
              styles.shimmerOverlay,
              { transform: [{ translateX: shimmerTranslate }] }
            ]} />
          </Animated.View>
        </View>
      </View>
      
      <Animated.View style={[
        styles.skeletonLine,
        { width: '95%', height: 12, marginTop: 16, opacity: shimmerOpacity }
      ]}>
        <Animated.View style={[
          styles.shimmerOverlay,
          { transform: [{ translateX: shimmerTranslate }] }
        ]} />
      </Animated.View>
      <Animated.View style={[
        styles.skeletonLine,
        { width: '75%', height: 12, marginTop: 8, opacity: shimmerOpacity }
      ]}>
        <Animated.View style={[
          styles.shimmerOverlay,
          { transform: [{ translateX: shimmerTranslate }] }
        ]} />
      </Animated.View>
      
      {hasImage && (
        <Animated.View style={[
          styles.skeletonImage,
          { opacity: shimmerOpacity }
        ]}>
          <Animated.View style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] }
          ]} />
        </Animated.View>
      )}
      
      <View style={styles.skeletonFooter}>
        <View style={styles.skeletonActions}>
          <Animated.View style={[
            styles.skeletonAction,
            { opacity: shimmerOpacity }
          ]} />
          <Animated.View style={[
            styles.skeletonAction,
            { opacity: shimmerOpacity }
          ]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonTitle}>
        <Animated.View style={[
          styles.skeletonLine,
          { width: 150, height: 28, opacity: shimmerOpacity }
        ]}>
          <Animated.View style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] }
          ]} />
        </Animated.View>
        <Animated.View style={[
          styles.skeletonLine,
          { width: 200, height: 12, marginTop: 8, opacity: shimmerOpacity }
        ]}>
          <Animated.View style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] }
          ]} />
        </Animated.View>
      </View>
      <SkeletonCard hasImage={true} />
      <SkeletonCard hasImage={false} />
      <SkeletonCard hasImage={true} />
    </View>
  );
};

export default function ConfessionScreen() {
  const { token, user } = useContext(AuthContext);
  
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [newConfession, setNewConfession] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Enhanced animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(300)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

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
    
    // Header entrance animation
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
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
      // ✅ Filter: Only show confessions from same university
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
      fetchConfessions(); // Revert on error
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

  const renderConfession = ({ item, index }) => {
    const isLiked = item.likedByCurrentUser;

    return (
      <Animated.View style={styles.card}>
        {/* Enhanced Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <LinearGradient 
              colors={['#6d6b67', '#6a6968']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }}
              style={styles.secretIcon}
            >
              <Ionicons name="eye-off" size={16} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.anonymousText}>Anonymous Confession</Text>
              <Text style={styles.timeText}>
                {item.location || "TDC Campus"} </Text>
              <Text style={styles.timeText}> {new Date(item.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Content */}
        {item.text ? (
          <Text style={styles.confessionText}>
            {item.text}
          </Text>
        ) : null}
        
        {/* Enhanced Image Display */}
        {item.image ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.image }} 
              style={styles.postImage}
              resizeMode="cover"
              onError={() => console.log('Image load error')}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.03)']}
              style={styles.imageGradient}
            />
          </View>
        ) : null}

        {/* Enhanced Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <TouchableOpacity 
              style={[styles.actionBtn, isLiked && styles.actionBtnLiked]} 
              onPress={() => handleLike(item._id)} 
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={isLiked ? "#ff4757" : "#666"} 
              />
              <Text style={[styles.actionText, isLiked && {color: "#ff4757"}]}>
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
          </View>
          
          <TouchableOpacity 
            style={styles.shareBtn}
            onPress={() => Share.share({ 
              message: ` Anonymous Confession: "${item.text}"\n\nShared via TDC App` 
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Enhanced Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <LinearGradient
          colors={['#ffffff', '#fafafa']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>tdc</Text>
              <Text style={styles.logoDot}>.</Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerLabel}>💭 Confessions</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.headerSubContainer}>
          <Ionicons name="school" size={15} color="#f9c349" />
          <Text style={styles.headerSub}>
            {user?.university?.name || "Your Campus"} 
            
          </Text>
        </View>
        <View style={styles.headerDivider} />
      </Animated.View>

      {/* Feed */}
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
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.emptyState}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={50} color="#f9c349" />
              </View>
              <Text style={styles.emptyText}>🌟 No Confessions Yet</Text>
              <Text style={styles.emptySubText}>
                Be the first to share your thoughts anonymously!
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionBtn}
                onPress={handleFabPress}
              >
                <Text style={styles.emptyActionText}>Create First Confession</Text>
                <Ionicons name="arrow-forward" size={16} color="#f9c349" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Enhanced FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={handleFabPress} 
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={['#1a1a1a', '#2d2d2d']} 
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="pencil" size={22} color="#f9c349" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="lock-closed" size={16} color="#f9c349" />
                <Text style={styles.modalTitle}>Anonymous Confession</Text>
              </View>
              <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.anonymityNotice}>
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
            />
            
            <Text style={styles.charCount}>
              {newConfession.length}/1000
            </Text>
            
            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
                    style={styles.removeImageGradient}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.imagePickBtn} 
              onPress={async () => {
                let result = await ImagePicker.launchImageLibraryAsync({ 
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.8 
                });
                if (!result.canceled) setSelectedImage(result.assets[0].uri);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={20} color="#f9c349" />
              <Text style={styles.imagePickText}>Add Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handlePost} 
              disabled={posting} 
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#1a1a1a', '#2d2d2d']} 
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {posting ? (
                  <ActivityIndicator color="#f9c349" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Share Anonymously</Text>
                    <Ionicons name="send" size={18} color="#f9c349" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={commentModalVisible} animationType="slide" transparent onRequestClose={() => setCommentModalVisible(false)}>
        <View style={styles.commentModalOverlay}>
          <View style={styles.commentModalContainer}>
            <View style={styles.dragHandle} />
            <View style={styles.commentHeader}>
              <View style={styles.commentHeaderLeft}>
                <Ionicons name="chatbubbles" size={18} color="#f9c349" />
                <Text style={styles.commentTitle}>Comments</Text>
                {selectedPost?.comments?.length > 0 && (
                  <View style={styles.commentCountBadge}>
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
              contentContainerStyle={{ padding: 16, flexGrow: 1 }}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubble-outline" size={50} color="#f9c349" />
                  <Text style={styles.emptyCommentText}>
                    No comments yet. Be the first! 🌟
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <LinearGradient
                    colors={['#747065', '#2d2d2d']}
                    style={styles.commentAvatar}
                  >
                    <Ionicons name="person" size={14} color="#fff" />
                  </LinearGradient>
                  <View style={styles.commentBody}>
                    <Text style={styles.commentUser}>🤫 Anonymous</Text>
                    <Text style={styles.commentTextContent}>{item.text}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write an anonymous comment..."
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
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
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff" 
  },
  
  // Enhanced Skeleton Styles
  skeletonContainer: { 
    flex: 1, 
    backgroundColor: '#ffffff',
    padding: 16 
  },
  skeletonTitle: {
    paddingVertical: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  skeletonCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden'
  },
  skeletonHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 8
  },
  skeletonHeaderText: {
    flex: 1
  },
  skeletonAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: '#f0f0f0', 
    marginRight: 12,
    overflow: 'hidden'
  },
  skeletonImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginTop: 12,
    overflow: 'hidden'
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5'
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 24
  },
  skeletonAction: {
    width: 60,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden'
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    width: '100%',
  },
  skeletonLine: { 
    backgroundColor: '#f0f0f0', 
    borderRadius: 6,
    overflow: 'hidden'
  },
  
  // Enhanced Header Styles
  header: { 
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerGradient: {
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 4
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#1a1a1a',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  logoDot: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f9c349',
    marginLeft: -2,
  },
  headerBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerLabel: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  headerSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  headerSub: { 
    color: '#666', 
    fontSize: 11, 
    fontWeight: '500',
  },
  headerSubAccent: {
    color: '#f9c349',
    fontWeight: '600',
  },
  headerDivider: {
    height: 3,
    backgroundColor: '#f9c349',
    width: '40%',
    marginLeft: 16,
    borderRadius: 2,
  },
  
  // List Styles
  listContent: { 
    padding: 16, 
    paddingBottom: 100 
  },
  
  // Enhanced Card Styles
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
   
    marginBottom: 16, 
    padding:10,
    borderWidth: 1, 
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    transform: [{ scale: 1 }],
  },
  cardHeader: { 
    flexDirection: "row", 
    marginBottom: 10,
    alignItems: 'flex-start'
  },
  headerInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1
  },
  secretIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  anonymousText: { 
    fontWeight: "700", 
    color: "#1a1a1a", 
    fontSize: 15,
    letterSpacing: 0.3,
  },
  timeText: { 
    fontSize: 11, 
    color: "#999", 
    marginTop: 3, 
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  confessionText: { 
    fontSize: 15, 
    color: "#1a1a1a", 
    lineHeight: 24, 
    marginBottom: 5, 
    fontWeight: '500',
    fontStyle: 'italic',
    
    padding: 14,
    borderRadius: 12,
    
    
  },
  
  // Enhanced Image Container
  imageContainer: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  postImage: { 
    width: '100%', 
    height: 320, 
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  
  // Enhanced Footer
  cardFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderTopWidth: 1, 
    borderTopColor: "#f5f5f5", 
    paddingTop: 14,
    marginTop: 4,
  },
  footerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  actionBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    gap: 6,
  },
  actionBtnLiked: {
    backgroundColor: '#fff5f5',
  },
  actionText: { 
    color: "#666", 
    fontSize: 13, 
    fontWeight: "600" 
  },
  shareBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  
  // Enhanced FAB
  fabContainer: {
    position: "absolute", 
    bottom: 24, 
    right: 16, 
    elevation: 8, 
    shadowColor: "#f9c349", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10,
  },
  fab: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  fabGradient: { 
    width: 58, 
    height: 58, 
    borderRadius: 18, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#f9c34933',
  },
  
  // Enhanced Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  modalContent: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, 
    maxHeight: height * 0.85 
  },
  dragHandle: { 
    width: 40, 
    height: 5, 
    backgroundColor: '#e0e0e0', 
    borderRadius: 3, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 12 
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  anonymityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef9f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fdebd0',
  },
  anonymityText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
  },
  closeBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  input: { 
    fontSize: 15, 
    minHeight: 120, 
    textAlignVertical: 'top',
    borderWidth: 2, 
    borderColor: "#f0f0f0", 
    borderRadius: 16, 
    padding: 16,
    marginBottom: 8, 
    color: '#1a1a1a', 
    backgroundColor: '#fafafa',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginBottom: 16,
    fontWeight: '500',
  },
  previewContainer: { 
    position: 'relative', 
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 12 
  },
  removeImage: { 
    position: 'absolute', 
    top: 10, 
    right: 10,
    borderRadius: 12,
  },
  removeImageGradient: {
    borderRadius: 12,
    padding: 4,
  },
  
  imagePickBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    padding: 16, 
    backgroundColor: "#fafafa", 
    borderRadius: 16,
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
    borderRadius: 16, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradientBtn: { 
    paddingVertical: 16, 
    alignItems: "center", 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10 
  },
  submitText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 16, 
    letterSpacing: 0.5 
  },
  
  // Enhanced Comments Modal
  commentModalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  commentModalContainer: { 
    backgroundColor: '#fff', 
    height: height * 0.7, 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  commentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1a1a1a' 
  },
  commentCountBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  commentCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  
  emptyComments: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyCommentText: { 
    color: '#999', 
    marginTop: 14, 
    fontWeight: '500',
    fontSize: 15,
  },
  
  commentItem: { 
    flexDirection: 'row', 
    marginBottom: 22 
  },
  commentAvatar: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  commentBody: { 
    flex: 1, 
    backgroundColor: '#f8f9fa', 
    padding: 14, 
    borderRadius: 16, 
    borderTopLeftRadius: 6 
  },
  commentUser: { 
    fontWeight: '700', 
    fontSize: 13, 
    marginBottom: 4, 
    color: '#1a1a1a' 
  },
  commentTextContent: { 
    color: '#444', 
    fontSize: 14, 
    lineHeight: 22 
  },
  commentTime: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 4,
    fontWeight: '500',
  },
  
  commentInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    gap: 10 
  },
  commentInput: { 
    flex: 1, 
    minHeight: 44, 
    maxHeight: 120, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    fontSize: 14, 
    color: '#1a1a1a' 
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  
  // Enhanced Empty State
  emptyContainer: { 
    flex: 1,
    paddingTop: 60 
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 22, 
    backgroundColor: '#fef9f0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fdebd0', 
    marginBottom: 20,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: { 
    color: '#1a1a1a', 
    fontSize: 20, 
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubText: { 
    color: '#999', 
    fontSize: 14, 
    marginBottom: 24,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef9f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fdebd0',
  },
  emptyActionText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 14,
  },
});