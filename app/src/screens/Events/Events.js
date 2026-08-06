import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import GuestGuard from "../../components/GuestGuard";
import io from "socket.io-client";

const { height, width } = Dimensions.get("window");
const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
const SOCKET_URL = "https://the-deft-crew-production.up.railway.app";

// ─── Category Configuration ──────────────────────────────────────────────
const CATEGORY_CONFIG = {
  All: { icon: "apps-outline", color: "#1a1a2e", bg: "#f0f2f6" },
  Hackathons: { icon: "code-outline", color: "#2563eb", bg: "#dbeafe" },
  Workshops: { icon: "construct-outline", color: "#7c3aed", bg: "#ede9fe" },
  Conferences: { icon: "people-outline", color: "#dc2626", bg: "#fef2f2" },
  Competitions: { icon: "trophy-outline", color: "#d97706", bg: "#fffbeb" },
  "Career Fairs": { icon: "briefcase-outline", color: "#059669", bg: "#ecfdf5" },
  Concerts: { icon: "musical-notes-outline", color: "#ec4899", bg: "#fce7f3" },
  Poetry: { icon: "book-outline", color: "#8b5cf6", bg: "#f3e8ff" },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG);
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
  secondary: "#f9c349",
  accent: "#f9c349",
  danger: "#e74c3c",
  goldSoft: "#fff5e0",
  overlayDark: "rgba(26, 26, 46, 0.85)",
  gradientStart: "#1a1a2e",
  gradientEnd: "#16213e",
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
const EventCard = ({ item, index, onOpen, onRegister }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const animatePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.97,
      friction: 5,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animatePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.92}
      onPress={() => onOpen(item)}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY }, { scale: cardScale }],
        },
      ]}
    >
      {/* Header - Avatar + Name + Time */}
      <View style={styles.postHeader}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {item.title?.charAt(0) || "E"}
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.postHeaderInfo}>
          <Text style={styles.postOrgName}>{item.organizer || "Organizer"}</Text>
          <View style={styles.postHeaderMeta}>
            <Text style={styles.postMetaText}>{item.city || "City"}</Text>
            <View style={styles.dotSeparator} />
            <Text style={styles.postMetaText}>{item.date || "TBA"}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postDescription} numberOfLines={3}>
          {item.description || "Join this exciting event and connect with fellow students."}
        </Text>
      </View>

      {/* Image Banner */}
      <View style={styles.postImageContainer}>
        <Image source={{ uri: item.image || FALLBACK_BANNER }} style={styles.postImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
          style={styles.postImageOverlay}
        />
        <View style={styles.postBadgeContainer}>
          <View style={[styles.postBadge, { backgroundColor: CATEGORY_CONFIG[item.type]?.bg || COLORS.goldSoft }]}>
            <Ionicons
              name={CATEGORY_CONFIG[item.type]?.icon || "sparkles-outline"}
              size={12}
              color={CATEGORY_CONFIG[item.type]?.color || COLORS.primary}
            />
            <Text style={[styles.postBadgeText, { color: CATEGORY_CONFIG[item.type]?.color || COLORS.primary }]}>
              {item.type || "Event"}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.postStats}>
        <View style={styles.postStatItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          <Text style={styles.postStatText}>{item.date || "TBA"}</Text>
        </View>
        <View style={styles.postStatItem}>
          <Ionicons name="location-outline" size={16} color={COLORS.muted} />
          <Text style={styles.postStatText}>{item.city || "City"}</Text>
        </View>
        <View style={styles.postStatItem}>
          <Ionicons name="trophy-outline" size={16} color={COLORS.muted} />
          <Text style={styles.postStatText}>{item.prize || "TBD"}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onRegister(item)}
        >
          <Ionicons name="people-outline" size={22} color={COLORS.muted} />
          <Text style={styles.actionText}>Register</Text>
        </TouchableOpacity>
      </View>
    </AnimatedTouchable>
  );
};

