import React, { useState, useContext } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet,  
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const CATEGORIES = ["General", "Discounts", "Events", "Study Group", "Opportunities"];

export default function CreatePostScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (!permission.granted) {
    //   Alert.alert("Permission required", "Allow gallery access to upload photos.");
    //   return;
    // }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToCloudinary = async (fileUri) => {
    try {
      const data = new FormData();
      const filename = fileUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const type = match ? `image/${match[1]}` : `image`;

      data.append("file", {
        uri: fileUri,
        name: filename,
        type: type,
      });

      data.append("upload_preset", "tdc_profiles");
      
      const uploadRes = await fetch(
        "https://api.cloudinary.com/v1_1/decaxpera/image/upload",
        {
          method: "POST",
          body: data,
        }
      );

      const uploadData = await uploadRes.json();
      return uploadData.secure_url || null;
    } catch (e) {
      console.log("Cloudinary Error:", e);
      return null;
    }
  };

  const handlePost = async () => {
    if (!text.trim() && !image) {
      return Alert.alert("Empty Post", "Please add some text or an image to share with the community.");
    }

    setLoading(true);

    try {
      let finalImageUrl = "";
      
      if (image) {
        console.log("Uploading to Cloudinary...");
        finalImageUrl = await uploadImageToCloudinary(image);
        if (!finalImageUrl) {
          setLoading(false);
          return Alert.alert("Upload Failed", "Could not upload image. Please check your internet connection.");
        }
      }

      const payload = {
        content: text.trim(),
        category: selectedCategory,
        image: finalImageUrl,
        location: user?.location || "Karachi"
      };

      console.log("Sending Payload to Backend:", payload);

      const response = await fetch('https://the-deft-crew-production.up.railway.app/api/social/create-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          "Published!", 
          "Your post is live in the TDC Community.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Post Failed", result.error || "Failed to save post. Please try again.");
      }

    } catch (err) {
      console.error("Submit Error:", err);
      Alert.alert(
        "Connection Error", 
        "Cannot reach the server. Make sure your backend is running and your phone is on the same Wi-Fi as your laptop."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity 
            style={[styles.postButton, (!text && !image || loading) && styles.postButtonDisabled]} 
            onPress={handlePost} 
            disabled={(!text && !image) || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.postButtonText}>Share</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* User Row */}
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "U"}</Text>
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "TDC Member"}</Text>
              <View style={styles.visibilityBadge}>
                <Ionicons name="school" size={14} color="#6C63FF" />
                <Text style={styles.badgeText}>{user?.university?.name || "MUET Student"}</Text>
              </View>
            </View>
          </View>

          <TextInput
            placeholder="What's on your mind? Share insights, campus news, or discounts..."
            placeholderTextColor="#9EA0A4"
            multiline
            value={text}
            onChangeText={setText}
            style={styles.input}
          />

          {/* Image Preview Area */}
          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={28} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Category Section */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>Choose Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catBadge, selectedCategory === cat && styles.catBadgeActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Footer Tools */}
        <View style={styles.footerToolbar}>
          <TouchableOpacity style={styles.toolItem} onPress={pickImage}>
            <View style={[styles.iconCircle, { backgroundColor: '#007AFF12' }]}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
            </View>
            <Text style={styles.toolText}>Photo</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        paddingTop: 10,
      },
      android: {
        paddingTop: 40,
      },
    }),
  },
  
  closeButton: {
    padding: 4,
  },
  
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  
  postButton: { 
    backgroundColor: "#000000", 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20,
  },
  
  postButtonDisabled: { 
    backgroundColor: "#000000",
    opacity: 0.5,
  },
  
  postButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "700",
    fontSize: 14,
  },
  
  scrollContent: { 
    padding: 20,
  },
  
  userRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 24,
  },
  
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12,
    overflow: 'hidden',
  },
  
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: "#000000", 
    justifyContent: "center", 
    alignItems: "center",
  },
  
  avatarImg: { 
    width: '100%', 
    height: '100%' 
  },
  
  avatarText: { 
    color: "#FFFFFF", 
    fontWeight: "bold",
    fontSize: 18,
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: { 
    fontWeight: "700", 
    fontSize: 16,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  
  visibilityBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
  },
  
  badgeText: { 
    fontSize: 12, 
    color: "#6C63FF", 
    marginLeft: 4, 
    fontWeight: "600" 
  },
  
  input: { 
    fontSize: 16, 
    color: "#1A1A1A", 
    minHeight: 120, 
    textAlignVertical: "top",
    lineHeight: 24,
  },
  
  imagePreviewContainer: { 
    marginVertical: 16, 
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  
  previewImage: { 
    width: '100%', 
    height: 250, 
    borderRadius: 16, 
    backgroundColor: '#F0F0F0' 
  },
  
  removeImage: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 20,
    padding: 4,
  },
  
  categorySection: {
    marginTop: 8,
  },
  
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: "#666666", 
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  catScroll: { 
    marginBottom: 8,
  },
  
  catBadge: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 25, 
    backgroundColor: "#F5F5F5", 
    marginRight: 12,
  },
  
  catBadgeActive: { 
    backgroundColor: "#1A1A1A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  catText: { 
    fontSize: 14, 
    color: "#666666", 
    fontWeight: "600",
  },
  
  catTextActive: { 
    color: "#FFFFFF" 
  },
  
  footerToolbar: { 
    borderTopWidth: 1, 
    borderTopColor: "#F0F0F0", 
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  
  toolItem: { 
    alignItems: "center", 
    marginLeft: 20,
    flexDirection: 'row',
  },
  
  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 8,
  },
  
  toolText: { 
    fontSize: 14, 
    color: "#007AFF", 
    fontWeight: "600",
  },
});