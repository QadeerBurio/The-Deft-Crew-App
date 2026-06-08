import React, { useState, useEffect, useContext, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { AuthContext } from "../../context/AuthContext";

const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
const CATEGORIES = ["Hackathons", "Workshops", "Conferences", "Competitions", "Career Fairs"];

const COLORS = {
  page: "#ffffff",
  card: "#ffffff",
  surface: "#fafafa",
  ink: "#000000",
  body: "#222222",
  muted: "#6f6f6f",
  line: "#e7e7e7",
  primary: "#000000",
  accent: "#f9c349",
  accentSoft: "#fff3c8",
  success: "#0f9f6e",
  danger: "#d92d20",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedEventCard = ({ item, index, onPress, onEdit, onDelete }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
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
    <Animated.View style={[styles.eventCardWrapper, { opacity, transform: [{ translateY }, { scale }] }]}>
      <AnimatedTouchable
        style={styles.eventCard}
        activeOpacity={0.92}
        onPress={() => onPress(item)}
        onPressIn={() => animatePress(0.985)}
        onPressOut={() => animatePress(1)}
      >
        <Image source={{ uri: item.image }} style={styles.eventImage} />
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={14} color={COLORS.accent} />
            <Text style={styles.eventMetaText}>{item.city}</Text>
            <View style={styles.dot} />
            <Ionicons name="calendar-outline" size={14} color={COLORS.ink} />
            <Text style={styles.eventMetaText}>{item.date || "TBA"}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBadge}>
              <Ionicons name="people-outline" size={16} color={COLORS.ink} />
              <Text style={styles.statText}>View Registered Students</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#b8b8b8" />
      </AnimatedTouchable>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={[styles.actionIconBtn, styles.editBtn]} onPress={() => onEdit(item)} activeOpacity={0.88}>
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.actionIconText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionIconBtn, styles.deleteBtn]} onPress={() => onDelete(item)} activeOpacity={0.88}>
          <Ionicons name="trash-outline" size={20} color={COLORS.ink} />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function EventNotification({ navigation }) {
  const { token } = useContext(AuthContext);
  const [userEvents, setUserEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fetchingEvents, setFetchingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "", organizer: "", city: "", type: "Hackathons", prize: "",
    deadline: "", description: "", location: "", contact: "", date: "", teamSize: "",
  });
  const [editImage, setEditImage] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const entranceOpacity = useRef(new Animated.Value(1)).current;
  const entranceTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserEvents();
  }, []);

  const fetchUserEvents = async () => {
    if (!token) { setFetchingEvents(false); return; }
    setFetchingEvents(true);
    try {
      const res = await axios.get(`${API_BASE}/my-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEvents(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Fetch user events error:", error);
      Alert.alert("Error", "Failed to fetch your events");
    } finally {
      setFetchingEvents(false);
      setRefreshing(false);
    }
  };

  const fetchRegisteredUsers = async (eventId) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/registrations/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRegisteredUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch registered users");
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = async (event) => {
    setSelectedEvent(event);
    await fetchRegisteredUsers(event._id);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserEvents();
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title, organizer: event.organizer, city: event.city,
      type: event.type, prize: event.prize || "TBD", deadline: event.deadline || "Limited spots",
      description: event.description || "", location: event.location || "Online/Venue TBD",
      contact: event.contact || "", date: event.date || "TBA", teamSize: event.teamSize || "1-4 Members",
    });
    setEditImage(null);
    setEditModalVisible(true);
  };

  const handleDeleteEvent = (event) => {
    Alert.alert("Delete Event", `Are you sure you want to delete "${event.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => confirmDeleteEvent(event._id) },
    ]);
  };

  const confirmDeleteEvent = async (eventId) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Event deleted successfully");
      fetchUserEvents();
    } catch (error) {
      Alert.alert("Error", "Failed to delete event");
    }
  };

  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Needed", "Please grant camera roll permissions"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled) setEditImage(result.assets[0].uri);
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
    } catch (err) { return null; }
  };

  const handleUpdateEvent = async () => {
    if (!editForm.title || !editForm.organizer || !editForm.city) {
      Alert.alert("Validation Error", "Please fill all required fields"); return;
    }
    setEditLoading(true);
    let imageUrl = editingEvent.image;
    if (editImage) {
      const uploaded = await uploadToCloudinary(editImage);
      if (uploaded) imageUrl = uploaded;
    }
    try {
      await axios.put(`${API_BASE}/event/${editingEvent._id}`, { ...editForm, image: imageUrl }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Event updated successfully");
      setEditModalVisible(false);
      fetchUserEvents();
    } catch (error) {
      Alert.alert("Error", "Failed to update event");
    } finally { setEditLoading(false); }
  };

  // Header component
  const HeaderBar = () => (
    <View style={styles.headerNav}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.headerNavTitle}>My Events</Text>
      <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
        <Ionicons name="refresh-outline" size={22} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
  );

  // Loading State
  if (fetchingEvents) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <HeaderBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty State
  if (userEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <HeaderBar />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={60} color={COLORS.ink} />
          </View>
          <Text style={styles.emptyStateTitle}>No Events Created</Text>
          <Text style={styles.emptyStateText}>
            You haven't created any events yet. Create an event to see registered students here.
          </Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <LinearGradient colors={["#000000", "#2a2a2a"]} style={styles.createBtnGradient}>
              <Ionicons name="add-circle-outline" size={18} color="#f9c349" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Create Event</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Content
  return (
    
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <HeaderBar />

      <FlatList
        data={userEvents}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <AnimatedEventCard
            item={item}
            index={index}
            onPress={handleEventPress}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
            progressBackgroundColor="#fff"
          />
        }
      />

      {/* Registered Users Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" onRequestClose={() => { setSelectedEvent(null); setRegisteredUsers([]); }}>
        <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
          <LinearGradient colors={["#000000", "#1d1d1d"]} style={styles.modalHero}>
            <View style={styles.modalHeroHeader}>
              <View>
                <Text style={styles.modalTitleOnDark}>Registered Students</Text>
                <Text style={styles.eventTitleSmall}>{selectedEvent?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedEvent(null); setRegisteredUsers([]); }} style={styles.closeGlass}>
                <Ionicons name="close" size={24} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          ) : registeredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#bdbdbd" />
              <Text style={styles.emptyText}>No Registrations Yet</Text>
              <Text style={styles.emptySubText}>When students register, they'll appear here</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsHeader}>
                <Ionicons name="people" size={20} color={COLORS.ink} />
                <Text style={styles.statsText}>Total: {registeredUsers.length} student{registeredUsers.length !== 1 ? "s" : ""}</Text>
              </View>
              <FlatList
                data={registeredUsers}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.registrationsList}
                renderItem={({ item, index }) => (
                  <TouchableOpacity style={styles.registrationCard} onPress={() => setSelectedUser(item)} activeOpacity={0.9}>
                    <View style={styles.registrationNumber}>
                      <Text style={styles.registrationNumberText}>{index + 1}</Text>
                    </View>
                    <LinearGradient colors={[COLORS.accent, "#f6d980"]} style={styles.registrationAvatar}>
                      <Text style={styles.avatarText}>{item.studentName.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={styles.registrationInfo}>
                      <Text style={styles.registrationName}>{item.studentName}</Text>
                      <Text style={styles.registrationEmail}>{item.email}</Text>
                      <Text style={styles.registrationWhatsapp}>{item.whatsapp}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={!!selectedUser} animationType="slide" onRequestClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
            <LinearGradient colors={["#000000", "#1d1d1d"]} style={styles.modalHero}>
              <View style={styles.modalHeroHeader}>
                <Text style={styles.modalTitleOnDark}>Student Details</Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeGlass}>
                  <Ionicons name="close" size={24} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeader}>
                <LinearGradient colors={[COLORS.accent, "#f6d980"]} style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{selectedUser.studentName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <Text style={styles.profileName}>{selectedUser.studentName}</Text>
                <Text style={styles.profileDate}>Registered: {new Date(selectedUser.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}><Ionicons name="mail-outline" size={22} color={COLORS.ink} /></View>
                <View style={styles.detailContent}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{selectedUser.email}</Text></View>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}><Ionicons name="logo-whatsapp" size={22} color={COLORS.success} /></View>
                <View style={styles.detailContent}><Text style={styles.detailLabel}>WhatsApp</Text><Text style={styles.detailValue}>{selectedUser.whatsapp}</Text></View>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}><Ionicons name="card-outline" size={22} color={COLORS.ink} /></View>
                <View style={styles.detailContent}><Text style={styles.detailLabel}>Student ID / CNIC</Text><Text style={styles.detailValue}>{selectedUser.studentId || "Not provided"}</Text></View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Edit Event Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
            <LinearGradient colors={["#000000", "#1d1d1d"]} style={styles.modalHero}>
              <View style={styles.modalHeroHeader}>
                <Text style={styles.modalTitleOnDark}>Edit Event</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeGlass}>
                  <Ionicons name="close" size={24} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput style={styles.input} placeholder="Event Title" placeholderTextColor="#8b8b8b" value={editForm.title} onChangeText={(t) => setEditForm({ ...editForm, title: t })} />
              <View style={styles.formRow}>
                <View style={styles.formColLeft}><Text style={styles.label}>University *</Text><TextInput style={styles.input} placeholder="University Name" placeholderTextColor="#8b8b8b" value={editForm.organizer} onChangeText={(t) => setEditForm({ ...editForm, organizer: t })} /></View>
                <View style={styles.formColRight}><Text style={styles.label}>City *</Text><TextInput style={styles.input} placeholder="City" placeholderTextColor="#8b8b8b" value={editForm.city} onChangeText={(t) => setEditForm({ ...editForm, city: t })} /></View>
              </View>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat} onPress={() => setEditForm({ ...editForm, type: cat })} style={[styles.smallPill, editForm.type === cat && styles.pillActive]} activeOpacity={0.88}>
                    <Text style={[styles.smallPillText, editForm.type === cat && styles.pillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.multiLineInput]} placeholder="Describe your event..." placeholderTextColor="#8b8b8b" multiline value={editForm.description} onChangeText={(t) => setEditForm({ ...editForm, description: t })} />
              <View style={styles.formRow}>
                <View style={styles.formColLeft}><Text style={styles.label}>Event Date</Text><TextInput style={styles.input} placeholder="15 May 2026" placeholderTextColor="#8b8b8b" value={editForm.date} onChangeText={(t) => setEditForm({ ...editForm, date: t })} /></View>
                <View style={styles.formColRight}><Text style={styles.label}>Team Size</Text><TextInput style={styles.input} placeholder="2-4 Members" placeholderTextColor="#8b8b8b" value={editForm.teamSize} onChangeText={(t) => setEditForm({ ...editForm, teamSize: t })} /></View>
              </View>
              <Text style={styles.label}>Location/Venue</Text>
              <TextInput style={styles.input} placeholder="Auditorium, Online, etc." placeholderTextColor="#8b8b8b" value={editForm.location} onChangeText={(t) => setEditForm({ ...editForm, location: t })} />
              <View style={styles.formRow}>
                <View style={styles.formColLeft}><Text style={styles.label}>Prize Pool</Text><TextInput style={styles.input} placeholder="PKR 100,000" placeholderTextColor="#8b8b8b" value={editForm.prize} onChangeText={(t) => setEditForm({ ...editForm, prize: t })} /></View>
                <View style={styles.formColRight}><Text style={styles.label}>Deadline</Text><TextInput style={styles.input} placeholder="30 April 2026" placeholderTextColor="#8b8b8b" value={editForm.deadline} onChangeText={(t) => setEditForm({ ...editForm, deadline: t })} /></View>
              </View>
              <Text style={styles.label}>Contact</Text>
              <TextInput style={styles.input} placeholder="Email or Phone" placeholderTextColor="#8b8b8b" value={editForm.contact} onChangeText={(t) => setEditForm({ ...editForm, contact: t })} />
              <Text style={styles.label}>Event Banner</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditImage} activeOpacity={0.9}>
                {editImage ? <Image source={{ uri: editImage }} style={styles.previewImage} /> :
                 editingEvent?.image ? <Image source={{ uri: editingEvent.image }} style={styles.previewImage} /> :
                 <View style={styles.placeholderBox}><Ionicons name="image-outline" size={40} color={COLORS.ink} /><Text style={styles.placeholderText}>Change Banner</Text></View>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateEvent} disabled={editLoading} activeOpacity={0.88}>
                <LinearGradient colors={["#000000", "#2a2a2a"]} style={styles.submitGradient}>
                  {editLoading ? <ActivityIndicator color={COLORS.accent} /> : <Text style={styles.submitBtnText}>Update Event</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Header Navigation
  headerNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerNavTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  listContainer: { padding: 16, paddingBottom: 32 },
  eventCardWrapper: {
    marginBottom: 16, backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden", borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  eventCard: { flexDirection: "row", padding: 12, alignItems: "center" },
  eventImage: { width: 80, height: 80, borderRadius: 14, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink, marginBottom: 4 },
  eventTitleSmall: { fontSize: 14, color: "rgba(255,255,255,0.72)", marginTop: 4, maxWidth: 280 },
  eventMeta: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  eventMetaText: { fontSize: 12, color: COLORS.muted, marginLeft: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#cfcfcf", marginHorizontal: 8 },
  statsContainer: { flexDirection: "row" },
  statBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  statText: { fontSize: 12, fontWeight: "700", color: COLORS.ink, marginLeft: 6 },
  actionButtonsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionIconBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  editBtn: { backgroundColor: COLORS.primary },
  deleteBtn: { backgroundColor: COLORS.accent },
  actionIconText: { color: "#fff", fontSize: 14, fontWeight: "700", marginLeft: 6 },
  deleteActionText: { color: COLORS.ink, fontSize: 14, fontWeight: "700", marginLeft: 6 },
  
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHero: { paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 14 : 22, paddingBottom: 20 },
  modalHeroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitleOnDark: { fontSize: 22, fontWeight: "900", color: "#fff" },
  closeGlass: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  registrationsList: { padding: 16, paddingBottom: 28 },
  registrationCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  registrationNumber: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  registrationNumberText: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  registrationAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  registrationInfo: { flex: 1 },
  registrationName: { fontSize: 16, fontWeight: "700", color: COLORS.ink, marginBottom: 4 },
  registrationEmail: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  registrationWhatsapp: { fontSize: 13, color: COLORS.success, fontWeight: "600" },
  
  detailContainer: { padding: 20 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  profileAvatarText: { fontSize: 34, fontWeight: "900", color: COLORS.ink },
  profileName: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  profileDate: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  detailCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  detailIconContainer: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.accentSoft, justifyContent: "center", alignItems: "center", marginRight: 12 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: "600", color: COLORS.ink },
  
  statsHeader: {
    flexDirection: "row", backgroundColor: COLORS.accentSoft, padding: 16,
    marginHorizontal: 16, marginTop: 16, borderRadius: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#f1dfa2",
  },
  statsText: { fontSize: 14, fontWeight: "700", color: COLORS.ink, marginLeft: 8 },
  
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: "#f1dfa2" },
  emptyStateTitle: { fontSize: 20, fontWeight: "800", color: COLORS.ink, marginTop: 20, marginBottom: 10 },
  emptyStateText: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginBottom: 30, lineHeight: 22 },
  createBtn: { borderRadius: 14, overflow: "hidden" },
  createBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 14 },
  createBtnText: { color: "#f9c349", fontSize: 16, fontWeight: "700" },
  
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: "700", color: COLORS.ink, marginTop: 20 },
  emptySubText: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginTop: 10, lineHeight: 22 },
  
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.muted },
  
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: "700", color: COLORS.ink, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.line, fontSize: 14, color: COLORS.ink },
  multiLineInput: { height: 100, textAlignVertical: "top" },
  formRow: { flexDirection: "row" },
  formColLeft: { flex: 1, marginRight: 8 },
  formColRight: { flex: 1, marginLeft: 8 },
  categoryRow: { marginBottom: 20 },
  smallPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", marginRight: 8, borderWidth: 1, borderColor: COLORS.line },
  smallPillText: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  pillTextActive: { color: "#fff" },
  imagePickerBtn: { width: "100%", height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: COLORS.line },
  previewImage: { width: "100%", height: "100%" },
  placeholderBox: { flex: 1, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.accent, borderStyle: "dashed", borderRadius: 16 },
  placeholderText: { marginTop: 10, color: COLORS.ink, fontWeight: "700" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 10 },
  submitGradient: { padding: 16, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});