// ─── Modern Header with Logo ──────────────────────────────────────────────
const ModernHeader = ({ onBack, onAdd, onNotification, notificationCount }) => {
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
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[COLORS.accent, "#f7d44a"]}
            style={styles.logoBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>tdc</Text>
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Events</Text>
            <Text style={styles.headerSubtitle}>Discover & Connect</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onNotification} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          {notificationCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onAdd} style={[styles.headerBtn, styles.headerAddBtn]} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { token, user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [userEventsCount, setUserEventsCount] = useState(0);

  // ── Animations ──
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

  const handleRegister = (eventItem) => {
    if (!eventItem) return;

    let targetUrl =
      eventItem.registrationUrl ||
      eventItem.externalUrl ||
      eventItem.organizerWebsite;

    if (
      !targetUrl &&
      eventItem.contact &&
      (eventItem.contact.startsWith("http://") ||
        eventItem.contact.startsWith("https://") ||
        eventItem.contact.startsWith("www."))
    ) {
      targetUrl = eventItem.contact;
    }

    if (targetUrl) {
      let formattedUrl = targetUrl.trim();
      if (
        !formattedUrl.startsWith("http://") &&
        !formattedUrl.startsWith("https://")
      ) {
        formattedUrl = `https://${formattedUrl}`;
      }
      Linking.openURL(formattedUrl).catch(() => {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          (eventItem.title || "") +
            " " +
            (eventItem.organizer || "") +
            " event registration"
        )}`;
        Linking.openURL(searchUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      });
    } else {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        (eventItem.title || "") +
          " " +
          (eventItem.organizer || "") +
          " event registration"
      )}`;
      Linking.openURL(searchUrl).catch(() => {
        Alert.alert("Notice", "No registration link available for this event.");
      });
    }
  };

  useEffect(() => {
    bootstrap();

    // ── Real-Time Socket.io Connection ──
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
    });

    socket.on("events:expired", () => {
      fetchEvents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEvents(true), fetchUserEventsCount()]);
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
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslate, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(filterOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(filterTranslate, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 400);
  };

  const fetchEvents = async (isInitial = false) => {
    try {
      if (!isInitial) setRefreshing(true);
      const res = await axios.get(`${API_BASE}/feed`);
      const fetchedEvents = Array.isArray(res.data) ? res.data : (res.data?.events || []);
      setEvents(fetchedEvents);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch events");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserEventsCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/my-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEventsCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch (error) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchUserEventsCount()]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const uploadToCloudinary = async (imageUri) => {
    const data = new FormData();
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "event_image.jpg",
    });
    data.append("upload_preset", "tdc_profiles");
    data.append("cloud_name", "decaxpera");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", {
        method: "post",
        body: data,
      });
      const result = await res.json();
      return result.secure_url;
    } catch (error) {
      return null;
    }
  };

  const resetCreateForm = () => {
    setSelectedImage(null);
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
  };

  const handlePostEvent = async () => {
    if (!form.title || !form.university || !form.city) {
      Alert.alert("Validation Error", "Please fill Title, University, and City.");
      return;
    }
    if (!token) {
      Alert.alert("Authentication Error", "Please login first.");
      return;
    }
    setSubmitting(true);
    let imageUrl = FALLBACK_BANNER;
    if (selectedImage) {
      const uploaded = await uploadToCloudinary(selectedImage);
      if (uploaded) imageUrl = uploaded;
    }
    try {
      const eventData = {
        title: form.title,
        organizer: form.university,
        city: form.city,
        type: form.type,
        description: form.description || "",
        prize: form.prize || "TBD",
        deadline: form.deadline || "Limited spots",
        location: form.location || "Online/Venue TBD",
        contact: form.contact || user?.email || "contact@event.com",
        image: imageUrl,
        date: form.date || new Date().toLocaleDateString(),
        teamSize: form.teamSize || "1-4 Members",
        registrationUrl: form.registrationUrl || "",
        externalUrl: form.registrationUrl || "",
      };
      const res = await axios.post(`${API_BASE}/create`, eventData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents((prev) => [res.data, ...prev]);
      setUserEventsCount((prev) => prev + 1);
      setModalVisible(false);
      resetCreateForm();
      Alert.alert("Success", "Event published successfully.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to publish event");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Exclude expired or rejected events
      if (event.isExpired || event.status === "expired" || event.status === "rejected") {
        return false;
      }
      if (activeTab === "All") return true;

      const categoryMatch = event.type === activeTab || 
        (Array.isArray(event.categories) && event.categories.includes(activeTab)) ||
        (Array.isArray(event.tags) && event.tags.includes(activeTab));

      return categoryMatch;
    });
  }, [activeTab, events]);

  // ─── Horizontal Category Scroll ──────────────────────────────────────────
  const CategoryScroll = () => {
    const scrollX = useRef(new Animated.Value(0)).current;

    return (
      <Animated.View
        style={[
          styles.categoryScrollContainer,
          {
            opacity: filterOpacity,
            transform: [{ translateY: filterTranslate }],
          },
        ]}
      >
        <View style={styles.categoryScrollHeader}>
          <Text style={styles.categoryScrollTitle}>Categories</Text>
          <Text style={styles.categoryScrollCount}>{filteredEvents.length} events</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
        >
          {CATEGORIES.map((cat, index) => {
            const active = activeTab === cat;
            const config = CATEGORY_CONFIG[cat];
            const inputRange = [
              (index - 1) * 80,
              index * 80,
              (index + 1) * 80,
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: "clamp",
            });

            return (
              <AnimatedTouchable
                key={cat}
                style={[
                  styles.categoryScrollItem,
                  active && styles.categoryScrollItemActive,
                  { backgroundColor: active ? config.color : config.bg },
                  { transform: [{ scale }] },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(cat);
                }}
              >
                <View style={[styles.categoryScrollIcon, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons
                    name={config.icon}
                    size={22}
                    color={active ? "#fff" : config.color}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryScrollLabel,
                    active && { color: "#fff" },
                  ]}
                >
                  {formatCategoryLabel(cat)}
                </Text>
                {active && (
                  <LinearGradient
                    colors={[config.color, config.color + "80"]}
                    style={styles.categoryScrollActiveBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
              </AnimatedTouchable>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  };

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <ModernHeader 
          onBack={() => navigation.goBack()} 
          onAdd={() => {}} 
          onNotification={() => {}}
          notificationCount={0}
        />
        <SkeletonList />
      </SafeAreaView>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />

      <ModernHeader
        onBack={() => navigation.goBack()}
        onAdd={() => setModalVisible(true)}
        onNotification={() => navigation.navigate("EventNotification")}
        notificationCount={userEventsCount}
      />

      <CategoryScroll />

      <Animated.View
        style={[
          styles.feedContainer,
          { opacity: listOpacity },
        ]}
      >
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <EventCard
              item={item}
              index={index}
              onOpen={setSelectedEvent}
              onRegister={handleRegister}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !refreshing && (
              <Animated.View
                style={[
                  styles.emptyState,
                  { opacity: listOpacity },
                ]}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-clear-outline" size={56} color={COLORS.accent} />
                </View>
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptyText}>
                  Be the first to create an event and bring your campus community together.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  activeOpacity={0.86}
                  onPress={() => setModalVisible(true)}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.gradientEnd]}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.emptyButtonText}>Create Event</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )
          }
        />
      </Animated.View>

      {/* Event Detail Modal - Fixed for all phones */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedEvent(null)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.detailScreen} edges={["top"]}>
          {selectedEvent && (
            <>
              <View style={styles.detailContainer}>
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  bounces={false}
                  contentContainerStyle={styles.detailScrollContent}
                >
                  <View style={styles.detailImageWrapper}>
                    <Image
                      source={{ uri: selectedEvent.image || FALLBACK_BANNER }}
                      style={styles.detailBanner}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.85)"]}
                      style={styles.detailBannerOverlay}
                    />
                    <TouchableOpacity
                      onPress={() => setSelectedEvent(null)}
                      activeOpacity={0.86}
                      style={styles.backButtonWrap}
                    >
                      <BlurView intensity={90} style={styles.roundGlass}>
                        <Ionicons name="arrow-back" size={21} color={COLORS.accent} />
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.detailBody}>
                    <View style={styles.detailTopRow}>
                      <View style={[styles.detailTag, { backgroundColor: CATEGORY_CONFIG[selectedEvent.type]?.bg || COLORS.goldSoft }]}>
                        <Ionicons
                          name={CATEGORY_CONFIG[selectedEvent.type]?.icon || "sparkles-outline"}
                          size={14}
                          color={CATEGORY_CONFIG[selectedEvent.type]?.color || COLORS.primary}
                        />
                        <Text style={[styles.detailTagText, { color: CATEGORY_CONFIG[selectedEvent.type]?.color || COLORS.primary }]}>
                          {selectedEvent.type}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                    
                    <View style={styles.detailOrgRow}>
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.detailAvatarSmall}
                      >
                        <Text style={styles.detailAvatarText}>
                          {selectedEvent.organizer?.charAt(0) || "O"}
                        </Text>
                      </LinearGradient>
                      <View>
                        <Text style={styles.detailOrgName}>{selectedEvent.organizer || "Organizer"}</Text>
                        <Text style={styles.detailOrgLocation}>
                          <Ionicons name="location-outline" size={12} color={COLORS.muted} /> {selectedEvent.city || "City"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.specRow}>
                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Date</Text>
                        <Text style={styles.specText}>{selectedEvent.date || "TBA"}</Text>
                      </View>
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="people-outline" size={20} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Team</Text>
                        <Text style={styles.specText}>{selectedEvent.teamSize || "1-4"}</Text>
                      </View>
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="trophy-outline" size={20} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Prize</Text>
                        <Text style={styles.specText}>{selectedEvent.prize || "TBD"}</Text>
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
                        <Ionicons name="location-outline" size={14} color={COLORS.accent} /> {selectedEvent.location || "Online event"}
                      </Text>
                    </View>
                    
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>Contact</Text>
                      <Text style={styles.sectionCardBody}>
                        <Ionicons name="mail-outline" size={14} color={COLORS.accent} /> {selectedEvent.contact || "Not provided"}
                      </Text>
                    </View>
                    
                    <View style={styles.detailBottomSpacer} />
                  </View>
                </ScrollView>
              </View>
              
              {/* Sticky Footer */}
              <View style={styles.stickyFooter}>
                <BlurView intensity={92} style={styles.stickyBlur}>
                  <View style={styles.stickyContent}>
                    <View>
                      <Text style={styles.stickyLabel}>Register before</Text>
                      <Text style={styles.stickyValue}>
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
                        colors={[COLORS.primary, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.stickyButton}
                      >
                        <Text style={styles.stickyButtonText}>Register Now</Text>
                        <Ionicons name="open-outline" size={18} color={COLORS.accent} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Create Event Modal - Fixed for all phones */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalScreen} edges={["top", "bottom"]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.modalHero}
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
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
              >
                <ScrollView 
                  style={styles.formScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.formScrollContent}
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {CATEGORIES.filter((item) => item !== "All").map((cat) => {
                        const selected = form.type === cat;
                        const config = CATEGORY_CONFIG[cat];
                        return (
                          <TouchableOpacity
                            key={cat}
                            activeOpacity={0.86}
                            onPress={() => setForm({ ...form, type: cat })}
                            style={[
                              styles.optionPill,
                              selected && styles.optionPillActive,
                              { borderColor: selected ? config.color : COLORS.line }
                            ]}
                          >
                            {selected && (
                              <LinearGradient
                                colors={[config.color, config.color + "80"]}
                                style={StyleSheet.absoluteFillObject}
                              />
                            )}
                            <Ionicons
                              name={config.icon}
                              size={14}
                              color={selected ? "#fff" : config.color}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.optionPillText, selected && styles.optionPillTextActive]}>
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
                    <TouchableOpacity style={styles.uploadCard} activeOpacity={0.88} onPress={pickImage}>
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.page 
  },

  // Modern Header with Logo
  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAddBtn: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.3,
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
  },

  // Horizontal Category Scroll
  categoryScrollContainer: {
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 8,
  },
  categoryScrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryScrollTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
  },
  categoryScrollCount: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  categoryScrollContent: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  categoryScrollItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal:8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 2,
    minWidth: 50,
    height: 65,
    position: "relative",
    overflow: "hidden",
  },
  categoryScrollItemActive: {
    borderColor: "transparent",
  },
  categoryScrollIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
  categoryScrollLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.body,
    textAlign: "center",
  },
  categoryScrollActiveBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },

  feedContainer: {
    flex: 1,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  skeletonImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#e8ecf1",
    overflow: "hidden",
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  skeletonContent: { padding: 14 },
  skeletonTitle: {
    height: 22,
    width: "75%",
    backgroundColor: "#e8ecf1",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonText: {
    height: 13,
    width: "90%",
    backgroundColor: "#e8ecf1",
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonTextShort: {
    height: 13,
    width: "55%",
    backgroundColor: "#e8ecf1",
    borderRadius: 6,
    marginBottom: 12,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  skeletonButton: {
    width: 90,
    height: 38,
    backgroundColor: "#e8ecf1",
    borderRadius: 14,
  },

  // Card - LinkedIn Post Style
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: Platform.OS === "android" ? 120 : 60,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  // Post Header
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  postHeaderInfo: {
    flex: 1,
  },
  postOrgName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  postHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  postMetaText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    marginHorizontal: 6,
  },
  moreButton: {
    padding: 4,
  },
  // Post Content
  postContent: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 14,
    color: COLORS.body,
    lineHeight: 20,
  },
  // Post Image
  postImageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  postImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  postBadgeContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  postBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  postBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  // Post Stats
  postStats: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  postStatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  postStatText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 4,
  },
  // Post Actions
  postActions: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 4,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 30,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  emptyTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    color: COLORS.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },

  // Detail Modal - Fixed
  detailScreen: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  detailContainer: { 
    flex: 1 
  },
  detailScrollContent: {
    paddingBottom: 100,
  },
  detailImageWrapper: {
    position: "relative",
    width: "100%",
    height: height * 0.3,
  },
  detailBanner: { 
    width: "100%", 
    height: "100%" 
  },
  detailBannerOverlay: { 
    ...StyleSheet.absoluteFillObject 
  },
  backButtonWrap: { 
    position: "absolute", 
    top: Platform.OS === "ios" ? 12 : 16, 
    left: 16 
  },
  roundGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  detailBody: {
    marginTop: -24,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  detailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  detailTagText: { 
    fontSize: 12, 
    fontWeight: "800", 
    marginLeft: 4 
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  detailTitle: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 10,
  },
  detailOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  detailAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  detailOrgName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  detailOrgLocation: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  specRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  specCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    marginRight: 8,
  },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 4 },
  specTitle: { 
    color: COLORS.muted, 
    fontSize: 10, 
    fontWeight: "700", 
    marginBottom: 1 
  },
  specText: { 
    color: COLORS.primary, 
    fontSize: 13, 
    fontWeight: "800", 
    textAlign: "center" 
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  sectionCardTitle: { 
    color: COLORS.primary, 
    fontSize: 15, 
    fontWeight: "800", 
    marginBottom: 6 
  },
  sectionCardBody: { 
    color: COLORS.body, 
    fontSize: 13, 
    lineHeight: 20 
  },
  detailBottomSpacer: { 
    height: 120 
  },
  stickyFooter: { 
    position: "absolute", 
    bottom: 0, 
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  stickyBlur: { 
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  stickyContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 54 : 34,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  stickyLabel: { 
    color: COLORS.danger, 
    fontSize: 10, 
    fontWeight: "800", 
    marginBottom: 1 
  },
  stickyValue: { 
    color: COLORS.primary, 
    fontSize: 15, 
    fontWeight: "900" 
  },
  stickyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  stickyButtonText: { 
    color: "#fff", 
    fontSize: 13, 
    fontWeight: "900", 
    marginRight: 4 
  },

  // Modals - Fixed
  modalScreen: { 
    flex: 1, 
    backgroundColor: COLORS.page 
  },
  modalContainer: { 
    flex: 1 
  },
  keyboardAvoidView: { 
    flex: 1 
  },
  modalHero: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 14 : 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  modalHeroTop: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  modalHeroTitleRow: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  modalHeroTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "900", 
    marginLeft: 8 
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalHeroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  formScrollView: { 
    flex: 1,
    paddingHorizontal: 16,
  },
  formScrollContent: {
    paddingTop: 14,
    paddingBottom: 20,
  },
  inputGroup: { 
    marginBottom: 0 
  },
  inputLabel: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    color: COLORS.primary,
    fontSize: 13,
  },
  multiLineInput: { 
    height: 90, 
    textAlignVertical: "top" 
  },
  row: { 
    flexDirection: "row" 
  },
  colLeft: { 
    flex: 1, 
    marginRight: 5 
  },
  colRight: { 
    flex: 1, 
    marginLeft: 5 
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginRight: 6,
    marginBottom: 12,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  optionPillActive: { 
    borderColor: "transparent" 
  },
  optionPillText: { 
    color: COLORS.body, 
    fontSize: 11, 
    fontWeight: "700" 
  },
  optionPillTextActive: { 
    color: "#fff" 
  },
  uploadCard: {
    width: "100%",
    height: 160,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.accent,
    backgroundColor: "#fff",
  },
  uploadPreview: { 
    width: "100%", 
    height: "100%" 
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  uploadIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.goldSoft,
  },
  uploadTitle: { 
    marginTop: 8, 
    color: COLORS.primary, 
    fontSize: 13, 
    fontWeight: "800" 
  },
  uploadSubtitle: { 
    marginTop: 1, 
    color: COLORS.muted, 
    fontSize: 10 
  },
  primaryFormButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 8,
  },
  primaryFormGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  primaryFormText: { 
    color: "#fff", 
    fontSize: 15, 
    fontWeight: "800", 
    marginRight: 6 
  },
  formBottomSpacer: { 
    height: Platform.OS === "ios" ? 40 : 30 
  },
});