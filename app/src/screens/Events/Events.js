// EventsScreen.js - Complete Modern Redesign
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
  Modal,
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import GuestGuard from "../../components/GuestGuard";

const { height, width } = Dimensions.get("window");
const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";

// ─── Category Configuration ──────────────────────────────────────────────
const CATEGORY_CONFIG = {
  All: { icon: "apps", color: "#1a1a2e", bg: "#f0f2f6" },
  Hackathons: { icon: "code-slash", color: "#2563eb", bg: "#dbeafe" },
  Workshops: { icon: "construct", color: "#7c3aed", bg: "#ede9fe" },
  Conferences: { icon: "people", color: "#dc2626", bg: "#fef2f2" },
  Competitions: { icon: "trophy", color: "#d97706", bg: "#fffbeb" },
  "Career Fairs": { icon: "briefcase", color: "#059669", bg: "#ecfdf5" },
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
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 800,
        delay: index * 80 + 200,
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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.15, 0],
  });

  const getCategoryColor = () => {
    return CATEGORY_CONFIG[item.type]?.color || COLORS.primary;
  };

  const getCategoryBg = () => {
    return CATEGORY_CONFIG[item.type]?.bg || COLORS.goldSoft;
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
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFF']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
        
        {/* Image Section with Overlay */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image || FALLBACK_BANNER }} style={styles.cardImage} />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
            style={styles.imageOverlay}
          />
          
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryBg() }]}>
            <Ionicons name={CATEGORY_CONFIG[item.type]?.icon || "sparkles"} size={10} color={getCategoryColor()} />
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor() }]}>
              {item.type || "Event"}
            </Text>
          </View>
          
          {/* Registered Badge */}
          {isRegistered && (
            <View style={styles.registeredBadge}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.registeredBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={styles.registeredBadgeText}>Registered</Text>
              </LinearGradient>
            </View>
          )}
          
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
              style={styles.dateBadgeGradient}
            >
              <Text style={styles.dateBadgeText}>{item.date || "TBA"}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <View style={styles.orgContainer}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.orgAvatar}
              >
                <Text style={styles.orgAvatarText}>
                  {item.organizer?.charAt(0) || "O"}
                </Text>
              </LinearGradient>
              <View>
                <Text style={styles.orgName} numberOfLines={1}>
                  {item.organizer || "Organizer"}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={10} color={COLORS.muted} />
                  <Text style={styles.locationText}>{item.city || "City"}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.description} numberOfLines={2}>
            {item.description || "Join this exciting event and connect with fellow students."}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color={COLORS.accent} />
              <Text style={styles.statText}>{item.teamSize || "1-4"} Team</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={14} color={COLORS.accent} />
              <Text style={styles.statText}>{item.prize || "TBD"}</Text>
            </View>
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
                  colors={['#f9c349', '#f5a623']}
                  style={styles.registerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.registerActionText}>Register</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.detailsActionButton}
              onPress={() => onOpen(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsActionText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </AnimatedTouchable>
  );
};

