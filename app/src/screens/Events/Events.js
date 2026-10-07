// EventsScreen.js — Manual events (internal form) + Imported events (external link) — both award points
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useOpenFromParams } from "../../engagement/hooks/useOpenFromParams";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import GuestGuard from "../../components/GuestGuard";
import io from "socket.io-client";
import { engagementBus, ENGAGEMENT_EVENTS } from "../../engagement/engagementBus";
import { colors as tdcColors } from "../../theme";

const { height, width } = Dimensions.get("window");
const SHEET_HEIGHT = Math.round(height * 0.85);

const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
const SOCKET_URL = "https://the-deft-crew-production.up.railway.app";

// ─── Event source detection ─────────────────────────────────────────────
const isImportedEvent = (event) => {
  if (!event) return false;
  if (event.isImported === true) return true;
  if (typeof event.source === "string" && event.source !== "manual") return true;
  const hasLink = !!(event.registrationUrl || event.externalUrl);
  const hasCreator = !!(event.creator || event.creatorEmail);
  if (hasLink && !hasCreator) return true;
  return false;
};

// CATEGORY_THEME is only a *visual theme* map, not the source of truth for
// which categories exist. The list of categories is derived from events
// (like cities) plus the backend /categories endpoint. Unknown categories
// get a deterministic fallback theme derived from their name.
const CATEGORY_THEME = {
  Hackathons: { icon: "code-outline", color: "#2563eb", bg: "#dbeafe" },
  Workshops: { icon: "construct-outline", color: "#7c3aed", bg: "#ede9fe" },
  Conferences: { icon: "people-outline", color: "#dc2626", bg: "#fef2f2" },
  Competitions: { icon: "trophy-outline", color: "#d97706", bg: "#fffbeb" },
  "Career Fairs": { icon: "briefcase-outline", color: "#059669", bg: "#ecfdf5" },
  Concerts: { icon: "musical-notes-outline", color: "#ec4899", bg: "#fce7f3" },
  Poetry: { icon: "book-outline", color: "#8b5cf6", bg: "#f3e8ff" },
  Classes: { icon: "school-outline", color: "#0891b2", bg: "#cffafe" },
  "Classes & Workshops": { icon: "school-outline", color: "#0891b2", bg: "#cffafe" },
  Theatre: { icon: "film-outline", color: "#7c2d12", bg: "#ffedd5" },
  "Theatre, Arts & Culture": { icon: "film-outline", color: "#7c2d12", bg: "#ffedd5" },
  "Arts & Crafts": { icon: "color-palette-outline", color: "#db2777", bg: "#fce7f3" },
  "Festivals & Markets": { icon: "balloon-outline", color: "#ea580c", bg: "#ffedd5" },
  "Fashion & Lifestyle": { icon: "shirt-outline", color: "#9333ea", bg: "#f3e8ff" },
  "Food & Culinary": { icon: "restaurant-outline", color: "#dc2626", bg: "#fee2e2" },
  "Adventure & Tours": { icon: "trail-sign-outline", color: "#16a34a", bg: "#dcfce7" },
  "Education & Business": { icon: "business-outline", color: "#0f766e", bg: "#ccfbf1" },
  "Health,Wellness & Beauty": { icon: "heart-outline", color: "#e11d48", bg: "#ffe4e6" },
  "Sports & Screenings": { icon: "football-outline", color: "#0284c7", bg: "#e0f2fe" },
  "Movie Night": { icon: "videocam-outline", color: "#4338ca", bg: "#e0e7ff" },
  Comedy: { icon: "happy-outline", color: "#ca8a04", bg: "#fef9c3" },
  Automotive: { icon: "car-sport-outline", color: "#334155", bg: "#e2e8f0" },
  "Concerts & Live Music": { icon: "musical-notes-outline", color: "#ec4899", bg: "#fce7f3" },
};

// Deterministic fallback palette for categories we haven't themed yet
const FALLBACK_PALETTE = [
  { color: "#2563eb", bg: "#dbeafe", icon: "sparkles-outline" },
  { color: "#7c3aed", bg: "#ede9fe", icon: "sparkles-outline" },
  { color: "#dc2626", bg: "#fee2e2", icon: "sparkles-outline" },
  { color: "#d97706", bg: "#fffbeb", icon: "sparkles-outline" },
  { color: "#059669", bg: "#ecfdf5", icon: "sparkles-outline" },
  { color: "#ec4899", bg: "#fce7f3", icon: "sparkles-outline" },
  { color: "#0891b2", bg: "#cffafe", icon: "sparkles-outline" },
  { color: "#7c2d12", bg: "#ffedd5", icon: "sparkles-outline" },
];

const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getCategoryTheme = (cat) => {
  if (!cat) return { icon: "sparkles-outline", color: "#1a1a2e", bg: "#f0f2f6" };
  if (CATEGORY_THEME[cat]) return CATEGORY_THEME[cat];

  const lower = String(cat).toLowerCase();
  const key = Object.keys(CATEGORY_THEME).find(
    (k) => k.toLowerCase() === lower
  );
  if (key) return CATEGORY_THEME[key];

  return FALLBACK_PALETTE[hashString(String(cat)) % FALLBACK_PALETTE.length];
};

const FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1523240715632-d984bb4b970e?w=1200";

