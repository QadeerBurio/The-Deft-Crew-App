// SettingsScreen.js — Complete
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

// 🆕 engagement
import StreakSheet from "../engagement/components/StreakSheet";
import { useStreak } from "../engagement/hooks/useStreak";
import { useTour } from "../engagement/tour/TourProvider";

import { color as T, font as F } from "../theme/tokens";
export default function SettingsScreen({ navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // 🆕 engagement state
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);
  const { examModeActive, examModeUntil } = useStreak();
  const { start: startTour } = useTour();

  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Delete modal ───────────────────────────────────────────────────────
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
    if (deleteStep === 1) setDeleteStep(2);
    else if (deleteStep === 2) setDeleteStep(3);
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
        headers: { Authorization: `Bearer ${token}` },
      });

      closeDeleteModal();
      setDeleting(false);

      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted. You will be logged out now.",
        [{ text: "OK", onPress: () => logout() }]
      );
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  // ── Replay the tour ────────────────────────────────────────────────────
  const handleReplayTour = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startTour();
      navigation.navigate("HomeTabs");
    } catch (e) {
      console.log("tour start error:", e?.message);
    }
  };

  // ── Settings rows ──────────────────────────────────────────────────────
  const settingsOptions = [
    {
      id: 1,
      icon: "person-outline",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      color: T.yellow,
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      id: 2,
      icon: "shield-checkmark-outline",
      title: "Privacy & Security",
      subtitle: "Manage your account security",
      color: T.success,
      onPress: () => navigation.navigate("PrivacySecurity"),
    },
    {
      id: 3,
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Configure your notification preferences",
      color: T.ink,
      onPress: () => navigation.navigate("NotificationSettings"),
    },
    {
      id: 4,
      icon: "refresh-outline",
      title: "Replay the Tour",
      subtitle: "See the app walkthrough again",
      color: T.ink,
      onPress: handleReplayTour,
    },
    {
      id: 5, // 🆕 exam mode row
      icon: "school-outline",
      title: "Exam Mode",
      subtitle:
        examModeActive && examModeUntil
          ? `On until ${examModeUntil}`
          : "Your streak waits while you study",
      color: T.yellow,
      badge: examModeActive ? "On" : "Off",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStreakSheetVisible(true);
      },
    },
    {
      id: 6,
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help with your account",
      color: "#FF9800",
      onPress: () => navigation.navigate("HelpSupport"),
    },
    {
      id: 7,
      icon: "information-circle-outline",
      title: "About tdc",
      subtitle: "Learn more about the app",
      color: "#9C27B0",
      onPress: () => navigation.navigate("About"),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>settings</Text>
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
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
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
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: option.color + "15" },
                ]}
              >
                <Ionicons name={option.icon} size={22} color={option.color} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{option.title}</Text>
                <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
              </View>
              {option.badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{option.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={T.textFaint} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerSectionTitle}>account actions</Text>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={openDeleteModal}
            activeOpacity={0.7}
          >
            <View style={styles.deleteIcon}>
              <MaterialCommunityIcons
                name="delete-forever-outline"
                size={22}
                color={T.danger}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.deleteTitle}>delete account</Text>
              <Text style={styles.deleteSubtitle}>
                Permanently remove your account and all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={T.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => logout() },
              ]);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={22} color={T.textMuted} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.logoutTitle}>logout</Text>
              <Text style={styles.settingSubtitle}>sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>tdc. v1.0.0 • Karachi, Pakistan</Text>
      </ScrollView>

      {/* 🆕 Streak Sheet (opened from Exam Mode row) */}
      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />

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
                transform: [{ scale: modalScale }, { translateX: shakeAnim }],
              },
            ]}
          >
            {deleteStep === 1 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={40}
                      color={T.danger}
                    />
                  </View>
                  <Text style={styles.modalTitle}>delete account?</Text>
                  <Text style={styles.modalDescription}>
                    This action cannot be undone. All your data including your
                    profile, connections, and activity will be permanently
                    deleted.
                  </Text>
                </View>

                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color={T.danger} />
                    <Text style={styles.warningText}>
                      your profile will be removed
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color={T.danger} />
                    <Text style={styles.warningText}>
                      all connections will be lost
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color={T.danger} />
                    <Text style={styles.warningText}>
                      referral history will be deleted
                    </Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleNextStep}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      { backgroundColor: T.yellowSoft },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="pause-circle"
                      size={40}
                      color="#FF9800"
                    />
                  </View>
                  <Text style={styles.modalTitle}>wait! before you go</Text>
                  <Text style={styles.modalDescription}>
                    Are you sure you want to delete your account? Consider
                    these options instead:
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
                    <Ionicons
                      name="notifications-off-outline"
                      size={20}
                      color={T.yellow}
                    />
                    <Text style={styles.alternativeText}>
                      turn off notifications
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.alternativeItem}
                    onPress={() => {
                      closeDeleteModal();
                      navigation.navigate("EditProfile");
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={T.yellow} />
                    <Text style={styles.alternativeText}>
                      update your profile
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.alternativeItem}
                    onPress={() => {
                      closeDeleteModal();
                      navigation.navigate("HelpSupport");
                    }}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={20}
                      color={T.yellow}
                    />
                    <Text style={styles.alternativeText}>contact support</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>keep account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleNextStep}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>still delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {deleteStep === 3 && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      { backgroundColor: T.dangerBg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="delete-forever"
                      size={40}
                      color={T.danger}
                    />
                  </View>
                  <Text style={[styles.modalTitle, { color: T.danger }]}>
                    final confirmation
                  </Text>
                  <Text style={styles.modalDescription}>
                    This is your last chance. Type "delete my account" below to
                    confirm.
                  </Text>
                </View>

                <TextInput
                  style={styles.confirmInput}
                  placeholder='Type "delete my account"'
                  placeholderTextColor={T.textFaint}
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
                    <Text style={styles.cancelButtonText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteFinalButton,
                      confirmText.toLowerCase() === "delete my account" &&
                        styles.deleteFinalButtonActive,
                    ]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color={T.white} size="small" />
                    ) : (
                      <Text style={styles.deleteFinalButtonText}>
                        delete permanently
                      </Text>
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
  container: { flex: 1, backgroundColor: T.paper },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.card,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
    letterSpacing: 0.5,
  },
  scrollContent: { paddingBottom: 40 },

  // User Card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.line,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: T.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  userInitial: { fontSize: 22, fontFamily: F.heading, color: T.yellow },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontFamily: F.bodyBold, color: T.ink },
  userEmail: { fontSize: 12, fontFamily: F.body, color: T.textFaint, marginTop: 2 },
  userBadge: {
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
  },
  userBadgeText: { fontSize: 11, fontFamily: F.bodyBold, color: T.yellow },

  // Settings Section
  settingsSection: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: T.line,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },
  settingSubtitle: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginTop: 2 },

  // 🆕 badge pill
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: T.yellowSoft,
    borderWidth: 1,
    borderColor: T.line,
  },
  badgePillText: {
    fontSize: 11,
    fontFamily: F.bodyBold,
    color: "#b8860b",
  },

  // Danger Zone
  dangerSection: { marginHorizontal: 16, marginTop: 24 },
  dangerSectionTitle: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.danger,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'none',
    letterSpacing: 1,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.danger,
    marginBottom: 10,
  },
  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deleteTitle: { fontSize: 14, fontFamily: F.bodySemi, color: T.danger },
  deleteSubtitle: { fontSize: 11, fontFamily: F.body, color: T.danger, marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.line,
  },
  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.sand,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoutTitle: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },

  versionText: {
    textAlign: "center",
    color: T.textFaint,
    fontSize: 11,
    marginTop: 30,
    fontFamily: F.bodyMedium,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: T.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: F.heading,
    color: T.ink,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  warningList: { marginBottom: 20 },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 13,
    color: T.textMuted,
    marginLeft: 10,
    fontFamily: F.bodyMedium,
  },
  alternativeList: { marginBottom: 20 },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: T.sand,
    borderRadius: 12,
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 13,
    color: T.ink,
    marginLeft: 12,
    fontFamily: F.bodyMedium,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: T.sand,
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 14, fontFamily: F.bodyBold, color: T.textMuted },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: T.danger,
    alignItems: "center",
  },
  continueButtonText: { fontSize: 14, fontFamily: F.bodyBold, color: T.white },
  confirmInput: {
    borderWidth: 2,
    borderColor: T.line,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: T.ink,
    marginBottom: 20,
    fontFamily: F.bodyMedium,
  },
  deleteFinalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: T.sand,
    alignItems: "center",
  },
  deleteFinalButtonActive: { backgroundColor: T.danger },
  deleteFinalButtonText: { fontSize: 14, fontFamily: F.bodyBold, color: T.white },
});