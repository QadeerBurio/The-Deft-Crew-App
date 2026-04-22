import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Modal, 
  Dimensions,  Animated, Alert, ActivityIndicator, 
  TextInput, KeyboardAvoidingView, Platform, BackHandler 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now - past;
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHrs = Math.floor(diffInMins / 60);
  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHrs < 24) return `${diffInHrs}h ago`;
  return past.toLocaleDateString();
};

export default function StoriesSection() {
  const { user, token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [stories, setStories] = useState([]); 
  const [myStory, setMyStory] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [isViewersModalVisible, setIsViewersModalVisible] = useState(false);

  const [uploadPreviewUri, setUploadPreviewUri] = useState(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [storyCaption, setStoryCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [isCommentVisible, setIsCommentVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [currentComments, setCurrentComments] = useState([]);
  
  const progress = useRef(new Animated.Value(0)).current;
  const progressTimeout = useRef(null);
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      if (isViewerVisible) { closeViewer(); return true; }
      if (isUploadModalVisible) { cancelUpload(); return true; }
      if (isViewersModalVisible) { setIsViewersModalVisible(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [isViewerVisible, isUploadModalVisible, isViewersModalVisible]);

  // Fetch stories only when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStories();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/stories`, config);
      if (!Array.isArray(res.data)) return;

      // Group stories by user
      const grouped = res.data.reduce((acc, story) => {
        if (!story.author?._id) return acc;
        const userId = story.author._id;
        if (!acc[userId]) {
          acc[userId] = { 
            id: userId, 
            user: story.author.name, 
            avatar: story.author.profileImage,
            latestTimestamp: new Date(story.createdAt).getTime(),
            images: [], 
            isMe: userId === user?._id,
            hasUnseenStories: false,
            viewCount: 0
          };
        }
        acc[userId].images.push(story);
        if (story.viewCount) {
          acc[userId].viewCount += story.viewCount;
        }
        return acc;
      }, {});

      // Sort images and check unseen stories
      Object.values(grouped).forEach(group => {
        group.images.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (!group.isMe) {
          const hasUnseen = group.images.some(story => !story.hasViewed);
          group.hasUnseenStories = hasUnseen;
        }
      });

      const allGroups = Object.values(grouped);
      const mine = allGroups.find(g => g.isMe) || null;
      const others = allGroups.filter(g => !g.isMe).sort((a, b) => b.latestTimestamp - a.latestTimestamp);

      setMyStory(mine);
      setStories(others);
    } catch (err) { 
      console.error("Fetch Stories Error:", err.message);
    } finally { 
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markStoryAsSeen = async (storyId) => {
    try {
      const res = await axios.put(`${API_URL}/stories/seen/${storyId}`, {}, config);
      return res.data;
    } catch (err) {
      console.error("Mark seen error:", err.message);
      return null;
    }
  };

  const fetchViewers = async (storyId) => {
    try {
      const res = await axios.get(`${API_URL}/stories/views/${storyId}`, config);
      setViewersList(res.data.viewers || []);
      setIsViewersModalVisible(true);
    } catch (err) {
      console.error("Fetch viewers error:", err.message);
      Alert.alert("Error", "Could not load viewers");
    }
  };

  const pickImage = async () => {
    // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (status !== 'granted') {
    //   Alert.alert('Permission needed', 'Please grant permission to access your photos');
    //   return;
    // }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled) {
      setUploadPreviewUri(result.assets[0].uri);
      setIsUploadModalVisible(true);
    }
  };

  const cancelUpload = () => {
    setUploadPreviewUri(null);
    setStoryCaption("");
    setIsUploadModalVisible(false);
  };

  const uploadToCloudinary = async (fileUri) => {
    try {
      const data = new FormData();
      const filename = fileUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const type = match ? `image/${match[1]}` : `image`;
      data.append("file", { uri: fileUri, name: filename, type: type });
      data.append("upload_preset", "tdc_profiles"); 
      const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", {
        method: "POST", body: data,
      });
      const uploadData = await res.json();
      return uploadData.secure_url || null;
    } catch (e) { 
      console.error("Upload Error:", e);
      return null; 
    }
  };

  const handleShareStory = async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(uploadPreviewUri);
      if (!cloudinaryUrl) throw new Error("Upload failed");
      await axios.post(`${API_URL}/stories/upload`, { image: cloudinaryUrl, caption: storyCaption }, config);
      cancelUpload();
      fetchStories();
    } catch (err) { 
      Alert.alert("Error", "Failed to share story."); 
    } finally { setIsUploading(false); }
  };

  const openStory = async (story) => {
    if (!story || !story.images || story.images.length === 0) {
      console.error("Invalid story object:", story);
      return;
    }
    
    setSelectedStory(story);
    setCurrentImageIndex(0);
    setIsViewerVisible(true);
    
    if (story.images[0]?._id) {
      await markStoryAsSeen(story.images[0]._id);
      // Update local state without full refresh
      setStories(prevStories => 
        prevStories.map(s => 
          s.id === story.id 
            ? { ...s, hasUnseenStories: false }
            : s
        )
      );
    }
    startProgress(0, story);
  };

  const startProgress = (index, story) => {
    if (progressTimeout.current) {
      clearTimeout(progressTimeout.current);
    }
    
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1, 
      duration: 5000, 
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        nextStory(index, story);
      }
    });
  };

  const nextStory = async (index, story) => {
    if (index + 1 < story.images.length) {
      setCurrentImageIndex(index + 1);
      if (story.images[index + 1]?._id) {
        await markStoryAsSeen(story.images[index + 1]._id);
      }
      startProgress(index + 1, story);
    } else { 
      closeViewer(); 
    }
  };

  const prevStory = (index, story) => {
    if (index > 0) {
      setCurrentImageIndex(index - 1);
      startProgress(index - 1, story);
    } else { 
      startProgress(0, story); 
    }
  };

  const closeViewer = () => {
    if (progressTimeout.current) {
      clearTimeout(progressTimeout.current);
    }
    progress.stopAnimation();
    setIsViewerVisible(false);
    setIsCommentVisible(false);
    setIsViewersModalVisible(false);
    setSelectedStory(null);
  };

  const navigateToUserProfile = (userId) => {
    closeViewer();
    navigation.navigate("UserProfile", { userId });
  };

  const handleLike = async (storyId) => {
    try {
      const res = await axios.put(`${API_URL}/stories/like/${storyId}`, {}, config);
      if (selectedStory) {
        const updatedImages = [...selectedStory.images];
        updatedImages[currentImageIndex].likes = res.data.likes;
        updatedImages[currentImageIndex].likeCount = res.data.likeCount;
        setSelectedStory({ ...selectedStory, images: updatedImages });
      }
      // Don't refresh all stories, just update local state
    } catch (err) { 
      console.log("Like Error:", err.message);
      Alert.alert("Access Denied", err.response?.data?.msg || "You cannot interact with this story");
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsCommenting(true);
    try {
      const storyId = selectedStory.images[currentImageIndex]._id;
      const res = await axios.post(`${API_URL}/stories/comment/${storyId}`, { text: commentText }, config);
      setCommentText("");
      if (selectedStory) {
        const updatedImages = [...selectedStory.images];
        updatedImages[currentImageIndex].comments = res.data;
        setSelectedStory({ ...selectedStory, images: updatedImages });
        setCurrentComments(res.data);
      }
    } catch (e) { 
      Alert.alert("Error", "Comment failed."); 
    } finally { setIsCommenting(false); }
  };

  const handleDelete = (storyId) => {
    Alert.alert("Delete", "Delete this story?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await axios.delete(`${API_URL}/stories/${storyId}`, config);
          closeViewer();
          fetchStories();
      }}
    ]);
  };

  const openComments = () => {
    setCurrentComments(selectedStory?.images[currentImageIndex]?.comments || []);
    setIsCommentVisible(true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStories();
  }, []);

  // Render viewers modal with user profiles
  const renderViewersModal = () => (
    <Modal visible={isViewersModalVisible} transparent animationType="slide">
      <View style={styles.viewersOverlay}>
        <View style={styles.viewersSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Story Views</Text>
            <TouchableOpacity onPress={() => setIsViewersModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <Text style={styles.viewCountHeader}>{viewersList.length} {viewersList.length === 1 ? 'view' : 'views'}</Text>
          <FlatList
            data={viewersList}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.viewerItem}
                onPress={() => {
                  setIsViewersModalVisible(false);
                  navigation.navigate("UserProfile", { userId: item._id });
                }}
              >
                <Image 
                  source={{ uri: item.profileImage || 'https://via.placeholder.com/150' }} 
                  style={styles.viewerAvatar} 
                />
                <View style={styles.viewerInfo}>
                  <Text style={styles.viewerName}>{item.name}</Text>
                  <Text style={styles.viewerTime}>Viewed {formatTimeAgo(item.viewedAt || new Date())}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyViewers}>
                <Ionicons name="eye-off-outline" size={48} color="#CCC" />
                <Text style={styles.emptyViewersText}>No one has viewed your story yet</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  // Render story circle
  const renderStoryCircle = (item, isMyStoryBtn = false) => {
    if (isMyStoryBtn) {
      const hasUnseen = myStory && myStory.hasUnseenStories;
      const ringColor = hasUnseen ? '#6C63FF' : '#DBDBDB';
      
      return (
        <View style={styles.storyWrapper}>
          <TouchableOpacity 
            style={[styles.storyRing, { borderColor: ringColor }]} 
            onPress={() => myStory ? openStory(myStory) : pickImage()}
          >
            <Image 
              source={{ uri: user?.profileImage || 'https://via.placeholder.com/150' }} 
              style={styles.storyImage} 
            />
            {!myStory && (
              <View style={styles.noStoryOverlay}>
                <Ionicons name="add" size={24} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.plusIcon} onPress={pickImage}>
            <Ionicons name="add" size={16} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.username} numberOfLines={1}>
            Your Story
          </Text>
        </View>
      );
    }
    
    const hasUnseen = item?.hasUnseenStories === true;
    const ringColor = hasUnseen ? '#6C63FF' : '#DBDBDB';
    const imageUri = item?.avatar || (item?.images && item.images[0]?.image) || 'https://via.placeholder.com/150';
    const userName = item?.user || 'User';
    
    return (
      <View style={styles.storyWrapper}>
        <TouchableOpacity 
          style={[styles.storyRing, { borderColor: ringColor }]} 
          onPress={() => openStory(item)}
        >
          <Image source={{ uri: imageUri }} style={styles.storyImage} />
        </TouchableOpacity>
        <Text style={styles.username} numberOfLines={1}>
          {userName}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !isViewerVisible ? (
        <ActivityIndicator color="#6C63FF" style={{marginVertical: 20}} />
      ) : (
        <FlatList
          data={stories}
          horizontal
          showsHorizontalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              {renderStoryCircle(null, true)}
              <View style={styles.divider} />
            </View>
          }
          renderItem={({ item }) => renderStoryCircle(item, false)}
          ListEmptyComponent={
            !loading && stories.length === 0 && !myStory ? (
              <View style={styles.emptyStories}>
                <Ionicons name="camera-outline" size={48} color="#CCC" />
                <Text style={styles.emptyStoriesText}>No stories to show</Text>
                <TouchableOpacity style={styles.addStoryButton} onPress={pickImage}>
                  <Text style={styles.addStoryText}>Add Your First Story</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* UPLOAD PREVIEW MODAL */}
      <Modal visible={isUploadModalVisible} animationType="slide" onRequestClose={cancelUpload}>
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={cancelUpload}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>New Story</Text>
            <View style={{width: 32}} />
          </View>
          <Image source={{ uri: uploadPreviewUri }} style={styles.previewImageMain} resizeMode="contain" />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.previewFooter}>
            <TextInput 
              style={styles.captionInput} 
              placeholder="Add a caption..." 
              placeholderTextColor="#999"
              value={storyCaption}
              onChangeText={setStoryCaption}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.shareButton} onPress={handleShareStory} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.shareText}>Share Story</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* STORY VIEWER MODAL */}
      <Modal visible={isViewerVisible} animationType="fade" onRequestClose={closeViewer}>
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.fullStory}>
            {/* Progress Bars */}
            <View style={styles.multiBarContainer}>
              {selectedStory?.images?.map((_, i) => (
                <View key={i} style={styles.barBackground}>
                  <Animated.View style={[
                    styles.barFill, 
                    { 
                      width: i < currentImageIndex ? '100%' : 
                             i === currentImageIndex ? progress.interpolate({ 
                               inputRange: [0, 1], 
                               outputRange: ['0%', '100%'] 
                             }) : '0%' 
                    }
                  ]} />
                </View>
              ))}
            </View>

            {/* Header */}
            <View style={styles.storyHeader}>
              <TouchableOpacity 
                style={styles.headerLeft} 
                onPress={() => navigateToUserProfile(selectedStory?.id)} 
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: selectedStory?.avatar || 'https://via.placeholder.com/150' }} 
                  style={styles.smallAvatar} 
                />
                <View>
                  <Text style={styles.storyUserText}>{selectedStory?.user || 'User'}</Text>
                  <Text style={styles.timeAgoText}>
                    {formatTimeAgo(selectedStory?.images?.[currentImageIndex]?.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.headerRight}>
                {selectedStory?.isMe && selectedStory?.images?.[currentImageIndex]?.viewCount > 0 && (
                  <TouchableOpacity 
                    style={styles.viewsButton} 
                    onPress={() => fetchViewers(selectedStory.images[currentImageIndex]._id)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFF" />
                    <Text style={styles.viewsCount}>{selectedStory.images[currentImageIndex].viewCount}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeViewer} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Story Image */}
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: selectedStory?.images?.[currentImageIndex]?.image }} 
                style={styles.fullImage} 
                resizeMode="contain" 
              />
              
              {selectedStory?.images?.[currentImageIndex]?.caption && (
                <View style={styles.captionOverlay}>
                  <Text style={styles.captionTextMain}>
                    {selectedStory.images[currentImageIndex].caption}
                  </Text>
                </View>
              )}
              
              <View style={styles.touchControlWrapper}>
                <TouchableOpacity 
                  activeOpacity={1} 
                  style={styles.touchSide} 
                  onPress={() => prevStory(currentImageIndex, selectedStory)} 
                />
                <TouchableOpacity 
                  activeOpacity={1} 
                  style={styles.touchSide} 
                  onPress={() => nextStory(currentImageIndex, selectedStory)} 
                />
              </View>
            </View>

            {/* Footer Actions */}
            <View style={styles.storyFooter}>
              <View style={styles.footerActions}>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleLike(selectedStory?.images?.[currentImageIndex]?._id)}
                >
                  <Ionicons 
                    name={selectedStory?.images?.[currentImageIndex]?.likes?.includes(user?._id) ? "heart" : "heart-outline"} 
                    size={28} 
                    color={selectedStory?.images?.[currentImageIndex]?.likes?.includes(user?._id) ? "#FF4444" : "#FFF"} 
                  />
                  <Text style={styles.actionText}>
                    {selectedStory?.images?.[currentImageIndex]?.likes?.length || 0}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionBtn} onPress={openComments}>
                  <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
                  <Text style={styles.actionText}>
                    {selectedStory?.images?.[currentImageIndex]?.comments?.length || 0}
                  </Text>
                </TouchableOpacity>
                
                {selectedStory?.isMe && (
                  <TouchableOpacity onPress={() => handleDelete(selectedStory.images[currentImageIndex]._id)}>
                    <Ionicons name="trash-outline" size={26} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>

          {/* COMMENT SHEET MODAL */}
          <Modal visible={isCommentVisible} transparent animationType="slide">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentOverlay}>
              <View style={styles.commentSheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Comments</Text>
                  <TouchableOpacity onPress={() => setIsCommentVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={currentComments}
                  keyExtractor={(item, index) => item?._id || index.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <TouchableOpacity onPress={() => navigateToUserProfile(item.user?._id)}>
                        <Image 
                          source={{ uri: item.profileImage || 'https://via.placeholder.com/150' }} 
                          style={styles.commentAvatar} 
                        />
                      </TouchableOpacity>
                      <View style={styles.commentContent}>
                        <TouchableOpacity onPress={() => navigateToUserProfile(item.user?._id)}>
                          <Text style={styles.commentUserName}>{item.name || 'User'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.commentText}>{item.text}</Text>
                        <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyComments}>
                      <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                      <Text style={styles.emptyCommentsText}>No comments yet</Text>
                      <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
                    </View>
                  }
                />
                
                <View style={styles.inputContainer}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Add a comment..." 
                    placeholderTextColor="#999"
                    value={commentText} 
                    onChangeText={setCommentText} 
                  />
                  <TouchableOpacity onPress={handlePostComment} disabled={isCommenting}>
                    {isCommenting ? <ActivityIndicator size="small" color="#6C63FF" /> : <Ionicons name="send" size={24} color="#6C63FF" />}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* VIEWERS MODAL */}
          {renderViewersModal()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingVertical: 12, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#EEE' 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  storyWrapper: { 
    alignItems: 'center', 
    marginLeft: 15,
    width: 72,
    position: 'relative'
  },
  storyRing: { 
    width: 68, 
    height: 68, 
    borderRadius: 34, 
    borderWidth: 2.5, 
    padding: 2, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFF'
  },
  storyImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#F5F5F5' 
  },
  noStoryOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  username: { 
    fontSize: 11, 
    marginTop: 6, 
    color: '#444', 
    fontWeight: '500' 
  },
  plusIcon: { 
    position: 'absolute', 
    bottom: 18, 
    right: 0, 
    backgroundColor: '#6C63FF', 
    borderRadius: 12, 
    width: 22, 
    height: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#FFF', 
    zIndex: 10 
  },
  divider: { 
    width: 1, 
    height: 45, 
    backgroundColor: '#F0F0F0', 
    marginLeft: 10 
  },
  emptyStories: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width - 100,
    paddingVertical: 20
  },
  emptyStoriesText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    marginBottom: 10
  },
  addStoryButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5
  },
  addStoryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12
  },
  
  // Upload Modal Styles
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    alignItems: 'center' 
  },
  previewTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  previewImageMain: { flex: 1, width: width },
  previewFooter: { padding: 20, backgroundColor: '#000' },
  captionInput: { 
    backgroundColor: '#222', 
    borderRadius: 15, 
    padding: 15, 
    color: '#FFF', 
    fontSize: 16, 
    marginBottom: 15, 
    maxHeight: 100 
  },
  shareButton: { 
    backgroundColor: '#6C63FF', 
    borderRadius: 12, 
    height: 55, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shareText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  // Story Viewer Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#000' },
  fullStory: { flex: 1 },
  multiBarContainer: { 
    flexDirection: 'row', 
    height: 2, 
    paddingHorizontal: 10, 
    marginTop: Platform.OS === 'android' ? 45 : 10 
  },
  barBackground: { 
    flex: 1, 
    height: '100%', 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    marginHorizontal: 2 
  },
  barFill: { height: '100%', backgroundColor: '#FFF' },
  storyHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    alignItems: 'center' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  viewsButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 12,
    gap: 5
  },
  viewsCount: { 
    color: '#FFF', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  closeButton: {
    marginLeft: 5
  },
  smallAvatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: '#FFF' 
  },
  storyUserText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  timeAgoText: { color: '#CCC', fontSize: 11 },
  imageContainer: { flex: 1, justifyContent: 'center' },
  fullImage: { width: width, height: height * 0.75 },
  captionOverlay: { 
    position: 'absolute', 
    bottom: 40, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    maxWidth: '85%' 
  },
  captionTextMain: { color: '#FFF', textAlign: 'center', fontSize: 15, lineHeight: 20 },
  touchControlWrapper: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  touchSide: { flex: 1 },
  storyFooter: { 
    flexDirection: 'row', 
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center' 
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  actionText: { color: '#FFF', marginLeft: 6, fontWeight: '600' },
  
  // Comment Modal Styles
  commentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  commentSheet: { 
    backgroundColor: '#FFF', 
    height: height * 0.6, 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25, 
    padding: 20 
  },
  sheetHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15, 
    alignItems: 'center' 
  },
  sheetTitle: { fontSize: 18, fontWeight: 'bold' },
  commentItem: { 
    flexDirection: 'row', 
    marginBottom: 15,
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#F0F2F5'
  },
  commentContent: {
    flex: 1
  },
  commentUserName: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontSize: 14
  },
  commentText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18
  },
  commentTime: {
    color: '#999',
    fontSize: 11
  },
  emptyComments: {
    padding: 40,
    alignItems: 'center'
  },
  emptyCommentsText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10
  },
  emptyCommentsSubtext: {
    color: '#CCC',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 5
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderColor: '#EEE', 
    paddingTop: 10, 
    marginTop: 10 
  },
  input: { 
    flex: 1, 
    height: 45, 
    backgroundColor: '#F0F2F5', 
    borderRadius: 22, 
    paddingHorizontal: 18, 
    marginRight: 10, 
    fontSize: 15 
  },
  
  // Viewers Modal Styles
  viewersOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  viewersSheet: { 
    backgroundColor: '#FFF', 
    height: height * 0.7, 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25, 
    padding: 20 
  },
  viewCountHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  viewerItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F0F2F5'
  },
  viewerInfo: {
    flex: 1
  },
  viewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  viewerTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  emptyViewers: {
    padding: 40,
    alignItems: 'center'
  },
  emptyViewersText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 10
  }
});