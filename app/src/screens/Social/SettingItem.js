// SettingsScreen.js - Modern Compact Design
import React, { useContext, useRef, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Platform, Alert, Animated, Image, Dimensions, Switch, Modal,
  ActivityIndicator, TextInput, Linking,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 🆕 engagement — Tour + Streak
import { useTour } from '../../engagement/tour/TourProvider';
import StreakSheet from '../../engagement/components/StreakSheet';
import { useStreak } from '../../engagement/hooks/useStreak';

import { color as T, font as F } from "../../theme/tokens";
const { width } = Dimensions.get('window');

// ── SettingItem ────────────────────────────────────────────────────────────
const SettingItem = ({ icon, label, subLabel, color = T.ink, onPress, danger = false, badge, iconBg }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.6}
      >
        <View style={[styles.settingIconWrapper, { backgroundColor: iconBg || (danger ? T.dangerBg : T.sand) }]}>
          <Ionicons name={icon} size={18} color={danger ? T.danger : color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingLabel, danger && { color: T.danger }]}>{label}</Text>
          {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
        </View>
        {badge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── ToggleItem ─────────────────────────────────────────────────────────────
const ToggleItem = ({ icon, label, subLabel, color = T.ink, value, onToggle, iconBg }) => {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onToggle} activeOpacity={0.6}>
      <View style={[styles.settingIconWrapper, { backgroundColor: iconBg || T.sand }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
      </View>
      <Switch
        trackColor={{ false: T.sand, true: T.yellow }}
        thumbColor={T.white}
        ios_backgroundColor={T.sand}
        onValueChange={onToggle}
        value={value}
        style={{ transform: [{ scale: 0.85 }] }}
      />
    </TouchableOpacity>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// PRIVACY & SAFETY SCREEN
// ══════════════════════════════════════════════════════════════════════════
const PrivacyAndSafetyScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>privacy & safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.compactContent}>
        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>privacy controls</Text>
          <ToggleItem
            icon="lock-closed-outline"
            label="Private Account"
            subLabel="Only connections can see your posts"
            color={T.yellow}
            iconBg={T.yellowSoft}
            value={isPrivate}
            onToggle={() => setIsPrivate(!isPrivate)}
          />
          <ToggleItem
            icon="eye-outline"
            label="Show Online Status"
            subLabel="Let others see when you're online"
            color={T.yellow}
            iconBg={T.yellowSoft}
            value={showOnlineStatus}
            onToggle={() => setShowOnlineStatus(!showOnlineStatus)}
          />
          <ToggleItem
            icon="time-outline"
            label="Show Last Seen"
            subLabel="Show when you were last active"
            color={T.yellow}
            iconBg={T.yellowSoft}
            value={showLastSeen}
            onToggle={() => setShowLastSeen(!showLastSeen)}
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>safety</Text>
          <SettingItem
            icon="ban-outline"
            label="Blocked Users"
            subLabel="Manage your blocked list"
            color={T.yellow}
            iconBg={T.yellowSoft}
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingItem
            icon="flag-outline"
            label="Report History"
            subLabel="View your past reports"
            color={T.yellow}
            iconBg={T.yellowSoft}
            onPress={() => Alert.alert("Report History", "Your reports will appear here")}
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>legal</Text>
          <SettingItem
            icon="document-text-outline"
            label="Privacy Policy"
            subLabel="How we handle your data"
            color={T.yellow}
            iconBg={T.yellowSoft}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingItem
            icon="document-text-outline"
            label="Terms & Conditions"
            subLabel="Our terms and conditions"
            color={T.yellow}
            iconBg={T.yellowSoft}
            onPress={() => navigation.navigate('TermsAndConditions')}
          />
          <SettingItem
            icon="people-outline"
            label="Community Guidelines"
            subLabel="Our community standards"
            color={T.yellow}
            iconBg={T.yellowSoft}
            onPress={() => navigation.navigate('CommunityGuidelines')}
          />
        </View>

        <View style={styles.footerCompact}>
          <Text style={styles.footerText}>© 2026 TDC</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS SCREEN
// ══════════════════════════════════════════════════════════════════════════
export default function SettingsScreen({ navigation }) {
  const { logout, user, deleteAccount } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const deleteModalScale = useRef(new Animated.Value(0.9)).current;
  const deleteModalOpacity = useRef(new Animated.Value(0)).current;

  // 🆕 tour + streak
  const { start: startTour } = useTour();
  const { examModeActive, examModeUntil } = useStreak();
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);

  useEffect(() => {
    loadPreferences();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      const savedDarkMode = await AsyncStorage.getItem('darkModeEnabled');
      if (savedNotifications !== null) setNotificationsEnabled(JSON.parse(savedNotifications));
      if (savedDarkMode !== null) setDarkModeEnabled(JSON.parse(savedDarkMode));
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleToggleNotification = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
  };

  const handleToggleDarkMode = async () => {
    const newValue = !darkModeEnabled;
    setDarkModeEnabled(newValue);
    await AsyncStorage.setItem('darkModeEnabled', JSON.stringify(newValue));
  };

  // 🆕 Replay the tour
  const handleReplayTour = () => {
    try {
      startTour();
      navigation.navigate('HomeTabs');
    } catch (e) {
      console.log('tour start error:', e?.message);
    }
  };

  // 🆕 Open streak sheet from Exam Mode row
  const handleExamModePress = () => {
    setStreakSheetVisible(true);
  };

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
    Animated.spring(modalAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handleSignOut = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  const openDeleteModal = () => {
    setShowLogoutModal(false);
    setDeleteStep(1);
    setConfirmText("");
    setShowDeleteModal(true);
    Animated.parallel([
      Animated.spring(deleteModalScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.timing(deleteModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteModalScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      Animated.timing(deleteModalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowDeleteModal(false);
      setDeleteStep(1);
      setConfirmText("");
    });
  };

  const handleShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNextStep = () => {
    if (deleteStep === 1) setDeleteStep(2);
    else if (deleteStep === 2) setDeleteStep(3);
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete my account") {
      handleShake();
      Alert.alert("Error", 'Please type "delete my account" to confirm.');
      return;
    }
    try {
      setDeleting(true);
      await deleteAccount();
      closeDeleteModal();
      setDeleting(false);
      Alert.alert("Account Deleted", "Your account has been permanently deleted.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.compactContent}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Profile Card */}
          <TouchableOpacity
            style={styles.profileCardCompact}
            onPress={() => {
              Animated.sequence([
                Animated.spring(profileScale, { toValue: 0.95, friction: 5, useNativeDriver: true }),
                Animated.spring(profileScale, { toValue: 1, friction: 5, useNativeDriver: true }),
              ]).start(() => navigation.navigate("YourAccount"));
            }}
            activeOpacity={0.7}
          >
            <Animated.View
              style={{
                transform: [{ scale: profileScale }],
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <LinearGradient colors={[T.yellow, '#e6b800']} style={styles.profileAvatarCompact}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.profileAvatarImage} />
                ) : (
                  <Text style={styles.profileAvatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                )}
              </LinearGradient>
              <View style={styles.profileInfoCompact}>
                <Text style={styles.profileNameCompact}>{user?.name || 'User'}</Text>
                <Text style={styles.profileEmailCompact}>{user?.email || 'user@email.com'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
            </Animated.View>
          </TouchableOpacity>

          {/* Settings Group */}
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="lock-closed-outline"
              label="Change Password"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              label="Privacy & Safety"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('PrivacyAndSafety')}
            />
            <SettingItem
              icon="notifications-outline"
              color={T.ink}
              iconBg={T.sand}
              label="Notifications"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <SettingItem
              icon="refresh-outline"
              color={T.ink}
              iconBg={T.sand}
              label="Replay the Tour"
              subLabel="See the app walkthrough again"
              onPress={handleReplayTour}
            />

            {/* 🆕 EXAM MODE ROW */}
            <SettingItem
              icon="school-outline"
              label="Exam Mode"
              subLabel={
                examModeActive && examModeUntil
                  ? `On until ${examModeUntil}`
                  : 'Your streak waits while you study'
              }
              color={T.yellow}
              iconBg={T.yellowSoft}
              badge={examModeActive ? 'On' : 'Off'}
              onPress={handleExamModePress}
            />

            <SettingItem
              icon="help-circle-outline"
              label="Help Center"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <SettingItem
              icon="information-circle-outline"
              label="About TDC"
              subLabel="Version 2.0.1"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('About')}
            />
            <SettingItem
              icon="document-text-outline"
              label="Terms & Conditions"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('Terrms')}
            />
            <SettingItem
              icon="people-outline"
              label="Community Guidelines"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('Guideline')}
            />
            <SettingItem
              icon="ban-outline"
              label="Blocked Users"
              color={T.yellow}
              iconBg={T.yellowSoft}
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              color={T.danger}
              iconBg={T.dangerBg}
              danger
              onPress={handleLogoutPress}
            />
          </View>

          <View style={styles.footerCompact}>
            <Text style={styles.footerText}>© 2026 TDC. All rights reserved.</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* 🆕 StreakSheet — opens from Exam Mode row */}
      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />

      {/* Logout Modal */}
      <Modal transparent visible={showLogoutModal} animationType="none" onRequestClose={() => setShowLogoutModal(false)}>
        <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: modalAnim }] }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={28} color={T.danger} />
            </View>
            <Text style={styles.modalTitle}>log out</Text>
            <Text style={styles.modalSubtitle}>Choose how to proceed with your account</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handleSignOut}>
              <View style={[styles.modalOptionIcon, { backgroundColor: T.yellowSoft }]}>
                <Ionicons name="exit-outline" size={22} color="#FF9800" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>sign out</Text>
                <Text style={styles.modalOptionDesc}>Keep your data, just sign out</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalOption, styles.modalOptionDanger]} onPress={openDeleteModal}>
              <View style={[styles.modalOptionIcon, { backgroundColor: T.dangerBg }]}>
                <Ionicons name="trash-outline" size={22} color={T.danger} />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={[styles.modalOptionTitle, { color: T.danger }]}>delete account</Text>
                <Text style={[styles.modalOptionDesc, { color: T.danger }]}>
                  permanently delete all data
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalCancelText}>cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="none" onRequestClose={closeDeleteModal}>
        <View style={styles.deleteModalOverlay}>
          <Animated.View
            style={[
              styles.deleteModalContent,
              {
                opacity: deleteModalOpacity,
                transform: [{ scale: deleteModalScale }, { translateX: shakeAnim }],
              },
            ]}
          >
            {deleteStep === 1 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: T.dangerBg }]}>
                    <MaterialCommunityIcons name="alert-circle" size={36} color={T.danger} />
                  </View>
                  <Text style={styles.deleteModalTitle}>delete account?</Text>
                  <Text style={styles.deleteModalDesc}>
                    This action cannot be undone. All your data will be permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>profile removed</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>all connections lost</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>history deleted</Text>
                  </View>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.cancelBtnText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.continueBtn} onPress={handleNextStep}>
                    <Text style={styles.continueBtnText}>continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: '#FFD93D20' }]}>
                    <MaterialCommunityIcons name="pause-circle" size={36} color={T.yellow} />
                  </View>
                  <Text style={styles.deleteModalTitle}>wait! before you go</Text>
                  <Text style={styles.deleteModalDesc}>consider these options instead:</Text>
                </View>
                <View style={styles.alternativeList}>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Ionicons name="create-outline" size={18} color={T.yellow} />
                    <Text style={styles.alternativeText}>update your profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Ionicons name="help-circle-outline" size={18} color={T.yellow} />
                    <Text style={styles.alternativeText}>contact support</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.cancelBtnText}>keep account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.continueBtn, { backgroundColor: T.yellow }]}
                    onPress={handleNextStep}
                  >
                    <Text style={[styles.continueBtnText, { color: T.ink }]}>
                      still delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 3 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: T.dangerBg }]}>
                    <MaterialCommunityIcons name="delete-forever" size={36} color={T.danger} />
                  </View>
                  <Text style={[styles.deleteModalTitle, { color: T.danger }]}>
                    final confirmation
                  </Text>
                  <Text style={styles.deleteModalDesc}>
                    Type "delete my account" to confirm.
                  </Text>
                </View>
                <TextInput
                  style={styles.confirmInput}
                  placeholder='Type "delete my account"'
                  placeholderTextColor={T.textFaint}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  editable={!deleting}
                />
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeDeleteModal}
                    disabled={deleting}
                  >
                    <Text style={styles.cancelBtnText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteFinalBtn,
                      confirmText.toLowerCase() === "delete my account" &&
                        styles.deleteFinalBtnActive,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color={T.white} size="small" />
                    ) : (
                      <Text style={styles.deleteFinalBtnText}>delete permanently</Text>
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

export { PrivacyAndSafetyScreen };

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.sand,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    letterSpacing: -0.3,
  },

  compactContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  settingsGroup: {
    marginTop: 16,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: 'none',
    marginBottom: 6,
    paddingLeft: 4,
  },

  // Profile Card
  profileCardCompact: {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  profileAvatarCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileAvatarText: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
  },
  profileInfoCompact: {
    flex: 1,
    marginLeft: 12,
  },
  profileNameCompact: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: -0.2,
  },
  profileEmailCompact: {
    fontSize: 12,
    color: T.textMuted,
    fontFamily: F.bodyMedium,
    marginTop: 1,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.card,
  },
  settingIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  settingLabel: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  settingSubLabel: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 0,
    fontFamily: F.body,
  },
  badgeContainer: {
    backgroundColor: T.yellow,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: F.bodyBold,
    color: T.ink,
  },

  footerCompact: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: T.textFaint,
    fontFamily: F.body,
  },

  // Logout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: T.sand,
    marginBottom: 8,
  },
  modalOptionDanger: {
    backgroundColor: T.dangerBg,
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  modalOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionContent: { flex: 1 },
  modalOptionTitle: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  modalOptionDesc: {
    fontSize: 11,
    color: T.textMuted,
    fontFamily: F.body,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: T.sand,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.textMuted,
  },

  // Delete Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteModalHeader: { alignItems: 'center', marginBottom: 16 },
  deleteModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    marginBottom: 4,
  },
  deleteModalDesc: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  warningList: { marginBottom: 16 },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 12,
    color: T.textMuted,
    marginLeft: 8,
    fontFamily: F.bodyMedium,
  },
  alternativeList: { marginBottom: 16 },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: T.sand,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: T.line,
  },
  alternativeText: {
    fontSize: 12,
    color: T.ink,
    marginLeft: 10,
    fontFamily: F.bodyMedium,
  },
  deleteModalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: T.paper,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.textMuted,
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: T.danger,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.white,
  },
  confirmInput: {
    borderWidth: 1.5,
    borderColor: T.line,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: T.ink,
    marginBottom: 16,
    fontFamily: F.bodyMedium,
    backgroundColor: T.sand,
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: T.sand,
    alignItems: 'center',
  },
  deleteFinalBtnActive: { backgroundColor: T.danger },
  deleteFinalBtnText: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.white,
  },
});