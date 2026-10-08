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
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from "../../context/AuthContext";
import { engagementBus, ENGAGEMENT_EVENTS } from '../../engagement/engagementBus';

import { color as T, font as F } from "../../theme/tokens";
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
                  <Ionicons name="close" size={20} color={T.ink} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>new post</Text>
                    <View style={styles.headerDot} />
                  </View>
                  <Text style={styles.headerSub}>compose your story</Text>
                </View>

                <TouchableOpacity
                  onPress={handlePost}
                  disabled={!canPost}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <LinearGradient
                      colors={canPost ? [T.yellow, T.yellow] : [T.sand, T.sand]}
                      style={styles.headerBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color={T.ink} size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="arrow-up"
                            size={15}
                            color={canPost ? T.ink : T.textFaint}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.headerBtnText,
                              !canPost && { color: T.textFaint },
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
                          colors={[T.yellow, T.yellow]}
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
                          <Ionicons name="location-sharp" size={11} color={T.yellow} />
                          <Text style={styles.authorLoc} numberOfLines={1}>
                            {user?.location || "Karachi"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.visibilityPill}>
                        <Ionicons name="globe-outline" size={12} color={T.textMuted} />
                        <Text style={styles.visibilityText}>public</Text>
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
                                outputRange: [T.sand, T.yellow],
                              }),
                            },
                          ]}
                        />

                        <TextInput
                          ref={inputRef}
                          placeholder="What's on your mind today?"
                          placeholderTextColor={T.textFaint}
                          multiline
                          value={text}
                          onChangeText={setText}
                          style={styles.composerInput}
                          maxLength={2000}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          selectionColor={T.yellow}
                          scrollEnabled
                        />
                      </View>

                      {/* Stats */}
                      <Animated.View style={[styles.statsBar, { opacity: statsFade }]}>
                        <View style={styles.statsGroup}>
                          <View style={styles.statPill}>
                            <Ionicons name="pencil-outline" size={12} color={T.textMuted} />
                            <Text style={styles.statPillText}>{text.length}</Text>
                          </View>
                          <View style={styles.statPill}>
                            <Ionicons name="reader-outline" size={12} color={T.textMuted} />
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
                                  backgroundColor: nearLimit ? T.danger : T.yellow,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.progressLabel,
                              nearLimit && { color: T.danger },
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
                          <Text style={styles.tipsHeaderText}>quick ideas</Text>
                        </View>

                        <View style={styles.tipsGrid}>
                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Today I want to share... ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: T.yellowSoft }]}>
                              <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={16}
                                color={T.yellow}
                              />
                            </View>
                            <Text style={styles.ideaText}>share a thought</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Quick question for the community: ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: T.successBg }]}>
                              <Ionicons
                                name="help-circle-outline"
                                size={16}
                                color={T.success}
                              />
                            </View>
                            <Text style={styles.ideaText}>ask a question</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.ideaCard}
                            activeOpacity={0.75}
                            onPress={() => setText("Small win worth celebrating: ")}
                          >
                            <View style={[styles.ideaIcon, { backgroundColor: T.dangerBg }]}>
                              <Ionicons
                                name="trophy-outline"
                                size={16}
                                color={T.danger}
                              />
                            </View>
                            <Text style={styles.ideaText}>celebrate a win</Text>
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
                            color={T.danger}
                          />
                          <Text style={[styles.actionBtnText, { color: T.danger }]}>
                            clear
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={handlePost}
                          activeOpacity={0.7}
                          disabled={loading}
                        >
                          <Ionicons name="send" size={16} color={T.success} />
                          <Text style={[styles.actionBtnText, { color: T.success }]}>
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
                        color={T.textFaint}
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
    backgroundColor: T.overlay,
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: height * 0.88,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.sand,
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
    width: 50, height: 50, borderRadius: 25, backgroundColor: T.sand,
  },
  skLine: { backgroundColor: T.sand, borderRadius: 6 },
  skCard: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    backgroundColor: T.sand,
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
    backgroundColor: T.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: -0.3,
  },
  headerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: T.yellow,
    marginLeft: 6,
    marginTop: 1,
  },
  headerSub: {
    fontSize: 11.5,
    color: T.textFaint,
    fontFamily: F.bodyMedium,
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
    fontFamily: F.bodyBold,
    color: T.ink,
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
    backgroundColor: T.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink },
  onlineBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineInner: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: T.success,
  },
  authorText: { flex: 1, marginLeft: 12, marginRight: 8 },
  authorName: {
    fontSize: 14.5, fontFamily: F.bodyBold, color: T.ink,
    letterSpacing: -0.2,
  },
  authorSub: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  authorLoc: {
    fontSize: 11.5, color: T.textFaint, fontFamily: F.bodyMedium, marginLeft: 2,
  },
  visibilityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.sand,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
  },
  visibilityText: {
    fontSize: 11, color: T.textMuted, fontFamily: F.bodySemi,
  },

  // ---------- Composer ----------
  composerWrap: { position: 'relative', marginBottom: 18 },
  composerGlow: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    backgroundColor: T.yellow,
    borderRadius: 26,
  },
  composer: {
    backgroundColor: T.sand,
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
    color: T.ink,
    lineHeight: 25,
    textAlignVertical: 'top',
    minHeight: 140,
    paddingTop: 2,
    fontFamily: F.body,
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
    backgroundColor: T.sand,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  statPillText: {
    fontSize: 11.5, color: T.textMuted, fontFamily: F.bodyBold,
  },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    width: 50, height: 4,
    backgroundColor: T.sand, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: {
    fontSize: 11.5, color: T.textFaint, fontFamily: F.bodySemi,
    minWidth: 52, textAlign: 'right',
  },

  // ---------- Tips ----------
  tipsWrap: { marginBottom: 16 },
  tipsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8,
  },
  tipsAccent: {
    width: 3, height: 14, borderRadius: 2, backgroundColor: T.yellow,
  },
  tipsHeaderText: {
    fontSize: 12.5, fontFamily: F.bodyBold, color: T.ink,
    letterSpacing: -0.2, textTransform: 'none',
  },
  tipsGrid: { flexDirection: 'row', gap: 10 },
  ideaCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'flex-start',
    shadowColor: T.ink,
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
    fontSize: 12, fontFamily: F.bodySemi, color: T.ink, lineHeight: 16,
  },

  // ---------- Action bar ----------
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.sand,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.line,
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
  actionBtnText: { fontSize: 13.5, fontFamily: F.bodyBold },
  actionDivider: { width: 1, height: 22, backgroundColor: T.sand },

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
    color: T.textFaint,
    fontFamily: F.bodyMedium,
    textAlign: 'center',
  },
});