const COLORS = {
  page: "#f8f9fc",
  pageAlt: "#f0f2f6",
  ink: "#1a1a2e",
  body: "#2d2d44",
  muted: "#6b6b8a",
  line: "#e8ecf1",
  card: "#ffffff",
  surface: "#f5f6fa",
  primary: "#1a1a2e",
  secondary: tdcColors.yellow,
  accent: tdcColors.yellow,
  danger: "#e74c3c",
  goldSoft: "#fff5e0",
  overlayDark: "rgba(26, 26, 46, 0.85)",
  gradientStart: "#1a1a2e",
  gradientEnd: "#16213e",
  success: "#10b981",
  warning: "#f59e0b",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const formatCategoryLabel = (cat) => (cat === "All" ? "All" : cat);

// ─── Shimmer Skeleton ───────────────────────────────────────────────────
const ShimmerSkeleton = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 1.5, width * 1.5],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage}>
        <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
      </View>
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonTitle, { overflow: "hidden" }]}>
          <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
        </View>
        <View style={[styles.skeletonText, { overflow: "hidden" }]}>
          <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
        </View>
        <View style={[styles.skeletonTextShort, { overflow: "hidden" }]}>
          <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
        </View>
        <View style={styles.skeletonFooter}>
          <View style={[styles.skeletonButton, { overflow: "hidden" }]}>
            <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const SkeletonList = () => (
  <View style={styles.listContent}>
    {[1, 2, 3].map((item) => (
      <ShimmerSkeleton key={item} />
    ))}
  </View>
);

