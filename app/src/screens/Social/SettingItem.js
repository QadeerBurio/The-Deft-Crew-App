// SettingsScreen.js - Modern Compact Design

import React, { useContext, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Animated,
  Image,
  Dimensions,
  Switch,
  Modal,
  ActivityIndicator,
  TextInput,
  Linking
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Modern Setting Item Component - Compact
const SettingItem = ({ icon, label, subLabel, color = "#1a1a1a", onPress, danger = false, badge, iconBg }) => {
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
        <View style={[styles.settingIconWrapper, { backgroundColor: iconBg || (danger ? '#FFEBEE' : '#F5F6FA') }]}>
          <Ionicons name={icon} size={18} color={danger ? '#F44336' : color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingLabel, danger && { color: '#F44336' }]}>{label}</Text>
          {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
        </View>
        {badge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#C5C7CC" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toggle Setting Item - Compact
const ToggleItem = ({ icon, label, subLabel, color = "#1a1a1a", value, onToggle, iconBg }) => {
  return (
    <TouchableOpacity 
      style={styles.settingRow} 
      onPress={onToggle}
      activeOpacity={0.6}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: iconBg || '#F5F6FA' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
      </View>
      <Switch
        trackColor={{ false: '#E8E9ED', true: '#f9c349' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#E8E9ED"
        onValueChange={onToggle}
        value={value}
        style={{ transform: [{ scale: 0.85 }] }}
      />
    </TouchableOpacity>
  );
};

// ==================== PRIVACY & SAFETY SCREEN ====================
const PrivacyAndSafetyScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fc" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.compactContent}>
        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>Privacy Controls</Text>
          <ToggleItem 
            icon="lock-closed-outline" 
            label="Private Account" 
            subLabel="Only connections can see your posts"
            color="#f9c349"
            iconBg="#FFF8E1"
            value={isPrivate}
            onToggle={() => setIsPrivate(!isPrivate)}
          />
          <ToggleItem 
            icon="eye-outline" 
            label="Show Online Status" 
            subLabel="Let others see when you're online"
            color="#f9c349"
            iconBg="#FFF8E1"
            value={showOnlineStatus}
            onToggle={() => setShowOnlineStatus(!showOnlineStatus)}
          />
          <ToggleItem 
            icon="time-outline" 
            label="Show Last Seen" 
            subLabel="Show when you were last active"
            color="#f9c349"
            iconBg="#FFF8E1"
            value={showLastSeen}
            onToggle={() => setShowLastSeen(!showLastSeen)}
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>Safety</Text>
          <SettingItem 
            icon="ban-outline" 
            label="Blocked Users" 
            subLabel="Manage your blocked list"
            color="#f9c349"
            iconBg="#FFF8E1"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingItem 
            icon="flag-outline" 
            label="Report History" 
            subLabel="View your past reports"
            color="#f9c349"
            iconBg="#FFF8E1"
            onPress={() => Alert.alert("Report History", "Your reports will appear here")}
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>Legal</Text>
          <SettingItem 
            icon="document-text-outline" 
            label="Privacy Policy" 
            subLabel="How we handle your data"
            color="#f9c349"
            iconBg="#FFF8E1"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingItem 
            icon="document-text-outline" 
            label="Terms & Conditions" 
            subLabel="Our terms and conditions"
            color="#f9c349"
            iconBg="#FFF8E1"
            onPress={() => navigation.navigate('TermsAndConditions')}
          />
          <SettingItem 
            icon="people-outline" 
            label="Community Guidelines" 
            subLabel="Our community standards"
            color="#f9c349"
            iconBg="#FFF8E1"
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

// ==================== MAIN SETTINGS SCREEN ====================
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
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fc1c" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.compactContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Profile Card - Compact */}
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
            <Animated.View style={{ transform: [{ scale: profileScale }], flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.profileAvatarCompact}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.profileAvatarImage} />
                ) : (
                  <Text style={styles.profileAvatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
                )}
              </LinearGradient>
              <View style={styles.profileInfoCompact}>
                <Text style={styles.profileNameCompact}>{user?.name || 'User'}</Text>
                <Text style={styles.profileEmailCompact}>{user?.email || 'user@email.com'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C5C7CC" />
            </Animated.View>
          </TouchableOpacity>

          {/* Settings Groups - All in One View */}
          <View style={styles.settingsGroup}>
            
            <SettingItem 
              icon="lock-closed-outline" 
              label="Change Password" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Privacy & Safety" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('PrivacyAndSafety')}
            />
           
    
            {/* <ToggleItem 
              icon="moon-outline" 
              label="Dark Mode" 
              color="#f9c349"
              iconBg="#FFF8E1"
              value={darkModeEnabled}
              onToggle={handleToggleDarkMode}
            />
            <ToggleItem 
              icon="notifications-outline" 
              label="Push Notifications" 
              color="#f9c349"
              iconBg="#FFF8E1"
              value={notificationsEnabled}
              onToggle={handleToggleNotification}
            /> */}

            <SettingItem 
              icon="help-circle-outline" 
              label="Help Center" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <SettingItem 
              icon="information-circle-outline" 
              label="About TDC" 
              subLabel="Version 2.0.1"
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('About')}
            />
          
            <SettingItem 
              icon="document-text-outline" 
              label="Terms & Conditions" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('Terrms')}
            />
            <SettingItem 
              icon="people-outline" 
              label="Community Guidelines" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('Guideline')}
            />
            
          
            <SettingItem 
              icon="ban-outline" 
              label="Blocked Users" 
              color="#f9c349"
              iconBg="#FFF8E1"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingItem 
              icon="log-out-outline" 
              label="Log Out" 
              color="#F44336"
              iconBg="#FFEBEE"
              danger
              onPress={handleLogoutPress}
            />
          </View>

          <View style={styles.footerCompact}>
            <Text style={styles.footerText}>© 2026 TDC. All rights reserved.</Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal transparent visible={showLogoutModal} animationType="none" onRequestClose={() => setShowLogoutModal(false)}>
        <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: modalAnim }] }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={28} color="#F44336" />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalSubtitle}>Choose how to proceed with your account</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={handleSignOut}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="exit-outline" size={22} color="#FF9800" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Sign Out</Text>
                <Text style={styles.modalOptionDesc}>Keep your data, just sign out</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalOption, styles.modalOptionDanger]} onPress={openDeleteModal}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={22} color="#F44336" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={[styles.modalOptionTitle, { color: '#F44336' }]}>Delete Account</Text>
                <Text style={[styles.modalOptionDesc, { color: '#F44336' }]}>Permanently delete all data</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="none" onRequestClose={closeDeleteModal}>
        <View style={styles.deleteModalOverlay}>
          <Animated.View style={[styles.deleteModalContent, { opacity: deleteModalOpacity, transform: [{ scale: deleteModalScale }, { translateX: shakeAnim }] }]}>
            {deleteStep === 1 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: '#FF475720' }]}>
                    <MaterialCommunityIcons name="alert-circle" size={36} color="#FF4757" />
                  </View>
                  <Text style={styles.deleteModalTitle}>Delete Account?</Text>
                  <Text style={styles.deleteModalDesc}>This action cannot be undone. All your data will be permanently deleted.</Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}><Ionicons name="close-circle" size={16} color="#FF4757" /><Text style={styles.warningText}>Profile removed</Text></View>
                  <View style={styles.warningItem}><Ionicons name="close-circle" size={16} color="#FF4757" /><Text style={styles.warningText}>All connections lost</Text></View>
                  <View style={styles.warningItem}><Ionicons name="close-circle" size={16} color="#FF4757" /><Text style={styles.warningText}>History deleted</Text></View>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.continueBtn} onPress={handleNextStep}><Text style={styles.continueBtnText}>Continue</Text></TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: '#FFD93D20' }]}>
                    <MaterialCommunityIcons name="pause-circle" size={36} color="#f9c349" />
                  </View>
                  <Text style={styles.deleteModalTitle}>Wait! Before You Go</Text>
                  <Text style={styles.deleteModalDesc}>Consider these options instead:</Text>
                </View>
                <View style={styles.alternativeList}>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Ionicons name="create-outline" size={18} color="#f9c349" />
                    <Text style={styles.alternativeText}>Update your profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Ionicons name="help-circle-outline" size={18} color="#f9c349" />
                    <Text style={styles.alternativeText}>Contact support</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal}><Text style={styles.cancelBtnText}>Keep Account</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.continueBtn, { backgroundColor: "#f9c349" }]} onPress={handleNextStep}>
                    <Text style={[styles.continueBtnText, { color: "#1A1A1A" }]}>Still Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 3 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: '#FF475720' }]}>
                    <MaterialCommunityIcons name="delete-forever" size={36} color="#FF4757" />
                  </View>
                  <Text style={[styles.deleteModalTitle, { color: '#FF4757' }]}>Final Confirmation</Text>
                  <Text style={styles.deleteModalDesc}>Type "delete my account" to confirm.</Text>
                </View>
                <TextInput style={styles.confirmInput} placeholder='Type "delete my account"' placeholderTextColor="#94A3B8" value={confirmText} onChangeText={setConfirmText} autoCapitalize="none" editable={!deleting} />
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal} disabled={deleting}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.deleteFinalBtn, confirmText.toLowerCase() === "delete my account" && styles.deleteFinalBtnActive]} onPress={handleDeleteAccount} disabled={deleting}>
                    {deleting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.deleteFinalBtnText}>Delete Permanently</Text>}
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fc" 
  },
  
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#f8f9fc',
  },
  headerBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1a1a', 
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
    fontWeight: '700',
    color: '#8E9098',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingLeft: 4,
  },
  
  // Profile Card Compact
  profileCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F1F5',
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
    fontWeight: '800',
    color: '#1a1a1a',
  },
  profileInfoCompact: {
    flex: 1,
    marginLeft: 12,
  },
  profileNameCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  profileEmailCompact: {
    fontSize: 12,
    color: '#8E9098',
    fontWeight: '500',
    marginTop: 1,
  },
  
  // Setting Row - Compact
  settingRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F6FA',
    backgroundColor: '#FFFFFF',
  },
  settingIconWrapper: { 
    width: 34, 
    height: 34, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  textContainer: { 
    flex: 1 
  },
  settingLabel: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settingSubLabel: { 
    fontSize: 11, 
    color: '#8E9098', 
    marginTop: 0, 
    fontWeight: '400' 
  },
  badgeContainer: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  
  footerCompact: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#B0B2B8',
    fontWeight: '400',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8E9098',
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
    backgroundColor: '#F8F9FC',
    marginBottom: 8,
  },
  modalOptionDanger: {
    backgroundColor: '#FFF5F5',
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
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalOptionDesc: {
    fontSize: 11,
    color: '#8E9098',
    fontWeight: '400',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },

  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  deleteModalHeader: { 
    alignItems: 'center', 
    marginBottom: 16,
  },
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
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  deleteModalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  warningList: { 
    marginBottom: 16,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
  alternativeList: { 
    marginBottom: 16,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  alternativeText: {
    fontSize: 12,
    color: '#1A1A1A',
    marginLeft: 10,
    fontWeight: '500',
  },
  deleteModalBtns: { 
    flexDirection: 'row', 
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#64748B',
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FF4757',
    alignItems: 'center',
  },
  continueBtnText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#FFFFFF',
  },
  confirmInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1A1A1A',
    marginBottom: 16,
    fontWeight: '500',
    backgroundColor: '#F8FAFC',
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
  },
  deleteFinalBtnActive: { 
    backgroundColor: '#FF4757',
  },
  deleteFinalBtnText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#FFFFFF',
  },
});