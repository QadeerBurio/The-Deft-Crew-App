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
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

// Animated Menu Item Component
const MenuItem = ({ item, index, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(30)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(itemSlide, {
        toValue: 0,
        friction: 7,
        tension: 35,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
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
        activeOpacity={0.8}
      >
        <View style={styles.menuLeft}>
          <LinearGradient
            colors={[item.color + "20", item.color + "08"]}
            style={styles.menuIconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name={item.icon} size={20} color={item.color} />
          </LinearGradient>
          <View style={styles.menuTextContainer}>
            <Text
              style={[
                styles.menuItemTitle,
                item.danger && { color: "#E74C3C" },
              ]}
            >
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
                colors={["#f9c349", "#f5a623"]}
                style={styles.menuBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.menuBadgeText}>
                  {typeof item.rightText === 'number' && item.rightText > 99 
                    ? '99+' 
                    : item.rightText}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <Icon
              name="chevron-forward"
              size={16}
              color="#C0C0C0"
              style={{ opacity: 0.4 }}
            />
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

  // Animation References
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const menuFade = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Delete Modal Animations
  const modalScale = useRef(new Animated.Value(0.7)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Shimmer Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const startEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
      Animated.spring(statsScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 500,
        delay: 150,
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
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [ecardModalVisible, showDeleteModal]);

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

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Sign Out",
      "Are you sure you want to leave?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            setUser(null);
            setToken(null);
          },
        },
      ],
      { cancelable: true }
    );
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
        friction: 6,
        tension: 35,
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
        toValue: 0.7,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 150,
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
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
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
          color: "#9b59b6",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEcardModalVisible(true);
          },
        },
        {
          name: "Loyalty Points",
          subtitle: "Your earned rewards balance",
          icon: "gift-outline",
          color: "#f9c349",
          rightText: "250 pts",
          onPress: () =>
            Alert.alert("Coming Soon!", "We're building our rewards shop!"),
        },
        {
          name: "My Discounts",
          subtitle: "Track your savings and redemptions",
          icon: "pricetag-outline",
          color: "#05ae7c",
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
          name: "Delete Account",
          subtitle: "Permanently remove your account",
          icon: "trash-outline",
          color: "#E74C3C",
          onPress: openDeleteModal,
          danger: true,
        },
        {
          name: "Sign Out",
          subtitle: "Log out of your account",
          icon: "log-out-outline",
          color: "#E74C3C",
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fc" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Compact Profile Header */}
        <Animated.View
          style={[styles.profileHeader, { opacity: headerFade }]}
        >
          <LinearGradient
            colors={["#ffffff", "#fafafa"]}
            style={styles.profileHeaderGradient}
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
                    colors={["#f9c349", "#e8b82a"]}
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
                      colors={["#f9c349", "#f5a623"]}
                      style={styles.cameraBadgeGradient}
                    >
                      <Icon name="camera" size={11} color="#000" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || "Student"}</Text>
                <View style={styles.emailRow}>
                  <Icon name="mail-outline" size={12} color="#999" />
                  <Text style={styles.userEmail}>{user?.email || ""}</Text>
                </View>
                {selectedImage && (
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    <LinearGradient
                      colors={["#05ae7c", "#06d6a0"]}
                      style={styles.saveBtnGradient}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon
                            name="cloud-upload-outline"
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.saveBtnText}>Save</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Compact Stats Card */}
        <Animated.View
          style={[
            styles.statsCard,
            { opacity: fadeAnim, transform: [{ scale: statsScale }] },
          ]}
        >
          <View style={styles.statItem}>
            <View style={styles.statIconBox}>
              <Icon name="wallet-outline" size={18} color="#05ae7c" />
            </View>
            <Text style={styles.statLabel}>Saved</Text>
            <Text style={[styles.statValue, { color: "#05ae7c" }]}>
              {totalSaved.toFixed(0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#f9c34915" }]}>
              <Icon name="gift-outline" size={18} color="#f9c349" />
            </View>
            <Text style={styles.statLabel}>Used</Text>
            <Text style={[styles.statValue, { color: "#f9c349" }]}>
              {redemptionCount}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#9b59b615" }]}>
              <Icon name="card-outline" size={18} color="#9b59b6" />
            </View>
            <Text style={styles.statLabel}>Discounts</Text>
            <Text style={[styles.statValue, { color: "#9b59b6" }]}>
              {claimedOffers.length}
            </Text>
          </View>
        </Animated.View>

        {/* Menu Cards with Animation */}
        <Animated.View
          style={{
            opacity: menuFade,
            transform: [{ translateY: slideUpAnim }],
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
              colors={["#9b59b6", "#6c3a8a", "#9b59b6"]}
              style={styles.membershipGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardSparkles}>
                {[...Array(6)].map((_, i) => (
                  <Icon
                    key={i}
                    name="sparkles"
                    size={16}
                    color="rgba(255,255,255,0.12)"
                    style={{
                      position: "absolute",
                      top: `${10 + i * 14}%`,
                      left: `${8 + (i % 3) * 30}%`,
                    }}
                  />
                ))}
              </View>
              <Text style={styles.cardTitle}>
                tdc<Text style={{ color: "#f9c349" }}>.</Text> PREMIUM
              </Text>
              <View style={styles.cardBody}>
                <View style={styles.diamondBox}>
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.diamondGradient}
                  >
                    <Icon name="diamond" size={45} color="#000" />
                  </LinearGradient>
                </View>
                <Text style={styles.cardPromoTitle}>Unlock Full Access</Text>
                <Text style={styles.cardPromoDesc}>
                  Get exclusive student discounts at all partner brands for
                  just{" "}
                  <Text style={styles.priceHighlight}>700-Rs / year</Text>
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
                  colors={["#FFD700", "#FFA500", "#FFD700"]}
                  style={styles.cardBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.cardBtnText}>GET MEMBERSHIP</Text>
                  <Icon
                    name="arrow-forward-circle"
                    size={20}
                    color="#000"
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEcardModalVisible(false)}
                style={{ marginTop: 18 }}
              >
                <Text style={styles.maybeLater}>Maybe Later</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
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
                <View style={styles.deleteModalHeader}>
                  <View style={styles.deleteModalIcon}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={36}
                      color="#FF5252"
                    />
                  </View>
                  <Text style={styles.deleteModalTitle}>
                    Delete Account?
                  </Text>
                  <Text style={styles.deleteModalDesc}>
                    This action cannot be undone. All your data will be
                    permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={16}
                      color="#FF5252"
                    />
                    <Text style={styles.warningText}>
                      Your profile will be removed
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={16}
                      color="#FF5252"
                    />
                    <Text style={styles.warningText}>
                      All connections will be lost
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={16}
                      color="#FF5252"
                    />
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
                      { backgroundColor: "#FFF3E0" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="pause-circle"
                      size={36}
                      color="#FF9800"
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
                    <Icon name="create-outline" size={18} color="#f9c349" />
                    <Text style={styles.alternativeText}>
                      Update your profile
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.alternativeItem}
                    onPress={closeDeleteModal}
                  >
                    <Icon
                      name="help-circle-outline"
                      size={18}
                      color="#f9c349"
                    />
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
                    style={styles.continueBtn}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.continueBtnText}>Still Delete</Text>
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
                      { backgroundColor: "#FFEBEE" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="delete-forever"
                      size={36}
                      color="#FF5252"
                    />
                  </View>
                  <Text
                    style={[
                      styles.deleteModalTitle,
                      { color: "#FF5252" },
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
                  placeholderTextColor="#999"
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
                      <ActivityIndicator color="#fff" size="small" />
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
  container: { flex: 1, backgroundColor: "#f8f9fc", paddingBottom:30 },
  scrollContent: { paddingBottom: 40 },
  
  // Compact Profile Header
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeaderGradient: { padding: 16 },
  profileHeaderContent: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {},
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "900", color: "#f9c349" },
  cameraBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  cameraBadgeGradient: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.3 },
  emailRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  userEmail: { fontSize: 12, color: "#999", fontWeight: "500" },
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
  saveBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  
  // Compact Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#05ae7c15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  
  // Menu Styles
  menuContainer: { paddingHorizontal: 16, marginTop: 12 },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
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
    borderBottomColor: "rgba(231, 76, 60, 0.08)",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuItemTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  menuItemSubtitle: {
    fontSize: 10,
    color: "#999",
    marginTop: 1,
    fontWeight: "500",
  },
  menuRight: { marginLeft: 8 },
  menuBadge: { borderRadius: 10, overflow: "hidden" },
  menuBadgeGradient: { paddingHorizontal: 10, paddingVertical: 3 },
  menuBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  membershipCard: {
    width: width * 0.92,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  membershipGradient: {
    padding: 28,
    alignItems: "center",
    borderRadius: 28,
  },
  cardSparkles: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardTitle: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "800",
    letterSpacing: 3,
    fontSize: 13,
    marginBottom: 24,
  },
  cardBody: { alignItems: "center", marginBottom: 26 },
  diamondBox: { marginBottom: 18 },
  diamondGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
    paddingHorizontal: 8,
  },
  priceHighlight: { color: "#FFD700", fontWeight: "800" },
  cardBtn: { borderRadius: 14, overflow: "hidden", width: "100%", elevation: 4 },
  cardBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
  maybeLater: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },
  
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  deleteModalHeader: { alignItems: "center", marginBottom: 16 },
  deleteModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  deleteModalDesc: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  warningList: { marginBottom: 16 },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  warningText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  alternativeList: { marginBottom: 16 },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    marginBottom: 6,
  },
  alternativeText: {
    fontSize: 12,
    color: "#1a1a1a",
    marginLeft: 10,
    fontWeight: "500",
  },
  deleteModalBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  continueBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FF5252",
    alignItems: "center",
  },
  continueBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  confirmInput: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#1a1a1a",
    marginBottom: 16,
    fontWeight: "500",
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#ccc",
    alignItems: "center",
  },
  deleteFinalBtnActive: { backgroundColor: "#FF5252" },
  deleteFinalBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});