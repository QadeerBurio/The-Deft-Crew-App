// app/src/screens/ProfileScreen.js
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
  Share,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Icon from "react-native-vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import * as Haptics from "expo-haptics";

// 🆕 engagement
import { useEngagement } from '../engagement/hooks/useEngagement';
import SavingsCounter from '../engagement/components/SavingsCounter';
import BadgeShelf from '../engagement/components/BadgeShelf';
import StreakChip from '../engagement/components/StreakChip';
import StreakSheet from '../engagement/components/StreakSheet';

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

// ─── Modern Menu Item ────────────────────────────────────────────────────────
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
            <Text style={[styles.menuItemTitle, item.danger && { color: T.danger }]}>
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
                colors={[T.yellow, T.yellow]}
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
            <Icon name="chevron-forward" size={16} color={T.textFaint} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, setUser, token, setToken, logout } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigation = useNavigation();

  const [claimedOffers, setClaimedOffers] = useState([]);
  const [ecardModalVisible, setEcardModalVisible] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [redemptionCount, setRedemptionCount] = useState(0);

  // 🆕 engagement state
  const { me, refresh } = useEngagement();
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);

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

  // ─── Entrance animations ───────────────────────────────────────────────
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

  // ─── Fetch discount data ───────────────────────────────────────────────
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

  // ─── Focus effect — refresh data on screen focus ───────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      startEntranceAnimations();
      if (refresh) refresh();
    }, [fetchProfileData, startEntranceAnimations, refresh])
  );

  // ─── Sync totalSaved from engagement data ─────────────────────────────
  useEffect(() => {
    if (me?.stats?.totalSaved !== undefined) {
      setTotalSaved(me.stats.totalSaved);
    }
  }, [me?.stats?.totalSaved]);

  // ─── Android back handler ─────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      if (ecardModalVisible) return (setEcardModalVisible(false), true);
      if (showDeleteModal) return (closeDeleteModal(), true);
      if (showSignOutModal) return (closeSignOutModal(), true);
      if (streakSheetVisible) return (setStreakSheetVisible(false), true);
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [ecardModalVisible, showDeleteModal, showSignOutModal, streakSheetVisible]);

  // ─── Image picker ──────────────────────────────────────────────────────
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

  // ─── Save profile image ────────────────────────────────────────────────
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

  // ─── Sign Out ──────────────────────────────────────────────────────────
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
    ]).start(() => setShowSignOutModal(false));
  };

  const handleSignOut = async () => {
    setUser(null);
    setToken(null);
    closeSignOutModal();
    await logout();
  };

  // ─── Delete Account ────────────────────────────────────────────────────
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
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
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
      Alert.alert("Account Deleted", "Your account has been permanently deleted.", [
        { text: "OK", onPress: () => { setUser(null); setToken(null); } },
      ]);
    } catch (error) {
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  // ─── Share savings ─────────────────────────────────────────────────────
  const handleShareSavings = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const message = `I've saved Rs. ${totalSaved.toLocaleString()} using TDC! 🎉 Join me and start saving on student discounts today.`;
      await Share.share({ message, title: 'My TDC Savings' });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  // ─── Menu items ────────────────────────────────────────────────────────
  const menuGroups = [
    {
      items: [
        {
          name: "profile details",
          subtitle: "view and edit your info",
          icon: "person-outline",
          color: T.ink,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("ProfileDetails");
          },
        },
        // {
        //   name: "Membership Card",
        //   subtitle: "Access your digital TDC card",
        //   icon: "card-outline",
        //   color: "#A855F7",
        //   onPress: () => {
        //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        //     setEcardModalVisible(true);
        //   },
        // },
        {
          name: "crew points",
          subtitle: "your rewards balance",
          icon: "gift-outline",
          color: T.ink,
          rightText: (me?.points?.balance || 0).toLocaleString(),
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Rewards');
          },
        },
        {
          name: "badges",
          subtitle: "your collection",
          icon: "ribbon-outline",
          color: T.ink,
          rightText: `${me?.badges?.earned || 0}/${me?.badges?.total || 17}`,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Badges');
          },
        },
        {
          name: "my discounts",
          subtitle: "codes, qr and redemptions",
          icon: "pricetag-outline",
          color: T.ink,
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
          name: "settings",
          subtitle: "notifications, privacy, account",
          icon: "settings-outline",
          color: T.ink,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("SettingsScreen");
          },
        },
        {
          name: "sign out",
          subtitle: "log out of your account",
          icon: "log-out-outline",
          color: T.danger,
          onPress: openSignOutModal,
          danger: true,
        },
      ],
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Header ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.profileHeader,
            { opacity: headerFade },
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
                  colors={[T.yellow, "#e6b800"]}
                  style={styles.avatarRing}
                >
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.avatarImage} />
                  ) : user?.profileImage ? (
                    <Image
                      source={{ uri: `${user.profileImage}?t=${Date.now()}` }}
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
                    colors={[T.yellow, "#e6b800"]}
                    style={styles.cameraBadgeGradient}
                  >
                    <Icon name="camera" size={12} color={T.ink} />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Student"}</Text>
              <View style={styles.emailRow}>
                <Icon name="mail-outline" size={13} color={T.textFaint} />
                <Text style={styles.userEmail}>{user?.email || ""}</Text>
              </View>

              {/* 🆕 Streak chip */}
              <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
                <StreakChip onPress={() => setStreakSheetVisible(true)} />
              </View>

              {/* 🆕 Badge shelf */}
              <View style={{ marginTop: 8 }}>
                <BadgeShelf
                  max={4}
                  compact
                  onSeeAll={() => navigation.navigate('Badges')}
                />
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
                      <ActivityIndicator size="small" color={T.white} />
                    ) : (
                      <>
                        <Icon name="checkmark-outline" size={14} color={T.white} />
                        <Text style={styles.saveBtnText}>save</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* 🆕 Savings counter */}
        <SavingsCounter onShare={handleShareSavings} />

        {/* ── Stats Row ──────────────────────────────────────────────── */}
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
            <Text style={styles.statValue}>
              {redemptionCount || 0}
            </Text>
            <Text style={styles.statLabel}>used</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {claimedOffers.length || 0}
            </Text>
            <Text style={styles.statLabel}>discounts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {me?.missions?.sortedCount || 0}/8
            </Text>
            <Text style={styles.statLabel}>sorted</Text>
          </View>
        </Animated.View>

        {/* ── Menu Section ───────────────────────────────────────────── */}
        <Animated.View style={{ opacity: menuFade }}>
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

      {/* ── Membership Card Modal ──────────────────────────────────────── */}
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
              colors={[T.ink, T.yellow, T.ink]}
              style={styles.membershipGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.cardTitle}>
                tdc<Text style={{ color: T.yellow }}>.</Text> premium
              </Text>
              <View style={styles.cardBody}>
                <View style={styles.diamondBox}>
                  <LinearGradient
                    colors={[T.yellow, "#e6b800"]}
                    style={styles.diamondGradient}
                  >
                    <Icon name="diamond" size={44} color={T.ink} />
                  </LinearGradient>
                </View>
                <Text style={styles.cardPromoTitle}>unlock full access</Text>
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
                  colors={[T.yellow, "#e6b800"]}
                  style={styles.cardBtnGradient}
                >
                  <Text style={styles.cardBtnText}>get membership</Text>
                  <Icon
                    name="arrow-forward"
                    size={18}
                    color={T.ink}
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEcardModalVisible(false)}
                style={{ marginTop: 16 }}
              >
                <Text style={styles.maybeLater}>maybe later</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Sign Out Modal ────────────────────────────────────────────── */}
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
              <MaterialCommunityIcons name="logout" size={32} color={T.yellow} />
            </View>
            <Text style={styles.modalTitle}>sign out?</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeSignOutModal}
              >
                <Text style={styles.modalCancelText}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSignOut}
              >
                <Text style={styles.modalConfirmText}>sign out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Delete Account Modal ──────────────────────────────────────── */}
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
                transform: [{ scale: modalScale }, { translateX: shakeAnim }],
              },
            ]}
          >
            {deleteStep === 1 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: T.dangerBg }]}>
                    <MaterialCommunityIcons name="alert-circle" size={36} color={T.danger} />
                  </View>
                  <Text style={styles.modalTitle}>delete account?</Text>
                  <Text style={styles.modalDesc}>
                    This action cannot be undone. All your data will be permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>profile removed</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>all connections lost</Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon name="close-circle" size={16} color={T.danger} />
                    <Text style={styles.warningText}>history deleted</Text>
                  </View>
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.modalCancelText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalDangerBtn} onPress={handleNextStep}>
                    <Text style={styles.modalDangerText}>continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: "#FFD93D20" }]}>
                    <MaterialCommunityIcons name="pause-circle" size={36} color={T.yellow} />
                  </View>
                  <Text style={styles.modalTitle}>wait! before you go</Text>
                  <Text style={styles.modalDesc}>consider these options instead:</Text>
                </View>
                <View style={styles.alternativeList}>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Icon name="create-outline" size={18} color={T.yellow} />
                    <Text style={styles.alternativeText}>update your profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.alternativeItem} onPress={closeDeleteModal}>
                    <Icon name="help-circle-outline" size={18} color={T.yellow} />
                    <Text style={styles.alternativeText}>contact support</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeleteModal}>
                    <Text style={styles.modalCancelText}>keep account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: T.yellow }]}
                    onPress={handleNextStep}
                  >
                    <Text style={[styles.modalConfirmText, { color: T.ink }]}>
                      still delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {deleteStep === 3 && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: T.dangerBg }]}>
                    <MaterialCommunityIcons name="delete-forever" size={36} color={T.danger} />
                  </View>
                  <Text style={[styles.modalTitle, { color: T.danger }]}>
                    final confirmation
                  </Text>
                  <Text style={styles.modalDesc}>
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
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={closeDeleteModal}
                    disabled={deleting}
                  >
                    <Text style={styles.modalCancelText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalDangerBtn,
                      confirmText.toLowerCase() === "delete my account" &&
                        styles.modalDangerActive,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color={T.white} size="small" />
                    ) : (
                      <Text style={styles.modalDangerText}>delete permanently</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* 🆕 Streak Sheet */}
      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  scrollContent: { paddingBottom: 40 },

  // Profile Header
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  profileHeaderContent: { flexDirection: "row", alignItems: "flex-start" },
  avatarContainer: {},
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontFamily: F.heading, color: T.yellow },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: T.white,
  },
  cameraBadgeGradient: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { marginLeft: 14, flex: 1 },
  userName: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  userEmail: { fontSize: 12, color: T.textFaint, fontFamily: F.bodyMedium },
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
  saveBtnText: { color: T.white, fontSize: 11, fontFamily: F.bodyBold },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  statDivider: { width: 1, backgroundColor: T.sand },
  statLabel: {
    fontSize: 11,
    color: T.textFaint,
    fontFamily: F.bodySemi,
    marginRight: 4,
  },
  statValue: { fontSize: 16, fontFamily: F.bodyBold, color: T.ink },

  // Menu
  menuContainer: { paddingHorizontal: 16, marginTop: 12 },
  menuCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    borderBottomColor: T.line,
  },
  menuItemDanger: { borderBottomColor: "rgba(255, 71, 87, 0.06)" },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuItemTitle: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
    letterSpacing: -0.2,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: T.textFaint,
    marginTop: 1,
    fontFamily: F.bodyMedium,
  },
  menuRight: { marginLeft: 8 },
  menuBadge: { borderRadius: 10, overflow: "hidden" },
  menuBadgeGradient: { paddingHorizontal: 10, paddingVertical: 3 },
  menuBadgeText: { fontSize: 10, fontFamily: F.bodyBold, color: T.ink },

  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: T.textFaint,
    marginTop: 20,
    fontFamily: F.bodyMedium,
  },

  // Modals
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
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modalHeader: { alignItems: "center", marginBottom: 16 },
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
    fontFamily: F.headingBold,
    color: T.ink,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: T.paper,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 13, fontFamily: F.bodySemi, color: T.textMuted },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: T.yellow,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 13, fontFamily: F.bodySemi, color: T.white },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: T.danger,
    alignItems: "center",
  },
  modalDangerActive: { backgroundColor: T.danger },
  modalDangerText: { fontSize: 13, fontFamily: F.bodySemi, color: T.white },

  // Warning / Alternative Lists
  warningList: { marginBottom: 16 },
  warningItem: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  warningText: {
    fontSize: 12,
    color: T.textMuted,
    marginLeft: 8,
    fontFamily: F.bodyMedium,
  },
  alternativeList: { marginBottom: 16 },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
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

  // Membership Card
  membershipCard: {
    width: width * 0.9,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 2,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  membershipGradient: {
    padding: 28,
    alignItems: "center",
    borderRadius: 28,
  },
  cardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: F.bodyBold,
    letterSpacing: 3,
    fontSize: 13,
    marginBottom: 24,
    textTransform: 'none',
  },
  cardBody: { alignItems: "center", marginBottom: 24 },
  diamondBox: { marginBottom: 16 },
  diamondGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: T.white,
    fontSize: 22,
    fontFamily: F.heading,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 13, fontFamily: F.body,
    paddingHorizontal: 8,
  },
  priceHighlight: { color: T.yellow, fontFamily: F.bodyBold },
  cardBtn: {
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
    elevation: 2,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: {
    color: T.ink,
    fontFamily: F.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  maybeLater: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontFamily: F.bodyMedium,
  },
});