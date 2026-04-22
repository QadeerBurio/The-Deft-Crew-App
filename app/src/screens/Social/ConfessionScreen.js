// screens/ConfessionScreen.js
import React, { useState, useContext, useEffect, useCallback } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  Modal, KeyboardAvoidingView, Platform, StatusBar, Dimensions, 
  Image, Alert, ActivityIndicator, RefreshControl, Share
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const { height } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

export default function ConfessionScreen() {
  const { token, user } = useContext(AuthContext);
  
  // Feed States
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create Post States
  const [modalVisible, setModalVisible] = useState(false);
  const [newConfession, setNewConfession] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  // Comment Modal States
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Fetch Feed with error handling
  const fetchConfessions = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/confessions/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setConfessions(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert("Error", "Failed to load confessions");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  // Like Logic
  const handleLike = async (id) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/confessions/like/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        // Optimistically update UI
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
      }
    } catch (err) { 
      console.log(err);
      Alert.alert("Error", "Failed to like confession");
    }
  };

  // Comment Logic
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ text: commentText.trim() })
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        setSelectedPost(updatedPost);
        setCommentText("");
        // Update in main feed
        setConfessions(prevConfessions =>
          prevConfessions.map(confession =>
            confession._id === updatedPost._id ? updatedPost : confession
          )
        );
      } else {
        Alert.alert("Error", "Failed to post comment");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Network error");
    } finally {
      setCommentLoading(false);
    }
  };

  // Post Creation Logic
  const uploadToCloudinary = async (fileUri) => {
    const data = new FormData();
    data.append("file", { 
      uri: fileUri, 
      name: 'upload.jpg', 
      type: 'image/jpeg' 
    });
    data.append("upload_preset", "tdc_profiles");
    
    const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { 
      method: "POST", 
      body: data 
    });
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
      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage);
      }

      const response = await fetch(`${API_URL}/confessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: newConfession.trim(), 
          image: imageUrl 
        })
      });

      if (response.ok) {
        resetForm();
        fetchConfessions();
        Alert.alert("Success", "Confession posted anonymously");
      } else {
        const error = await response.json();
        Alert.alert("Error", error.error || "Failed to post");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Check your connection");
    } finally {
      setPosting(false);
    }
  };

  const resetForm = () => {
    setNewConfession("");
    setSelectedImage(null);
    setModalVisible(false);
  };

  // Delete Confession
  const handleDeleteConfession = (id) => {
    Alert.alert(
      "Delete Confession",
      "Are you sure you want to delete this confession?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/confessions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (response.ok) {
                setConfessions(prevConfessions => 
                  prevConfessions.filter(c => c._id !== id)
                );
                Alert.alert("Success", "Confession deleted");
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete");
            }
          }
        }
      ]
    );
  };

  const renderConfession = ({ item }) => {
    const isLiked = item.likedByCurrentUser;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <View style={styles.secretIcon}>
              <Ionicons name="eye-off" size={14} color="#FFF" />
            </View>
            <View>
              <Text style={styles.anonymousText}>Anonymous • {item.location}</Text>
              <Text style={styles.timeText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {item.text ? (
          <Text style={styles.confessionText}>{item.text}</Text>
        ) : null}
        
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.postImage} />
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => handleLike(item._id)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={22} 
                color={isLiked ? "#FF4757" : "#555"} 
              />
              <Text style={[styles.actionText, isLiked && {color: "#FF4757"}]}>
                {item.likes}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => openComments(item)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#555" />
              <Text style={styles.actionText}>
                {item.comments?.length || 0}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => Share.share({ 
                message: item.text || "Check out this confession on TDC!" 
              })}
            >
              <Ionicons name="share-social-outline" size={20} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1e1e2e', '#2d2d44']} style={styles.header}>
        <Text style={styles.headerTitle}>Confessions</Text>
        <Text style={styles.headerSub}>
          {user?.university?.name || "Karachi Campus"} • Secret Feed
        </Text>
      </LinearGradient>

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
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No confessions yet</Text>
            <Text style={styles.emptySubText}>
              Be the first to share anonymously
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="pencil" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Secret</Text>
                <TouchableOpacity onPress={resetForm}>
                  <Ionicons name="close" size={28} color="#CCC" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Tell us what's on your mind..."
                placeholderTextColor="#999"
                multiline
                value={newConfession}
                onChangeText={setNewConfession}
              />
              
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              )}
              
              <TouchableOpacity 
                style={styles.imagePickBtn} 
                onPress={async () => {
                  // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  // if (status !== 'granted') {
                  //   Alert.alert("Permission needed", "Please grant permission to access photos");
                  //   return;
                  // }
                  
                  let result = await ImagePicker.launchImageLibraryAsync({ 
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7 
                  });
                  
                  if (!result.canceled) {
                    setSelectedImage(result.assets[0].uri);
                  }
                }}
              >
                <Ionicons name="image" size={20} color="#6C63FF" />
                <Text style={styles.imagePickText}>Add Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handlePost} 
                disabled={posting}
              >
                <LinearGradient colors={['#6C63FF', '#4B45B2']} style={styles.gradientBtn}>
                  {posting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitText}>Post Anonymously</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={commentModalVisible} animationType="slide">
        <View style={styles.commentModalContainer}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
              <Ionicons name="chevron-down" size={30} color="#333" />
            </TouchableOpacity>
            <Text style={styles.commentTitle}>Comments</Text>
            <View style={{ width: 30 }} />
          </View>

          <FlatList
            data={selectedPost?.comments || []}
            keyExtractor={(item, index) => item._id || index.toString()}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Ionicons name="person" size={12} color="#FFF" />
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>Anonymous Student</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              </View>
            )}
          />

          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : null} 
            style={styles.commentInputContainer}
          >
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#999"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity 
              onPress={handlePostComment} 
              disabled={commentLoading || !commentText.trim()}
            >
              {commentLoading ? (
                <ActivityIndicator color="#6C63FF" />
              ) : (
                <Ionicons name="send" size={24} color="#6C63FF" />
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 25, 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },
  listContent: { padding: 15, paddingBottom: 100 },
  card: { 
    backgroundColor: "#FFF", 
    borderRadius: 20, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: "row", marginBottom: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  secretIcon: { 
    width: 30, 
    height: 30, 
    borderRadius: 10, 
    backgroundColor: "#1e1e2e", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 10 
  },
  anonymousText: { fontWeight: "700", color: "#1A1A1A", fontSize: 14 },
  timeText: { fontSize: 10, color: "#AAA", marginTop: 2 },
  confessionText: { fontSize: 16, color: "#333", lineHeight: 24, marginBottom: 10 },
  postImage: { width: '100%', height: 220, borderRadius: 15, marginBottom: 10 },
  cardFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderTopWidth: 1, 
    borderTopColor: "#F5F5F5", 
    paddingTop: 10 
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  actionText: { marginLeft: 5, color: "#555", fontSize: 13, fontWeight: "600" },
  fab: { 
    position: "absolute", 
    bottom: 30, 
    right: 20, 
    width: 55, 
    height: 55, 
    borderRadius: 18, 
    backgroundColor: "#000000", 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalContainer: { flex: 1 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  modalContent: { 
    backgroundColor: "#FFF", 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: height * 0.8
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 15 
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  input: { 
    fontSize: 16, 
    minHeight: 100, 
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10
  },
  previewImage: { width: '100%', height: 150, borderRadius: 15, marginVertical: 10 },
  imagePickBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    justifyContent: 'center'
  },
  imagePickText: { marginLeft: 8, color: '#6C63FF', fontWeight: '700' },
  submitBtn: { borderRadius: 15, overflow: 'hidden' },
  gradientBtn: { paddingVertical: 15, alignItems: "center" },
  submitText: { color: "#FFF", fontWeight: "700" },
  commentModalContainer: { flex: 1, backgroundColor: '#FFF' },
  commentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    paddingTop: Platform.OS === 'ios' ? 60 : 20
  },
  commentTitle: { fontSize: 18, fontWeight: '800' },
  commentItem: { flexDirection: 'row', marginBottom: 20 },
  commentAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#6C63FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  commentBody: { flex: 1, backgroundColor: '#F0F0F0', padding: 12, borderRadius: 15 },
  commentUser: { fontWeight: '700', fontSize: 12, marginBottom: 4, color: '#6C63FF' },
  commentText: { color: '#444', fontSize: 14 },
  commentInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#EEE',
    backgroundColor: '#FFF'
  },
  commentInput: { 
    flex: 1, 
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F5F5', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    marginRight: 10,
    fontSize: 14
  },
  emptyText: { textAlign: 'center', color: '#AAA', marginTop: 50 },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 100 
  },
  emptySubText: { 
    color: '#AAA', 
    fontSize: 14, 
    marginTop: 10 
  }
});