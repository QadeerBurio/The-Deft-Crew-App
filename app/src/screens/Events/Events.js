import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");
const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";

const CATEGORIES = ["All", "Hackathons", "Workshops", "Conferences", "Competitions", "Career Fairs"];

export default function EventsScreen() {
  const { token, user } = useContext(AuthContext);
  const navigation = useNavigation();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [userEventsCount, setUserEventsCount] = useState(0);
  
  // Post Event Form State
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
  });

  // Registration Form State
  const [registerEvent, setRegisterEvent] = useState(null);
  const [regForm, setRegForm] = useState({
    studentName: "",
    whatsapp: "",
    studentId: "",
    email: "",
  });

  useEffect(() => {
    if (user?.name) {
      setRegForm(prev => ({ ...prev, studentName: user.name }));
    }
    if (user?.email) {
      setRegForm(prev => ({ ...prev, email: user.email }));
    }
    fetchEvents();
    fetchUserEventsCount();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/feed`);
      setEvents(res.data);
    } catch (e) {
      console.error("Fetch Error", e);
      Alert.alert("Error", "Failed to fetch events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserEventsCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/my-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserEventsCount(res.data.length);
    } catch (e) {
      console.error("Fetch user events count error:", e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    fetchUserEventsCount();
  };

  const pickImage = async () => {
    // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (status !== 'granted') {
    //   Alert.alert('Permission Needed', 'Please grant camera roll permissions to upload images');
    //   return;
    // }
    
    let result = await ImagePicker.launchImageLibraryAsync({
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
      let res = await fetch("https://api.cloudinary.com/v1_1/decaxpera/image/upload", {
        method: "post",
        body: data,
      });
      let result = await res.json();
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Error:", err);
      return null;
    }
  };

  const handlePostEvent = async () => {
    if (!form.title || !form.university || !form.city) {
      Alert.alert("Validation Error", "Please fill all required fields (Title, University, City)");
      return;
    }
    if (!token) {
      Alert.alert("Authentication Error", "Please login first");
      return;
    }

    setLoading(true);
    let imageUrl = "https://images.unsplash.com/photo-1523240715632-d984bb4b970e?w=800";

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
        teamSize: form.teamSize || "1-4 Members"
      };

      const res = await axios.post(
        `${API_BASE}/create`,
        eventData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvents([res.data, ...events]);
      setUserEventsCount(prev => prev + 1);
      setModalVisible(false);
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
      });
      Alert.alert("Success", "Event Published Successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", e.response?.data?.message || "Failed to publish event");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSubmit = async () => {
    if (!regForm.studentName || !regForm.email || !regForm.whatsapp) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }
    if (!token) {
      Alert.alert("Authentication Error", "Please login to register");
      return;
    }
    
    try {
      const registrationData = {
        eventId: registerEvent._id,
        studentName: regForm.studentName,
        email: regForm.email,
        whatsapp: regForm.whatsapp,
        studentId: regForm.studentId || "Not provided"
      };

      await axios.post(
        `${API_BASE}/register`,
        registrationData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Registration Successful!");
      setRegisterEvent(null);
      setRegForm({
        studentName: user?.name || "",
        whatsapp: "",
        studentId: "",
        email: user?.email || "",
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", e.response?.data?.error || "Registration failed");
    }
  };

  const onShare = async (title) => {
    try {
      await Share.share({
        message: `Check out this event: ${title} on CampusFlow!`,
        title: title,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const EventCard = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => setSelectedEvent(item)}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardOverlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#6366f1" />
          <Text style={styles.metaText}>
            {item.organizer} • {item.city}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.prizeLabel}>Prize</Text>
            <Text style={styles.prizeAmount}>{item.prize || "TBD"}</Text>
          </View>
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={(e) => {
              e.stopPropagation();
              setRegisterEvent(item);
            }}
          >
            <Text style={styles.mainBtnText}>Register</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>tdc. Campuses</Text>
          <Text style={styles.subBrand}>Explore Student Opportunities</Text>
        </View>
        <View style={styles.headerButtons}>
          
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('EventNotification')}
          >
            <Ionicons name="notifications-outline" size={24} color="#000000" />
            {userEventsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{userEventsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Tab */}
      <View style={styles.tabScrollArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveTab(cat)}
              style={[styles.pill, activeTab === cat && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillText,
                  activeTab === cat && styles.pillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={
          activeTab === "All"
            ? events
            : events.filter((e) => e.type === activeTab)
        }
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <EventCard item={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Event Details Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <View style={styles.detailWrapper}>
            <ScrollView bounces={false}>
              <Image
                source={{ uri: selectedEvent.image }}
                style={styles.detailImg}
              />
              <TouchableOpacity
                style={styles.detailClose}
                onPress={() => setSelectedEvent(null)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>

              <View style={styles.detailContent}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailType}>{selectedEvent.type}</Text>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity onPress={() => onShare(selectedEvent.title)}>
                      <Ionicons name="share-social-outline" size={24} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                <View style={styles.detailOrgRow}>
                  <Ionicons name="business" size={18} color="#94a3b8" />
                  <Text style={styles.detailOrgText}>
                    {selectedEvent.organizer} • {selectedEvent.city}
                  </Text>
                </View>

                <View style={styles.specGrid}>
                  <View style={styles.specBox}>
                    <Ionicons name="calendar-outline" size={20} color="#000000" />
                    <Text style={styles.specLabel}>Date</Text>
                    <Text style={styles.specValue}>{selectedEvent.date || "TBA"}</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Ionicons name="people-outline" size={20} color="#000000" />
                    <Text style={styles.specLabel}>Team Size</Text>
                    <Text style={styles.specValue}>
                      {selectedEvent.teamSize || "1-4 Members"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailHeading}>Description</Text>
                <Text style={styles.detailDesc}>
                  {selectedEvent.description || "No description provided."}
                </Text>

                <Text style={styles.detailHeading}>Location & Venue</Text>
                <Text style={styles.detailDesc}>{selectedEvent.location || "Online Event"}</Text>

                <Text style={styles.detailHeading}>Contact Info</Text>
                <Text style={styles.detailDesc}>{selectedEvent.contact || "Not provided"}</Text>

                <View style={{ height: 120 }} />
              </View>
            </ScrollView>

            <View style={styles.bottomSticky}>
              <View>
                <Text style={styles.deadlineLabel}>Register Before</Text>
                <Text style={styles.deadlineDate}>
                  {selectedEvent.deadline || "Limited Spots"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.finalRegBtn}
                onPress={() => {
                  setSelectedEvent(null);
                  setRegisterEvent(selectedEvent);
                }}
              >
                <Text style={styles.finalRegText}>Register Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Registration Form Modal */}
      <Modal visible={!!registerEvent} animationType="slide" onRequestClose={() => setModalVisible(false)}>
      <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
        {registerEvent && (
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Registration</Text>
              <TouchableOpacity onPress={() => setRegisterEvent(null)}>
                <Ionicons name="close" size={30} color="#64748b" />
              </TouchableOpacity>
              
            </View>
            <ScrollView style={styles.form}>
              <Text style={styles.regTitle}>
                Registering for: {registerEvent.title}
              </Text>
              
              <Text style={styles.label}>Full Name *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter your full name"
                value={regForm.studentName}
                onChangeText={(text) => setRegForm({...regForm, studentName: text})}
              />
              
              <Text style={styles.label}>University Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="student@university.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                value={regForm.email}
                onChangeText={(text) => setRegForm({...regForm, email: text})}
              />
              
              <Text style={styles.label}>WhatsApp Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+92 3XX XXXXXXX"
                keyboardType="phone-pad"
                value={regForm.whatsapp}
                onChangeText={(text) => setRegForm({...regForm, whatsapp: text})}
              />
              
              <Text style={styles.label}>Student ID / CNIC</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Optional"
                value={regForm.studentId}
                onChangeText={(text) => setRegForm({...regForm, studentId: text})}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegistrationSubmit}
              >
                <Text style={styles.submitBtnText}>Submit Registration</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Event Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., National Coding Competition"
                onChangeText={(t) => setForm({ ...form, title: t })}
                value={form.title}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>University/Organizer *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="University Name"
                    onChangeText={(t) => setForm({ ...form, university: t })}
                    value={form.university}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    onChangeText={(t) => setForm({ ...form, city: t })}
                    value={form.city}
                  />
                </View>
              </View>

              <Text style={styles.label}>Event Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setForm({ ...form, type: cat })}
                    style={[
                      styles.smallPill,
                      form.type === cat && styles.pillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        form.type === cat && styles.pillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                placeholder="Describe your event..."
                multiline
                onChangeText={(t) => setForm({ ...form, description: t })}
                value={form.description}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Event Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="15 May 2024"
                    onChangeText={(t) => setForm({ ...form, date: t })}
                    value={form.date}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Team Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2-4 Members"
                    onChangeText={(t) => setForm({ ...form, teamSize: t })}
                    value={form.teamSize}
                  />
                </View>
              </View>

              <Text style={styles.label}>Location/Venue</Text>
              <TextInput
                style={styles.input}
                placeholder="Auditorium, Online, etc."
                onChangeText={(t) => setForm({ ...form, location: t })}
                value={form.location}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Prize Pool</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="PKR 100,000"
                    onChangeText={(t) => setForm({ ...form, prize: t })}
                    value={form.prize}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Registration Deadline</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30 April 2024"
                    onChangeText={(t) => setForm({ ...form, deadline: t })}
                    value={form.deadline}
                  />
                </View>
              </View>

              <Text style={styles.label}>Contact Information</Text>
              <TextInput
                style={styles.input}
                placeholder="Email or Phone for inquiries"
                onChangeText={(t) => setForm({ ...form, contact: t })}
                value={form.contact}
              />

              <Text style={styles.label}>Event Banner</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Ionicons name="camera" size={40} color="#000000" />
                    <Text style={styles.placeholderText}>Upload Banner Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handlePostEvent}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Publish Event</Text>
                )}
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
  container: { flex: 1, backgroundColor: "#fdfdff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  brand: { fontSize: 23, fontWeight: "900", color: "#1e293b" },
  subBrand: { fontSize: 11, color: "#94a3b8" },
  addBtn: {
    backgroundColor: "#000",
    height: 40,
    width: 40,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBtn: {
    backgroundColor: "#ebebeb9d",
    height: 37,
    width: 37,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  tabScrollArea: { marginBottom: 15 },
  tabContent: { paddingHorizontal: 25, gap: 10 },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
  },
  pillActive: { backgroundColor: "#1e293b" },
  pillText: { fontWeight: "700", color: "#64748b" },
  pillTextActive: { color: "#fff" },
  listContainer: { paddingHorizontal: 25, paddingBottom: 50 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 25,
    marginBottom: 25,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: { width: "100%", height: 180 },
  cardOverlay: { position: "absolute", top: 15, left: 15 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#000000" },
  cardBody: { padding: 20 },
  eventTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  metaText: { color: "#64748b", fontSize: 14 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  prizeLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "800" },
  prizeAmount: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  mainBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mainBtnText: { color: "#fff", fontWeight: "800" },
  detailWrapper: { flex: 1, backgroundColor: "#fff" },
  detailImg: { width: "100%", height: height * 0.35 },
  detailClose: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 8,
  },
  detailContent: {
    padding: 25,
    marginTop: -30,
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailType: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  actionIcons: { flexDirection: "row" },
  detailTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e293b",
    marginTop: 10,
  },
  detailOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  detailOrgText: { color: "#64748b", fontSize: 16, fontWeight: "500" },
  specGrid: { flexDirection: "row", gap: 15, marginTop: 25 },
  specBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  specLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "800",
    marginTop: 5,
  },
  specValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  detailHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 25,
    marginBottom: 10,
  },
  detailDesc: { color: "#64748b", lineHeight: 22, fontSize: 15 },
  bottomSticky: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  deadlineLabel: { fontSize: 11, color: "#ef4444", fontWeight: "800" },
  deadlineDate: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  finalRegBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 18,
  },
  finalRegText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  modalContent: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1e293b" },
  form: { padding: 25 },
  regTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  input: {
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    color: "#000000",
  },
  submitBtn: {
    backgroundColor: "#000000",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  formRow: { flexDirection: "row", marginBottom: 10, gap: 10 },
  smallPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  smallPillText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  imagePickerBtn: {
    width: "100%",
    height: 150,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  placeholderBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 15,
  },
  placeholderText: {
    marginTop: 10,
    color: "#6366f1",
    fontWeight: "600",
  },
});