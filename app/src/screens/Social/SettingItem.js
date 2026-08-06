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
  TextInput
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Modern Setting Item Component
const SettingItem = ({ icon, label, subLabel, color = "#1a1a1a", isLast = false, onPress, danger = false, badge }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ 
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }] 
    }}>
      <TouchableOpacity 
        style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.settingIconCircle, { backgroundColor: danger ? '#FFEBEE' : color + '15' }]}>
          <Ionicons name={icon} size={20} color={danger ? '#F44336' : color} />
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
        <Ionicons name="chevron-forward" size={18} color="#ddd" style={styles.chevronIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toggle Setting Item
const ToggleItem = ({ icon, label, subLabel, color = "#1a1a1a", isLast = false, value, onToggle }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ 
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }] 
    }}>
      <TouchableOpacity 
        style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]} 
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.settingIconCircle, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
        </View>
        <Switch
          trackColor={{ false: '#e0e0e0', true: '#f9c349' }}
          thumbColor={value ? '#ffffff' : '#ffffff'}
          ios_backgroundColor="#e0e0e0"
          onValueChange={onToggle}
          value={value}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { logout, user, deleteAccount, token } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete Account Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  
  // Delete Modal Animations
  const deleteModalScale = useRef(new Animated.Value(0.8)).current;
  const deleteModalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load saved preferences
    loadPreferences();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      const savedDarkMode = await AsyncStorage.getItem('darkModeEnabled');
      
      if (savedNotifications !== null) {
        setNotificationsEnabled(JSON.parse(savedNotifications));
      }
      if (savedDarkMode !== null) {
        setDarkModeEnabled(JSON.parse(savedDarkMode));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleToggleNotification = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    try {
      await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
      Alert.alert(
        "Notifications",
        newValue ? "Notifications enabled" : "Notifications disabled"
      );
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  const handleToggleDarkMode = async () => {
    const newValue = !darkModeEnabled;
    setDarkModeEnabled(newValue);
    try {
      await AsyncStorage.setItem('darkModeEnabled', JSON.stringify(newValue));
      Alert.alert(
        "Dark Mode",
        newValue ? "Dark mode enabled" : "Light mode enabled"
      );
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleSignOut = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  // Delete Account Functions
  const openDeleteModal = () => {
    setShowLogoutModal(false);
    setDeleteStep(1);
    setConfirmText("");
    setShowDeleteModal(true);

    Animated.parallel([
      Animated.spring(deleteModalScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(deleteModalOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteModalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(deleteModalOpacity, {
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
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
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
      
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to login or welcome screen
              navigation.navigate("Login");
            }
          }
        ]
      );
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const handleProfilePress = () => {
    Animated.sequence([
      Animated.spring(profileScale, { toValue: 0.92, friction: 5, useNativeDriver: true }),
      Animated.spring(profileScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate("YourAccount");
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerHandle} />
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Profile Card with Animation */}
          <Animated.View style={[styles.profileCard, { transform: [{ scale: profileScale }] }]}>
            <TouchableOpacity 
              style={styles.profileCardTouchable}
              onPress={handleProfilePress}
              activeOpacity={0.9}
            >
              <LinearGradient 
                colors={['#f9c349', '#e6b800']} 
                style={styles.profileAvatarRing}
              >
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarPlaceholder}>
                    <Text style={styles.profileAvatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.profileBadge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.profileBadgeText}>Active</Text>
                </View>
              </View>
              <View style={styles.profileArrow}>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.sectionCard, { opacity: cardFade }]}>
            
            
            <SettingItem 
              icon="lock-closed-outline" 
              label="Change Password" 
              subLabel="Update your login credentials"
              color="#f9c349"
              onPress={() => navigation.navigate("ChangePassword")}
            />
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Privacy & Safety" 
              subLabel="Control your visibility and data"
              color="#f9c349"
              isLast
              onPress={() => navigation.navigate("PrivacyAndSafety")}
            />
             <SettingItem 
              icon="help-circle-outline" 
              label="Help Center" 
              subLabel="Get help and learn about TDC"
              color="#f9c349"
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <SettingItem 
              icon="information-circle-outline" 
              label="About TDC" 
              subLabel="Version information and legal"
              color="#f9c349"
              isLast
              onPress={() => navigation.navigate("About")}
            />
          </Animated.View>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <Animated.View style={[styles.sectionCard, styles.logoutCard, { opacity: cardFade }]}>
              <SettingItem 
                icon="log-out-outline" 
                label="Log Out" 
                subLabel="Sign out or delete your account"
                color="#F44336"
                danger
                isLast
                onPress={handleLogoutPress}
              />
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <Text style={styles.footerLogoText}>tdc</Text>
              <Text style={styles.footerLogoDot}>.</Text>
            </View>
            
            <Text style={styles.footerCopyright}>© 2026 TDC. All rights reserved.</Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* Custom Logout Modal */}
      <Modal
        transparent
        visible={showLogoutModal}
        animationType="none"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: modalAnim }] }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="log-out-outline" size={32} color="#F44336" />
              </View>
              <Text style={styles.modalTitle}>Log Out</Text>
              <Text style={styles.modalSubtitle}>
                Choose how you want to proceed with your account
              </Text>
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleSignOut}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="exit-outline" size={24} color="#FF9800" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Sign Out</Text>
                <Text style={styles.modalOptionDescription}>
                  Sign out of your account and keep your data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalOption, styles.modalOptionDanger]}
              onPress={openDeleteModal}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={24} color="#F44336" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={[styles.modalOptionTitle, { color: '#F44336' }]}>
                  Delete Account Permanently
                </Text>
                <Text style={[styles.modalOptionDescription, { color: '#F44336' }]}>
                  Permanently delete all your data and account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F44336" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="none"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View
            style={[
              styles.deleteModalContent,
              {
                opacity: deleteModalOpacity,
                transform: [
                  { scale: deleteModalScale },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            {deleteStep === 1 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View style={[styles.deleteModalIcon, { backgroundColor: '#FF475720' }]}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={40}
                      color="#FF4757"
                    />
                  </View>
                  <Text style={styles.deleteModalTitle}>
                    Delete Account?
                  </Text>
                  <Text style={styles.deleteModalDesc}>
                    This action cannot be undone. All your data will be permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF4757" />
                    <Text style={styles.warningText}>
                      Your profile will be removed
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF4757" />
                    <Text style={styles.warningText}>
                      All connections will be lost
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Ionicons name="close-circle" size={18} color="#FF4757" />
                    <Text style={styles.warningText}>
                      Referral history will be deleted
                    </Text>
                  </View>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.continueBtnText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View
                    style={[
                      styles.deleteModalIcon,
                      { backgroundColor: '#FFD93D20' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="pause-circle"
                      size={40}
                      color="#f9c349"
                    />
                  </View>
                  <Text style={styles.deleteModalTitle}>
                    Wait! Before You Go
                  </Text>
                  <Text style={styles.deleteModalDesc}>
                    Consider these options instead:
                  </Text>
                </View>
                <View style={styles.alternativeList}>
                  <TouchableOpacity
                    style={styles.alternativeItem}
                    onPress={closeDeleteModal}
                  >
                    <Ionicons name="create-outline" size={20} color="#f9c349" />
                    <Text style={styles.alternativeText}>
                      Update your profile
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.alternativeItem}
                    onPress={closeDeleteModal}
                  >
                    <Ionicons name="help-circle-outline" size={20} color="#f9c349" />
                    <Text style={styles.alternativeText}>
                      Contact support
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.deleteModalBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.cancelBtnText}>Keep Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.continueBtn, { backgroundColor: "#f9c349" }]}
                    onPress={handleNextStep}
                  >
                    <Text style={[styles.continueBtnText, { color: "#1A1A1A" }]}>
                      Still Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 3 && (
              <>
                <View style={styles.deleteModalHeader}>
                  <View
                    style={[
                      styles.deleteModalIcon,
                      { backgroundColor: '#FF475720' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="delete-forever"
                      size={40}
                      color="#FF4757"
                    />
                  </View>
                  <Text
                    style={[
                      styles.deleteModalTitle,
                      { color: '#FF4757' },
                    ]}
                  >
                    Final Confirmation
                  </Text>
                  <Text style={styles.deleteModalDesc}>
                    Type "delete my account" to confirm.
                  </Text>
                </View>
                <TextInput
                  style={styles.confirmInput}
                  placeholder='Type "delete my account"'
                  placeholderTextColor="#94A3B8"
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
                    <Text style={styles.cancelBtnText}>Cancel</Text>
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
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.deleteFinalBtnText}>
                        Delete Permanently
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
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fc" 
  },
  
  // Header
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    backgroundColor: '#fff'
  },
  headerBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f5f6f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    letterSpacing: 0.3 
  },
  headerHandle: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#f9c349',
    marginTop: 4,
  },
  
  content: { 
    flex: 1 
  },
  contentContainer: {
    paddingBottom: 20,
  },
  
  // Profile Card
  profileCard: {
    marginHorizontal: 16, 
    marginTop: 16,
    backgroundColor: '#fff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  profileCardTouchable: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
  },
  profileAvatarRing: { 
    width: 54, 
    height: 54, 
    borderRadius: 54, 
    padding: 2, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 48 
  },
  profileAvatarPlaceholder: { 
    width: 48, 
    height: 48, 
    borderRadius: 48, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileAvatarText: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#f9c349' 
  },
  profileInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  profileName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1a1a1a' 
  },
  profileEmail: { 
    fontSize: 12, 
    color: '#999', 
    fontWeight: '500', 
    marginTop: 1 
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  profileBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  profileArrow: {
    marginLeft: 4,
  },
  
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#888', 
    marginHorizontal: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  
  // Section Card
  sectionCard: { 
    marginHorizontal: 16, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f0f0f0', 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop:10
  },
  
  // Setting Row
  settingRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: '#f5f5f5'
  },
  settingIconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
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
    color: '#999', 
    marginTop: 1, 
    fontWeight: '400' 
  },
  chevronIcon: {
    marginLeft: 4,
  },
  badgeContainer: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Logout Section
  logoutSection: {
    marginTop: 16,
  },
  logoutCard: {
    borderColor: '#FFEBEE',
    borderWidth: 1.5,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 10,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  footerLogoDot: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f9c349',
  },
  footerVersion: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginTop: 4,
  },
  footerCopyright: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '400',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontWeight: '400',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fc',
    marginBottom: 12,
  },
  modalOptionDanger: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  modalOptionDescription: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  modalCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f6f8',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },

  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  deleteModalHeader: { 
    alignItems: 'center', 
    marginBottom: 20,
  },
  deleteModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  deleteModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
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
    color: '#64748B',
    marginLeft: 10,
    fontWeight: '500',
  },
  alternativeList: { 
    marginBottom: 20,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  alternativeText: {
    fontSize: 13,
    color: '#1A1A1A',
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteModalBtns: { 
    flexDirection: 'row', 
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748B',
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FF4757',
    alignItems: 'center',
  },
  continueBtnText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FFFFFF',
  },
  confirmInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 20,
    fontWeight: '500',
    backgroundColor: '#F8FAFC',
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
  },
  deleteFinalBtnActive: { 
    backgroundColor: '#FF4757',
  },
  deleteFinalBtnText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FFFFFF',
  },
});