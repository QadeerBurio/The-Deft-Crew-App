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
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  const ShimmerBlock = ({ style }) => (
    <View
      style={[
        style,
        {
          overflow: "hidden",
          backgroundColor: "#E8ECF1",
          borderRadius: style?.borderRadius || 8,
        },
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 80,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.skeletonHeader}>
          <LinearGradient
            colors={["#f8f9fb", "#eef2f6", "#f8f9fb"]}
            style={styles.skeletonHeaderGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.skeletonAvatarContainer}>
                <View style={styles.skeletonAvatarRing} />
                <View style={styles.skeletonAvatar}>
                  <Icon name="person" size={40} color="#D0D0D0" />
                </View>
              </View>

              <View style={[styles.headerInfo, { marginLeft: 20 }]}>
                <ShimmerBlock
                  style={{
                    width: 110,
                    height: 14,
                    borderRadius: 7,
                    marginBottom: 10,
                  }}
                />
                <ShimmerBlock
                  style={{
                    width: 150,
                    height: 24,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{ width: 170, height: 12, borderRadius: 6 }}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ShimmerBlock
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                marginBottom: 10,
              }}
            />
            <ShimmerBlock
              style={{
                width: 80,
                height: 12,
                borderRadius: 6,
                marginBottom: 6,
              }}
            />
            <ShimmerBlock
              style={{ width: 90, height: 20, borderRadius: 10 }}
            />
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <ShimmerBlock
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                marginBottom: 10,
              }}
            />
            <ShimmerBlock
              style={{
                width: 80,
                height: 12,
                borderRadius: 6,
                marginBottom: 6,
              }}
            />
            <ShimmerBlock
              style={{ width: 60, height: 20, borderRadius: 10 }}
            />
          </View>
        </View>

        {[1, 2, 3].map((group) => (
          <View key={group} style={styles.groupContainer}>
            <ShimmerBlock
              style={{
                width: 90,
                height: 14,
                borderRadius: 7,
                marginBottom: 12,
                marginLeft: 5,
              }}
            />
            <View style={styles.card}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.menuItem}>
                  <View style={styles.menuLeft}>
                    <ShimmerBlock
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        marginRight: 14,
                      }}
                    />
                    <ShimmerBlock
                      style={{ width: 130, height: 16, borderRadius: 8 }}
                    />
                  </View>
                  <ShimmerBlock
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const AnimatedMenuItem = ({ item, index, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 180,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(itemSlide, {
        toValue: 0,
        duration: 220,
        delay: index * 60,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, itemFade, itemSlide]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
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
            colors={[`${item.color}20`, `${item.color}10`]}
            style={styles.iconBox}
          >
            <Icon name={item.icon} size={22} color={item.color} />
          </LinearGradient>
          <Text style={[styles.menuText, item.danger && { color: "#eb4d4b" }]}>
            {item.name}
          </Text>
        </View>

        <View style={styles.menuRight}>
          {item.rightText !== undefined ? (
            <View style={styles.badge}>
              <LinearGradient
                colors={["#f9c349", "#f9c349"]}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.badgeText}>{item.rightText}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.chevronContainer}>
              <Icon name="chevron-forward" size={18} color="#C7C7CC" />
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
  const [loading, setLoading] = useState(true);
  const [totalSaved, setTotalSaved] = useState(0);
  const [redemptionCount, setRedemptionCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(18)).current;
  const menuFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.92)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-10)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const startEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(titleSlide, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(statsSlide, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(headerGlow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(confettiAnim, {
        toValue: 360,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [
    avatarScale,
    confettiAnim,
    fadeAnim,
    headerGlow,
    menuFade,
    statsSlide,
    titleSlide,
  ]);

  const fetchProfileData = useCallback(async () => {
    let screenReady = false;

    try {
      setLoading(true);

      const minLoaderDelay = new Promise((resolve) =>
        setTimeout(resolve, 180)
      );

      const dataPromise = Promise.all([
        api.get("/offers/claimed", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/offers/my-total-savings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [[offersRes, savingsRes]] = await Promise.all([
        dataPromise,
        minLoaderDelay,
      ]);

      setClaimedOffers(offersRes.data);
      setTotalSaved(savingsRes.data.totalSaved || 0);
      setRedemptionCount(savingsRes.data.redemptionCount || 0);
      screenReady = true;
    } catch (err) {
      console.log("Error fetching profile data:", err);
      screenReady = true;
    } finally {
      if (screenReady) {
        setLoading(false);
        requestAnimationFrame(() => {
          startEntranceAnimations();
        });
      }
    }
  }, [startEntranceAnimations, token]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  useEffect(() => {
    const backAction = () => {
      if (ecardModalVisible) {
        setEcardModalVisible(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [ecardModalVisible]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(avatarScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1.03,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

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

      data.append("file", {
        uri: selectedImage,
        name: filename,
        type,
      });
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

      Animated.sequence([
        Animated.timing(avatarScale, {
          toValue: 1.08,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(avatarScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

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
    Alert.alert("Sign Out", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          setUser(null);
          setToken(null);
        },
      },
    ]);
  };

  const headerGlowOpacity = headerGlow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.12, 0.22, 0.12],
  });

  const confettiSpin = confettiAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const menuGroups = [
    {
      title: "Personal",
      items: [
        {
          name: "Profile Details",
          icon: "person-outline",
          color: "#f9c349",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("ProfileDetails");
          },
        },
        {
          name: "Membership Card",
          icon: "id-card-outline",
          color: "#9b59b6",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEcardModalVisible(true);
          },
        },
      ],
    },
    {
      title: "Rewards",
      items: [
        {
          name: "Loyalty Points",
          icon: "gift-outline",
          color: "#f9c349",
          rightText: "250 pts",
          onPress: () =>
            Alert.alert("Coming Soon!", "We're building our rewards shop!"),
        },
        {
          name: "My Discounts",
          icon: "ticket-outline",
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
      ],
    },
    {
      title: "System",
      items: [
        {
          name: "Sign Out",
          icon: "log-out-outline",
          color: "#eb4d4b",
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        style={[styles.headerGlowEffect, { opacity: headerGlowOpacity }]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={["#ffffff", "#f8f9fb", "#f9c349"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerTop}>
              <Animated.View
                style={{
                  transform: [{ scale: avatarScale }],
                }}
              >
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.avatarWrapper}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarOuterRing}>
                    <LinearGradient
                      colors={[
                        "#06629b",
                        "#000000",
                        "#f9c349",
                        "#05ae7c",
                        "#000000",
                      ]}
                      style={styles.ringGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>

                  <Animated.View
                    style={[
                      styles.confettiRing,
                      { transform: [{ rotate: confettiSpin }] },
                    ]}
                  >
                    {[...Array(8)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.confettiDot,
                          {
                            transform: [
                              { rotate: `${i * 45}deg` },
                              { translateY: -45 },
                            ],
                            backgroundColor:
                              i % 2 === 0 ? "#f3b245" : "#2c2e34",
                          },
                        ]}
                      />
                    ))}
                  </Animated.View>

                  <View style={styles.avatarGradient}>
                    {selectedImage ? (
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.avatarImage}
                      />
                    ) : user?.profileImage ? (
                      <Image
                        source={{ uri: `${user.profileImage}?t=${Date.now()}` }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarInitial}>
                        {user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    )}

                    <View style={styles.editIconBadge}>
                      <LinearGradient
                        colors={["#FFD700", "#f9c349", "#f9c349"]}
                        style={styles.editBadgeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Icon name="camera" size={14} color="#000" />
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.headerInfo,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: titleSlide }],
                  },
                ]}
              >
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name || "Student"}</Text>
                <View style={styles.emailRow}>
                  <Icon name="mail-outline" size={14} color="#8E8E93" />
                  <Text style={styles.email}>{user?.email || ""}</Text>
                </View>

                {selectedImage && (
                  <View style={{ marginTop: 12 }}>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={["#05ae7c", "#06d6a0", "#05ae7c"]}
                        style={styles.saveBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Icon
                              name="cloud-upload-outline"
                              size={18}
                              color="#fff"
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.saveBtnText}>Save Photo</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.statsRow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: statsSlide }],
            },
          ]}
        >
          <View style={styles.statItem}>
            <LinearGradient
              colors={["rgba(5,174,124,0.1)", "rgba(5,174,124,0.05)"]}
              style={styles.statIconContainer}
            >
              <Icon name="wallet-outline" size={26} color="#05ae7c" />
            </LinearGradient>
            <Text style={styles.statLabel}>Total Saved</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: "#05ae7c" }]}>
                {totalSaved.toFixed(0)}
              </Text>
              <Text style={styles.currency}> PKR</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <LinearGradient
              colors={["rgba(255,215,0,0.15)", "rgba(255,215,0,0.05)"]}
              style={styles.statIconContainer}
            >
              <Icon name="gift-outline" size={26} color="#f9c349" />
            </LinearGradient>
            <Text style={styles.statLabel}>Redemptions</Text>
            <Text style={styles.statValue}>{redemptionCount}</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: menuFade }}>
          {menuGroups.map((group, gIdx) => (
            <View key={gIdx} style={styles.groupContainer}>
              <View style={styles.groupTitleRow}>
                <View style={styles.groupTitleDot} />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              <View style={styles.card}>
                {group.items.map((item, iIdx) => (
                  <AnimatedMenuItem
                    key={iIdx}
                    item={item}
                    index={iIdx}
                    isLast={iIdx === group.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </Animated.View>

         {/* Footer */}
                  <View style={styles.footer}>
                    <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
                    <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
                  </View>
      </ScrollView>

      <Modal
        visible={ecardModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEcardModalVisible(false)}
      >
        <Pressable
          style={styles.modalBlur}
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
              <View style={styles.cardPattern}>
                {[...Array(6)].map((_, i) => (
                  <Icon
                    key={i}
                    name="sparkles"
                    size={18}
                    color="rgba(255,255,255,0.15)"
                    style={{
                      position: "absolute",
                      top: `${12 + i * 12}%`,
                      left: `${10 + (i % 3) * 28}%`,
                    }}
                  />
                ))}
              </View>

              <Text style={styles.cardHeader}>
                tdc<Text style={{ color: "#f9c349" }}>.</Text> PREMIUM
              </Text>
              <View style={styles.cardBody}>
                <View style={styles.cardIconContainer}>
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.diamondGradient}
                  >
                    <Icon name="diamond" size={50} color="#000" />
                  </LinearGradient>
                </View>
                <Text style={styles.cardPromoTitle}>Unlock Full Access</Text>
                <Text style={styles.cardPromoDesc}>
                  Get exclusive student discounts at all partner brands for just{" "}
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
                    size={22}
                    color="#000"
                    style={{ marginLeft: 10 }}
                  />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEcardModalVisible(false)}
                style={{ marginTop: 20 }}
              >
                <Text style={styles.maybeLaterText}>Maybe Later</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  headerGlowEffect: {
    position: "absolute",
    top: -80,
    left: -80,
    right: -80,
    height: 400,
    backgroundColor: "#f9c349",
    borderRadius: 200,
    zIndex: 0,
  },
  header: {
    padding: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: "hidden",
    zIndex: 2,
  },
  headerGradient: {
    borderRadius: 35,
    borderTopLeftRadius: 45,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  avatarWrapper: {
    position: "relative",
    width: 90,
    height: 95,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOuterRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  ringGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    opacity: 0.6,
  },
  confettiRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  confettiDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatarGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#06629b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    zIndex: 2,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    resizeMode: "cover",
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#fff",
  },
  editIconBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
  },
  editBadgeGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerInfo: {
    marginLeft: 22,
    flex: 1,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  email: {
    fontSize: 13,
    color: "#636366",
    flex: 1,
  },
  saveBtn: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
    elevation: 3,
    shadowColor: "#05ae7c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 3,
    marginTop: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statDivider: {
    width: 1.5,
    height: "70%",
    backgroundColor: "#F0F0F5",
    alignSelf: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  currency: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },
  groupContainer: {
    marginTop: 21,
    paddingHorizontal: 20,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginLeft: 5,
  },
  groupTitleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f9c349",
    marginRight: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 1 },
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5FA",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginLeft: 14,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: "center",
    marginTop: 35,
    marginBottom: 20,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  footerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalBlur: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  membershipCard: {
    width: width * 0.92,
    borderRadius: 32,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#9b59b6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  membershipGradient: {
    padding: 35,
    alignItems: "center",
    borderRadius: 32,
  },
  cardPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  cardHeader: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "bold",
    letterSpacing: 4,
    fontSize: 15,
    marginBottom: 30,
  },
  cardBody: {
    alignItems: "center",
    marginBottom: 35,
    width: "100%",
  },
  cardIconContainer: {
    marginBottom: 24,
  },
  diamondGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  cardPromoTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 14,
    textAlign: "center",
  },
  cardPromoDesc: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 15,
    paddingHorizontal: 10,
  },
  priceHighlight: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  cardBtn: {
    borderRadius: 18,
    overflow: "hidden",
    width: "100%",
    elevation: 5,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardBtnGradient: {
    paddingHorizontal: 30,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  maybeLaterText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
  skeletonHeader: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: "hidden",
  },
  skeletonHeaderGradient: {
    padding: 25,
    paddingTop: 35,
  },
  skeletonAvatarContainer: {
    position: "relative",
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonAvatarRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  skeletonAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E8ECF1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  // Footer
  footer: { alignItems: 'center', marginTop: 24, paddingVertical: 10 },
  footerLogo: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  footerText: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '500' },
});