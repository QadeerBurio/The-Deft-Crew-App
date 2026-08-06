import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Keyboard
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');

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
        <Animated.View style={[styles.skeletonLine, { width: 150, height: 22, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 70, height: 36, opacity: shimmerOpacity, marginLeft: 'auto', borderRadius: 20 }]} />
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonUserRow}>
          <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
          <View style={{ flex: 1 }}>
            <Animated.View style={[styles.skeletonLine, { width: 140, height: 18, opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: 100, height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
          </View>
        </View>
        <Animated.View style={[styles.skeletonLine, { width: '100%', height: 16, marginTop: 24, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '85%', height: 16, marginTop: 12, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '60%', height: 16, marginTop: 12, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '90%', height: 16, marginTop: 12, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '70%', height: 16, marginTop: 12, opacity: shimmerOpacity }]} />
      </View>
    </SafeAreaView>
  );
};

export default function CreatePostScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const charCountAnim = useRef(new Animated.Value(0)).current;
  const publishBtnScale = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

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
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => setIsReady(true));
  }, []);

  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    
    Animated.spring(charCountAnim, {
      toValue: text.length > 0 ? 1 : 0,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [text, isFocused]);

  const handlePost = async () => {
    Keyboard.dismiss();

    if (!text.trim()) {
      Animated.sequence([
        Animated.timing(slideUpAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
      
      return Alert.alert(
        "💭 Empty Post",
        "Share your thoughts with the community. Every voice matters!",
        [{ text: "Write Something", style: "default" }]
      );
    }

    Animated.sequence([
      Animated.timing(publishBtnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(publishBtnScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

    setLoading(true);

    try {
      const payload = {
        content: text.trim(),
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
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0.6, duration: 150, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();

        setText("");
        setWordCount(0);

        Alert.alert(
          "✨ Posted!",
          "Your thoughts have been shared with the community.",
          [{ text: "View Feed", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("❌ Failed", result.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      Alert.alert(
        "📡 Connection Error",
        "Unable to connect to the server. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E5E5', '#f9c349']
  });

  if (!isReady) return <CreatePostSkeleton />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Animated Header */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }] }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>New Post</Text>
              <View style={styles.headerDot} />
            </View>
            
            <TouchableOpacity
              style={[styles.publishButton, (!text.trim() || loading) && styles.publishButtonDisabled]}
              onPress={handlePost}
              disabled={!text.trim() || loading}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: publishBtnScale }] }}>
                <LinearGradient
                  colors={!text.trim() || loading ? ['#E5E5E5', '#D4D4D4'] : ['#f9c349', '#f5a623']}
                  style={styles.publishGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <View style={styles.publishContent}>
                      <Text style={styles.publishText}>Publish</Text>
                      <Ionicons name="send" size={16} color="#000000" />
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated User Card */}
          <Animated.View style={[styles.userCard, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.userCardContent}>
              <View style={styles.userRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
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
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.name || "Community Member"}</Text>
                  <View style={styles.userBadge}>
                    <View style={styles.userBadgeDot} />
                    <Ionicons name="location-outline" size={12} color="#666666" />
                    <Text style={styles.userLocation}>
                      {user?.location || "Karachi"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Animated Text Input */}
          <Animated.View style={[styles.inputSection, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            <Animated.View style={[styles.inputWrapper, { borderColor }]}>
              <TextInput
                placeholder="What's on your mind?"
                placeholderTextColor="#999999"
                multiline
                value={text}
                onChangeText={setText}
                style={styles.input}
                maxLength={2000}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoFocus={true}
              />
              
              <Animated.View style={[styles.inputAccent, { 
                opacity: borderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1]
                })
              }]} />
            </Animated.View>

            {/* Character & Word Count */}
            <Animated.View style={[styles.statsContainer, { opacity: charCountAnim }]}>
              <View style={styles.statsLeft}>
                <View style={styles.statItem}>
                  <Ionicons name="text-outline" size={14} color="#666666" />
                  <Text style={styles.statText}>{text.length} chars</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="stats-chart-outline" size={14} color="#666666" />
                  <Text style={styles.statText}>{wordCount} words</Text>
                </View>
              </View>
              <View style={styles.charLimitContainer}>
                <View style={styles.charProgress}>
                  <View style={[styles.charProgressBar, { 
                    width: `${(text.length / 2000) * 100}%`,
                    backgroundColor: text.length > 1800 ? '#EF4444' : '#f9c349'
                  }]} />
                </View>
                <Text style={[styles.charLimit, text.length > 1800 && styles.charLimitWarning]}>
                  {text.length}/2000
                </Text>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Empty State Tips */}
          {!text.trim() && (
            <Animated.View style={[styles.tipsContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
              <View style={styles.tipsGradient}>
                <View style={styles.tipsHeader}>
                  <View style={styles.tipsIconContainer}>
                    <Ionicons name="bulb-outline" size={22} color="#f9c349" />
                  </View>
                  <View style={styles.tipsHeaderText}>
                    <Text style={styles.tipsTitle}>Share something with the community</Text>
                    <Text style={styles.tipsSubtitle}>Your voice matters. Start typing!</Text>
                  </View>
                </View>
                <View style={styles.tipsList}>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#f9c349' }]} />
                    <Text style={styles.tipText}>Share your thoughts or experiences</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#f9c349' }]} />
                    <Text style={styles.tipText}>Ask questions or seek advice</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#f9c349' }]} />
                    <Text style={styles.tipText}>Celebrate achievements and milestones</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Quick Actions */}
          {text.length > 0 && (
            <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setText('')}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.quickActionText}>Clear</Text>
              </TouchableOpacity>
              <View style={styles.quickActionDivider} />
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handlePost}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
                <Text style={[styles.quickActionText, { color: '#22C55E' }]}>Submit</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Skeleton Styles
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    marginRight: 14,
  },
  skeletonLine: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    height: 14,
  },

  // Header Styles
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
  },

  publishButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  publishGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  publishContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  publishText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },

  // User Card Styles
  userCard: {
    marginBottom: 24,
  },
  userCardContent: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    marginRight: 4,
  },
  userLocation: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },

  // Input Section Styles
  inputSection: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    minHeight: 200,
    padding: 16,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 180,
    paddingTop: 4,
  },
  inputAccent: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E5E5',
  },
  statText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  charLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charProgress: {
    width: 40,
    height: 3,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  charProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  charLimit: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  charLimitWarning: {
    color: '#EF4444',
  },

  // Tips Section Styles
  tipsContainer: {
    marginTop: 8,
  },
  tipsGradient: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsHeaderText: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  tipsSubtitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 13,
    color: '#444444',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  quickActionText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  quickActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E5E5',
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});