// ─── Animated Event Card ──────────────────────────────────────────────────
const EventCard = ({ item, index, onOpen, onRegister, isRegistered, onCancel }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay: index * 80, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, delay: index * 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 55, delay: index * 80, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 1, duration: 800, delay: index * 80 + 200, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const animatePressIn = () => {
    Animated.spring(cardScale, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const animatePressOut = () => {
    Animated.spring(cardScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.15, 0],
  });

  const theme = getCategoryTheme(item.type);
  const imported = isImportedEvent(item);

  return (
    <AnimatedTouchable
      activeOpacity={0.92}
      onPress={() => onOpen(item)}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      style={[styles.card, { opacity, transform: [{ translateY }, { scale: cardScale }] }]}
    >
      <LinearGradient
        colors={["#FFFFFF", "#FAFBFF"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />

        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image || FALLBACK_BANNER }} style={styles.cardImage} />
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={styles.imageOverlay} />

          <View style={[styles.categoryBadge, { backgroundColor: theme.bg }]}>
            <Ionicons name={theme.icon} size={10} color={theme.color} />
            <Text style={[styles.categoryBadgeText, { color: theme.color }]} numberOfLines={1}>
              {item.type || "Event"}
            </Text>
          </View>

          {imported && (
            <View style={styles.importedPill}>
              <Ionicons name="open-outline" size={10} color="#fff" />
              <Text style={styles.importedPillText}>External</Text>
            </View>
          )}

          {isRegistered && (
            <View style={styles.registeredBadge}>
              <LinearGradient
                colors={["#10b981", "#059669"]}
                style={styles.registeredBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={styles.registeredBadgeText}>Registered</Text>
              </LinearGradient>
            </View>
          )}

          <View style={styles.dateBadge}>
            <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]} style={styles.dateBadgeGradient}>
              <Text style={styles.dateBadgeText}>{item.date || "TBA"}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <View style={styles.orgContainer}>
              <LinearGradient colors={[tdcColors.yellow, "#f5a623"]} style={styles.orgAvatar}>
                <Ionicons name="location" size={16} color="#fff" />
              </LinearGradient>
              <Text style={styles.locationText} numberOfLines={1}>
                {item.city || "City"}
              </Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description || "Join this exciting event and connect with fellow students."}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={14} color={COLORS.accent} />
              <Text style={styles.statText}>{item.date || "TBA"}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            {isRegistered ? (
              <TouchableOpacity
                style={styles.cancelActionButton}
                onPress={() => onCancel && onCancel(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={16} color="#FF3B30" />
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.registerActionButton}
                onPress={() => onRegister(item)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={imported ? ["#6366f1", "#4f46e5"] : [tdcColors.yellow, "#f5a623"]}
                  style={styles.registerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={imported ? "open-outline" : "add"} size={16} color="#fff" />
                  <Text style={styles.registerActionText}>
                    {imported ? "Open Link" : "Register"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.detailsActionButton} onPress={() => onOpen(item)} activeOpacity={0.7}>
              <Text style={styles.detailsActionText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </AnimatedTouchable>
  );
};

// ─── Modern Header ────────────────────────────────────────────────────────
const ModernHeader = ({ onBack, onMenuPress, showApplied, appliedCount }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.modernHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[COLORS.accent, "#f7d44a"]}
            style={styles.logoBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="calendar-star" size={16} color="#000" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>
              {showApplied ? "My Events" : "Events"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {showApplied ? "Your registrations" : "Discover & Connect"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onMenuPress}
        style={[styles.headerBtn, showApplied && styles.headerBtnActive]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={showApplied ? "checkmark-circle" : "apps"}
          size={22}
          color={showApplied ? COLORS.success : COLORS.primary}
        />
        {appliedCount > 0 && !showApplied && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{appliedCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { token, user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [activeCity, setActiveCity] = useState("All");
  const [registerEvent, setRegisterEvent] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showApplied, setShowApplied] = useState(false);
  const [appliedEventsData, setAppliedEventsData] = useState([]);
  const [userEventsCount, setUserEventsCount] = useState(0);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic categories fetched from backend
  const [categories, setCategories] = useState([]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const filterTranslate = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    title: "",
    university: "",
    city: "",
    type: "Hackathons",
    prize: "",
    deadline: "",
    description: "",
    location: "",
    contact: "",
    date: "",
    teamSize: "",
    registrationUrl: "",
  });

  const [regForm, setRegForm] = useState({
    studentName: "",
    whatsapp: "",
    studentId: "",
    email: "",
  });

  const availableCities = useMemo(() => {
    if (!events || events.length === 0) return [];
    const set = new Set();
    events.forEach((ev) => {
      const c = (ev.city || "").toString().trim();
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  // Derive categories from the loaded events (like cities), merging with the
  // backend-provided list so nothing gets lost during a partial fetch.
  const availableCategories = useMemo(() => {
    const set = new Set();

    events.forEach((ev) => {
      const push = (v) => {
        if (!v) return;
        const s = String(v).trim();
        if (!s) return;
        if (s.toLowerCase() === "general") return;
        set.add(s);
      };
      push(ev.type);
      if (Array.isArray(ev.categories)) ev.categories.forEach(push);
      if (Array.isArray(ev.tags)) ev.tags.forEach(push);
    });

    (categories || []).forEach((c) => {
      const s = String(c || "").trim();
      if (!s) return;
      if (s.toLowerCase() === "general") return;
      set.add(s);
    });

    return ["All", ...Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )];
  }, [events, categories]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePostEvent = async () => {
    if (!form.title || !form.university || !form.date) {
      Alert.alert("Validation Error", "Please fill required fields (Title, University, Date).");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/create`,
        { ...form, image: selectedImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Event created successfully.");
      setModalVisible(false);
      setForm({
        title: "",
        university: "",
        city: "",
        type: "Hackathons",
        prize: "",
        deadline: "",
        description: "",
        location: "",
        contact: "",
        date: "",
        teamSize: "",
        registrationUrl: "",
      });
      setSelectedImage(null);
      fetchEvents();
      fetchCategories();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to post event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = (eventItem) => {
    if (!eventItem) return;

    if (isEventRegistered(eventItem._id)) {
      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        Alert.alert("Already Registered", "You're already registered for this event.");
      }
      return;
    }

    if (isImportedEvent(eventItem)) {
      (async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/track-external/${eventItem._id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res?.data?.engagement?.popups?.length) {
            engagementBus.emit(
              ENGAGEMENT_EVENTS.POPUPS_QUEUED,
              res.data.engagement.popups
            );
          }

          engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
          await fetchRegisteredEvents();
        } catch (e) {
          console.log("[track-external] failed:", e?.response?.data || e?.message);
        }
      })();

      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          (eventItem.title || "") + " " + (eventItem.organizer || "") + " event registration"
        )}`;
        Linking.openURL(searchUrl).catch(() => {
          Alert.alert("Notice", "No registration link available for this event.");
        });
      }
      return;
    }

    setRegForm({
      studentName: user?.name || "",
      email: user?.email || "",
      whatsapp: "",
      studentId: "",
    });
    setRegisterEvent(eventItem);
  };

  useEffect(() => {
    bootstrap();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.emit("subscribe_events");

    socket.on("events:new_imported", (data) => {
      if (data?.events && Array.isArray(data.events)) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e._id));
          const newUnique = data.events.filter((e) => !existingIds.has(e._id));
          return [...newUnique, ...prev];
        });
      } else {
        fetchEvents();
      }
      fetchCategories();
    });

    socket.on("events:expired", () => {
      fetchEvents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchRegisteredEvents();
      }
    });
    return () => sub.remove();
  }, [token]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEvents(true),
        fetchCategories(),
        fetchRegisteredEvents(),
      ]);
      runEntranceAnimations();
    } finally {
      setLoading(false);
    }
  };

  const runEntranceAnimations = () => {
    headerOpacity.setValue(0);
    headerTranslate.setValue(-20);
    filterOpacity.setValue(0);
    filterTranslate.setValue(20);
    listOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(filterOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(filterTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.timing(listOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 400);
  };

  const fetchEvents = async (isInitial = false) => {
    try {
      if (!isInitial) setRefreshing(true);
      const res = await axios.get(`${API_BASE}/feed`);
      const fetchedEvents = Array.isArray(res.data) ? res.data : res.data?.events || [];
      setEvents(fetchedEvents);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch events");
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch the distinct category list from the backend.
  // Fails silently — the derived `availableCategories` still covers the UI.
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.categories)
        ? res.data.categories
        : [];
      setCategories(list);
    } catch (error) {
      console.log("fetchCategories failed:", error?.message);
    }
  };

  const fetchRegisteredEvents = async () => {
    if (!token) {
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawList = Array.isArray(res.data) ? res.data : [];

      const ids = rawList
        .map((r) => {
          if (!r) return null;
          if (typeof r === "string") return r;
          if (r.eventId && typeof r.eventId === "object") {
            return r.eventId._id || r.eventId.id || null;
          }
          return r.eventId || null;
        })
        .filter(Boolean)
        .map(String);

      setRegisteredEventIds(ids);

      const appliedList = rawList
        .filter((r) => r && r.eventId && typeof r.eventId === "object")
        .map((r) => ({ event: r.eventId, registration: r }));
      setAppliedEventsData(appliedList);
    } catch (error) {
      console.log("Error fetching registrations:", error);
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchCategories(), fetchRegisteredEvents()]);
  };

  const handleRegistrationSubmit = async () => {
    if (!regForm.studentName || !regForm.email || !regForm.whatsapp) {
      Alert.alert("Validation Error", "Please fill all required fields.");
      return;
    }
    if (!token) {
      Alert.alert("Authentication Error", "Please login to register.");
      return;
    }
    if (!registerEvent?._id) {
      Alert.alert("Error", "No event selected.");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/register`,
        {
          eventId: registerEvent._id,
          studentName: regForm.studentName,
          email: regForm.email,
          whatsapp: regForm.whatsapp,
          studentId: regForm.studentId || "Not provided",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.engagement?.popups?.length) {
        engagementBus.emit(
          ENGAGEMENT_EVENTS.POPUPS_QUEUED,
          res.data.engagement.popups
        );
      }

      engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);

      Alert.alert("Success", "Registration successful.");
      setRegisterEvent(null);
      setRegForm({
        studentName: user?.name || "",
        whatsapp: "",
        studentId: "",
        email: user?.email || "",
      });
      await fetchRegisteredEvents();
    } catch (error) {
      if (error?.response?.data?.alreadyRegistered) {
        Alert.alert("Notice", "You're already registered for this event.");
        setRegisterEvent(null);
        await fetchRegisteredEvents();
        return;
      }
      Alert.alert(
        "Error",
        error.response?.data?.error || "Registration failed"
      );
    }
  };

  const handleCancelRegistration = async (event) => {
    if (!token) {
      Alert.alert("Authentication Error", "Please login to cancel registration.");
      return;
    }

    Alert.alert(
      "Cancel Registration",
      `Are you sure you want to cancel your registration for "${event.title}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/register/${event._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Registration cancelled successfully.");
              await fetchRegisteredEvents();
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to cancel registration"
              );
            }
          },
        },
      ]
    );
  };

  const normalizeCategoryStr = (str) => {
    if (!str) return "";
    let s = str.toString().trim().toLowerCase();
    if (s.length > 3 && s.endsWith("s")) s = s.slice(0, -1);
    return s;
  };

  const isCategoryMatch = (event, category) => {
    if (!category || category === "All") return true;
    const normTab = normalizeCategoryStr(category);

    if (event.type) {
      const normType = normalizeCategoryStr(event.type);
      if (normType === normTab || normType.includes(normTab) || normTab.includes(normType)) {
        return true;
      }
    }
    if (Array.isArray(event.categories)) {
      if (event.categories.some((cat) => {
        const n = normalizeCategoryStr(cat);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    if (Array.isArray(event.tags)) {
      if (event.tags.some((tag) => {
        const n = normalizeCategoryStr(tag);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    return false;
  };

  const isCityMatch = (event, city) => {
    if (!city || city === "All") return true;
    return (event.city || "").toString().trim().toLowerCase() ===
           city.toString().trim().toLowerCase();
  };

  const filteredEvents = useMemo(() => {
    if (showApplied) {
      return appliedEventsData
        .map((item) => ({ ...item.event, registration: item.registration }))
        .filter((ev) => isCityMatch(ev, activeCity));
    }

    let list = events;
    if (activeTab && activeTab !== "All") list = list.filter((e) => isCategoryMatch(e, activeTab));
    if (activeCity && activeCity !== "All") list = list.filter((e) => isCityMatch(e, activeCity));
    return list;
  }, [activeTab, activeCity, events, showApplied, appliedEventsData]);

  const isEventRegistered = (eventId) => registeredEventIds.includes(eventId);
  const appliedCount = registeredEventIds.length;

  // ✅ FIX: iterate dynamic `availableCategories`. Fixed-width chips, 2-line
  // labels, and auto-shrink so long names never look like "one big + one small".
  const CategoryScroll = () => (
    <Animated.View
      style={[
        styles.categoryScrollContainer,
        { opacity: filterOpacity, transform: [{ translateY: filterTranslate }] },
      ]}
    >
      {!showApplied && availableCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {availableCategories.map((cat) => {
            const active = activeTab === cat;
            const theme = getCategoryTheme(cat);
            const isAll = cat === "All";
            const bg = active
              ? isAll
                ? COLORS.primary
                : theme.color
              : isAll
              ? COLORS.pageAlt
              : theme.bg;
            const fg = active ? "#fff" : isAll ? COLORS.primary : theme.color;

            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryScrollItem,
                  active && styles.categoryScrollItemActive,
                  { backgroundColor: bg },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(cat);
                  setShowApplied(false);
                }}
              >
                <View
                  style={[
                    styles.categoryScrollIcon,
                    active && { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons
                    name={isAll ? "apps-outline" : theme.icon}
                    size={16}
                    color={fg}
                  />
                </View>

                <Text
                  style={[styles.categoryScrollLabel, { color: fg }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  allowFontScaling={false}
                >
                  {formatCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );

  const CityFilterScroll = () => {
    if (availableCities.length <= 1) return null;

    return (
      <Animated.View style={[styles.cityScrollContainer, { opacity: filterOpacity }]}>
        <View style={styles.cityScrollHeader}>
          <Ionicons name="location-outline" size={13} color={COLORS.muted} />
          <Text style={styles.cityScrollHeaderText}>Filter by city</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScrollContent}
        >
          {availableCities.map((city) => {
            const active = activeCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityChip, active && styles.cityChipActive]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCity(city);
                }}
              >
                {active && (
                  <Ionicons name="checkmark-circle" size={12} color="#000" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  };

  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowApplied(!showApplied);
    if (!showApplied) {
      setActiveTab("All");
      setActiveCity("All");
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const closeDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEvent(null);
  };

  // Daily Drop / push → navigate('Events', { openEventId }) opens that event
  useOpenFromParams("openEventId", async (id) => {
    let ev = events.find((e) => String(e._id) === String(id));
    if (!ev) {
      const res = await axios.get(`${API_BASE}/${id}`);
      ev = res.data;
    }
    if (ev?._id) setSelectedEvent(ev);
    return true;
  }, !loading);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <ModernHeader
          onBack={handleBackPress}
          onMenuPress={handleMenuPress}
          showApplied={showApplied}
          appliedCount={appliedCount}
        />
        <SkeletonList />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />

      <ModernHeader
        onBack={handleBackPress}
        onMenuPress={handleMenuPress}
        showApplied={showApplied}
        appliedCount={appliedCount}
      />

      <CategoryScroll />
      <CityFilterScroll />

      <Animated.View style={[styles.feedContainer, { opacity: listOpacity }]}>
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <EventCard
              item={item}
              index={index}
              onOpen={setSelectedEvent}
              onRegister={handleRegister}
              isRegistered={isEventRegistered(item._id)}
              onCancel={handleCancelRegistration}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !refreshing && (
              <Animated.View style={[styles.emptyState, { opacity: listOpacity }]}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name={showApplied ? "checkmark-circle" : "calendar"}
                    size={48}
                    color={COLORS.accent}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {showApplied ? "No registered events" : "No events found"}
                </Text>
                <Text style={styles.emptyText}>
                  {showApplied
                    ? "You haven't registered for any events yet. Explore and register!"
                    : activeCity !== "All"
                    ? `No events in ${activeCity}. Try another city.`
                    : "Check back later for upcoming events in your area."}
                </Text>
                {showApplied && (
                  <TouchableOpacity
                    style={styles.exploreButton}
                    onPress={() => setShowApplied(false)}
                  >
                    <LinearGradient colors={[tdcColors.yellow, "#f5a623"]} style={styles.exploreGradient}>
                      <Text style={styles.exploreButtonText}>Explore Events</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {!showApplied && activeCity !== "All" && (
                  <TouchableOpacity
                    style={styles.exploreButton}
                    onPress={() => setActiveCity("All")}
                  >
                    <LinearGradient colors={[tdcColors.yellow, "#f5a623"]} style={styles.exploreGradient}>
                      <Text style={styles.exploreButtonText}>Clear City Filter</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )
          }
        />
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EVENT DETAIL — BOTTOM SHEET */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetail}
        statusBarTranslucent={true}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeDetail}>
          <Pressable
            style={[styles.sheetContainer, { height: SHEET_HEIGHT }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            {selectedEvent && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetGrabber} />
                  <View style={styles.sheetHeaderRow}>
                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
                      Event Details
                    </Text>

                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  bounces={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.sheetImageWrapper}>
                    <Image
                      source={{ uri: selectedEvent.image || FALLBACK_BANNER }}
                      style={styles.sheetBanner}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)"]}
                      style={styles.sheetBannerOverlay}
                    />
                    {isEventRegistered(selectedEvent._id) && (
                      <View style={styles.sheetRegisteredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.sheetRegisteredText}>Registered</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sheetBody}>
                    <View style={styles.detailTopRow}>
                      <View
                        style={[
                          styles.detailTag,
                          { backgroundColor: getCategoryTheme(selectedEvent.type).bg },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryTheme(selectedEvent.type).icon}
                          size={12}
                          color={getCategoryTheme(selectedEvent.type).color}
                        />
                        <Text
                          style={[
                            styles.detailTagText,
                            { color: getCategoryTheme(selectedEvent.type).color },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedEvent.type}
                        </Text>
                      </View>
                      {isEventRegistered(selectedEvent._id) && (
                        <View style={[styles.detailTag, { backgroundColor: "#d1fae5" }]}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={[styles.detailTagText, { color: COLORS.success }]}>
                            Registered
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.detailTitle}>{selectedEvent.title}</Text>

                    <View style={styles.detailOrgRow}>
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.detailAvatarSmall}
                      >
                        <Ionicons name="location" size={16} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.detailOrgLocationLarge}>
                        {selectedEvent.city || "City"}
                      </Text>
                    </View>

                    <View style={styles.specRow}>
                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="calendar" size={18} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Date</Text>
                        <Text style={styles.specText}>{selectedEvent.date || "TBA"}</Text>
                      </View>

                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="hourglass" size={18} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Deadline</Text>
                        <Text style={styles.specText}>{selectedEvent.deadline || "Open"}</Text>
                      </View>

                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="people" size={18} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Team</Text>
                        <Text style={styles.specText}>{selectedEvent.teamSize || "Any"}</Text>
                      </View>
                    </View>

                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>Description</Text>
                      <Text style={styles.sectionCardBody}>
                        {selectedEvent.description || "No description provided."}
                      </Text>
                    </View>

                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>Location</Text>
                      <Text style={styles.sectionCardBody}>
                        <Ionicons name="location" size={14} color={COLORS.accent} />{" "}
                        {selectedEvent.location || "Online event"}
                      </Text>
                    </View>

                    {selectedEvent.university ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>University</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="school" size={14} color={COLORS.accent} />{" "}
                          {selectedEvent.university}
                        </Text>
                      </View>
                    ) : null}

                    {selectedEvent.prize ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>Prize Pool</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="trophy" size={14} color={COLORS.accent} />{" "}
                          {selectedEvent.prize}
                        </Text>
                      </View>
                    ) : null}

                    {selectedEvent.contact ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>Contact</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="call" size={14} color={COLORS.accent} />{" "}
                          {selectedEvent.contact}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ height: 24 }} />
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.sheetStickyFooter,
                    { paddingBottom: (insets.bottom || 0) + 12 },
                  ]}
                >
                  <View style={styles.sheetStickyContent}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.stickyLabel}>
                        {isImportedEvent(selectedEvent) ? "External event" : "Register before"}
                      </Text>
                      <Text style={styles.stickyValue} numberOfLines={1}>
                        {selectedEvent.deadline || "Limited Spots"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        const e = selectedEvent;
                        setSelectedEvent(null);
                        handleRegister(e);
                      }}
                    >
                      <LinearGradient
                        colors={
                          isImportedEvent(selectedEvent)
                            ? ["#6366f1", "#4f46e5"]
                            : [COLORS.primary, COLORS.gradientEnd]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.stickyButton}
                      >
                        <Text style={styles.stickyButtonText}>
                          {isImportedEvent(selectedEvent) ? "Open Link" : "Register Now"}
                        </Text>
                        <Ionicons
                          name={isImportedEvent(selectedEvent) ? "open-outline" : "arrow-forward"}
                          size={16}
                          color={COLORS.accent}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE EVENT MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalScreen}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={[styles.modalHero, { paddingTop: (insets.top || 0) + 12 }]}
              >
                <View style={styles.modalHeroTop}>
                  <View style={styles.modalHeroTitleRow}>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                    <Text style={styles.modalHeroTitle}>Create Event</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.86}
                  >
                    <Ionicons name="close" size={25} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalHeroSubtitle}>
                  Publish an event and connect with your campus community
                </Text>
              </LinearGradient>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
              >
                <ScrollView
                  style={styles.formScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.formScrollContent,
                    { paddingBottom: (insets.bottom || 12) + 24 },
                  ]}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Event Title *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter event title"
                      placeholderTextColor="#8a8a8a"
                      value={form.title}
                      onChangeText={(text) => setForm({ ...form, title: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>University *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="University name"
                          placeholderTextColor="#8a8a8a"
                          value={form.university}
                          onChangeText={(text) => setForm({ ...form, university: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>City *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="City"
                          placeholderTextColor="#8a8a8a"
                          value={form.city}
                          onChangeText={(text) => setForm({ ...form, city: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category *</Text>
                    {/* ✅ FIX: long labels shrink and stay on one line inside the pill */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {availableCategories
                        .filter((item) => item !== "All")
                        .map((cat) => {
                          const selected = form.type === cat;
                          const theme = getCategoryTheme(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              activeOpacity={0.86}
                              onPress={() => setForm({ ...form, type: cat })}
                              style={[
                                styles.optionPill,
                                selected && styles.optionPillActive,
                                { borderColor: selected ? theme.color : COLORS.line },
                              ]}
                            >
                              {selected && (
                                <LinearGradient
                                  colors={[theme.color, theme.color + "80"]}
                                  style={StyleSheet.absoluteFillObject}
                                />
                              )}
                              <Ionicons
                                name={theme.icon}
                                size={14}
                                color={selected ? "#fff" : theme.color}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextActive,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                allowFontScaling={false}
                              >
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={[styles.textInput, styles.multiLineInput]}
                      placeholder="Describe your event..."
                      placeholderTextColor="#8a8a8a"
                      multiline
                      value={form.description}
                      onChangeText={(text) => setForm({ ...form, description: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Event Date</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="15 May 2026"
                          placeholderTextColor="#8a8a8a"
                          value={form.date}
                          onChangeText={(text) => setForm({ ...form, date: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Team Size</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2-4 Members"
                          placeholderTextColor="#8a8a8a"
                          value={form.teamSize}
                          onChangeText={(text) => setForm({ ...form, teamSize: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location / Venue</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Auditorium, online, lab..."
                      placeholderTextColor="#8a8a8a"
                      value={form.location}
                      onChangeText={(text) => setForm({ ...form, location: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Prize Pool</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="PKR 100,000"
                          placeholderTextColor="#8a8a8a"
                          value={form.prize}
                          onChangeText={(text) => setForm({ ...form, prize: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Deadline</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="30 April 2026"
                          placeholderTextColor="#8a8a8a"
                          value={form.deadline}
                          onChangeText={(text) => setForm({ ...form, deadline: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Info</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email or phone"
                      placeholderTextColor="#8a8a8a"
                      value={form.contact}
                      onChangeText={(text) => setForm({ ...form, contact: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Original Event / Registration Link</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="https://forms.google.com/... or https://luma.com/..."
                      placeholderTextColor="#8a8a8a"
                      value={form.registrationUrl}
                      onChangeText={(text) => setForm({ ...form, registrationUrl: text })}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Event Banner</Text>
                    <TouchableOpacity
                      style={styles.uploadCard}
                      activeOpacity={0.88}
                      onPress={pickImage}
                    >
                      {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.uploadPreview} />
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <View style={styles.uploadIconCircle}>
                            <Ionicons name="image-outline" size={30} color={COLORS.primary} />
                          </View>
                          <Text style={styles.uploadTitle}>Upload banner</Text>
                          <Text style={styles.uploadSubtitle}>Recommended 16:9 ratio</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryFormButton}
                    activeOpacity={0.88}
                    disabled={submitting}
                    onPress={handlePostEvent}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryFormGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color={COLORS.accent} />
                      ) : (
                        <>
                          <Text style={styles.primaryFormText}>Publish Event</Text>
                          <Ionicons name="rocket-outline" size={22} color={COLORS.accent} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.formBottomSpacer} />
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* REGISTRATION MODAL — only for manual/admin events */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <GuestGuard
        title="View Your Discounts"
        message="Sign in to see your claimed offers and discounts."
      >
        <Modal
          visible={!!registerEvent}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setRegisterEvent(null)}
          statusBarTranslucent={true}
        >
          <View style={styles.modalScreen}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            {registerEvent && (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContainer}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={[styles.modalHero, { paddingTop: (insets.top || 0) + 12 }]}
                  >
                    <View style={styles.modalHeroTop}>
                      <View style={styles.modalHeroTitleRow}>
                        <Ionicons name="clipboard" size={22} color={COLORS.accent} />
                        <Text style={styles.modalHeroTitle}>Register</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setRegisterEvent(null)}
                        activeOpacity={0.86}
                      >
                        <Ionicons name="close" size={22} color={COLORS.accent} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.modalHeroSubtitle} numberOfLines={2}>
                      {registerEvent.title}
                    </Text>
                  </LinearGradient>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
                  >
                    <ScrollView
                      style={styles.formScrollView}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={[
                        styles.formScrollContent,
                        { paddingBottom: (insets.bottom || 12) + 24 },
                      ]}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter your full name"
                          placeholderTextColor="#8a8a8a"
                          value={regForm.studentName}
                          onChangeText={(text) =>
                            setRegForm({ ...regForm, studentName: text })
                          }
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>University Email *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="student@university.edu"
                          placeholderTextColor="#8a8a8a"
                          value={regForm.email}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onChangeText={(text) => setRegForm({ ...regForm, email: text })}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>WhatsApp Number *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="+92 3XX XXXXXXX"
                          placeholderTextColor="#8a8a8a"
                          keyboardType="phone-pad"
                          value={regForm.whatsapp}
                          onChangeText={(text) => setRegForm({ ...regForm, whatsapp: text })}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Student ID / CNIC</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Optional"
                          placeholderTextColor="#8a8a8a"
                          value={regForm.studentId}
                          onChangeText={(text) => setRegForm({ ...regForm, studentId: text })}
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.primaryFormButton}
                        activeOpacity={0.88}
                        onPress={handleRegistrationSubmit}
                      >
                        <LinearGradient
                          colors={[tdcColors.yellow, "#f5a623"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.primaryFormGradient}
                        >
                          <Text style={styles.primaryFormText}>Submit Registration</Text>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>

                      <View style={styles.formBottomSpacer} />
                    </ScrollView>
                  </KeyboardAvoidingView>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </Modal>
      </GuestGuard>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },

  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", position: "relative",
  },
  headerBtnActive: {
    backgroundColor: "#d1fae5", borderWidth: 1, borderColor: COLORS.success,
  },
  headerBadge: {
    position: "absolute", top: -3, right: -3, minWidth: 16, height: 16,
    paddingHorizontal: 3, borderRadius: 8, backgroundColor: COLORS.danger,
    justifyContent: "center", alignItems: "center",
  },
  headerBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  logoContainer: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  logoBadge: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  headerTitle: {
    fontSize: 16, fontWeight: "800", color: COLORS.primary,
    letterSpacing: 0.3, marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 9, color: COLORS.muted, fontWeight: "600",
    marginLeft: 8, letterSpacing: 0.5,
  },

  // ─── Category chips (FIXED: uniform width, 2-line label, auto-shrink) ─
  categoryScrollContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryScrollItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 6,
    width: 86,
    minHeight: 68,
    position: "relative",
    overflow: "hidden",
  },
  categoryScrollItemActive: {
    borderColor: "transparent",
  },
  categoryScrollIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryScrollLabel: {
    fontSize: 8.5,
    lineHeight: 10.5,
    fontWeight: "700",
    color: COLORS.body,
    textAlign: "center",
    marginTop: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  cityScrollContainer: {
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line,
    backgroundColor: COLORS.page,
  },
  cityScrollHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 6,
  },
  cityScrollHeaderText: {
    fontSize: 10, fontWeight: "700", color: COLORS.muted,
    letterSpacing: 0.4, marginLeft: 4, textTransform: "uppercase",
  },
  cityScrollContent: { paddingHorizontal: 14, paddingVertical: 2 },
  cityChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    backgroundColor: COLORS.card, marginRight: 8,
  },
  cityChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cityChipText: { fontSize: 12, fontWeight: "600", color: COLORS.body },
  cityChipTextActive: { color: "#000", fontWeight: "800" },

  feedContainer: { flex: 1 },

  skeletonCard: {
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    marginBottom: 12, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: COLORS.line,
  },
  skeletonImage: { width: "100%", height: 140, backgroundColor: "#e8ecf1", overflow: "hidden" },
  shimmerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  skeletonContent: { padding: 12 },
  skeletonTitle: {
    height: 18, width: "75%", backgroundColor: "#e8ecf1",
    borderRadius: 6, marginBottom: 6,
  },
  skeletonText: {
    height: 11, width: "90%", backgroundColor: "#e8ecf1",
    borderRadius: 4, marginBottom: 4,
  },
  skeletonTextShort: {
    height: 11, width: "55%", backgroundColor: "#e8ecf1",
    borderRadius: 4, marginBottom: 8, marginTop: 4,
  },
  skeletonButton: {
    width: 80, height: 32, backgroundColor: "#e8ecf1", borderRadius: 10,
  },
  skeletonFooter: { flexDirection: "row" },

  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 30 },
  card: {
    borderRadius: 16, overflow: "hidden", marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.04)",
  },
  cardGradient: { position: "relative", overflow: "hidden" },
  glowEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.accent, borderRadius: 16,
  },
  imageWrapper: { position: "relative", width: "100%", height: 170 },
  cardImage: { width: "100%", height: "100%" },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  categoryBadge: {
    position: "absolute", bottom: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    maxWidth: "65%",
  },
  categoryBadgeText: { fontSize: 9, fontWeight: "700", marginLeft: 3, flexShrink: 1 },
  importedPill: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.85)",
  },
  importedPillText: {
    fontSize: 9, fontWeight: "700", color: "#fff", marginLeft: 3,
  },
  registeredBadge: {
    position: "absolute", top: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  registeredBadgeGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4,
  },
  registeredBadgeText: {
    fontSize: 9, fontWeight: "700", color: "#fff", marginLeft: 2,
  },
  dateBadge: {
    position: "absolute", bottom: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  dateBadgeGradient: { paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  contentWrapper: { padding: 14 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  orgContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  orgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  locationText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  title: {
    fontSize: 16, fontWeight: "700", color: COLORS.primary,
    marginBottom: 4, lineHeight: 20,
  },
  description: {
    fontSize: 12, color: COLORS.body, lineHeight: 16, marginBottom: 8,
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  statText: { fontSize: 10, color: COLORS.muted, marginLeft: 3, fontWeight: "500" },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  registerActionButton: { borderRadius: 10, overflow: "hidden" },
  registerGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6,
  },
  registerActionText: {
    fontSize: 12, fontWeight: "700", color: "#fff", marginLeft: 3,
  },
  cancelActionButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: "#fee2e2",
  },
  cancelActionText: {
    fontSize: 12, fontWeight: "700", color: "#FF3B30", marginLeft: 3,
  },
  detailsActionButton: { flexDirection: "row", alignItems: "center" },
  detailsActionText: {
    fontSize: 11, color: COLORS.accent, fontWeight: "600", marginRight: 2,
  },

  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 40, paddingBottom: 20 },
  emptyIconContainer: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.line,
  },
  emptyTitle: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  emptyText: {
    marginTop: 4, color: COLORS.body, fontSize: 12,
    lineHeight: 17, textAlign: "center", maxWidth: 240,
  },
  exploreButton: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  exploreGradient: { paddingHorizontal: 20, paddingVertical: 8 },
  exploreButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column",
  },
  sheetHeader: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexShrink: 0,
  },
  sheetGrabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#d0d5dd", alignSelf: "center", marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 14,
  },
  sheetHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center",
  },
  sheetHeaderTitle: {
    flex: 1, textAlign: "center", fontSize: 15,
    fontWeight: "800", color: COLORS.primary, marginHorizontal: 8,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    paddingBottom: 90,
  },
  sheetImageWrapper: {
    position: "relative", width: "100%", height: 200,
  },
  sheetBanner: { width: "100%", height: "100%" },
  sheetBannerOverlay: { ...StyleSheet.absoluteFillObject },
  sheetRegisteredBadge: {
    position: "absolute", bottom: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  sheetRegisteredText: {
    color: COLORS.success, fontSize: 11, fontWeight: "700", marginLeft: 3,
  },
  sheetBody: { padding: 16, paddingBottom: 8 },

  sheetStickyFooter: {
    borderTopWidth: 1, borderTopColor: COLORS.line,
    backgroundColor: "#fff", paddingTop: 10,
    flexShrink: 0,
  },
  sheetStickyContent: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
  },

  detailTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  detailTag: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    maxWidth: "70%",
  },
  detailTagText: { fontSize: 11, fontWeight: "700", marginLeft: 3, flexShrink: 1 },
  detailTitle: {
    color: COLORS.primary, fontSize: 20, fontWeight: "900",
    lineHeight: 26, marginBottom: 8,
  },
  detailOrgRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  detailAvatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  detailOrgLocationLarge: {
    fontSize: 14, fontWeight: "700", color: COLORS.primary,
  },
  specRow: { flexDirection: "row", marginBottom: 12 },
  specCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: "center", marginRight: 6,
  },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 4 },
  specTitle: {
    color: COLORS.muted, fontSize: 10, fontWeight: "700", marginBottom: 2,
  },
  specText: {
    color: COLORS.primary, fontSize: 12, fontWeight: "800", textAlign: "center",
  },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.line,
  },
  sectionCardTitle: {
    color: COLORS.primary, fontSize: 13, fontWeight: "700", marginBottom: 4,
  },
  sectionCardBody: {
    color: COLORS.body, fontSize: 12, lineHeight: 18,
  },
  stickyLabel: { color: COLORS.danger, fontSize: 9, fontWeight: "700", marginBottom: 0 },
  stickyValue: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  stickyButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
  },
  stickyButtonText: {
    color: "#fff", fontSize: 12, fontWeight: "700", marginRight: 3,
  },

  modalScreen: { flex: 1, backgroundColor: COLORS.page },
  modalContainer: { flex: 1 },
  keyboardAvoidView: { flex: 1 },
  modalHero: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  modalHeroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  modalHeroTitleRow: { flexDirection: "row", alignItems: "center" },
  modalHeroTitle: {
    color: "#fff", fontSize: 18, fontWeight: "800", marginLeft: 6,
  },
  modalClose: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalHeroSubtitle: {
    marginTop: 4, color: "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: "600",
  },
  formScrollView: { flex: 1, paddingHorizontal: 14 },
  formScrollContent: { paddingTop: 10 },
  inputGroup: { marginBottom: 0 },
  inputLabel: {
    color: COLORS.primary, fontSize: 11, fontWeight: "700", marginBottom: 3,
  },
  textInput: {
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.line,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10,
    marginBottom: 10, color: COLORS.primary, fontSize: 12,
  },
  row: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 4 },
  colRight: { flex: 1, marginLeft: 4 },
  multiLineInput: { minHeight: 80, textAlignVertical: "top" },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 6,
    backgroundColor: "#fff",
    overflow: "hidden",
    maxWidth: 220,
  },
  optionPillActive: { borderWidth: 1.5 },
  optionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.body,
    flexShrink: 1,
  },
  optionPillTextActive: { color: "#fff" },
  uploadCard: {
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1.5, borderColor: COLORS.line, borderStyle: "dashed",
    backgroundColor: "#fff", minHeight: 110,
    justifyContent: "center", alignItems: "center",
  },
  uploadPlaceholder: { alignItems: "center", paddingVertical: 20 },
  uploadIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  uploadTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  uploadSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  uploadPreview: { width: "100%", height: 160, resizeMode: "cover" },
  primaryFormButton: {
    borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4, marginTop: 14,
  },
  primaryFormGradient: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  primaryFormText: {
    color: "#fff", fontSize: 14, fontWeight: "700", marginRight: 4,
  },
  formBottomSpacer: { height: Platform.OS === "ios" ? 30 : 20 },
});