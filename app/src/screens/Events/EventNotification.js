import React, { useState, useEffect, useContext } from "react";
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
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
const CATEGORIES = ["Hackathons", "Workshops", "Conferences", "Competitions", "Career Fairs"];

export default function EventNotification({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [userEvents, setUserEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fetchingEvents, setFetchingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit Event State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    organizer: "",
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
  const [editImage, setEditImage] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchUserEvents();
  }, []);

  const fetchUserEvents = async () => {
    if (!token) {
      setFetchingEvents(false);
      return;
    }
    
    setFetchingEvents(true);
    try {
      const res = await axios.get(`${API_BASE}/my-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserEvents(res.data);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegisteredUsers(res.data);
    } catch (error) {
      console.error("Fetch registered users error:", error);
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
      title: event.title,
      organizer: event.organizer,
      city: event.city,
      type: event.type,
      prize: event.prize || "TBD",
      deadline: event.deadline || "Limited spots",
      description: event.description || "",
      location: event.location || "Online/Venue TBD",
      contact: event.contact || "",
      date: event.date || "TBA",
      teamSize: event.teamSize || "1-4 Members",
    });
    setEditImage(null);
    setEditModalVisible(true);
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => confirmDeleteEvent(event._id)
        }
      ]
    );
  };

  const confirmDeleteEvent = async (eventId) => {
    if (!token) return;
    
    try {
      await axios.delete(`${API_BASE}/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert("Success", "Event deleted successfully");
      fetchUserEvents();
    } catch (error) {
      console.error("Delete event error:", error);
      Alert.alert("Error", "Failed to delete event");
    }
  };

  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant camera roll permissions to upload images');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) setEditImage(result.assets[0].uri);
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

  const handleUpdateEvent = async () => {
    if (!editForm.title || !editForm.organizer || !editForm.city) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }

    setEditLoading(true);
    let imageUrl = editingEvent.image;

    if (editImage) {
      const uploaded = await uploadToCloudinary(editImage);
      if (uploaded) imageUrl = uploaded;
    }

    try {
      const updateData = {
        ...editForm,
        image: imageUrl,
      };

      await axios.put(`${API_BASE}/event/${editingEvent._id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Success", "Event updated successfully");
      setEditModalVisible(false);
      fetchUserEvents();
    } catch (error) {
      console.error("Update event error:", error);
      Alert.alert("Error", "Failed to update event");
    } finally {
      setEditLoading(false);
    }
  };

  const UserDetailModal = ({ user, visible, onClose }) => {
    if (!user) return null;
    
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Registered Student Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#1e293b" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.detailContainer}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user.studentName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{user.studentName}</Text>
              <Text style={styles.profileDate}>
                Registered on: {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="mail-outline" size={24} color="#6366f1" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>WhatsApp Number</Text>
                <Text style={styles.detailValue}>{user.whatsapp}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="card-outline" size={24} color="#000000" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Student ID / CNIC</Text>
                <Text style={styles.detailValue}>{user.studentId || "Not provided"}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.emailBtn]}
                onPress={() => {
                  Alert.alert("Contact via Email", `Email: ${user.email}`, [
                    { text: "Copy Email", onPress: () => console.log(user.email) }, 
                    { text: "OK" }
                  ]);
                }}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.whatsappBtn]}
                onPress={() => {
                  Alert.alert("Contact via WhatsApp", `WhatsApp: ${user.whatsapp}`, [
                    { text: "Copy Number", onPress: () => console.log(user.whatsapp) }, 
                    { text: "OK" }
                  ]);
                }}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const RegisteredUsersModal = ({ event, visible, onClose }) => {
    if (!event) return null;
    
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Registered Students</Text>
              <Text style={styles.eventTitleSmall}>{event.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#1e293b" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : registeredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>No Registrations Yet</Text>
              <Text style={styles.emptySubText}>
                When students register for your event, they'll appear here
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsHeader}>
                <Ionicons name="people" size={20} color="#000000" />
                <Text style={styles.statsText}>
                  Total Registered: {registeredUsers.length} student{registeredUsers.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <FlatList
                data={registeredUsers}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.registrationsList}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.registrationCard}
                    onPress={() => setSelectedUser(item)}
                  >
                    <View style={styles.registrationNumber}>
                      <Text style={styles.registrationNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.registrationAvatar}>
                      <Text style={styles.avatarText}>
                        {item.studentName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.registrationInfo}>
                      <Text style={styles.registrationName}>{item.studentName}</Text>
                      <Text style={styles.registrationEmail}>{item.email}</Text>
                      <Text style={styles.registrationWhatsapp}>{item.whatsapp}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  const renderEventCard = ({ item }) => (
    <View style={styles.eventCardWrapper}>
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
      >
        <Image source={{ uri: item.image }} style={styles.eventImage} />
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={14} color="#000000" />
            <Text style={styles.eventMetaText}>{item.city}</Text>
            <View style={styles.dot} />
            <Ionicons name="calendar-outline" size={14} color="#000000" />
            <Text style={styles.eventMetaText}>{item.date || "TBA"}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBadge}>
              <Ionicons name="people-outline" size={16} color="#000000" />
              <Text style={styles.statText}>View Registered Students</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
      </TouchableOpacity>
      
      {/* Edit and Delete Buttons */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.actionIconBtn, styles.editBtn]}
          onPress={() => handleEditEvent(item)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.actionIconText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionIconBtn, styles.deleteBtn]}
          onPress={() => handleDeleteEvent(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionIconText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Edit Event Modal
  const EditEventModal = () => (
    <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={editForm.title}
              onChangeText={(t) => setEditForm({ ...editForm, title: t })}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>University/Organizer *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="University Name"
                  value={editForm.organizer}
                  onChangeText={(t) => setEditForm({ ...editForm, organizer: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={editForm.city}
                  onChangeText={(t) => setEditForm({ ...editForm, city: t })}
                />
              </View>
            </View>

            <Text style={styles.label}>Event Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditForm({ ...editForm, type: cat })}
                  style={[
                    styles.smallPill,
                    editForm.type === cat && styles.pillActive,
                  ]}
                >
                  <Text style={[
                    styles.smallPillText,
                    editForm.type === cat && styles.pillTextActive,
                  ]}>
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
              value={editForm.description}
              onChangeText={(t) => setEditForm({ ...editForm, description: t })}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Event Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15 May 2024"
                  value={editForm.date}
                  onChangeText={(t) => setEditForm({ ...editForm, date: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Team Size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2-4 Members"
                  value={editForm.teamSize}
                  onChangeText={(t) => setEditForm({ ...editForm, teamSize: t })}
                />
              </View>
            </View>

            <Text style={styles.label}>Location/Venue</Text>
            <TextInput
              style={styles.input}
              placeholder="Auditorium, Online, etc."
              value={editForm.location}
              onChangeText={(t) => setEditForm({ ...editForm, location: t })}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Prize Pool</Text>
                <TextInput
                  style={styles.input}
                  placeholder="PKR 100,000"
                  value={editForm.prize}
                  onChangeText={(t) => setEditForm({ ...editForm, prize: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Registration Deadline</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30 April 2024"
                  value={editForm.deadline}
                  onChangeText={(t) => setEditForm({ ...editForm, deadline: t })}
                />
              </View>
            </View>

            <Text style={styles.label}>Contact Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Email or Phone for inquiries"
              value={editForm.contact}
              onChangeText={(t) => setEditForm({ ...editForm, contact: t })}
            />

            <Text style={styles.label}>Event Banner</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditImage}>
              {editImage ? (
                <Image source={{ uri: editImage }} style={styles.previewImage} />
              ) : editingEvent?.image ? (
                <Image source={{ uri: editingEvent.image }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderBox}>
                  <Ionicons name="camera" size={40} color="#000000" />
                  <Text style={styles.placeholderText}>Change Banner Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleUpdateEvent}
              disabled={editLoading}
            >
              {editLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Update Event</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (fetchingEvents) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Created Events</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (userEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Created Events</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyStateTitle}>No Events Created</Text>
          <Text style={styles.emptyStateText}>
            You haven't created any events yet. Create an event to see registered students here.
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.createBtnText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Created Events ({userEvents.length})</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={userEvents}
        keyExtractor={(item) => item._id}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000000"]}
          />
        }
      />

      <RegisteredUsersModal
        event={selectedEvent}
        visible={!!selectedEvent}
        onClose={() => {
          setSelectedEvent(null);
          setRegisteredUsers([]);
        }}
      />

      <UserDetailModal
        user={selectedUser}
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      <EditEventModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingTop:40
  },
  backBtn: {
    padding: 8,
  },
  refreshBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  listContainer: {
    padding: 16,
  },
  eventCardWrapper: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  eventCard: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  eventTitleSmall: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eventMetaText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 8,
  },
  statsContainer: {
    flexDirection: "row",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  actionButtonsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  actionIconBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  editBtn: {
    backgroundColor: "#000000",
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
  },
  actionIconText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeBtn: {
    padding: 8,
  },
  registrationsList: {
    padding: 16,
  },
  registrationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  registrationNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  registrationNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  registrationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6366f1",
  },
  registrationInfo: {
    flex: 1,
  },
  registrationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  registrationEmail: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  registrationWhatsapp: {
    fontSize: 13,
    color: "#25D366",
  },
  detailContainer: {
    padding: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#6366f1",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  profileDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  detailCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emailBtn: {
    backgroundColor: "#6366f1",
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsHeader: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 30,
  },
  createBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  // Form Styles
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 14,
    color: "#1e293b",
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  smallPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  pillActive: {
    backgroundColor: "#1e293b",
  },
  pillTextActive: {
    color: "#fff",
  },
  imagePickerBtn: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  placeholderText: {
    marginTop: 10,
    color: "#6366f1",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});