import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  BackHandler,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Icon from "react-native-vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// Modern Menu Item Component - Compact
const MenuItem = ({ item, index, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 500,
        delay: index * 50,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(itemSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: itemFade,
        transform: [{ translateY: itemSlide }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.menuItem,
          isLast && { borderBottomWidth: 0 },
          item.danger && styles.menuItemDanger,
        ]}
        onPress={item.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.6}
      >
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconBox, { backgroundColor: item.color + '15' }]}>
            <Icon name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuItemTitle, item.danger && { color: "#FF4757" }]}>
              {item.name}
            </Text>
            {item.subtitle && (
              <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.menuRight}>
          {item.rightText !== undefined && item.rightText !== null ? (
            <View style={styles.menuBadge}>
              <LinearGradient
                colors={["#f9c349", "#f9c349"]}
                style={styles.menuBadgeGradient}
              >
                <Text style={styles.menuBadgeText}>
                  {typeof item.rightText === 'number' && item.rightText > 99 
                    ? '99+' 
                    : item.rightText}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <Icon name="chevron-forward" size={16} color="#C5C7CC" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProfileScreen() {
  const { user, setUser, token, setToken } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigation = useNavigation();

  const [claimedOffers, setClaimedOffers] = useState([]);
  const [ecardModalVisible, setEcardModalVisible] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [redemptionCount, setRedemptionCount] = useState(0);

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Sign Out Modal States
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Animation References
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.7)).current;
  const menuFade = useRef(new Animated.Value(0)).current;

  // Delete Modal Animations
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sign Out Modal Animations
  const signOutModalScale = useRef(new Animated.Value(0.9)).current;
  const signOutModalOpacity = useRef(new Animated.Value(0)).current;

  const startEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      const [offersRes, savingsRes] = await Promise.all([
        api.get("/offers/claimed", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/offers/my-total-savings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setClaimedOffers(offersRes.data || []);
      setTotalSaved(savingsRes.data.totalSaved || 0);
      setRedemptionCount(savingsRes.data.redemptionCount || 0);
    } catch (err) {
      console.log("Error fetching profile data:", err);
      setTotalSaved(0);
      setRedemptionCount(0);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      startEntranceAnimations();
    }, [fetchProfileData, startEntranceAnimations])
  );

  useEffect(() => {
    const backAction = () => {
      if (ecardModalVisible) {
        setEcardModalVisible(false);
        return true;
      }
      if (showDeleteModal) {
        closeDeleteModal();
        return true;
      }
      if (showSignOutModal) {
        closeSignOutModal();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [ecardModalVisible, showDeleteModal, showSignOutModal]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedImage) return;
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const data = new FormData();
      const filename = selectedImage.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const type = match ? `image/${match[1]}` : "image";
      data.append("file", { uri: selectedImage, name: filename, type });
      data.append("upload_preset", "tdc_profiles");

      const uploadRes = await fetch(
        "https://api.cloudinary.com/v1_1/decaxpera/image/upload",
        { method: "POST", body: data }
      );
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
        Alert.alert("Upload Failed", "Image upload failed.");
        return;
      }

      const imageUrl = uploadData.secure_url;
      await api.post(
        "/profile/update-profile",
        { profileImage: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser((prev) => ({ ...prev, profileImage: imageUrl }));
      setSelectedImage(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Profile image updated!");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Sign Out Functions
  const openSignOutModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowSignOutModal(true);
    
    Animated.parallel([
      Animated.spring(signOutModalScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(signOutModalOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSignOutModal = () => {
    Animated.parallel([
      Animated.timing(signOutModalScale, {
        toValue: 0.9,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(signOutModalOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSignOutModal(false);
    });
  };

  const handleSignOut = () => {
    setUser(null);
    setToken(null);
    closeSignOutModal();
  };

  // Delete Account Functions
  const openDeleteModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteStep(1);
    setConfirmText("");
    setShowDeleteModal(true);

    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.9,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
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
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -4,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (deleteStep === 1) setDeleteStep(2);
    else if (deleteStep === 2) setDeleteStep(3);
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete my account") {
      handleShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", 'Please type "delete my account" to confirm.');
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
        "Your account has been permanently deleted.",
        [
          {
            text: "OK",
            onPress: () => {
              setUser(null);
              setToken(null);
            },
          },
        ]
      );
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const menuGroups = [
    {
      items: [
        {
          name: "Profile Details",
          subtitle: "View and edit your information",
          icon: "person-outline",
          color: "#f9c349",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("ProfileDetails");
          },
        },
        {
          name: "Membership Card",
          subtitle: "Access your digital TDC card",
          icon: "card-outline",
          color: "#A855F7",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEcardModalVisible(true);
          },
        },
        {
          name: "Loyalty Points",
          subtitle: "Your earned rewards balance",
          icon: "gift-outline",
          color: "#FF6B6B",
          rightText: "250",
          onPress: () =>
            Alert.alert("Coming Soon!", "We're building our rewards shop!"),
        },
        {
          name: "My Discounts",
          subtitle: "Track your savings and redemptions",
          icon: "pricetag-outline",
          color: "#4ECDC4",
          rightText: claimedOffers.length,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("MyDiscountScreen", {
              claimedOffers,
              totalSaved,
              redemptionCount,
            });
          },
        },
        {
          name: "Settings",
          subtitle: "App preferences and options",
          icon: "settings-outline",
          color: "#3B82F6",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("SettingsScreen");
          },
        },
        {
          name: "Sign Out",
          subtitle: "Log out of your account",
          icon: "log-out-outline",
          color: "#FF4757",
          onPress: openSignOutModal,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: headerFade,
            },
          ]}
        >
          <View style={styles.profileHeaderContent}>
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: avatarScale }] },
              ]}
            >
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#f9c349", "#e6b800"]}
                  style={styles.avatarRing}
                >
                  {selectedImage ? (
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.avatarImage}
                    />
                  ) : user?.profileImage ? (
                    <Image
                      source={{
                        uri: `${user.profileImage}?t=${Date.now()}`,
                      }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
                <View style={styles.cameraBadge}>
                  <LinearGradient
                    colors={["#f9c349", "#e6b800"]}
                    style={styles.cameraBadgeGradient}
                  >
                    <Icon name="camera" size={12} color="#1A1A1A" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Student"}</Text>
              <View style={styles.emailRow}>
                <Icon name="mail-outline" size={13} color="#94A3B8" />
                <Text style={styles.userEmail}>{user?.email || ""}</Text>
              </View>
              {selectedImage && (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={["#4ECDC4", "#44B39D"]}
                    style={styles.saveBtnGradient}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Icon name="checkmark-outline" size={14} color="#FFF" />
                        <Text style={styles.saveBtnText}>Save</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Stats Row - Compact & Smart */}
        <Animated.View
          style={[
            styles.statsRow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#FFD93D20" }]}>
              <Icon name="gift-outline" size={16} color="#f9c349" />
            </View>
            <Text style={styles.statLabel}>Used</Text>
            <Text style={[styles.statValue, { color: "#f9c349" }]}>
              {redemptionCount || 0}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#A855F720" }]}>
              <Icon name="card-outline" size={16} color="#A855F7" />
            </View>
            <Text style={styles.statLabel}>Discounts</Text>
            <Text style={[styles.statValue, { color: "#A855F7" }]}>
              {claimedOffers.length || 0}
            </Text>
          </View>
        </Animated.View>

        {/* Menu Section */}
        <Animated.View
          style={{
            opacity: menuFade,
          }}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuCard}>
              {menuGroups[0].items.map((item, iIdx) => (
                <MenuItem
                  key={iIdx}
                  item={item}
                  index={iIdx}
                  isLast={iIdx === menuGroups[0].items.length - 1}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        <Text style={styles.versionText}>Version 2.0.1</Text>
      </ScrollView>

      {/* Membership Card Modal */}
      <Modal
        visible={ecardModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEcardModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEcardModalVisible(false)}
        >
          <Pressable
            style={styles.membershipCard}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={["#1A1A1A", "#f9c349", "#1A1A1A"]}
              style={styles.membershipGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.cardTitle}>
                tdc<Text style={{ color: "#f9c349" }}>.</Text> PREMIUM
              </Text>
              <View style={styles.cardBody}>
                <View style={styles.diamondBox}>
                  <LinearGradient
                    colors={["#f9c349", "#e6b800"]}
                    style={styles.diamondGradient}
                  >
                    <Icon name="diamond" size={44} color="#1A1A1A" />
                  </LinearGradient>
                </View>
                <Text style={styles.cardPromoTitle}>Unlock Full Access</Text>
                <Text style={styles.cardPromoDesc}>
                  Get exclusive student discounts for just{" "}
                  <Text style={styles.priceHighlight}>750-Rs / year</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cardBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setEcardModalVisible(false);
                  navigation.navigate("Card");
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#f9c349", "#e6b800"]}
                  style={styles.cardBtnGradient}
                >
                  <Text style={styles.cardBtnText}>GET MEMBERSHIP</Text>
                  <Icon
                    name="arrow-forward"
                    size={18}
                    color="#1A1A1A"
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEcardModalVisible(false)}
                style={{ marginTop: 16 }}
              >
                <Text style={styles.maybeLater}>Maybe Later</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sign Out Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="none"
        onRequestClose={closeSignOutModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: signOutModalOpacity,
                transform: [{ scale: signOutModalScale }],
              },
            ]}
          >
            <View style={styles.modalIconContainer}>
              <MaterialCommunityIcons name="logout" size={32} color="#f9c349" />
            </View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeSignOutModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSignOut}
              >
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
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
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            {deleteStep === 1 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: "#FF475720" }]}>
                    <MaterialCommunityIcons name="alert-circle" size={36} color="#FF4757" />
                  </View>
                  <Text style={styles.modalTitle}>Delete Account?</Text>
                  <Text style={styles.modalDesc}>
                    This action cannot be undone. All your data will be permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color="#FF4757" />
                    <Text style={styles.warningText}>Profile removed</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color="#FF4757" />
                    <Text style={styles.warningText}>All connections lost</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color="#FF4757" />
                    <Text style={styles.warningText}>History deleted</Text>
                  </View>
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalDangerBtn} onPress={handleNextStep}>
                    <Text style={styles.modalDangerText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: "#FFD93D20" }]}>
                    <MaterialCommunityIcons name="pause-circle" size={36} color="#f9c349" />
                  </View>
                  <Text style={styles.modalTitle}>Wait! Before You Go</Text>
                  <Text style={styles.modalDesc}>Consider these options instead:</Text>
                </View>
                <View style={styles.alternativeList}>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Icon name="create-outline" size={18} color="#f9c349" />
                    <Text style={styles.alternativeText}>Update your profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Icon name="help-circle-outline" size={18} color="#f9c349" />
                    <Text style={styles.alternativeText}>Contact support</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.modalCancelText}>Keep Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: "#f9c349" }]} onPress={handleNextStep}>
                    <Text style={[styles.modalConfirmText, { color: "#1A1A1A" }]}>Still Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 3 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: "#FF475720" }]}>
                    <MaterialCommunityIcons name="delete-forever" size={36} color="#FF4757" />
                  </View>
                  <Text style={[styles.modalTitle, { color: "#FF4757" }]}>Final Confirmation</Text>
                  <Text style={styles.modalDesc}>Type "delete my account" to confirm.</Text>
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
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeleteModal} disabled={deleting}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalDangerBtn,
                      confirmText.toLowerCase() === "delete my account" && styles.modalDangerActive,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.modalDangerText}>Delete Permanently</Text>
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
    backgroundColor: "#F8FAFC",
  },
  scrollContent: { 
    paddingBottom: 40,
  },
  
  // Profile Header
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  profileHeaderContent: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  avatarContainer: {},
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { 
    width: 64, 
    height: 64, 
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { 
    fontSize: 28, 
    fontWeight: "800", 
    color: "#f9c349",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  cameraBadgeGradient: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { 
    marginLeft: 14, 
    flex: 1,
  },
  userName: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1A1A1A", 
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  emailRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 2, 
    gap: 6,
  },
  userEmail: { 
    fontSize: 12, 
    color: "#94A3B8", 
    fontWeight: "500",
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  saveBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    gap: 4,
  },
  saveBtnText: { 
    color: "#FFFFFF", 
    fontSize: 11, 
    fontWeight: "700",
  },
  
  // Stats Row - Compact
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  statItem: { 
    flex: 1, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginRight: 4,
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1A1A1A",
  },
  
  // Menu
  menuContainer: { 
    paddingHorizontal: 16, 
    marginTop: 12,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  menuItemDanger: {
    borderBottomColor: "rgba(255, 71, 87, 0.06)",
  },
  menuLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: { 
    flex: 1,
  },
  menuItemTitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "500",
  },
  menuRight: { 
    marginLeft: 8,
  },
  menuBadge: { 
    borderRadius: 10, 
    overflow: "hidden",
  },
  menuBadgeGradient: { 
    paddingHorizontal: 10, 
    paddingVertical: 3,
  },
  menuBadgeText: { 
    fontSize: 10, 
    fontWeight: "700", 
    color: "#1A1A1A",
  },
  
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 20,
    fontWeight: "500",
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
  },
  modalHeader: { 
    alignItems: "center", 
    marginBottom: 16,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD93D20",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  modalBtns: { 
    flexDirection: "row", 
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#64748B",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#f9c349",
    alignItems: "center",
  },
  modalConfirmText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FF4757",
    alignItems: "center",
  },
  modalDangerActive: { 
    backgroundColor: "#FF4757",
  },
  modalDangerText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },
  
  // Warning List
  warningList: { 
    marginBottom: 16,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  warningText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
    fontWeight: "500",
  },
  
  // Alternative List
  alternativeList: { 
    marginBottom: 16,
  },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  alternativeText: {
    fontSize: 12,
    color: "#1A1A1A",
    marginLeft: 10,
    fontWeight: "500",
  },
  
  // Confirm Input
  confirmInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#1A1A1A",
    marginBottom: 16,
    fontWeight: "500",
    backgroundColor: "#F8FAFC",
  },
  
  // Membership Card
  membershipCard: {
    width: width * 0.9,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
  },
  membershipGradient: {
    padding: 28,
    alignItems: "center",
    borderRadius: 28,
  },
  cardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "800",
    letterSpacing: 3,
    fontSize: 13,
    marginBottom: 24,
    textTransform: "uppercase",
  },
  cardBody: { 
    alignItems: "center", 
    marginBottom: 24,
  },
  diamondBox: { 
    marginBottom: 16,
  },
  diamondGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 13,
    paddingHorizontal: 8,
  },
  priceHighlight: { 
    color: "#f9c349", 
    fontWeight: "800",
  },
  cardBtn: { 
    borderRadius: 14, 
    overflow: "hidden", 
    width: "100%", 
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: { 
    color: "#1A1A1A", 
    fontWeight: "800", 
    fontSize: 14,
    letterSpacing: 0.5,
  },
  maybeLater: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontWeight: "500",
  },
});