// ─── Modern Header with Logo ──────────────────────────────────────────────
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [registerEvent, setRegisterEvent] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showApplied, setShowApplied] = useState(false);
  const [appliedEventsData, setAppliedEventsData] = useState([]);

  // ── Animations ──
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const filterTranslate = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  const [regForm, setRegForm] = useState({
    studentName: "",
    whatsapp: "",
    studentId: "",
    email: "",
  });

  useEffect(() => {
    if (user?.name) setRegForm((prev) => ({ ...prev, studentName: user.name }));
    if (user?.email) setRegForm((prev) => ({ ...prev, email: user.email }));
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    try {
      await fetchEvents(true);
      await fetchRegisteredEvents();
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
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch events");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchRegisteredEvents = async () => {
    if (!token) {
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
      return;
    }
    try {
      const idsRes = await axios.get(`${API_BASE}/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegisteredEventIds(idsRes.data || []);
      
      const detailsRes = await axios.get(`${API_BASE}/my-registrations/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppliedEventsData(detailsRes.data || []);
    } catch (error) {
      console.log("Error fetching registrations:", error);
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchRegisteredEvents()]);
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
    try {
      await axios.post(
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
      Alert.alert("Error", error.response?.data?.error || "Registration failed");
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
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert("Success", "Registration cancelled successfully.");
              await fetchRegisteredEvents();
              if (showApplied) {
                const detailsRes = await axios.get(`${API_BASE}/my-registrations/details`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setAppliedEventsData(detailsRes.data || []);
              }
            } catch (error) {
              Alert.alert("Error", error.response?.data?.error || "Failed to cancel registration");
            }
          }
        }
      ]
    );
  };

  const filteredEvents = useMemo(() => {
    if (showApplied) {
      return appliedEventsData.map(item => ({
        ...item.event,
        registration: item.registration
      }));
    }
    
    let filtered = events;
    if (activeTab !== "All") {
      filtered = events.filter((event) => event.type === activeTab);
    }
    return filtered;
  }, [activeTab, events, showApplied, appliedEventsData]);

  const isEventRegistered = (eventId) => {
    return registeredEventIds.includes(eventId);
  };

  const appliedCount = registeredEventIds.length;

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
        {!showApplied && (
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
                (index - 1) * 60,
                index * 60,
                (index + 1) * 60,
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
                    setShowApplied(false);
                  }}
                >
                  <View style={[styles.categoryScrollIcon, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons
                      name={config.icon}
                      size={16}
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
                </AnimatedTouchable>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    );
  };

  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowApplied(!showApplied);
    if (!showApplied) {
      setActiveTab("All");
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <ModernHeader 
          onBack={() => navigation.goBack()} 
          onMenuPress={handleMenuPress}
          showApplied={showApplied}
          appliedCount={appliedCount}
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
        onMenuPress={handleMenuPress}
        showApplied={showApplied}
        appliedCount={appliedCount}
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
              onRegister={setRegisterEvent}
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
              <Animated.View
                style={[
                  styles.emptyState,
                  { opacity: listOpacity },
                ]}
              >
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
                    : "Check back later for upcoming events in your area."}
                </Text>
                {showApplied && (
                  <TouchableOpacity
                    style={styles.exploreButton}
                    onPress={() => setShowApplied(false)}
                  >
                    <LinearGradient
                      colors={['#f9c349', '#f5a623']}
                      style={styles.exploreGradient}
                    >
                      <Text style={styles.exploreButtonText}>Explore Events</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )
          }
        />
      </Animated.View>

      {/* Event Detail Modal - Same as before but with modern styling */}
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
                      <View style={styles.roundGlass}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                      </View>
                    </TouchableOpacity>
                    {selectedEvent.registration && (
                      <View style={styles.detailRegisteredBadge}>
                        <View style={styles.detailRegisteredBlur}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                          <Text style={styles.detailRegisteredText}>Registered</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailBody}>
                    <View style={styles.detailTopRow}>
                      <View style={[styles.detailTag, { backgroundColor: CATEGORY_CONFIG[selectedEvent.type]?.bg || COLORS.goldSoft }]}>
                        <Ionicons
                          name={CATEGORY_CONFIG[selectedEvent.type]?.icon || "sparkles"}
                          size={12}
                          color={CATEGORY_CONFIG[selectedEvent.type]?.color || COLORS.primary}
                        />
                        <Text style={[styles.detailTagText, { color: CATEGORY_CONFIG[selectedEvent.type]?.color || COLORS.primary }]}>
                          {selectedEvent.type}
                        </Text>
                      </View>
                      {isEventRegistered(selectedEvent._id) && (
                        <View style={[styles.detailTag, { backgroundColor: "#d1fae5" }]}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={[styles.detailTagText, { color: COLORS.success }]}>Registered</Text>
                        </View>
                      )}
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
                          <Ionicons name="location" size={12} color={COLORS.muted} /> {selectedEvent.city || "City"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.specRow}>
                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="calendar" size={16} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Date</Text>
                        <Text style={styles.specText}>{selectedEvent.date || "TBA"}</Text>
                      </View>
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="people" size={16} color={COLORS.accent} />
                        </View>
                        <Text style={styles.specTitle}>Team</Text>
                        <Text style={styles.specText}>{selectedEvent.teamSize || "1-4"}</Text>
                      </View>
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="trophy" size={16} color={COLORS.accent} />
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
                        <Ionicons name="location" size={14} color={COLORS.accent} /> {selectedEvent.location || "Online event"}
                      </Text>
                    </View>
                    
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>Contact</Text>
                      <Text style={styles.sectionCardBody}>
                        <Ionicons name="mail" size={14} color={COLORS.accent} /> {selectedEvent.contact || "Not provided"}
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
                    {isEventRegistered(selectedEvent._id) ? (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          const e = selectedEvent;
                          setSelectedEvent(null);
                          setTimeout(() => handleCancelRegistration(e), 260);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          const e = selectedEvent;
                          setSelectedEvent(null);
                          setTimeout(() => setRegisterEvent(e), 260);
                        }}
                      >
                        <LinearGradient
                          colors={[COLORS.accent, "#f5a623"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.stickyButton}
                        >
                          <Text style={styles.stickyButtonText}>Register</Text>
                          <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </BlurView>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Registration Modal */}
      <GuestGuard
        title="View Your Discounts"
        message="Sign in to see your claimed offers and discounts."
      >
        <Modal
          visible={!!registerEvent}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setRegisterEvent(null)}
          statusBarTranslucent={true}
        >
          <SafeAreaView style={styles.modalScreen} edges={["top", "bottom"]}>
            {registerEvent && (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContainer}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.modalHero}
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
                    <Text style={styles.modalHeroSubtitle}>{registerEvent.title}</Text>
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
                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter your full name"
                          placeholderTextColor="#8a8a8a"
                          value={regForm.studentName}
                          onChangeText={(text) => setRegForm({ ...regForm, studentName: text })}
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
                          colors={['#f9c349', '#f5a623']}
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
          </SafeAreaView>
        </Modal>
      </GuestGuard>
    </SafeAreaView>
  );
}

