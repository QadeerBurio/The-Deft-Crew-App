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

const { width, height } = Dimensions.get("window");

// Modern Menu Item Component with glass morphism
const MenuItem = ({ item, index, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(40)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 600,
        delay: index * 60,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(itemSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

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
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.menuGlow,
            {
              opacity: glowOpacity,
              backgroundColor: item.color + "20",
            },
          ]}
        />
        <View style={styles.menuLeft}>
          <LinearGradient
            colors={[item.color + "25", item.color + "08"]}
            style={styles.menuIconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name={item.icon} size={22} color={item.color} />
          </LinearGradient>
          <View style={styles.menuTextContainer}>
            <Text
              style={[
                styles.menuItemTitle,
                item.danger && { color: "#FF4757" },
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
                colors={["#f9c349", "#f9c349"]}
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
            <View style={styles.chevronContainer}>
              <Icon
                name="chevron-forward"
                size={14}
                color="#C0C0C0"
              />
            </View>
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
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.6)).current;
  const statsScale = useRef(new Animated.Value(0.8)).current;
  const menuFade = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  // Delete Modal Animations
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sign Out Modal Animations
  const signOutModalScale = useRef(new Animated.Value(0.8)).current;
  const signOutModalOpacity = useRef(new Animated.Value(0)).current;

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
        duration: 700,
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
        duration: 600,
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
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 600,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslate, {
        toValue: 0,
        friction: 8,
        tension: 40,
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
        toValue: 0.8,
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
        toValue: 0.8,
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
          rightText: "250 pts",
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

  const formatSavedAmount = (amount) => {
    if (amount === 0) return "0";
    if (amount >= 1000) return (amount / 1000).toFixed(1) + "k";
    return amount.toFixed(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Modern Profile Header with Glass Effect */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: headerFade,
              transform: [{ translateY: headerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F8FAFC"]}
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
                    colors={["#f9c349", "#f9c349"]}
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
                      colors={["#f9c349", "#f9c349"]}
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
                          <Icon
                            name="cloud-upload-outline"
                            size={14}
                            color="#FFF"
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

        {/* Modern Stats Card with Glass Effect */}
        <Animated.View
          style={[
            styles.statsCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: statsScale }],
            },
          ]}
        >
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#FFD93D20" }]}>
              <Icon name="gift-outline" size={20} color="#f9c349" />
            </View>
            <Text style={styles.statLabel}>Used</Text>
            <Text style={[styles.statValue, { color: "#f9c349" }]}>
              {redemptionCount || 0}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: "#A855F720" }]}>
              <Icon name="card-outline" size={20} color="#A855F7" />
            </View>
            <Text style={styles.statLabel}>Discounts</Text>
            <Text style={[styles.statValue, { color: "#A855F7" }]}>
              {claimedOffers.length || 0}
            </Text>
          </View>
        </Animated.View>

        {/* Modern Menu Section */}
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

        {/* Version Footer */}
        <Text style={styles.versionText}>Version 2.0.0</Text>
      </ScrollView>

      {/* Membership Card Modal with Modern Design */}
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
              colors={["#fff", "#f9c349", "#000"]}
              style={styles.membershipGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardSparkles}>
                {[...Array(8)].map((_, i) => (
                  <Icon
                    key={i}
                    name="sparkles"
                    size={16}
                    color="rgba(255,255,255,0.08)"
                    style={{
                      position: "absolute",
                      top: `${10 + i * 12}%`,
                      left: `${8 + (i % 4) * 25}%`,
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
                    colors={["#f9c349", "#f9c349"]}
                    style={styles.diamondGradient}
                  >
                    <Icon name="diamond" size={50} color="#1A1A1A" />
                  </LinearGradient>
                </View>
                <Text style={styles.cardPromoTitle}>Unlock Full Access</Text>
                <Text style={styles.cardPromoDesc}>
                  Get exclusive student discounts at all partner brands for
                  just{" "}
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
                  colors={["#f9c349", "#f9c349"]}
                  style={styles.cardBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.cardBtnText}>GET MEMBERSHIP</Text>
                  <Icon
                    name="arrow-forward-circle"
                    size={22}
                    color="#1A1A1A"
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

      {/* Modern Sign Out Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="none"
        onRequestClose={closeSignOutModal}
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View
            style={[
              styles.deleteModalContent,
              {
                opacity: signOutModalOpacity,
                transform: [{ scale: signOutModalScale }],
              },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <View style={[styles.deleteModalIcon, { backgroundColor: "#FFD93D20" }]}>
                <MaterialCommunityIcons
                  name="logout"
                  size={40}
                  color="#f9c349"
                />
              </View>
              <Text style={styles.deleteModalTitle}>Sign Out?</Text>
              <Text style={styles.deleteModalDesc}>
                Are you sure you want to sign out of your account?
              </Text>
            </View>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeSignOutModal}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: "#f9c349" }]}
                onPress={handleSignOut}
              >
                <Text style={[styles.continueBtnText, { color: "#1A1A1A" }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modern Delete Account Modal */}
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
                  <View style={[styles.deleteModalIcon, { backgroundColor: "#FF475720" }]}>
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
                    This action cannot be undone. All your data will be
                    permanently deleted.
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={18}
                      color="#FF4757"
                    />
                    <Text style={styles.warningText}>
                      Your profile will be removed
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={18}
                      color="#FF4757"
                    />
                    <Text style={styles.warningText}>
                      All connections will be lost
                    </Text>
                  </View>
                  <View style={styles.warningItem}>
                    <Icon
                      name="close-circle"
                      size={18}
                      color="#FF4757"
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
                      { backgroundColor: "#FFD93D20" },
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
                      { backgroundColor: "#FF475720" },
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
                      { color: "#FF4757" },
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
    backgroundColor: "#F8FAFC",
  },
  scrollContent: { 
    paddingBottom: 60,
  },
  
  // Modern Profile Header
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  profileHeaderGradient: { 
    padding: 20,
  },
  profileHeaderContent: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  avatarContainer: {},
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarImage: { 
    width: 72, 
    height: 72, 
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#f9c349",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  cameraBadgeGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { 
    marginLeft: 16, 
    flex: 1,
  },
  userName: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1A1A1A", 
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  emailRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 2, 
    gap: 6,
  },
  userEmail: { 
    fontSize: 13, 
    color: "#94A3B8", 
    fontWeight: "500",
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  saveBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    gap: 6,
  },
  saveBtnText: { 
    color: "#FFFFFF", 
    fontSize: 12, 
    fontWeight: "700",
  },
  
  // Modern Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  statItem: { 
    flex: 1, 
    alignItems: "center",
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1A1A1A",
  },
  
  // Modern Menu Styles
  menuContainer: { 
    paddingHorizontal: 16, 
    marginTop: 16,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
    position: "relative",
    overflow: "hidden",
  },
  menuItemDanger: {
    borderBottomColor: "rgba(255, 71, 87, 0.06)",
  },
  menuGlow: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0,
  },
  menuLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: { 
    flex: 1,
  },
  menuItemTitle: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  menuRight: { 
    marginLeft: 8,
  },
  menuBadge: { 
    borderRadius: 12, 
    overflow: "hidden",
  },
  menuBadgeGradient: { 
    paddingHorizontal: 12, 
    paddingVertical: 4,
  },
  menuBadgeText: { 
    fontSize: 11, 
    fontWeight: "700", 
    color: "#1A1A1A",
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Version Text
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#CBD5E1",
    marginTop: 24,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  
  // Modern Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backdropFilter: "blur(10px)",
  },
  membershipCard: {
    width: width * 0.92,
    borderRadius: 32,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
  },
  membershipGradient: {
    padding: 32,
    alignItems: "center",
    borderRadius: 32,
  },
  cardSparkles: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
  },
  cardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "800",
    letterSpacing: 4,
    fontSize: 14,
    marginBottom: 28,
    textTransform: "uppercase",
  },
  cardBody: { 
    alignItems: "center", 
    marginBottom: 30,
  },
  diamondBox: { 
    marginBottom: 20,
  },
  diamondGradient: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  priceHighlight: { 
    color: "#f9c349", 
    fontWeight: "800",
  },
  cardBtn: { 
    borderRadius: 16, 
    overflow: "hidden", 
    width: "100%", 
    elevation: 6,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: { 
    color: "#1A1A1A", 
    fontWeight: "800", 
    fontSize: 15,
    letterSpacing: 0.5,
  },
  maybeLater: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
  },
  
  // Modern Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  deleteModalHeader: { 
    alignItems: "center", 
    marginBottom: 20,
  },
  deleteModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  deleteModalDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  warningList: { 
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 10,
    fontWeight: "500",
  },
  alternativeList: { 
    marginBottom: 20,
  },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  alternativeText: {
    fontSize: 13,
    color: "#1A1A1A",
    marginLeft: 12,
    fontWeight: "500",
  },
  deleteModalBtns: { 
    flexDirection: "row", 
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  cancelBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#64748B",
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FF4757",
    alignItems: "center",
  },
  continueBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },
  confirmInput: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 20,
    fontWeight: "500",
    backgroundColor: "#F8FAFC",
  },
  deleteFinalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
  },
  deleteFinalBtnActive: { 
    backgroundColor: "#FF4757",
  },
  deleteFinalBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },
});