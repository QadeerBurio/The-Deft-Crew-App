import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Modal, 
  Dimensions, Animated, Alert, ActivityIndicator, Share,
  TextInput, KeyboardAvoidingView, Platform, BackHandler, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

const GradientStoryRing = ({ children, hasUnseen, style }) => {
  if (hasUnseen) {
    return (
      <LinearGradient colors={['#f9c349', '#1a1a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[style, { padding: 3 }]}>
        <View style={styles.innerWhiteBorder}>{children}</View>
      </LinearGradient>
    );
  }
  return <View style={[style, { borderColor: '#f0f0f0', borderWidth: 2, padding: 2 }]}>{children}</View>;
};

// Skeleton loading component
const SkeletonStories = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.skeletonItem}>
        <View style={styles.skeletonRing}>
          <View style={styles.skeletonImage} />
        </View>
        <View style={styles.skeletonName} />
      </View>
    ))}
  </View>
);

export default function StoriesSection() {
  const { user, token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [stories, setStories] = useState([]);
  const [myStory, setMyStory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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
  const progressValue = useRef(0);
  const progressTimeout = useRef(null);
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const pauseOpacity = useRef(new Animated.Value(0)).current;
  const config = { headers: { Authorization: `Bearer ${token}` } };

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

  useFocusEffect(useCallback(() => { fetchStories(); }, []));

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/stories`, config);
      if (!Array.isArray(res.data)) return;

      const grouped = res.data.reduce((acc, story) => {
        if (!story.author?._id) return acc;
        const userId = story.author._id;
        if (!acc[userId]) {
          acc[userId] = { 
            id: userId, user: story.author.name, avatar: story.author.profileImage,
            latestTimestamp: new Date(story.createdAt).getTime(), images: [], 
            isMe: userId === user?._id, hasUnseenStories: false 
          };
        }
        acc[userId].images.push(story);
        return acc;
      }, {});

      Object.values(grouped).forEach(group => {
        group.images.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (!group.isMe) group.hasUnseenStories = group.images.some(s => !s.hasViewed);
      });

      const allGroups = Object.values(grouped);
      setMyStory(allGroups.find(g => g.isMe) || null);
      
      const now = Date.now();
      const activeOthers = allGroups
        .filter(g => !g.isMe)
        .filter(g => (now - g.latestTimestamp) < 24 * 60 * 60 * 1000)
        .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

      setStories(activeOthers);
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  };

  const markStoryAsSeen = async (storyId) => {
    try { await axios.put(`${API_URL}/stories/seen/${storyId}`, {}, config); } catch (err) {}
  };

  const fetchViewers = async (storyId) => {
    try {
      const res = await axios.get(`${API_URL}/stories/views/${storyId}`, config);
      setViewersList(res.data.viewers || []);
      setIsViewersModalVisible(true);
    } catch (err) { Alert.alert("Error", "Could not load viewers"); }
  };

  // ✅ Pick image WITHOUT forced crop - auto detect and display full image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,        // ✅ NO forced crop
      aspect: undefined,           // ✅ Auto detect aspect ratio
      quality: 0.95,              // ✅ High quality
      allowsMultipleSelection: false,
    });
    
    if (!result.canceled) { 
      setUploadPreviewUri(result.assets[0].uri); 
      setIsUploadModalVisible(true); 
    }
  };

  const openMyStory = () => {
    if (myStory && myStory.images?.length > 0) {
      openStory(myStory);
    }
  };

  const openOtherStory = (story) => {
    openStory(story);
  };

  const cancelUpload = () => { setUploadPreviewUri(null); setStoryCaption(""); setIsUploadModalVisible(false); };

  const uploadToCloudinary = async (fileUri) => {
    try {
      const data = new FormData();
      const filename = fileUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      data.append("file", { uri: fileUri, name: filename, type: match ? `image/${match[1]}` : `image` });
      data.append("upload_preset", "tdc_profiles");
      const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "POST", body: data });
      const uploadData = await res.json();
      return uploadData.secure_url || null;
    } catch (e) { return null; }
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
    } catch (err) { Alert.alert("Error", "Failed to share story."); }
    finally { setIsUploading(false); }
  };

  const handleShareStoryExternal = async () => {
    if (!selectedStory?.images?.[currentImageIndex]?.image) return;
    try {
      await Share.share({
        message: `Check out this story on TDC!`,
        url: selectedStory.images[currentImageIndex].image,
      });
    } catch (err) { console.log(err); }
  };

  const openStory = async (story) => {
    if (!story?.images?.length) return;
    setSelectedStory({...story});
    setCurrentImageIndex(0);
    setIsViewerVisible(true);
    setIsPaused(false);
    pauseOpacity.setValue(0);
    if (story.images[0]?._id && !story.isMe) {
      await markStoryAsSeen(story.images[0]._id);
      setStories(prev => prev.map(s => s.id === story.id ? {...s, hasUnseenStories: false} : s));
    }
    startProgress(0, story);
  };

  const startProgress = (index, story) => {
    if (progressTimeout.current) clearTimeout(progressTimeout.current);
    progressValue.current = 0;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 5000, useNativeDriver: false })
      .start(({ finished }) => { if (finished && !isPaused) nextStory(index, story); });
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      Animated.timing(pauseOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      const remaining = 5000 * (1 - progressValue.current);
      Animated.timing(progress, { toValue: 1, duration: remaining, useNativeDriver: false })
        .start(({ finished }) => { if (finished) nextStory(currentImageIndex, selectedStory); });
    } else {
      setIsPaused(true);
      progress.stopAnimation((value) => { progressValue.current = value; });
      Animated.timing(pauseOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  };

  const nextStory = async (index, story) => {
    if (index + 1 < story.images.length) {
      setCurrentImageIndex(index + 1);
      if (story.images[index + 1]?._id && !story.isMe) await markStoryAsSeen(story.images[index + 1]._id);
      startProgress(index + 1, story);
    } else { closeViewer(); }
  };

  const prevStory = (index, story) => {
    if (index > 0) { setCurrentImageIndex(index - 1); startProgress(index - 1, story); }
  };

  const closeViewer = () => {
    if (progressTimeout.current) clearTimeout(progressTimeout.current);
    progress.stopAnimation();
    setIsViewerVisible(false); setIsCommentVisible(false);
    setIsViewersModalVisible(false); setIsPaused(false);
    setSelectedStory(null);
  };

  const navigateToUserProfile = (userId) => { closeViewer(); navigation.navigate("UserProfile", { userId }); };

  const handleLike = async (storyId) => {
    try {
      if (selectedStory) {
        const updatedImages = [...selectedStory.images];
        const currentImage = {...updatedImages[currentImageIndex]};
        const uid = user?._id;
        const isCurrentlyLiked = currentImage.likes?.includes(uid);
        
        if (isCurrentlyLiked) {
          currentImage.likes = currentImage.likes.filter(id => id !== uid);
          currentImage.likeCount = Math.max(0, (currentImage.likeCount || 0) - 1);
        } else {
          currentImage.likes = [...(currentImage.likes || []), uid];
          currentImage.likeCount = (currentImage.likeCount || 0) + 1;
        }
        updatedImages[currentImageIndex] = currentImage;
        setSelectedStory({ ...selectedStory, images: updatedImages });
      }

      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
      
      heartOpacity.setValue(1);
      Animated.timing(heartOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();

      const res = await axios.put(`${API_URL}/stories/like/${storyId}`, {}, config);
      if (selectedStory) {
        const imgs = [...selectedStory.images];
        imgs[currentImageIndex].likes = res.data.likes;
        imgs[currentImageIndex].likeCount = res.data.likeCount;
        setSelectedStory({ ...selectedStory, images: imgs });
      }
    } catch (err) { fetchStories(); }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsCommenting(true);
    try {
      const storyId = selectedStory.images[currentImageIndex]._id;
      const res = await axios.post(`${API_URL}/stories/comment/${storyId}`, { text: commentText }, config);
      setCommentText("");
      if (selectedStory) {
        const imgs = [...selectedStory.images];
        imgs[currentImageIndex].comments = res.data;
        setSelectedStory({ ...selectedStory, images: imgs });
        setCurrentComments(res.data);
      }
    } catch (e) { Alert.alert("Error", "Comment failed."); }
    finally { setIsCommenting(false); }
  };

  const handleDelete = (storyId) => {
    Alert.alert("Delete Story", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await axios.delete(`${API_URL}/stories/${storyId}`, config);
          closeViewer(); fetchStories();
      }}
    ]);
  };

  const openComments = () => {
    setCurrentComments(selectedStory?.images[currentImageIndex]?.comments || []);
    setIsCommentVisible(true);
  };

  const isLiked = selectedStory?.images?.[currentImageIndex]?.likes?.includes(user?._id);

  const renderMyStoryCircle = () => {
    const hasStory = myStory !== null && myStory.images?.length > 0;
    
    return (
      <View style={styles.storyItemContainer}>
        <View style={styles.storyImageWrapper}>
          <GradientStoryRing hasUnseen={false} style={styles.storyRing}>
            <View style={styles.myStoryContainer}>
              <TouchableOpacity onPress={hasStory ? openMyStory : pickImage} activeOpacity={0.7}>
                <Image 
                  source={{ uri: hasStory ? myStory.images[myStory.images.length - 1]?.image : (user?.profileImage || 'https://via.placeholder.com/150') }} 
                  style={[styles.storyImage, !hasStory && { opacity: 0.6 }]} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={hasStory ? styles.addIconSmall : styles.addIconLarge}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={hasStory ? styles.addIconGradientSmall : styles.addIconGradientLarge}>
                  <Ionicons name="add" size={hasStory ? 14 : 24} color="#f9c349" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GradientStoryRing>
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>Your Story</Text>
      </View>
    );
  };

  const renderOtherStoryCircle = (item) => {
    return (
      <TouchableOpacity style={styles.storyItemContainer} onPress={() => openOtherStory(item)} activeOpacity={0.7}>
        <View style={styles.storyImageWrapper}>
          <GradientStoryRing hasUnseen={item?.hasUnseenStories} style={styles.storyRing}>
            <Image source={{ uri: item?.images?.[0]?.image || item?.avatar }} style={styles.storyImage} />
          </GradientStoryRing>
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>{item?.user || 'User'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.storiesContainer}>
        {renderMyStoryCircle()}
        <View style={styles.storySeparator} />
        {loading ? (
          <SkeletonStories />
        ) : (
          <FlatList
            data={stories} horizontal showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item?.id || Math.random().toString()}
            renderItem={({ item }) => renderOtherStoryCircle(item)}
            ListEmptyComponent={
              <View style={styles.emptyStoriesContainer}>
                <Ionicons name="people-outline" size={28} color="#ccc" />
                <Text style={styles.emptyStoriesText}>Waiting for stories...</Text>
              </View>
            }
            contentContainerStyle={styles.storiesListContent}
          />
        )}
      </View>

      {/* UPLOAD MODAL */}
      <Modal visible={isUploadModalVisible} animationType="slide" onRequestClose={cancelUpload}>
        <StatusBar barStyle="light-content" />
        <View style={styles.previewContainer}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={cancelUpload} style={styles.closeIconButton}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
              <Text style={styles.previewTitle}>New Story</Text>
              <View style={{width: 28}} />
            </View>
          </SafeAreaView>
          {/* ✅ Auto-sized full image display */}
          <View style={styles.previewImageWrapper}>
            <Image source={{ uri: uploadPreviewUri }} style={styles.previewImageAuto} resizeMode="contain" />
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.previewFooter}>
            <TextInput style={styles.captionInput} placeholder="Write a caption..." placeholderTextColor="#999" value={storyCaption} onChangeText={setStoryCaption} multiline maxLength={500} />
            <TouchableOpacity style={styles.shareButton} onPress={handleShareStory} disabled={isUploading} activeOpacity={0.8}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.shareButtonGradient}>
                {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareText}>Share to Story</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* STORY VIEWER */}
      {isViewerVisible && selectedStory && (
        <Modal visible={isViewerVisible} animationType="fade" onRequestClose={closeViewer} statusBarTranslucent>
          <StatusBar barStyle="light-content" />
          <View style={styles.viewerContainer}>
            <SafeAreaView style={styles.fullStory}>
              <View style={styles.progressBarsContainer}>
                {selectedStory?.images?.map((_, i) => (
                  <View key={i} style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, { 
                      width: i < currentImageIndex ? '100%' : i === currentImageIndex ? 
                        progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' 
                    }]} />
                  </View>
                ))}
              </View>

              <View style={styles.viewerHeader}>
                <TouchableOpacity style={styles.viewerHeaderLeft} onPress={() => navigateToUserProfile(selectedStory?.id)}>
                  <Image source={{ uri: selectedStory?.avatar || selectedStory?.images?.[0]?.image }} style={styles.viewerAvatar} />
                  <View style={styles.viewerUserInfo}>
                    <Text style={styles.viewerUsername}>{selectedStory?.user || 'User'}</Text>
                    <Text style={styles.viewerTimeAgo}>{formatTimeAgo(selectedStory?.images?.[currentImageIndex]?.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.viewerHeaderRight}>
                  {selectedStory?.isMe && (
                    <TouchableOpacity style={styles.viewsPill} onPress={() => fetchViewers(selectedStory.images[currentImageIndex]._id)}>
                      <Ionicons name="eye-outline" size={14} color="#fff" />
                      <Text style={styles.viewsPillText}>{selectedStory.images[currentImageIndex]?.viewCount || 0}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleShareStoryExternal} style={styles.headerIconBtn}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeViewer} style={styles.closeViewerBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ✅ Auto-sized full image viewer */}
              <TouchableOpacity activeOpacity={1} style={styles.viewerImageWrapper} onPress={togglePause}>
                <Image source={{ uri: selectedStory?.images?.[currentImageIndex]?.image }} style={styles.viewerImageAuto} resizeMode="contain" />
                <Animated.View style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: likeScale }] }]}>
                  <Ionicons name="heart" size={100} color="red" />
                </Animated.View>
                <Animated.View style={[styles.pauseOverlay, { opacity: pauseOpacity }]}>
                  <View style={styles.pauseIconContainer}>
                    <Ionicons name="pause" size={40} color="#f9c349" />
                  </View>
                </Animated.View>
                {selectedStory?.images?.[currentImageIndex]?.caption ? (
                  <BlurView intensity={60} tint="dark" style={styles.captionBlur}>
                    <Text style={styles.captionTextMain}>{selectedStory.images[currentImageIndex].caption}</Text>
                  </BlurView>
                ) : null}
                <View style={styles.touchNavigationOverlay} pointerEvents="box-none">
                  <TouchableOpacity activeOpacity={1} style={styles.touchLeft} onPress={() => prevStory(currentImageIndex, selectedStory)} />
                  <TouchableOpacity activeOpacity={1} style={styles.touchRight} onPress={() => nextStory(currentImageIndex, selectedStory)} />
                </View>
              </TouchableOpacity>

              <View style={styles.viewerFooter}>
                <View style={styles.footerActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(selectedStory?.images?.[currentImageIndex]?._id)}>
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "red" : "#fff"} />
                    </Animated.View>
                    <Text style={styles.actionText}>{selectedStory?.images?.[currentImageIndex]?.likeCount || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={openComments}>
                    <Ionicons name="chatbubble-outline" size={22} color="#fff" />
                    <Text style={styles.actionText}>{selectedStory?.images?.[currentImageIndex]?.comments?.length || 0}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={styles.actionButton} onPress={handleShareStoryExternal}>
                    <Ionicons name="paper-plane-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  {selectedStory?.isMe && (
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(selectedStory.images[currentImageIndex]._id)}>
                      <Ionicons name="trash-outline" size={20} color="red" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: '#ffffff' },
  storiesContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 5, minHeight: 80 },
  storiesListContent: { alignItems: 'center', paddingRight: 14 },
  
  // Skeleton
  skeletonContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  skeletonItem: { alignItems: 'center', width: 72 },
  skeletonRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#f0f0f0', padding: 2, justifyContent: 'center', alignItems: 'center' },
  skeletonImage: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#e8e8e8' },
  skeletonName: { width: 50, height: 8, borderRadius: 4, backgroundColor: '#e8e8e8', marginTop: 6 },
  
  storyItemContainer: { alignItems: 'center', width: 72 },
  storyImageWrapper: { marginBottom: 5 },
  storyRing: { width: 66, height: 66, borderRadius: 33, justifyContent: 'center', alignItems: 'center' },
  innerWhiteBorder: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  storyImage: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#f5f5f5' },
  myStoryContainer: { position: 'relative' },
  addIconSmall: { position: 'absolute', bottom: -3, right: -3, borderRadius: 10, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', zIndex: 10 },
  addIconGradientSmall: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addIconLarge: { position: 'absolute', bottom: -5, right: -5, borderRadius: 14, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', zIndex: 10 },
  addIconGradientLarge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  storyUsername: { fontSize: 11, color: '#1a1a1a', fontWeight: '600', textAlign: 'center', maxWidth: 68, marginTop: 4 },
  storySeparator: { width: 1, height: 45, backgroundColor: '#f0f0f0', marginHorizontal: 6 },
  emptyStoriesContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, gap: 10 },
  emptyStoriesText: { fontSize: 13, color: '#999', fontWeight: '500' },
  
  previewContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  safeArea: { backgroundColor: 'rgba(0,0,0,0.9)' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  closeIconButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  previewTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  // ✅ Auto image wrapper - fills available space
  previewImageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImageAuto: { width: width, flex: 1 },
  previewFooter: { padding: 18, backgroundColor: '#1a1a1a', paddingBottom: Platform.OS === 'ios' ? 38 : 18 },
  captionInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shareButton: { borderRadius: 14, overflow: 'hidden', elevation: 8 },
  shareButtonGradient: { height: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  shareText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  
  viewerContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  fullStory: { flex: 1 },
  progressBarsContainer: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 10, gap: 4 },
  progressBarBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#f9c349', borderRadius: 2 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  viewerHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  viewerAvatar: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: '#f9c349', marginRight: 10 },
  viewerUserInfo: { flex: 1 },
  viewerUsername: { color: '#fff', fontWeight: '700', fontSize: 14 },
  viewerTimeAgo: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  viewerHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 4 },
  viewsPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeViewerBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  // ✅ Auto image viewer - fills screen properly
  viewerImageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewerImageAuto: { width: width, flex: 1 },
  heartOverlay: { position: 'absolute', alignSelf: 'center', zIndex: 10 },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  pauseIconContainer: { borderRadius: 30, overflow: 'hidden' },
  captionBlur: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, overflow: 'hidden' },
  captionTextMain: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '500' },
  touchNavigationOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  touchLeft: { flex: 1 },
  touchRight: { flex: 1 },
  viewerFooter: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  footerActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 6 },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  deleteButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,195,73,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(249,195,73,0.2)' },
});

