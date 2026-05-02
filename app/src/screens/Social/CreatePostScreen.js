import React, { useState, useContext, useEffect, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet,  
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert, 
  ActivityIndicator, Animated, Dimensions 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const CATEGORIES = [
  { name: "General", icon: "chatbubbles", color: "#6C63FF" },
  { name: "Discounts", icon: "pricetag", color: "#FF6B6B" },
  { name: "Events", icon: "calendar", color: "#4ECDC4" },
  { name: "Study Group", icon: "book", color: "#FFD93D" },
  { name: "Opportunities", icon: "rocket", color: "#6BCB77" }
];

// Skeleton Loading Component
const CreatePostSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7]
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonCircle, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 100, height: 20, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 80, height: 20, opacity: shimmerOpacity, marginLeft: 'auto' }]} />
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonUserRow}>
          <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
          <View>
            <Animated.View style={[styles.skeletonLine, { width: 120, height: 16, opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: 80, height: 12, marginTop: 6, opacity: shimmerOpacity }]} />
          </View>
        </View>
        <Animated.View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 20, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '70%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '80%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
      </View>
    </SafeAreaView>
  );
};

export default function CreatePostScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const categoryAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const toolBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(headerAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(categoryAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toolBarAnim, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (image) {
      Animated.spring(imageAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      imageAnim.setValue(0);
    }
  }, [image]);

  const pickImage = async () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

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
      // Shake animation for empty post
      Animated.sequence([
        Animated.timing(slideUpAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
      
      return Alert.alert(
        "✨ Empty Post", 
        "Share something meaningful with the TDC community! Add some text or an image to continue.",
        [{ text: "Got it!", style: "default" }]
      );
    }

    setLoading(true);

    try {
      let finalImageUrl = "";
      
      if (image) {
        finalImageUrl = await uploadImageToCloudinary(image);
        if (!finalImageUrl) {
          setLoading(false);
          return Alert.alert(
            "📸 Upload Failed", 
            "We couldn't upload your image. Please check your connection and try again."
          );
        }
      }

      const payload = {
        content: text.trim(),
        category: selectedCategory,
        image: finalImageUrl,
        location: user?.location || "Karachi"
      };

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
        // Success animation before navigation
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        Alert.alert(
          "🎉 Published!", 
          "Your post is now live in the TDC Community. Great contribution!",
          [{ text: "View Feed", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("❌ Post Failed", result.error || "Something went wrong. Please try again.");
      }

    } catch (err) {
      console.error("Submit Error:", err);
      Alert.alert(
        "📡 Connection Error", 
        "Cannot reach the server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return <CreatePostSkeleton />;

  const getCategoryColor = (catName) => {
    const category = CATEGORIES.find(c => c.name === catName);
    return category ? category.color : "#6C63FF";
  };

  const getCategoryIcon = (catName) => {
    const category = CATEGORIES.find(c => c.name === catName);
    return category ? category.icon : "chatbubbles";
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Animated Header */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }] }]}>
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={styles.headerGradient}
          >
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <View style={styles.closeButtonCircle}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Create Post</Text>
              <View style={styles.headerAccent} />
            </View>
            
            <TouchableOpacity 
              style={[styles.postButton, (!text && !image || loading) && styles.postButtonDisabled]} 
              onPress={handlePost} 
              disabled={(!text && !image) || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!text && !image || loading) ? ['#101010', '#000000'] : ['#1A1A1A', '#2D2D2D']}
                style={styles.postButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View style={styles.postButtonContent}>
                    <Text style={styles.postButtonText}>Share</Text>
                    <Ionicons name="arrow-up-circle" size={18} color="#f9c349" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated User Row */}
          <Animated.View style={[styles.userRow, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </LinearGradient>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "TDC Member"}</Text>
              <View style={styles.visibilityBadge}>
                <Ionicons name="school" size={14} color="#6C63FF" />
                <Text style={styles.badgeText}>
                  {user?.university?.name || "MUET Student"}
                </Text>
                <View style={styles.visibilityDot} />
                <Text style={styles.visibilityText}>Posting as yourself</Text>
              </View>
            </View>
          </Animated.View>

          {/* Animated Text Input */}
          <Animated.View style={[styles.inputContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            <LinearGradient
              colors={['#fafafa', '#ffffff']}
              style={styles.inputGradient}
            >
              <TextInput
                placeholder="✨ What's on your mind? Share insights, campus news, or discounts..."
                placeholderTextColor="#9EA0A4"
                multiline
                value={text}
                onChangeText={setText}
                style={styles.input}
                maxLength={2000}
              />
            </LinearGradient>
            <View style={styles.charCountContainer}>
              <Text style={styles.charCount}>
                {text.length}/2000
              </Text>
            </View>
          </Animated.View>

          {/* Animated Image Preview */}
          {image && (
            <Animated.View style={[styles.imagePreviewContainer, { 
              opacity: imageAnim,
              transform: [{ 
                scale: imageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }]}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.imageOverlay}
              />
              <TouchableOpacity 
                style={styles.removeImage} 
                onPress={() => setImage(null)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.removeImageGradient}
                >
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Animated Category Section */}
          <Animated.View style={[styles.categorySection, { 
            opacity: categoryAnim,
            transform: [{ translateX: categoryAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0]
            })}]
          }]}>
            <View style={styles.categoryHeader}>
              <Ionicons name="pricetags" size={16} color="#666" />
              <Text style={styles.sectionLabel}>Choose Category</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.name} 
                  style={[
                    styles.catBadge, 
                    selectedCategory === cat.name && { 
                      backgroundColor: cat.color,
                      shadowColor: cat.color,
                    }
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.name);
                    Animated.spring(categoryAnim, {
                      toValue: 1.05,
                      friction: 3,
                      useNativeDriver: true,
                    }).start(() => {
                      Animated.spring(categoryAnim, {
                        toValue: 1,
                        friction: 3,
                        useNativeDriver: true,
                      }).start();
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={18} 
                    color={selectedCategory === cat.name ? "#fff" : cat.color} 
                  />
                  <Text style={[
                    styles.catText, 
                    selectedCategory === cat.name && styles.catTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </ScrollView>

        {/* Animated Footer Toolbar */}
        <Animated.View style={[styles.footerToolbar, { 
          opacity: toolBarAnim,
          transform: [{ translateY: toolBarAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0]
          })}]
        }]}>
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={styles.footerGradient}
          >
            <View style={styles.footerContent}>
              <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                <TouchableOpacity 
                  style={styles.toolItem} 
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#007AFF12', '#007AFF08']}
                    style={styles.iconCircle}
                  >
                    <Ionicons name="image-outline" size={24} color="#007AFF" />
                  </LinearGradient>
                  <View style={styles.toolTextContainer}>
                    <Text style={styles.toolTitle}>Add Photo</Text>
                    <Text style={styles.toolSubtext}>Upload from gallery</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
              
              <View style={styles.footerInfo}>
                <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                <Text style={styles.footerInfoText}>
                  Posting to {user?.university?.name || "University"} community
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  
  // Skeleton Styles
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  skeletonLine: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  
  // Header Styles
  header: { 
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 14,
  },
  
  closeButton: {
    padding: 2,
  },
  closeButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  headerAccent: {
    width: 30,
    height: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
    marginTop: 4,
  },
  
  postButton: { 
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  postButtonGradient: {
    paddingHorizontal: 24, 
    paddingVertical: 10,
  },
  postButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postButtonDisabled: { 
    opacity: 0.6,
  },
  postButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "700",
    fontSize: 15,
  },
  
  // Content Styles
  scrollContent: { 
    padding: 20,
    paddingBottom: 20,
  },
  
  userRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 28,
  },
  
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    marginRight: 14,
    overflow: 'hidden',
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    justifyContent: "center", 
    alignItems: "center",
  },
  
  avatarImg: { 
    width: '100%', 
    height: '100%',
    borderRadius: 16,
  },
  
  avatarText: { 
    color: "#FFFFFF", 
    fontWeight: "800",
    fontSize: 20,
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: { 
    fontWeight: "700", 
    fontSize: 17,
    color: "#1A1A1A",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  
  visibilityBadge: { 
    flexDirection: "row", 
    alignItems: "center",
    flexWrap: 'wrap',
    gap: 4,
  },
  
  badgeText: { 
    fontSize: 12, 
    color: "#6C63FF", 
    fontWeight: "600",
    marginRight: 6,
  },
  visibilityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  visibilityText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  
  inputContainer: {
    marginBottom: 16,
  },
  inputGradient: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  input: { 
    fontSize: 16, 
    color: "#1A1A1A", 
    minHeight: 140, 
    textAlignVertical: "top",
    lineHeight: 24,
    padding: 16,
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  
  imagePreviewContainer: { 
    marginBottom: 20, 
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  previewImage: { 
    width: '100%', 
    height: 280, 
    backgroundColor: '#F0F0F0' 
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  
  removeImage: { 
    position: 'absolute', 
    top: 14, 
    right: 14,
    borderRadius: 20,
  },
  removeImageGradient: {
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  categorySection: {
    marginTop: 8,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionLabel: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#666666",
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  catScroll: { 
    marginBottom: 8,
  },
  catScrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  catBadge: { 
    flexDirection: 'row',
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25, 
    backgroundColor: "#F8F9FA", 
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  catText: { 
    fontSize: 14, 
    color: "#666666", 
    fontWeight: "600",
  },
  
  catTextActive: { 
    color: "#FFFFFF",
    fontWeight: "700",
  },
  
  // Footer Toolbar
  footerToolbar: { 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  footerGradient: {
    borderTopWidth: 1, 
    borderTopColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  footerContent: {
    gap: 12,
  },
  
  toolItem: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  
  toolTextContainer: {
    flex: 1,
  },
  toolTitle: { 
    fontSize: 15, 
    color: "#007AFF", 
    fontWeight: "700",
  },
  toolSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  footerInfoText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});