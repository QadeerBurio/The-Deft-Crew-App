// ==================== PremiumMemberCard.js (CLEAN BANK-GRADE V4) ====================
// No shadow overlay · crisp card · gold accents · tight layout

import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Image,
  Platform,
  PermissionsAndroid,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_W = width - 32;
const CARD_H = 216;
const CHIP_IMAGE = require("../../../assets/images/chip.png");
const BACKGROUND_IMAGE = require("../../../assets/images/background.jpeg");

// ─── Theme ───
const GOLD = "#f9c349";
const GOLD_DARK = "#e0a82e";
const GOLD_LIGHT = "#fffbee";
const BLACK = "#0f0f0f";
const CARD_BASE = "#0a0a0a";
const CARD_MID = "#141414";
const WHITE = "#ffffff";
const LIGHT = "#fafafa";
const BORDER = "#ececec";
const MUTED = "#888";
const SUCCESS = "#10b981";

export default function PremiumMemberCard() {
  const { user, token } = useContext(AuthContext);
  const navigation = useNavigation();

  const [redeemCode, setRedeemCode] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [expiryDate, setExpiryDate] = useState("--/--");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("None");
  const [downloading, setDownloading] = useState(false);
  const [userData, setUserData] = useState({
    name: "MEMBER NAME",
    id: "N/A",
    phone: "Not Provided",
    email: "Not Provided",
    website: "www.tdc.co",
    cardNumber: "4412 8800 1234 1000",
  });

  const viewShotRef = useRef();
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const sectionFade = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(sectionFade, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(2800),
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading]);

  // Show the card at once from the signed-in user, then refresh from the server
  useEffect(() => {
    if (user && user.name) {
      applyUser(user);
      setLoading(false);
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get("/auth/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      applyUser(res.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyUser = (data) => {
    if (!data) return;
    {
      const isVipActive =
        data.isVip === true || data.paymentStatus === "Verified";
      setIsVip(isVipActive);
      setPaymentStatus(data.paymentStatus || "None");

      if (data.vipExpiry) {
        const date = new Date(data.vipExpiry);
        setExpiryDate(
          `${String(date.getMonth() + 1).padStart(2, "0")}/${date
            .getFullYear()
            .toString()
            .slice(-2)}`
        );
      }

      setUserData({
        name: (data.name || "MEMBER NAME").toUpperCase(),
        id: (data.rollNo || data._id?.slice(-6) || "N/A").toUpperCase(),
        phone: data.phone || "Not Provided",
        email: data.email || "Not Provided",
        website: data.instagram ? `@${data.instagram}` : "www.tdc.co",
        cardNumber: formatCardNumber(data._id),
      });
    }
  };

  const formatCardNumber = (mongoId) => {
    if (!mongoId || mongoId.length < 6) return "4412 8800 1234 1000";
    const hexSuffix = mongoId.substring(mongoId.length - 6);
    const num = parseInt(hexSuffix, 16) || 1234;
    const block1 = "4412";
    const block2 = "88" + String(num % 100).padStart(2, "0");
    const block3 = String((num >> 4) % 10000).padStart(4, "0");
    const block4 = String(1000 + (num % 9000)).padStart(4, "0");
    return `${block1} ${block2} ${block3} ${block4}`.toUpperCase();
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  };

  const handleDownload = async () => {
    if (!isVip) {
      Alert.alert("Locked", "Your Gold Membership is not active.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);
    try {
      if (Platform.OS === "android") {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          Alert.alert("Permission Denied");
          setDownloading(false);
          return;
        }
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied");
        setDownloading(false);
        return;
      }
      const uri = await viewShotRef.current.capture();
      const fileName = `TDC_Card_${Date.now()}.png`;
      const fileUri =
        Platform.OS === "android"
          ? FileSystem.cacheDirectory + fileName
          : FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      const albumName = "TDC Cards";
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      }
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      Alert.alert(
        "Card Saved",
        `Your TDC Card has been saved to the "${albumName}" album.`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save image.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!isVip) {
      Alert.alert("Locked", "Your Gold Membership is not active.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (flipped) {
        setFlipped(false);
        flipAnimation.setValue(0);
        await new Promise((r) => setTimeout(r, 300));
      }
      const uri = await viewShotRef.current.capture();
      const fileName = `TDC_Card_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share your TDC Card",
      });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {
      Alert.alert("Error", "Could not share card.");
    }
  };

  const toggleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnimation, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_W, CARD_W],
  });

  // ════════════════════════════════════════════
  // FRONT
  // ════════════════════════════════════════════
  const FrontContent = ({ vip }) => (
    <View style={styles.full}>
      {/* Deep dark base */}
      <LinearGradient
        colors={[CARD_MID, CARD_BASE, "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle swirl texture */}
      <ImageBackground
        source={BACKGROUND_IMAGE}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.18, resizeMode: "cover" }}
      />

      {/* Gold accent top-right */}
      <LinearGradient
        colors={["rgba(249,195,73,0.22)", "rgba(249,195,73,0)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.3, y: 0.7 }}
        style={styles.goldAccentTop}
      />

      {/* Gold accent bottom-left */}
      <LinearGradient
        colors={["rgba(249,195,73,0.14)", "rgba(249,195,73,0)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.6, y: 0.3 }}
        style={styles.goldAccentBottom}
      />

      {/* Shine sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shineOverlay,
          { transform: [{ translateX: shineTranslate }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.full}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.cardPadding}>
        <View style={styles.topRow}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>
              tdc<Text style={styles.logoDot}>.</Text>
            </Text>
          </View>
          <Image
            source={CHIP_IMAGE}
            style={styles.chipImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.cardNumberBlock}>
          <Text style={styles.cardNumberLabel}>CARD NUMBER</Text>
          <Text
            style={styles.cardNumberValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {userData.cardNumber}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            <Text style={styles.miniLabel}>MEMBER</Text>
            <Text style={styles.miniValue} numberOfLines={1}>
              {userData.id}
            </Text>
          </View>

          <View style={styles.bottomRight}>
            <Text style={styles.miniLabelGold}>VALID THRU</Text>
            <Text style={styles.miniValue}>{expiryDate}</Text>
          </View>

          <View style={styles.networkMark}>
            <View style={styles.networkCircleGold} />
            <View style={styles.networkCircleWhite} />
          </View>
        </View>
      </View>

      {vip && <View style={styles.goldBorder} />}
    </View>
  );

  // ════════════════════════════════════════════
  // BACK
  // ════════════════════════════════════════════
  const BackContent = ({ vip }) => (
    <View style={styles.full}>
      <LinearGradient
        colors={[CARD_MID, CARD_BASE, "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ImageBackground
        source={BACKGROUND_IMAGE}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.15, resizeMode: "cover" }}
      />

      <LinearGradient
        colors={["rgba(249,195,73,0.18)", "rgba(249,195,73,0)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={styles.goldAccentTop}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.shineOverlay,
          { transform: [{ translateX: shineTranslate }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.full}
        />
      </Animated.View>

      <View style={styles.cardPadding}>
        <View style={styles.magStripe} />

        <View style={styles.backContactBlock}>
          <Text style={styles.miniLabel}>MEMBER NAME</Text>
          <Text
            style={styles.backNameValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {userData.name}
          </Text>

          <View style={styles.backDivider} />

          <Text style={styles.miniLabel}>REGISTERED MOBILE</Text>
          <Text style={styles.backPhoneValue} numberOfLines={1}>
            {userData.phone}
          </Text>
        </View>

        <View style={styles.backFooter}>
          <Text style={styles.footerSmall}>
            tdc<Text style={styles.logoDot}>.</Text>co
          </Text>
          <Text style={styles.footerSmall}>
            {vip ? "PREMIER MEMBER" : "BASIC MEMBER"}
          </Text>
        </View>
      </View>

      {vip && <View style={styles.goldBorder} />}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center]}
        edges={["top", "bottom"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>loading card...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <Animated.View style={[styles.headerNav, { opacity: headerFade }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={BLACK} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>membership card</Text>
          <Text style={styles.headerSubtitle}>
            @{user?.name?.toLowerCase()?.replace(/\s/g, "") || "member"}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Card with visible border radius — no shadow overlays */}
        <Animated.View
          style={[
            styles.displayCardContainer,
            { transform: [{ scale: cardScale }] },
          ]}
        >
          <ViewShot
            ref={viewShotRef}
            options={{
              format: "png",
              quality: 1.0,
              snapshotContentContainer: true,
            }}
            style={styles.viewShotStyle}
          >
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={toggleFlip}
              style={styles.cardWrapper}
            >
              <Animated.View
                style={[
                  styles.card,
                  styles.abs,
                  { transform: [{ rotateY: frontInterpolate }] },
                  { backfaceVisibility: "hidden" },
                ]}
              >
                <FrontContent vip={isVip} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.card,
                  styles.abs,
                  { transform: [{ rotateY: backInterpolate }] },
                  { backfaceVisibility: "hidden" },
                ]}
              >
                <BackContent vip={isVip} />
              </Animated.View>
            </TouchableOpacity>
          </ViewShot>
        </Animated.View>

        <View style={styles.flipHintRow}>
          <Ionicons name="swap-horizontal-outline" size={14} color={MUTED} />
          <Text style={styles.flipHintText}>tap card to flip</Text>
        </View>

        <Animated.View style={[styles.statusSection, { opacity: sectionFade }]}>
          {isVip ? (
            <View style={styles.statusSuccess}>
              <View style={styles.statusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>premium active</Text>
                {expiryDate !== "--/--" && (
                  <Text style={styles.statusSub}>expires {expiryDate}</Text>
                )}
              </View>
              <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
            </View>
          ) : paymentStatus === "Pending Verification" ? (
            <View style={styles.statusPending}>
              <ActivityIndicator size="small" color={GOLD_DARK} />
              <Text style={styles.statusPendingText}>
                waiting for verification
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.activateBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                navigation.navigate("Payment");
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="diamond" size={16} color={BLACK} />
              <Text style={styles.activateBtnText}>
                activate gold card · rs. 750
              </Text>
              <Ionicons name="arrow-forward" size={14} color={BLACK} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {!isVip && paymentStatus !== "Pending Verification" && (
          <Animated.View style={[styles.promoRow, { opacity: sectionFade }]}>
            <View style={styles.promoInputWrap}>
              <Ionicons name="pricetag-outline" size={16} color={GOLD_DARK} />
              <TextInput
                style={styles.promoInput}
                placeholder="enter promo code"
                placeholderTextColor={MUTED}
                value={redeemCode}
                onChangeText={(val) => setRedeemCode(val.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.promoApplyBtn}
              onPress={() => Alert.alert("processing", "validating code...")}
              activeOpacity={0.85}
            >
              <Text style={styles.promoApplyText}>apply</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View style={[styles.actionsRow, { opacity: sectionFade }]}>
          <TouchableOpacity
            style={[styles.actionBtn, !isVip && styles.actionBtnDisabled]}
            onPress={handleDownload}
            disabled={!isVip || downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={isVip ? BLACK : MUTED} />
            ) : (
              <>
                <Ionicons
                  name={isVip ? "download-outline" : "lock-closed-outline"}
                  size={16}
                  color={isVip ? BLACK : MUTED}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    !isVip && styles.actionBtnTextDisabled,
                  ]}
                >
                  {isVip ? "download card" : "activate to download"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isVip && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDark]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={16} color={GOLD} />
              <Text style={[styles.actionBtnText, { color: GOLD }]}>
                share card
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            tdc<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.footerText}>
            building a stronger student economy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    color: MUTED,
    marginTop: 12,
    fontWeight: "600",
    fontSize: 13,
  },

  // ─── Header ───
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 8 : 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: LIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: BLACK,
    letterSpacing: -0.2,
    textTransform: "lowercase",
  },
  headerSubtitle: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    marginTop: 2,
  },

  // ─── Scroll ───
  scrollContent: {
    padding: 16,
    alignItems: "center",
    paddingBottom: 40,
  },

  // ═══════════════════════════════════════════
  // CARD — FIXED
  // ═══════════════════════════════════════════
  // Container has NO shadow / NO overflow:hidden
  displayCardContainer: {
    width: CARD_W,
    height: CARD_H,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 22,
    // ✅ Clean — no shadow, no overlay. Card border-radius visible.
  },
  viewShotStyle: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: "hidden",
  },
  cardWrapper: {
    width: CARD_W,
    height: CARD_H,
    position: "relative",
    borderRadius: 22,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: "hidden",
    // ✅ NO elevation, NO shadow on card itself
    position: "absolute",
    top: 0,
    left: 0,
  },
  abs: { position: "absolute", top: 0, left: 0, zIndex: 5 },
  full: { flex: 1, borderRadius: 22, overflow: "hidden" },

  // ─── Gold accents ───
  goldAccentTop: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  goldAccentBottom: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  // ─── Shine ───
  shineOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
    zIndex: 4,
  },

  // ─── Card padding ───
  cardPadding: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: "space-between",
    zIndex: 6,
  },

  // ─── Front top row ───
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoPill: {
    backgroundColor: BLACK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(249,195,73,0.35)",
  },
  logoText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  logoDot: { color: GOLD },
  chipImage: {
    width: 40,
    height: 30,
  },

  // ─── Card number block ───
  cardNumberBlock: {
    marginVertical: 6,
  },
  cardNumberLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  cardNumberValue: {
    color: WHITE,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 2.2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ─── Front bottom row ───
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    position: "relative",
  },
  bottomLeft: { flex: 1 },
  bottomRight: {
    alignItems: "flex-end",
    marginRight: 46,
  },
  miniLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  miniLabelGold: {
    color: GOLD,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 4,
    textAlign: "right",
    textTransform: "uppercase",
  },
  miniValue: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ─── Network mark ───
  networkMark: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 44,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  networkCircleGold: {
    position: "absolute",
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    opacity: 0.9,
  },
  networkCircleWhite: {
    position: "absolute",
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    opacity: 0.9,
  },

  // ─── Back card ───
  magStripe: {
    height: 34,
    backgroundColor: "#000",
    marginHorizontal: -22,
    marginTop: -20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(249,195,73,0.2)",
  },
  backContactBlock: {
    alignItems: "flex-start",
    flex: 1,
    justifyContent: "center",
  },
  backNameValue: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  backDivider: {
    width: 44,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 1,
    marginVertical: 10,
    opacity: 0.85,
  },
  backPhoneValue: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  backFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  footerSmall: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  goldBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: "rgba(249,195,73,0.4)",
    borderRadius: 22,
  },

  // ─── Flip hint ───
  flipHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 22,
  },
  flipHintText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "lowercase",
  },

  // ─── Status ───
  statusSection: { width: "100%", marginBottom: 14 },
  statusSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: SUCCESS + "10",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SUCCESS + "30",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SUCCESS,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: SUCCESS,
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },
  statusSub: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "lowercase",
  },

  statusPending: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    backgroundColor: GOLD_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD + "50",
  },
  statusPendingText: {
    fontSize: 13,
    fontWeight: "900",
    color: GOLD_DARK,
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },

  // ─── Activate button ───
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: BLACK,
  },
  activateBtnText: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
    textTransform: "lowercase",
  },

  // ─── Promo ───
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },
  promoInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: LIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 50,
  },
  promoInput: {
    flex: 1,
    color: BLACK,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  promoApplyBtn: {
    backgroundColor: BLACK,
    borderRadius: 14,
    paddingHorizontal: 22,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },

  // ─── Actions ───
  actionsRow: {
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: BLACK,
  },
  actionBtnDark: {
    backgroundColor: BLACK,
    borderColor: BLACK,
  },
  actionBtnDisabled: {
    backgroundColor: LIGHT,
    borderColor: BORDER,
  },
  actionBtnText: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "lowercase",
    letterSpacing: 0.2,
  },
  actionBtnTextDisabled: {
    color: MUTED,
    fontWeight: "700",
  },

  // ─── Footer ───
  footer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 10,
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: "900",
    color: BLACK,
    letterSpacing: -0.5,
  },
  footerText: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
    fontWeight: "600",
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },
});