// CreatePostScreen.js - Bottom Sheet Modal (TDC Modern Light)
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
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from "../../context/AuthContext";
import { engagementBus, ENGAGEMENT_EVENTS } from '../../engagement/engagementBus';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// ============================================================
// INLINE SKELETON — shown briefly while sheet content warms up
// ============================================================
const SheetSkeleton = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const op = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={{ paddingTop: 8 }}>
      <View style={styles.skUserRow}>
        <Animated.View style={[styles.skAvatar, { opacity: op }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Animated.View style={[styles.skLine, { width: 120, height: 14, opacity: op }]} />
          <Animated.View style={[styles.skLine, { width: 80, height: 11, marginTop: 6, opacity: op }]} />
        </View>
      </View>
      <Animated.View style={[styles.skCard, { opacity: op }]} />
    </View>
  );
};

// ============================================================
// MAIN — Bottom Sheet Modal
// ============================================================
export default function CreatePostScreen({ navigation, route }) {
  const { token, user } = useContext(AuthContext);

  // Modal is visible by default when this component is mounted.
  // If used as a screen, `visible` can be controlled from outside via route.params.
  const [visible, setVisible] = useState(true);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const focusGlow = useRef(new Animated.Value(0)).current;
  const statsFade = useRef(new Animated.Value(0)).current;

  const inputRef = useRef(null);
  const mounted = useRef(true);

  // ---------- Open / close animation ----------
  useEffect(() => {
    mounted.current = true;

    if (visible) {
      // Slide sheet up
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const t = setTimeout(() => {
        if (mounted.current) {
          setIsReady(true);
          inputRef.current?.focus();
        }
      }, 320);

      return () => {
        mounted.current = false;
        clearTimeout(t);
      };
    } else {
      // Slide down + close
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (mounted.current) {
          setVisible(false);
          navigation?.goBack?.();
        }
      });
    }
  }, [visible]);

  // ---------- Track text / focus ----------
  useEffect(() => {
    const w = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(w);

    Animated.spring(statsFade, {
      toValue: text.length > 0 ? 1 : 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    Animated.timing(focusGlow, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [text, isFocused]);

  // ---------- Close handler ----------
  const closeSheet = () => {
    Keyboard.dismiss();
    setVisible(false);
  };

  // ---------- Post ----------
  const handlePost = async () => {
    Keyboard.dismiss();

    if (!text.trim()) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();

      return Alert.alert(
        "💭 Empty Post",
        "Share your thoughts with the community. Every voice matters!",
        [{ text: "Write Something", style: "default" }]
      );
    }

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

    setLoading(true);

    try {
      const payload = {
        content: text.trim(),
        location: user?.location || "Karachi",
      };

      const response = await fetch(`${API_URL}/create-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        if (result?.engagement?.popups?.length) {
          engagementBus.emit(
            ENGAGEMENT_EVENTS.POPUPS_QUEUED,
            result.engagement.popups
          );
        }
        setText("");
        setWordCount(0);

        // Close sheet, then alert
        Keyboard.dismiss();
        setVisible(false);

        setTimeout(() => {
          Alert.alert(
            "✨ Posted!",
            "Your thoughts have been shared with the community.",
            [
              {
                text: "View Feed",
                onPress: () =>
                  navigation?.navigate?.('FeedScreen', { refreshFeed: Date.now() }),
              },
            ]
          );
        }, 280);
      } else {
        Alert.alert(
          "❌ Failed",
          result.error || "Something went wrong. Please try again."
        );
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

  const charProgress = Math.min((text.length / 2000) * 100, 100);
  const nearLimit = text.length > 1800;
  const canPost = text.trim().length > 0 && !loading;

  // Don't render Modal at all if not visible (avoids overlays)
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Keyboard-avoiding bottom sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kavWrapper}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.sheetWrap}>
            <Animated.View
              style={[
                styles.sheet,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Drag handle */}
              <View style={styles.dragHandle} />

              {/* ---------- HEADER ---------- */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={closeSheet}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#111111" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>New Post</Text>
                    <View style={styles.headerDot} />
                  </View>
                  <Text style={styles.headerSub}>Compose your story</Text>
                </View>

                <TouchableOpacity
                  onPress={handlePost}
                  disabled={!canPost}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <LinearGradient
                      colors={canPost ? ['#f9c349', '#f5a623'] : ['#F5F5F5', '#EFEFEF']}
                      style={styles.headerBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#111111" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="arrow-up"
                            size={15}
                            color={canPost ? "#111111" : "#BBBBBB"}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.headerBtnText,
                              !canPost && { color: '#BBBBBB' },
                            ]}
                          >
                            Post
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* ---------- BODY ---------- */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {!isReady ? (
                  <SheetSkeleton />
                ) : (
                  <>
                    {/* Author row */}
                    <View style={styles.authorRow}>
                      <View style={styles.avatarWrap}>
                        <LinearGradient
                          colors={['#f9c349', '#f5a623']}
                          style={styles.avatarGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.avatarMask}>
                            {user?.profileImage ? (
                              <Image
                                source={{ uri: user.profileImage }}
                                style={styles.avatarImg}
                              />
                            ) : (
                              <Text style={styles.avatarLetter}>
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                              </Text>
                            )}
                          </View>
                        </LinearGradient>
                        <View style={styles.onlineBadge}>
                          <View style={styles.onlineInner} />
                        </View>
                      </View>

                      <View style={styles.authorText}>
                        <Text style={styles.authorName} numberOfLines={1}>
                          {user?.name || "Community Member"}
                        </Text>
                        <View style={styles.authorSub}>
                          <Ionicons name="location-sharp" size={11} color="#f5a623" />
                          <Text style={styles.authorLoc} numberOfLines={1}>
                            {user?.location || "Karachi"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.visibilityPill}>
                        <Ionicons name="globe-outline" size={12} color="#666666" />
                        <Text style={styles.visibilityText}>Public</Text>
                      </View>
                    </View>

                    {/* Composer */}
                    <View style={styles.composerWrap}>
                      <Animated.View
                        style={[
                          styles.composerGlow,
                          {
                            opacity: focusGlow.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 0.18],
                            }),
                          },
                        ]}
                      />

                      <View style={styles.composer}>
                        <Animated.View
                          style={[
                            styles.composerBorder,
                            {
                              borderColor: focusGlow.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#EFEFEF', '#f9c349'],
                              }),
                            },
                          ]}
                        />

                        <TextInput
                          ref={inputRef}
                          placeholder="What's on your mind today?"
                          placeholderTextColor="#B5B5B5"
                          multiline
                          value={text}
                          onChangeText={setText}
                          style={styles.composerInput}
                          maxLength={2000}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          selectionColor="#f5a623"
                          scrollEnabled
                        />
                      </View>

                      {/* Stats */}
                      <Animated.View style={[styles.statsBar, { opacity: statsFade }]}>
                        <View style={styles.statsGroup}>
                          <View style={styles.statPill}>
                            <Ionicons name="pencil-outline" size={12} color="#666666" />
                            <Text style={styles.statPillText}>{text.length}</Text>
                          </View>
                          <View style={styles.statPill}>
                            <Ionicons name="reader-outline" size={12} color="#666666" />
                            <Text style={styles.statPillText}>{wordCount}w</Text>
                          </View>
                        </View>

                        <View style={styles.statRight}>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${charProgress}%`,
                                  backgroundColor: nearLimit ? '#EF4444' : '#f9c349',
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.progressLabel,
                              nearLimit && { color: '#EF4444' },
                            ]}
                          >
                            {text.length}/2000
                          </Text>
                        </View>
                      </Animated.View>
                    </View>

                    {/* Quick ideas — only when empty */}
                    {text.length === 0 && (
                      <View style={styles.tipsWrap}>
                        <View style={styles.tipsHeaderRow}>
                          <View style={styles.tipsAccent} />
                          <Text style={styles.tipsHeaderText}>Quick ideas</Text>
                        </View>

                        <View style={styles.tipsGrid}>
                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Today I want to share... ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: '#FFF4D6' }]}>
                              <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={16}
                                color="#f5a623"
                              />
                            </View>
                            <Text style={styles.ideaText}>Share a thought</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Quick question for the community: ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: '#E8F5E9' }]}>
                              <Ionicons
                                name="help-circle-outline"
                                size={16}
                                color="#22C55E"
                              />
                            </View>
                            <Text style={styles.ideaText}>Ask a question</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Small win worth celebrating: ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: '#FDE8E8' }]}>
                              <Ionicons
                                name="trophy-outline"
                                size={16}
                                color="#EF4444"
                              />
                            </View>
                            <Text style={styles.ideaText}>Celebrate a win</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Action bar — only when typing */}
                    {text.length > 0 && (
                      <View style={styles.actionBar}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => setText('')}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color="#EF4444"
                          />
                          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                            Clear
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={handlePost}
                          activeOpacity={0.7}
                          disabled={loading}
                        >
                          <Ionicons name="send" size={16} color="#22C55E" />
                          <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>
                            {loading ? 'Publishing...' : 'Publish'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Footer hint */}
                    <View style={styles.footerHint}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={13}
                        color="#BBBBBB"
                      />
                      <Text style={styles.footerHintText}>
                        Be kind. Be authentic. Community guidelines apply.
                      </Text>
                    </View>

                    <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  // ---------- Modal shell ----------
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: height * 0.88,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  // ---------- Skeleton ----------
  skUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0',
  },
  skLine: { backgroundColor: '#F0F0F0', borderRadius: 6 },
  skCard: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
  },

  // ---------- Header ----------
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
  },
  headerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f9c349',
    marginLeft: 6,
    marginTop: 1,
  },
  headerSub: {
    fontSize: 11.5,
    color: '#9A9A9A',
    fontWeight: '500',
    marginTop: 2,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 78,
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.2,
  },

  // ---------- Body / scroll ----------
  body: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },

  // ---------- Author ----------
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2F2F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  avatarWrap: { position: 'relative' },
  avatarGradient: {
    width: 48, height: 48, borderRadius: 24, padding: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarMask: {
    width: '100%', height: '100%', borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 17, fontWeight: '800', color: '#111111' },
  onlineBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  onlineInner: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  authorText: { flex: 1, marginLeft: 12, marginRight: 8 },
  authorName: {
    fontSize: 14.5, fontWeight: '700', color: '#111111',
    letterSpacing: -0.2,
  },
  authorSub: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  authorLoc: {
    fontSize: 11.5, color: '#888888', fontWeight: '500', marginLeft: 2,
  },
  visibilityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
  },
  visibilityText: {
    fontSize: 11, color: '#666666', fontWeight: '600',
  },

  // ---------- Composer ----------
  composerWrap: { position: 'relative', marginBottom: 18 },
  composerGlow: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    backgroundColor: '#f9c349',
    borderRadius: 26,
  },
  composer: {
    backgroundColor: '#FCFCFC',
    borderRadius: 22,
    minHeight: 170,
    padding: 16,
    overflow: 'hidden',
  },
  composerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  composerInput: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 25,
    textAlignVertical: 'top',
    minHeight: 140,
    paddingTop: 2,
    fontWeight: '400',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  statsGroup: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  statPillText: {
    fontSize: 11.5, color: '#555555', fontWeight: '700',
  },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    width: 50, height: 4,
    backgroundColor: '#EDEDED', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: {
    fontSize: 11.5, color: '#9A9A9A', fontWeight: '600',
    minWidth: 52, textAlign: 'right',
  },

  // ---------- Tips ----------
  tipsWrap: { marginBottom: 16 },
  tipsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8,
  },
  tipsAccent: {
    width: 3, height: 14, borderRadius: 2, backgroundColor: '#f9c349',
  },
  tipsHeaderText: {
    fontSize: 12.5, fontWeight: '700', color: '#111111',
    letterSpacing: -0.2, textTransform: 'uppercase',
  },
  tipsGrid: { flexDirection: 'row', gap: 10 },
  ideaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  ideaIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  ideaText: {
    fontSize: 12, fontWeight: '600', color: '#333333', lineHeight: 16,
  },

  // ---------- Action bar ----------
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 4,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  actionBtnText: { fontSize: 13.5, fontWeight: '700' },
  actionDivider: { width: 1, height: 22, backgroundColor: '#E8E8E8' },

  // ---------- Footer ----------
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  footerHintText: {
    fontSize: 11,
    color: '#BBBBBB',
    fontWeight: '500',
    textAlign: 'center',
  },
});