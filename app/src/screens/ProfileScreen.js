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

const { width } = Dimensions.get("window");

const MenuItem = ({ item, index, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(itemSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, itemFade, itemSlide]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
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
        style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
        onPress={item.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.menuLeft}>
          <LinearGradient
            colors={[item.color + "25", item.color + "10"]}
            style={[styles.menuIconBox, { backgroundColor: "transparent" }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name={item.icon} size={22} color={item.color} />
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
              size={18}
              color="#C0C0C0"
              style={{ opacity: 0.5 }}
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
  const slideUpAnim = useRef(new Animated.Value(40)).current;
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
  }, [shimmerAnim]);

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
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(statsScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [avatarScale, fadeAnim, headerFade, menuFade, slideUpAnim, statsScale]);

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
      quality: 0.9,
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
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.7,
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerLogo}>
            User Profile
          </Text>
        </View>
        
        
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[styles.profileHeader, { opacity: headerFade }]}
        >
          <LinearGradient
            colors={["#ffffff", "#fafafa"]}
            style={styles.profileHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
                      <Icon name="camera" size={12} color="#000" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || "Student"}</Text>
                <View style={styles.emailRow}>
                  <Icon name="mail-outline" size={13} color="#999" />
                  <Text style={styles.userEmail}>{user?.email || ""}</Text>
                </View>
              </View>
            </View>

            {selectedImage && (
              <Animated.View style={{ opacity: fadeAnim }}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#05ae7c", "#06d6a0"]}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon
                          name="cloud-upload-outline"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.saveBtnText}>Save Photo</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.statsCard,
            { opacity: fadeAnim, transform: [{ scale: statsScale }] },
          ]}
        >
          <View style={styles.statItem}>
            <LinearGradient
              colors={["#05ae7c18", "#05ae7c08"]}
              style={styles.statIconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="wallet-outline" size={22} color="#05ae7c" />
            </LinearGradient>
            <Text style={styles.statLabel}>Total Saved</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: "#05ae7c" }]}>
                {totalSaved.toFixed(0)}
              </Text>
              <Text style={styles.statCurrency}> PKR</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <LinearGradient
              colors={["#f9c34918", "#f9c34908"]}
              style={styles.statIconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="gift-outline" size={22} color="#f9c349" />
            </LinearGradient>
            <Text style={styles.statLabel}>Redemptions</Text>
            <Text style={styles.statValue}>{redemptionCount}</Text>
          </View>
        </Animated.View>

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

        {/* Footer Section - Fully Centered */}
        <View style={styles.footerContainer}>
          <Animated.View 
            style={[
              styles.footerContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: statsScale }],
              }
            ]}
          >
            <Text style={styles.footerLogo}>
              tdc<Text style={styles.footerLogoAccent}>.</Text>
            </Text>
            <Text style={styles.footerText}>
              Building a Stronger Student Economy
            </Text>
            <View style={styles.footerDivider} />
            <Text style={styles.footerVersion}>v1.0.2 • Karachi, Pakistan</Text>
          </Animated.View>
        </View>
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
                      size={40}
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
                      size={18}
                      color="#FF5252"
                    />
                    <Text style={styles.warningText}>
                      Your profile will be removed
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={18}
                      color="#FF5252"
                    />
                    <Text style={styles.warningText}>
                      All connections will be lost
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={18}
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
                      size={40}
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
                    <Icon name="create-outline" size={20} color="#f9c349" />
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
                      size={20}
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
                      size={40}
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
  container: { flex: 1, backgroundColor: "#f8f9fc" },
  
  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { 
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  headerLogoAccent: {
    color: "#f9c349",
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5252",
    borderWidth: 2,
    borderColor: "#fff",
  },
  
  scrollContent: { paddingBottom: 20 },
  
  // Profile Header Styles
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeaderGradient: { padding: 20 },
  profileHeaderContent: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {},
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 50,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 78, height: 78, borderRadius: 50 },
  avatarPlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 34, fontWeight: "900", color: "#f9c349" },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraBadgeGradient: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { marginLeft: 18, flex: 1 },
  userName: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.3 },
  emailRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  userEmail: { fontSize: 13, color: "#999", fontWeight: "500" },
  saveBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  saveBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  
  // Stats Card Styles
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center" },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 10,
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.3 },
  statCurrency: { fontSize: 11, fontWeight: "600", color: "#999" },
  
  // Menu Styles
  menuContainer: { paddingHorizontal: 16, marginTop: 20 },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontWeight: "500",
  },
  menuRight: { marginLeft: 10 },
  menuBadge: { borderRadius: 12, overflow: "hidden" },
  menuBadgeGradient: { paddingHorizontal: 12, paddingVertical: 5 },
  menuBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  
  // Footer Styles - Fully Centered
  footerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  footerContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  footerLogo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  footerLogoAccent: {
    color: "#f9c349",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  footerDivider: {
    width: 40,
    height: 2,
    backgroundColor: "#f0f0f0",
    borderRadius: 1,
    marginVertical: 8,
  },
  footerVersion: {
    fontSize: 10,
    color: "#ccc",
    fontWeight: "500",
    textAlign: "center",
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  membershipCard: {
    width: width * 0.92,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  membershipGradient: {
    padding: 32,
    alignItems: "center",
    borderRadius: 30,
  },
  cardSparkles: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardTitle: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "800",
    letterSpacing: 4,
    fontSize: 14,
    marginBottom: 28,
  },
  cardBody: { alignItems: "center", marginBottom: 30 },
  diamondBox: { marginBottom: 22 },
  diamondGradient: {
    width: 92,
    height: 92,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  priceHighlight: { color: "#FFD700", fontWeight: "800" },
  cardBtn: { borderRadius: 16, overflow: "hidden", width: "100%", elevation: 5 },
  cardBtnGradient: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: { color: "#000", fontWeight: "800", fontSize: 16 },
  maybeLater: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
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
    borderRadius: 28,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  deleteModalHeader: { alignItems: "center", marginBottom: 20 },
  deleteModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  deleteModalDesc: {
    fontSize: 13,
    color: "#666",
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
    color: "#666",
    marginLeft: 10,
    fontWeight: "500",
  },
  alternativeList: { marginBottom: 20 },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fc",
    borderRadius: 14,
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 13,
    color: "#1a1a1a",
    marginLeft: 12,
    fontWeight: "500",
  },
  deleteModalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#666" },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FF5252",
    alignItems: "center",
  },
  continueBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  confirmInput: {
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 20,
    fontWeight: "500",
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#ccc",
    alignItems: "center",
  },
  deleteFinalBtnActive: { backgroundColor: "#FF5252" },
  deleteFinalBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});