// ─── Modern Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.page 
  },

  // Modern Header
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerBtnActive: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  headerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  // Category Scroll
  categoryScrollContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryScrollItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 2,
    minWidth: 42,
    height: 52,
    position: "relative",
    overflow: "hidden",
  },
  categoryScrollItemActive: {
    borderColor: "transparent",
  },
  categoryScrollIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  categoryScrollLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.body,
    textAlign: "center",
    marginTop: 1,
  },

  feedContainer: {
    flex: 1,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
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
    height: 140,
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
  skeletonContent: { padding: 12 },
  skeletonTitle: {
    height: 18,
    width: "75%",
    backgroundColor: "#e8ecf1",
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonText: {
    height: 11,
    width: "90%",
    backgroundColor: "#e8ecf1",
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonTextShort: {
    height: 11,
    width: "55%",
    backgroundColor: "#e8ecf1",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    backgroundColor: "#e8ecf1",
    borderRadius: 10,
  },

  // Modern Card
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  cardGradient: {
    position: "relative",
    overflow: "hidden",
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 170,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 3,
  },
  registeredBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  registeredBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  registeredBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 2,
  },
  dateBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  dateBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  contentWrapper: {
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orgContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  orgAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  orgName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 10,
    color: COLORS.muted,
    marginLeft: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: COLORS.body,
    lineHeight: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  statText: {
    fontSize: 10,
    color: COLORS.muted,
    marginLeft: 3,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  registerActionButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  registerGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  registerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 3,
  },
  cancelActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
  },
  cancelActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF3B30",
    marginLeft: 3,
  },
  detailsActionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsActionText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "600",
    marginRight: 2,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  emptyTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 4,
    color: COLORS.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 240,
  },
  exploreButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  exploreGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // Detail Modal
  detailScreen: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  detailContainer: { 
    flex: 1 
  },
  detailScrollContent: {
    paddingBottom: 80,
  },
  detailImageWrapper: {
    position: "relative",
    width: "100%",
    height: height * 0.28,
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
    top: Platform.OS === "ios" ? 10 : 14, 
    left: 14 
  },
  roundGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  detailRegisteredBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 14,
    right: 14,
  },
  detailRegisteredBlur: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  detailRegisteredText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 3,
  },
  detailBody: {
    marginTop: -20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  detailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailTagText: { 
    fontSize: 11, 
    fontWeight: "700", 
    marginLeft: 3 
  },
  detailTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginBottom: 8,
  },
  detailOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  detailAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  detailOrgName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  detailOrgLocation: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  specRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  specCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    marginRight: 6,
  },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 2 },
  specTitle: { 
    color: COLORS.muted, 
    fontSize: 9, 
    fontWeight: "700", 
    marginBottom: 0 
  },
  specText: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: "800", 
    textAlign: "center" 
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  sectionCardTitle: { 
    color: COLORS.primary, 
    fontSize: 14, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  sectionCardBody: { 
    color: COLORS.body, 
    fontSize: 12, 
    lineHeight: 18 
  },
  detailBottomSpacer: { 
    height: 16 
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  stickyLabel: { 
    color: COLORS.danger, 
    fontSize: 9, 
    fontWeight: "700", 
    marginBottom: 0 
  },
  stickyValue: { 
    color: COLORS.primary, 
    fontSize: 13, 
    fontWeight: "800" 
  },
  stickyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  stickyButtonText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "700", 
    marginRight: 3 
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 3,
  },

  // Modals
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
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
    fontSize: 18, 
    fontWeight: "800", 
    marginLeft: 6 
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalHeroSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  formScrollView: { 
    flex: 1,
    paddingHorizontal: 14,
  },
  formScrollContent: {
    paddingTop: 10,
    paddingBottom: 16,
  },
  inputGroup: { 
    marginBottom: 0 
  },
  inputLabel: { 
    color: COLORS.primary, 
    fontSize: 11, 
    fontWeight: "700", 
    marginBottom: 3 
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    color: COLORS.primary,
    fontSize: 12,
  },
  primaryFormButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  primaryFormGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  primaryFormText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "700", 
    marginRight: 4 
  },
  formBottomSpacer: { 
    height: Platform.OS === "ios" ? 30 : 20 
  },
});