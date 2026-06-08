import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
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

const { height } = Dimensions.get("window");
const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
const CATEGORIES = ["All", "Hackathons", "Workshops", "Conferences", "Competitions", "Career Fairs"];
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1523240715632-d984bb4b970e?w=1200";
const COLORS = {
  page: "#ffffff", pageAlt: "#f7f7f7", ink: "#000000", body: "#232323",
  muted: "#6b6b6b", line: "#e8e8e8", card: "#ffffff", surface: "#fafafa",
  primary: "#000000", secondary: "#f9c349", accent: "#f9c349",
  danger: "#b42318", goldSoft: "#fff4cf", overlayDark: "rgba(0,0,0,0.76)",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const formatCategoryLabel = (cat) => (cat === "All" ? "All Events" : cat);

// FAST Skeleton Card
const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(opacity, { toValue: 0.8, duration: 400, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonText} />
        <View style={styles.skeletonTextShort} />
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonButton} />
        </View>
      </View>
    </Animated.View>
  );
};

const SkeletonList = () => (
  <View style={styles.listContent}>
    {[1, 2, 3].map((item) => <SkeletonCard key={item} />)}
  </View>
);

const EventCard = ({ item, index, onOpen, onRegister }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);
  const animatePress = (toValue) => {
    Animated.spring(scale, { toValue, friction: 8, tension: 90, useNativeDriver: true }).start();
  };
  return (
    <AnimatedTouchable
      activeOpacity={0.92}
      onPress={() => onOpen(item)}
      onPressIn={() => animatePress(0.985)}
      onPressOut={() => animatePress(1)}
      style={[styles.card, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <View style={styles.cardMedia}>
        <Image source={{ uri: item.image || FALLBACK_BANNER }} style={styles.cardImage} />
        <LinearGradient colors={["rgba(0,0,0,0.08)", COLORS.overlayDark]} style={styles.cardOverlay}>
          <View style={styles.cardTopRow}>
            <View style={styles.categoryChip}>
              <Ionicons name="sparkles-outline" size={13} color={COLORS.ink} />
              <Text style={styles.categoryChipText}>{item.type || "Event"}</Text>
            </View>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={12} color={COLORS.accent} />
              <Text style={styles.timeChipText}>{item.deadline || "Open"}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>{item.description || "A polished student event experience with practical networking."}</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="business-outline" size={14} color={COLORS.ink} />
            <Text style={styles.metaChipText} numberOfLines={1}>{item.organizer || "Organizer"}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={14} color={COLORS.accent} />
            <Text style={styles.metaChipText} numberOfLines={1}>{item.city || "City"}</Text>
          </View>
        </View>
        <View style={styles.statsPanel}>
          <View style={styles.statsBlock}>
            <Text style={styles.statsLabel}>Prize Pool</Text>
            <Text style={styles.statsValue}>{item.prize || "TBD"}</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBlock}>
            <Text style={styles.statsLabel}>Team Size</Text>
            <Text style={styles.statsValue}>{item.teamSize || "1-4 Members"}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Event Date</Text>
            <Text style={styles.dateValue}>{item.date || "To be announced"}</Text>
          </View>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.88} onPress={() => onRegister(item)}>
            <LinearGradient colors={[COLORS.primary, "#2d2d2d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Register</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedTouchable>
  );
};

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
  const [registerEvent, setRegisterEvent] = useState(null);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(24)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    title: "", university: "", city: "", type: "Hackathons", prize: "",
    deadline: "", description: "", location: "", contact: "", date: "", teamSize: "",
  });
  const [regForm, setRegForm] = useState({
    studentName: "", whatsapp: "", studentId: "", email: "",
  });

  useEffect(() => {
    if (user?.name) setRegForm((prev) => ({ ...prev, studentName: user.name }));
    if (user?.email) setRegForm((prev) => ({ ...prev, email: user.email }));
    bootstrap();
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
    entranceOpacity.setValue(0);
    entranceTranslate.setValue(24);
    glowOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(entranceTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
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
    data.append("file", { uri: imageUri, type: "image/jpeg", name: "event_image.jpg" });
    data.append("upload_preset", "tdc_profiles");
    data.append("cloud_name", "decaxpera");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "post", body: data });
      const result = await res.json();
      return result.secure_url;
    } catch (error) { return null; }
  };

  const resetCreateForm = () => {
    setSelectedImage(null);
    setForm({ title: "", university: "", city: "", type: "Hackathons", prize: "", deadline: "", description: "", location: "", contact: "", date: "", teamSize: "" });
  };

  const handlePostEvent = async () => {
    if (!form.title || !form.university || !form.city) {
      Alert.alert("Validation Error", "Please fill Title, University, and City.");
      return;
    }
    if (!token) { Alert.alert("Authentication Error", "Please login first."); return; }
    setSubmitting(true);
    let imageUrl = FALLBACK_BANNER;
    if (selectedImage) {
      const uploaded = await uploadToCloudinary(selectedImage);
      if (uploaded) imageUrl = uploaded;
    }
    try {
      const eventData = {
        title: form.title, organizer: form.university, city: form.city, type: form.type,
        description: form.description || "", prize: form.prize || "TBD",
        deadline: form.deadline || "Limited spots", location: form.location || "Online/Venue TBD",
        contact: form.contact || user?.email || "contact@event.com", image: imageUrl,
        date: form.date || new Date().toLocaleDateString(), teamSize: form.teamSize || "1-4 Members",
      };
      const res = await axios.post(`${API_BASE}/create`, eventData, { headers: { Authorization: `Bearer ${token}` } });
      setEvents((prev) => [res.data, ...prev]);
      setUserEventsCount((prev) => prev + 1);
      setModalVisible(false);
      resetCreateForm();
      Alert.alert("Success", "Event published successfully.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to publish event");
    } finally { setSubmitting(false); }
  };

  const handleRegistrationSubmit = async () => {
    if (!regForm.studentName || !regForm.email || !regForm.whatsapp) {
      Alert.alert("Validation Error", "Please fill all required fields.");
      return;
    }
    if (!token) { Alert.alert("Authentication Error", "Please login to register."); return; }
    try {
      await axios.post(`${API_BASE}/register`, {
        eventId: registerEvent._id, studentName: regForm.studentName,
        email: regForm.email, whatsapp: regForm.whatsapp, studentId: regForm.studentId || "Not provided",
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert("Success", "Registration successful.");
      setRegisterEvent(null);
      setRegForm({ studentName: user?.name || "", whatsapp: "", studentId: "", email: user?.email || "" });
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Registration failed");
    }
  };

  const onShare = async (title) => {
    try { await Share.share({ message: `Check out this event: ${title} on tdc. Campuses.`, title }); } catch (error) {}
  };

  const filteredEvents = useMemo(() => {
    if (activeTab === "All") return events;
    return events.filter((event) => event.type === activeTab);
  }, [activeTab, events]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <Animated.View style={[styles.glowTop, { opacity: glowOpacity }]} />
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerNavTitle}>Events</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.loadingHeaderWrap}>
          <LinearGradient colors={["#000000", "#1a1a1a", "#2a2a2a"]} style={styles.loadingHeader}>
            <Text style={styles.loadingHeaderLabel}>Campus Opportunity Network</Text>
            <Text style={styles.loadingHeaderTitle}>Loading events</Text>
            <Text style={styles.loadingHeaderText}>Bringing in the latest campus opportunities for you.</Text>
          </LinearGradient>
        </View>
        <SkeletonList />
      </SafeAreaView>
    );
  }

  return (
    
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
      <Animated.View style={[styles.glowTop, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.glowBottom, { opacity: glowOpacity }]} />

      {/* Header Navigation */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerNavTitle}>Events</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerAddBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.heroShell]}>
        <LinearGradient colors={["#000000", "#181818", "#262626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroNoise} />
          <View style={styles.navRow}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandTitle}>tdc<Text style={{ color: COLORS.accent }}>.</Text></Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>Campuses</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButtonSoft} activeOpacity={0.86} onPress={() => navigation.navigate("EventNotification")}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {userEventsCount > 0 && (
                  <View style={styles.notificationDot}>
                    <Text style={styles.notificationDotText}>{userEventsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Animated.View style={[styles.heroContent, { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] }]}>
            <Text style={styles.heroLabel}>Campus Opportunity Network</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{events.length}</Text>
                <Text style={styles.heroStatText}>Live events</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{userEventsCount}</Text>
                <Text style={styles.heroStatText}>Your posts</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{CATEGORIES.length - 1}</Text>
                <Text style={styles.heroStatText}>Categories</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Browse by category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {CATEGORIES.map((cat) => {
            const active = activeTab === cat;
            return (
              <TouchableOpacity key={cat} style={[styles.filterPill, active && styles.filterPillActive]} activeOpacity={0.84} onPress={() => setActiveTab(cat)}>
                {active && <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} style={StyleSheet.absoluteFillObject} />}
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{formatCategoryLabel(cat)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Events Feed */}
      <Animated.View style={[styles.feedSection, { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] }]}>
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => <EventCard item={item} index={index} onOpen={setSelectedEvent} onRegister={setRegisterEvent} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !refreshing && (
              <View style={styles.emptyState}>
                <LinearGradient colors={["#ffffff", COLORS.goldSoft]} style={styles.emptyIconCircle}>
                  <Ionicons name="calendar-clear-outline" size={54} color={COLORS.ink} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptyText}>Switch categories or publish the first standout event for your community.</Text>
                <TouchableOpacity style={styles.emptyButton} activeOpacity={0.86} onPress={() => setModalVisible(true)}>
                  <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} style={styles.emptyButtonGradient}>
                    <Text style={styles.emptyButtonText}>Create Event</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )
          }
        />
      </Animated.View>

      {/* Event Detail Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <View style={styles.detailScreen}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View>
                <Image source={{ uri: selectedEvent.image || FALLBACK_BANNER }} style={styles.detailBanner} />
                <LinearGradient colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.90)"]} style={styles.detailBannerOverlay} />
                <TouchableOpacity onPress={() => setSelectedEvent(null)} activeOpacity={0.86} style={styles.backButtonWrap}>
                  <BlurView intensity={90} style={styles.roundGlass}>
                    <Ionicons name="arrow-back" size={21} color={COLORS.accent} />
                  </BlurView>
                </TouchableOpacity>
              </View>
              <View style={styles.detailBody}>
                <View style={styles.detailTopRow}>
                  <View style={styles.detailTag}>
                    <Ionicons name="sparkles-outline" size={14} color={COLORS.ink} />
                    <Text style={styles.detailTagText}>{selectedEvent.type}</Text>
                  </View>
                  <TouchableOpacity style={styles.shareButton} activeOpacity={0.86} onPress={() => onShare(selectedEvent.title)}>
                    <Ionicons name="share-social-outline" size={19} color={COLORS.ink} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                <View style={styles.detailOrgRow}>
                  <Ionicons name="business-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.detailOrgText}>{selectedEvent.organizer || "Organizer"} • {selectedEvent.city || "City"}</Text>
                </View>
                <View style={styles.specRow}>
                  <View style={styles.specCard}>
                    <View style={styles.specIcon}><Ionicons name="calendar-outline" size={20} color={COLORS.accent} /></View>
                    <Text style={styles.specTitle}>Date</Text>
                    <Text style={styles.specText}>{selectedEvent.date || "TBA"}</Text>
                  </View>
                  <View style={[styles.specCard, styles.specCardLast]}>
                    <View style={styles.specIcon}><Ionicons name="people-outline" size={20} color={COLORS.accent} /></View>
                    <Text style={styles.specTitle}>Team</Text>
                    <Text style={styles.specText}>{selectedEvent.teamSize || "1-4"}</Text>
                  </View>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Description</Text>
                  <Text style={styles.sectionCardBody}>{selectedEvent.description || "No description provided."}</Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Location</Text>
                  <Text style={styles.sectionCardBody}>{selectedEvent.location || "Online event"}</Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Contact</Text>
                  <Text style={styles.sectionCardBody}>{selectedEvent.contact || "Not provided"}</Text>
                </View>
                <View style={{ height: 120 }} />
              </View>
            </ScrollView>
            <View style={styles.stickyFooter}>
              <BlurView intensity={92} style={styles.stickyBlur}>
                <View style={styles.stickyContent}>
                  <View>
                    <Text style={styles.stickyLabel}>Register before</Text>
                    <Text style={styles.stickyValue}>{selectedEvent.deadline || "Limited Spots"}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.88} onPress={() => { const e = selectedEvent; setSelectedEvent(null); setTimeout(() => setRegisterEvent(e), 260); }}>
                    <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stickyButton}>
                      <Text style={styles.stickyButtonText}>Register Now</Text>
                      <Ionicons name="rocket-outline" size={18} color={COLORS.accent} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}
      </Modal>

      {/* Registration Modal */}
      <GuestGuard 
                  title="View Your Discounts" 
                  message="Sign in to see your claimed offers and discounts."
                >
      <Modal visible={!!registerEvent} animationType="slide" onRequestClose={() => setRegisterEvent(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
          {registerEvent && (
            <SafeAreaView style={styles.modalScreen} edges={["bottom"]}>
              <LinearGradient colors={["#000000", "#1a1a1a", "#2a2a2a"]} style={styles.modalHero}>
                <View style={styles.modalHeroTop}>
                  <View style={styles.modalHeroTitleRow}>
                    <Ionicons name="clipboard-outline" size={24} color={COLORS.accent} />
                    <Text style={styles.modalHeroTitle}>Event Registration</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setRegisterEvent(null)} activeOpacity={0.86}>
                    <Ionicons name="close" size={25} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalHeroSubtitle}>{registerEvent.title}</Text>
              </LinearGradient>
              <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Full Name *</Text><TextInput style={styles.textInput} placeholder="Enter your full name" placeholderTextColor="#8a8a8a" value={regForm.studentName} onChangeText={(text) => setRegForm({ ...regForm, studentName: text })} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>University Email *</Text><TextInput style={styles.textInput} placeholder="student@university.edu" placeholderTextColor="#8a8a8a" value={regForm.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(text) => setRegForm({ ...regForm, email: text })} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>WhatsApp Number *</Text><TextInput style={styles.textInput} placeholder="+92 3XX XXXXXXX" placeholderTextColor="#8a8a8a" keyboardType="phone-pad" value={regForm.whatsapp} onChangeText={(text) => setRegForm({ ...regForm, whatsapp: text })} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Student ID / CNIC</Text><TextInput style={styles.textInput} placeholder="Optional" placeholderTextColor="#8a8a8a" value={regForm.studentId} onChangeText={(text) => setRegForm({ ...regForm, studentId: text })} /></View>
                <TouchableOpacity style={styles.primaryFormButton} activeOpacity={0.88} onPress={handleRegistrationSubmit}>
                  <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryFormGradient}>
                    <Text style={styles.primaryFormText}>Submit Registration</Text>
                    <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.accent} />
                  </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 36 }} />
              </ScrollView>
            </SafeAreaView>
          )}
        </KeyboardAvoidingView>
      </Modal></GuestGuard>

      {/* Create Event Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SafeAreaView style={styles.modalScreen} edges={["bottom"]}>
            <LinearGradient colors={["#000000", "#1a1a1a", "#2a2a2a"]} style={styles.modalHero}>
              <View style={styles.modalHeroTop}>
                <View style={styles.modalHeroTitleRow}>
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                  <Text style={styles.modalHeroTitle}>Create New Event</Text>
                </View>
                <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)} activeOpacity={0.86}>
                  <Ionicons name="close" size={25} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalHeroSubtitle}>Publish a sharper, more trustworthy event listing for your campus audience</Text>
            </LinearGradient>
            <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Event Title *</Text><TextInput style={styles.textInput} placeholder="National Coding Competition" placeholderTextColor="#8a8a8a" value={form.title} onChangeText={(text) => setForm({ ...form, title: text })} /></View>
              <View style={styles.row}>
                <View style={styles.colLeft}><View style={styles.inputGroup}><Text style={styles.inputLabel}>University *</Text><TextInput style={styles.textInput} placeholder="University name" placeholderTextColor="#8a8a8a" value={form.university} onChangeText={(text) => setForm({ ...form, university: text })} /></View></View>
                <View style={styles.colRight}><View style={styles.inputGroup}><Text style={styles.inputLabel}>City *</Text><TextInput style={styles.textInput} placeholder="City" placeholderTextColor="#8a8a8a" value={form.city} onChangeText={(text) => setForm({ ...form, city: text })} /></View></View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.filter((item) => item !== "All").map((cat) => {
                    const selected = form.type === cat;
                    return (
                      <TouchableOpacity key={cat} activeOpacity={0.86} onPress={() => setForm({ ...form, type: cat })} style={[styles.optionPill, selected && styles.optionPillActive]}>
                        {selected && <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} style={StyleSheet.absoluteFillObject} />}
                        <Text style={[styles.optionPillText, selected && styles.optionPillTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Description</Text><TextInput style={[styles.textInput, styles.multiLineInput]} placeholder="Describe what makes this event worth attending..." placeholderTextColor="#8a8a8a" multiline value={form.description} onChangeText={(text) => setForm({ ...form, description: text })} /></View>
              <View style={styles.row}>
                <View style={styles.colLeft}><View style={styles.inputGroup}><Text style={styles.inputLabel}>Event Date</Text><TextInput style={styles.textInput} placeholder="15 May 2026" placeholderTextColor="#8a8a8a" value={form.date} onChangeText={(text) => setForm({ ...form, date: text })} /></View></View>
                <View style={styles.colRight}><View style={styles.inputGroup}><Text style={styles.inputLabel}>Team Size</Text><TextInput style={styles.textInput} placeholder="2-4 Members" placeholderTextColor="#8a8a8a" value={form.teamSize} onChangeText={(text) => setForm({ ...form, teamSize: text })} /></View></View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Location / Venue</Text><TextInput style={styles.textInput} placeholder="Auditorium, online, lab, hall..." placeholderTextColor="#8a8a8a" value={form.location} onChangeText={(text) => setForm({ ...form, location: text })} /></View>
              <View style={styles.row}>
                <View style={styles.colLeft}><View style={styles.inputGroup}><Text style={styles.inputLabel}>Prize Pool</Text><TextInput style={styles.textInput} placeholder="PKR 100,000" placeholderTextColor="#8a8a8a" value={form.prize} onChangeText={(text) => setForm({ ...form, prize: text })} /></View></View>
                <View style={styles.colRight}><View style={styles.inputGroup}><Text style={styles.inputLabel}>Registration Deadline</Text><TextInput style={styles.textInput} placeholder="30 April 2026" placeholderTextColor="#8a8a8a" value={form.deadline} onChangeText={(text) => setForm({ ...form, deadline: text })} /></View></View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Contact Information</Text><TextInput style={styles.textInput} placeholder="Email or phone number" placeholderTextColor="#8a8a8a" value={form.contact} onChangeText={(text) => setForm({ ...form, contact: text })} /></View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Banner</Text>
                <TouchableOpacity style={styles.uploadCard} activeOpacity={0.88} onPress={pickImage}>
                  {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.uploadPreview} /> : (
                    <View style={styles.uploadPlaceholder}>
                      <View style={styles.uploadIconCircle}><Ionicons name="image-outline" size={30} color={COLORS.ink} /></View>
                      <Text style={styles.uploadTitle}>Upload event banner</Text>
                      <Text style={styles.uploadSubtitle}>Recommended ratio: 16:9</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryFormButton} activeOpacity={0.88} disabled={submitting} onPress={handlePostEvent}>
                <LinearGradient colors={[COLORS.primary, "#2a2a2a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryFormGradient}>
                  {submitting ? <ActivityIndicator color={COLORS.accent} /> : <><Text style={styles.primaryFormText}>Publish Event</Text><Ionicons name="rocket-outline" size={22} color={COLORS.accent} /></>}
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 44 }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  glowTop: { position: "absolute", top: -100, right: -30, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(249, 195, 73, 0.16)" },
  glowBottom: { position: "absolute", left: -50, bottom: 120, width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(0, 0, 0, 0.05)" },
  
  // Header Nav
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerNavTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  headerAddBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f9c34915', justifyContent: 'center', alignItems: 'center' },
  
  loadingHeaderWrap: { paddingHorizontal: 18, paddingTop: 8 },
  loadingHeader: { borderRadius: 30, paddingHorizontal: 20, paddingVertical: 22 },
  loadingHeaderLabel: { color: COLORS.accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 11, fontWeight: "800" },
  loadingHeaderTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 8 },
  loadingHeaderText: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 20, marginTop: 8 },
  
  heroShell: { paddingHorizontal: 18, paddingTop: 8 },
  heroCard: { borderRadius: 32, padding: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10 },
  heroNoise: { ...StyleSheet.absoluteFillObject, opacity: 0.04 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandBadge: { width: 38, height: 38, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  brandTitle: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: 'center' },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconButtonSoft: { width: 38, height: 38, borderRadius: 15, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)" },
  notificationDot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: COLORS.accent, justifyContent: "center", alignItems: "center" },
  notificationDotText: { color: COLORS.ink, fontSize: 10, fontWeight: "800" },
  heroContent: { marginTop: 10 },
  heroLabel: { color: COLORS.accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 11, fontWeight: "800", marginBottom: 10 },
  heroStats: { flexDirection: "row", marginTop: 16 },
  heroStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, marginRight: 10 },
  heroStatNumber: { color: COLORS.accent, fontSize: 18, fontWeight: "900" },
  heroStatText: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "600" },
  
  filterSection: { marginTop: 18 },
  sectionTitle: { paddingHorizontal: 20, color: COLORS.ink, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  filtersRow: { paddingHorizontal: 20, paddingBottom: 2 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 12, marginRight: 10, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line, overflow: "hidden" },
  filterPillActive: { borderColor: COLORS.accent },
  filterPillText: { color: COLORS.body, fontSize: 13, fontWeight: "700" },
  filterPillTextActive: { color: "#fff" },
  
  feedSection: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  
  // Fast Skeleton
  skeletonCard: { backgroundColor: "#fff", borderRadius: 30, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: COLORS.line },
  skeletonImage: { width: "100%", height: 200, backgroundColor: "#efefef" },
  skeletonContent: { padding: 18 },
  skeletonTitle: { height: 28, width: "80%", backgroundColor: COLORS.goldSoft, borderRadius: 8, marginBottom: 12 },
  skeletonText: { height: 16, width: "100%", backgroundColor: "#f1f1f1", borderRadius: 6, marginBottom: 8 },
  skeletonTextShort: { height: 16, width: "60%", backgroundColor: "#f1f1f1", borderRadius: 6, marginBottom: 16 },
  skeletonFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  skeletonButton: { width: 120, height: 48, backgroundColor: COLORS.accent, borderRadius: 18 },
  
  // Card
  card: { backgroundColor: COLORS.card, borderRadius: 30, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 7, borderWidth: 1, borderColor: COLORS.line },
  cardMedia: { position: "relative" },
  cardImage: { width: "100%", height: 200 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 16 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  categoryChip: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  categoryChipText: { color: COLORS.ink, fontSize: 12, fontWeight: "800", marginLeft: 5 },
  timeChip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  timeChipText: { color: "#fff", fontSize: 11, fontWeight: "700", marginLeft: 4, maxWidth: 104 },
  cardTitle: { color: "#fff", fontSize: 24, fontWeight: "900", lineHeight: 30, marginBottom: 8 },
  cardDescription: { color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 20, maxWidth: "92%" },
  cardBody: { padding: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  metaChip: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, marginRight: 8, marginBottom: 8, maxWidth: "48%" },
  metaChipText: { marginLeft: 6, color: COLORS.ink, fontSize: 10, fontWeight: "600", flexShrink: 1 },
  statsPanel: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  statsBlock: { flex: 1 },
  statsDivider: { width: 1, height: 34, backgroundColor: COLORS.line, marginHorizontal: 10 },
  statsLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  statsValue: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateBox: { flex: 1, paddingRight: 12 },
  dateLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  dateValue: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  ctaButton: { borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 },
  ctaGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13 },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "800", marginRight: 6 },
  
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 70, paddingBottom: 40 },
  emptyIconCircle: { width: 110, height: 110, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 18, borderWidth: 1, borderColor: COLORS.line },
  emptyTitle: { color: COLORS.ink, fontSize: 22, fontWeight: "900" },
  emptyText: { marginTop: 8, color: COLORS.body, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 290 },
  emptyButton: { marginTop: 22, borderRadius: 18, overflow: "hidden" },
  emptyButtonGradient: { paddingHorizontal: 22, paddingVertical: 13 },
  emptyButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  
  detailScreen: { flex: 1, backgroundColor: "#fff" },
  detailBanner: { width: "100%", height: height * 0.3 },
  detailBannerOverlay: { ...StyleSheet.absoluteFillObject },
  backButtonWrap: { position: "absolute", top: 58, left: 20 },
  roundGlass: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", overflow: "hidden", backgroundColor: "rgba(0,0,0,0.18)" },
  detailBody: { marginTop: -28, backgroundColor: "#fff", borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24 },
  detailTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  detailTag: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.goldSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  detailTagText: { color: COLORS.ink, fontSize: 13, fontWeight: "800", marginLeft: 6 },
  shareButton: { width: 42, height: 42, borderRadius: 15, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  detailTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "900", lineHeight: 38, marginBottom: 14 },
  detailOrgRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  detailOrgText: { marginLeft: 8, color: COLORS.body, fontSize: 15, fontWeight: "600" },
  specRow: { flexDirection: "row", marginBottom: 24 },
  specCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.line, alignItems: "center", marginRight: 12 },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 8 },
  specTitle: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  specText: { color: COLORS.ink, fontSize: 15, fontWeight: "800", textAlign: "center" },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: COLORS.line },
  sectionCardTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800", marginBottom: 10 },
  sectionCardBody: { color: COLORS.body, fontSize: 15, lineHeight: 23 },
  stickyFooter: { position: "absolute", bottom: 0, width: "100%" },
  stickyBlur: { overflow: "hidden" },
  stickyContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, backgroundColor: "rgba(255,255,255,0.94)", borderTopWidth: 1, borderTopColor: COLORS.line },
  stickyLabel: { color: COLORS.danger, fontSize: 12, fontWeight: "800", marginBottom: 4 },
  stickyValue: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  stickyButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 15, borderRadius: 18 },
  stickyButtonText: { color: "#fff", fontSize: 15, fontWeight: "900", marginRight: 8 },
  
  modalScreen: { flex: 1, backgroundColor: COLORS.page },
  modalHero: { paddingHorizontal: 22, paddingTop: Platform.OS === "ios" ? 16 : 24, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  modalHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalHeroTitleRow: { flexDirection: "row", alignItems: "center" },
  modalHeroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginLeft: 10 },
  modalClose: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)" },
  modalHeroSubtitle: { marginTop: 10, color: "rgba(255,255,255,0.84)", fontSize: 14, fontWeight: "600" },
  formScrollView: { paddingHorizontal: 20, paddingTop: 20 },
  inputGroup: { marginBottom: 4 },
  inputLabel: { color: COLORS.ink, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 18, color: COLORS.ink, fontSize: 15 },
  multiLineInput: { height: 120, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 8 },
  colRight: { flex: 1, marginLeft: 8 },
  optionPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: "#fff", marginRight: 8, marginBottom: 18, borderWidth: 1.5, borderColor: COLORS.line, overflow: "hidden" },
  optionPillActive: { borderColor: COLORS.accent },
  optionPillText: { color: COLORS.body, fontSize: 13, fontWeight: "700" },
  optionPillTextActive: { color: "#fff" },
  uploadCard: { width: "100%", height: 196, borderRadius: 22, marginBottom: 18, overflow: "hidden", borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.accent, backgroundColor: "#fff" },
  uploadPreview: { width: "100%", height: "100%" },
  uploadPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  uploadIconCircle: { width: 62, height: 62, borderRadius: 31, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.goldSoft },
  uploadTitle: { marginTop: 12, color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  uploadSubtitle: { marginTop: 4, color: COLORS.muted, fontSize: 12 },
  primaryFormButton: { borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 8 },
  primaryFormGradient: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 17, paddingHorizontal: 20 },
  primaryFormText: { color: "#fff", fontSize: 17, fontWeight: "800", marginRight: 8 },
});