import React, { useState, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import * as Haptics from "expo-haptics";

export default function SettingsScreen({ navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: Confirm, 2: Warning, 3: Final
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const openDeleteModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteStep(1);
    setConfirmText("");
    setShowDeleteModal(true);
    
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDeleteModal(false);
      setDeleteStep(1);
      setConfirmText("");
    });
  };

  const handleShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (deleteStep === 1) {
      setDeleteStep(2);
    } else if (deleteStep === 2) {
      setDeleteStep(3);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete my account") {
      handleShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setDeleting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      await api.delete("/auth/delete-account", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      closeDeleteModal();
      setDeleting(false);
      
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted. You will be logged out now.",
        [
          {
            text: "OK",
            onPress: () => logout()
          }
        ]
      );
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const settingsOptions = [
    {
      id: 1,
      icon: "person-outline",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      color: "#f9c349",
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      id: 2,
      icon: "shield-checkmark-outline",
      title: "Privacy & Security",
      subtitle: "Manage your account security",
      color: "#4CAF50",
      onPress: () => navigation.navigate("PrivacySecurity"),
    },
    {
      id: 3,
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Configure your notification preferences",
      color: "#2196F3",
      onPress: () => navigation.navigate("NotificationSettings"),
    },
    {
      id: 4,
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help with your account",
      color: "#FF9800",
      onPress: () => navigation.navigate("HelpSupport"),
    },
    {
      id: 5,
      icon: "information-circle-outline",
      title: "About tdc",
      subtitle: "Learn more about the app",
      color: "#9C27B0",
      onPress: () => navigation.navigate("About"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email || "No email"}</Text>
          </View>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              {user?.isAlumni ? "Alumni" : "Student"}
            </Text>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                option.onPress();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIcon, { backgroundColor: option.color + '15' }]}>
                <Ionicons name={option.icon} size={22} color={option.color} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{option.title}</Text>
                <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerSectionTitle}>Account Actions</Text>
          
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={openDeleteModal}
            activeOpacity={0.7}
          >
            <View style={styles.deleteIcon}>
              <MaterialCommunityIcons name="delete-forever-outline" size={22} color="#FF5252" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.deleteSubtitle}>
                Permanently remove your account and all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF5252" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                "Logout",
                "Are you sure you want to logout?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Logout", 
                    style: "destructive",
                    onPress: () => logout()
                  }
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={22} color="#666" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.settingSubtitle}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>tdc. v1.0.0 • Karachi, Pakistan</Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: modalOpacity,
                transform: [
                  { scale: modalScale },
                  { translateX: shakeAnim }
                ]
              }
            ]}
          >
            {deleteStep === 1 && (
              <>
                {/* Step 1: Initial Warning */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={40} color="#FF5252" />
                  </View>
                  <Text style={styles.modalTitle}>Delete Account?</Text>
                  <Text style={styles.modalDescription}>
                    This action cannot be undone. All your data including your profile, 
                    connections, and activity will be permanently deleted.
                  </Text>
                </View>
                
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF5252" />
                    <Text style={styles.warningText}>Your profile will be removed</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF5252" />
                    <Text style={styles.warningText}>All connections will be lost</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF5252" />
                    <Text style={styles.warningText}>Referral history will be deleted</Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.continueButton}
                    onPress={handleNextStep}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {deleteStep === 2 && (
              <>
                {/* Step 2: Alternative Options */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconContainer, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialCommunityIcons name="pause-circle" size={40} color="#FF9800" />
                  </View>
                  <Text style={styles.modalTitle}>Wait! Before You Go</Text>
                  <Text style={styles.modalDescription}>
                    Are you sure you want to delete your account? Consider these options instead:
                  </Text>
                </View>
                
                <View style={styles.alternativeList}>
                  <TouchableOpacity 
                    style={styles.alternativeItem}
                    onPress={() => {
                      closeDeleteModal();
                      navigation.navigate("NotificationSettings");
                    }}
                  >
                    <Ionicons name="notifications-off-outline" size={20} color="#f9c349" />
                    <Text style={styles.alternativeText}>Turn off notifications</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.alternativeItem}
                    onPress={() => {
                      closeDeleteModal();
                      navigation.navigate("EditProfile");
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#f9c349" />
                    <Text style={styles.alternativeText}>Update your profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.alternativeItem}
                    onPress={() => {
                      closeDeleteModal();
                      navigation.navigate("HelpSupport");
                    }}
                  >
                    <Ionicons name="help-circle-outline" size={20} color="#f9c349" />
                    <Text style={styles.alternativeText}>Contact support</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Keep Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.continueButton}
                    onPress={handleNextStep}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>Still Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {deleteStep === 3 && (
              <>
                {/* Step 3: Final Confirmation */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconContainer, { backgroundColor: '#FFEBEE' }]}>
                    <MaterialCommunityIcons name="delete-forever" size={40} color="#FF5252" />
                  </View>
                  <Text style={[styles.modalTitle, { color: '#FF5252' }]}>
                    Final Confirmation
                  </Text>
                  <Text style={styles.modalDescription}>
                    This is your last chance. Type "delete my account" below to confirm.
                  </Text>
                </View>
                
                <TextInput
                  style={styles.confirmInput}
                  placeholder='Type "delete my account"'
                  placeholderTextColor="#999"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!deleting}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                    activeOpacity={0.7}
                    disabled={deleting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.deleteFinalButton,
                      confirmText.toLowerCase() === "delete my account" && styles.deleteFinalButtonActive,
                    ]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.deleteFinalButtonText}>Delete Permanently</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9c349',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userBadge: {
    backgroundColor: '#f9c34915',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f9c349',
  },
  
  // Settings Section
  settingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  
  // Danger Zone
  dangerSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  dangerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5252',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF525220',
    marginBottom: 10,
  },
  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FF525215',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5252',
  },
  deleteSubtitle: {
    fontSize: 11,
    color: '#FF525280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  
  // Version
  versionText: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 11,
    marginTop: 30,
    fontWeight: '500',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Warning List
  warningList: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    fontWeight: '500',
  },
  
  // Alternative List
  alternativeList: {
    marginBottom: 20,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Modal Buttons
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF5252',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Step 3
  confirmInput: {
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 20,
    fontWeight: '500',
  },
  deleteFinalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  deleteFinalButtonActive: {
    backgroundColor: '#FF5252',
  },
  deleteFinalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});