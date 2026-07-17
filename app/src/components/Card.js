// ==================== PremiumMemberCard.js (FIXED) ====================
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  StatusBar, Alert, Dimensions, ScrollView, Animated, ActivityIndicator, Image,
  Platform, PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CHIP_IMAGE = require('../../../assets/images/chip.png'); 

export default function PremiumMemberCard() {
  const { user, token } = useContext(AuthContext);
  const navigation = useNavigation();

  const [redeemCode, setRedeemCode] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [expiryDate, setExpiryDate] = useState('--/--');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("None");
  const [downloading, setDownloading] = useState(false);
  const [userData, setUserData] = useState({
    name: "", id: "", phone: "", email: "", website: "www.tdc.co", cardNumber: "0000 0000 0000 0000"
  });

  const viewShotRef = useRef();
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const sectionFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(sectionFade, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  // ==========================================
  // FETCH USER DATA - CHECK VIP STATUS
  // ==========================================
  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;
      
      console.log("📊 PremiumCard - User Data:", {
        isVip: data.isVip,
        paymentStatus: data.paymentStatus,
        referralCount: data.referralCount
      });
      
      const isVipActive = data.isVip === true || data.paymentStatus === "Verified";
      setIsVip(isVipActive);
      setPaymentStatus(data.paymentStatus || "None");

      if (data.vipExpiry) {
        const date = new Date(data.vipExpiry);
        setExpiryDate(`${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`);
      }

      setUserData({
        name: data.name || "MEMBER NAME",
        id: data.rollNo || data._id?.slice(-6) || "N/A",
        phone: data.phone || "No Phone",
        email: data.email || "No Email",
        website: data.instagram ? `@${data.instagram}` : "www.tdc.co",
        cardNumber: generateCardNumber(data._id)
      });
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCardNumber = (mongoId) => {
    if (!mongoId) return "4412 8800 1234 1000";
    const seed = parseInt(mongoId.substring(mongoId.length - 6), 16);
    const lastFour = 1000 + (seed % 9000); 
    return `4412 88${mongoId.substring(0, 2)} ${mongoId.substring(2, 6)} ${lastFour}`;
  };

  // ==========================================
  // REQUEST PERMISSIONS FOR ANDROID
  // ==========================================
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "App needs access to storage to save your card.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // ==========================================
  // DOWNLOAD CARD - FIXED
  // ==========================================
  const handleDownload = async () => {
    if (!isVip) {
      Alert.alert("Locked", "Your Gold Membership is not active.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      // Request permissions for Android
      if (Platform.OS === 'android') {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          Alert.alert("Permission Denied", "Cannot save card without storage permission.");
          setDownloading(false);
          return;
        }
      }

      // Request media library permissions for iOS
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Cannot save card without media library permission.");
        setDownloading(false);
        return;
      }

      // Capture the view
      const uri = await viewShotRef.current.capture();
      console.log("📸 Captured URI:", uri);

      if (!uri) {
        Alert.alert("Error", "Failed to capture card image.");
        setDownloading(false);
        return;
      }

      const fileName = `TDC_Card_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Copy to documents directory
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });

      console.log("💾 File saved to:", fileUri);

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      if (asset) {
        // Create album if it doesn't exist
        const album = await MediaLibrary.getAlbumAsync('TDC Cards');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('TDC Cards', asset, false);
        }

        Alert.alert(
          "✅ Card Saved!",
          "Your TDC Card has been saved to your device gallery.",
          [
            { text: "Open Gallery", onPress: () => {
              // For iOS, we can open the gallery app
              if (Platform.OS === 'ios') {
                Linking.openURL('photos://');
              }
            }},
            { text: "OK", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to save to gallery.");
      }

    } catch (error) {
      console.error("❌ Download error:", error);
      Alert.alert("Error", error.message || "Could not save image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ==========================================
  // SHARE CARD - NEW OPTION
  // ==========================================
  const handleShare = async () => {
    if (!isVip) {
      Alert.alert("Locked", "Your Gold Membership is not active.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await viewShotRef.current.capture();
      
      if (!uri) {
        Alert.alert("Error", "Failed to capture card image.");
        return;
      }

      const fileName = `TDC_Card_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });

      const shareResult = await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your TDC Card',
      });

      if (shareResult.action === Sharing.SharedAction) {
        console.log("📤 Card shared successfully");
      }

    } catch (error) {
      console.error("❌ Share error:", error);
      Alert.alert("Error", "Could not share card. Please try again.");
    }
  };

  const toggleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnimation, {
      toValue: flipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const GoldPattern = ({ vip }) => (
    <View style={styles.patternOverlay}>
      {[...Array(12)].map((_, i) => (
        <View key={i} style={[styles.wavyLine, { right: -50 + (i * 15), opacity: vip ? 0.15 : 0.05, borderColor: '#f9c349' }]} />
      ))}
    </View>
  );

  const FrontContent = ({ vip }) => (
    <LinearGradient colors={vip ? ['#1a1a1a', '#0a0a0a'] : ['#2d3748', '#1a202c']} style={styles.full}>
      <GoldPattern vip={vip} />
      <View style={styles.cardPadding}>
        <View style={styles.rowBetween}>
          <View style={styles.logoContainer}>
            <Text style={[styles.textLogoMain, vip && { color: '#f9c349' }]}>tdc<Text style={{color: '#f9c349'}}>.</Text></Text>
            <View style={styles.divider} />
            <Text style={[styles.textLogoSub, vip && { color: '#f9c349' }]}>GOLD</Text>
          </View>
          <Image source={CHIP_IMAGE} style={styles.originalChip} resizeMode="contain" />
        </View>
        <View style={styles.middleRow}>
          <View>
            <Text style={[styles.mainTitle, vip && { color: '#f9c349' }]}>MEMBER</Text>
            <Text style={[styles.cardNumberText, vip && { color: '#FFF' }]}>{userData.cardNumber}</Text>
          </View>
          {vip && (
            <View style={styles.validContainer}>
              <Text style={styles.validLabel}>VALID THRU</Text>
              <Text style={styles.validDate}>{expiryDate}</Text>
            </View>
          )}
        </View>
        <View style={styles.bottomInfo}>
          <Text style={styles.label}>ID NUMBER</Text>
          <Text style={[styles.infoValue, vip && { color: '#FFF' }]}>{userData.id}</Text>
        </View>
      </View>
      {vip && <View style={styles.goldBorder} />}
    </LinearGradient>
  );

  const BackContent = ({ vip }) => (
    <LinearGradient colors={vip ? ['#0a0a0a', '#1a1a1a'] : ['#1a202c', '#2d3748']} style={styles.full}>
      <GoldPattern vip={vip} />
      <View style={styles.securityStrip} />
      <View style={styles.cardPadding}>
        <Text style={[styles.backName, vip && { color: '#f9c349' }]}>{userData.name.toUpperCase()}</Text>
        <View style={styles.centerContactBox}>
          <Text style={[styles.contactCenterValue, vip && { color: '#FFF' }]}>{userData.phone}</Text>
          <Text style={styles.contactCenterLabel}>REGISTERED MOBILE</Text>
        </View>
        <View style={styles.backFooter}>
          <Text style={[styles.helplineValue, vip && { color: '#f9c349' }]}>+92 315 3440945</Text>
          <Text style={[styles.vipTag, vip && { color: '#f9c349' }]}>{vip ? "GOLD EDITION" : "BASIC MEMBER"}</Text>
        </View>
      </View>
      {vip && <View style={styles.goldBorder} />}
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={{ color: '#999', marginTop: 12, fontWeight: '500' }}>Loading card...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <Animated.View style={[styles.headerNav, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Membership Card</Text>
          <Text style={styles.headerSubtitle}>@{user?.name?.toLowerCase()?.replace(/\s/g, '') || 'member'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Card Section - Wrap in ViewShot */}
        <ViewShot 
          ref={viewShotRef} 
          options={{ 
            format: "png", 
            quality: 1.0,
            width: width - 32,
            height: 220,
          }}
          style={styles.displayCardContainer}
        >
          <TouchableOpacity activeOpacity={0.95} onPress={toggleFlip} style={styles.cardWrapper}>
            <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }, styles.abs, { backfaceVisibility: 'hidden' }]}>
              <FrontContent vip={isVip} />
            </Animated.View>
            <Animated.View style={[styles.card, { transform: [{ rotateY: backInterpolate }] }, { backfaceVisibility: 'hidden' }]}>
              <BackContent vip={isVip} />
            </Animated.View>
          </TouchableOpacity>
        </ViewShot>

        {/* Flip Hint */}
        <Text style={styles.flipHint}>
          <Ionicons name="swap-horizontal-outline" size={14} color="#666" /> Tap card to flip
        </Text>

        {/* Status Section */}
        <Animated.View style={[styles.statusSection, { opacity: sectionFade }]}>
          {isVip ? (
            <View style={styles.statusBadgeSuccess}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusTextSuccess}>PREMIUM ACCESS ACTIVE</Text>
              {expiryDate !== '--/--' && (
                <Text style={styles.statusExpiry}>Expires: {expiryDate}</Text>
              )}
            </View>
          ) : paymentStatus === "Pending Verification" ? (
            <View style={styles.statusBadgePending}>
              <ActivityIndicator size="small" color="#f9c349" style={{ marginRight: 10 }} />
              <Text style={styles.statusTextPending}>WAITING FOR VERIFICATION</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.activateBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                navigation.navigate('Payment');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#f9c349', '#f7b733']} style={styles.activateBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="diamond" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.activateBtnText}>ACTIVATE GOLD CARD (RS. 750)</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Promo Section */}
        {!isVip && paymentStatus !== "Pending Verification" && (
          <Animated.View style={[styles.promoWrapper, { opacity: sectionFade }]}>
            <View style={styles.promoInputRow}>
              <View style={styles.promoIconBox}>
                <Ionicons name="pricetag-outline" size={18} color="#f9c349" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter Promo Code"
                placeholderTextColor="#666"
                value={redeemCode}
                onChangeText={(val) => setRedeemCode(val.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert("Processing", "Validating code...");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.applyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.applyText}>APPLY</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Download & Share Buttons */}
        <Animated.View style={{ opacity: sectionFade, width: '100%', gap: 10 }}>
          {/* Download Button */}
          <TouchableOpacity 
            style={[styles.dlBtn, isVip ? styles.dlBtnActive : styles.dlBtnDisabled]} 
            onPress={handleDownload}
            disabled={!isVip || downloading}
            activeOpacity={0.8}
          >
            {isVip ? (
              <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.dlBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {downloading ? (
                  <ActivityIndicator size="small" color="#f9c349" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#f9c349" style={{ marginRight: 8 }} />
                    <Text style={styles.dlTextActive}>DOWNLOAD DIGITAL CARD</Text>
                  </>
                )}
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.dlTextDisabled}>ACTIVATE TO DOWNLOAD</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share Button (only show for VIP) */}
          {isVip && (
            <TouchableOpacity 
              style={styles.shareBtnCard} 
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#2d2d2d', '#1a1a1a']} style={styles.shareBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="share-social-outline" size={18} color="#f9c349" style={{ marginRight: 8 }} />
                <Text style={styles.shareBtnText}>SHARE CARD</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>tdc<Text style={{ color: '#f9c349' }}>.</Text></Text>
          <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // Header Nav
  headerNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#000',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 11, color: '#666', fontWeight: '500', marginTop: 1 },
  
  scrollContent: { padding: 16, alignItems: 'center', paddingBottom: 40 },
  
  // Card
  displayCardContainer: { width: width - 32, height: 220, marginTop: 12, marginBottom: 8 },
  cardWrapper: { width: width - 32, height: 220 },
  card: { width: width - 32, height: 220, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#f9c349', shadowOpacity: 0.1, shadowRadius: 10 },
  abs: { position: 'absolute', top: 0, zIndex: 5 },
  full: { flex: 1 },
  patternOverlay: { ...StyleSheet.absoluteFillObject },
  wavyLine: { position: 'absolute', height: '150%', width: 200, borderWidth: 0.5, borderRadius: 100, top: -50, transform: [{ rotate: '15deg' }] },
  cardPadding: { padding: 24, flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  textLogoMain: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  textLogoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginLeft: 8, fontWeight: '300' },
  divider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 },
  originalChip: { width: 48, height: 38 },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15 },
  mainTitle: { color: '#FFF', fontSize: 22, fontWeight: '300', letterSpacing: 2 },
  cardNumberText: { color: '#FFF', fontSize: 18, fontFamily: 'monospace', marginTop: 5, letterSpacing: 1 },
  validContainer: { alignItems: 'center' },
  validLabel: { color: '#f9c349', fontSize: 8, fontWeight: 'bold' },
  validDate: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  bottomInfo: { marginTop: 'auto' },
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  infoValue: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  securityStrip: { height: 40, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', marginTop: 20 },
  backName: { color: '#FFF', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  centerContactBox: { flex: 1, justifyContent: 'center' },
  contactCenterValue: { color: '#FFF', fontSize: 18, letterSpacing: 1 },
  contactCenterLabel: { color: '#666', fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  backFooter: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helplineValue: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  vipTag: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  goldBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderColor: 'rgba(249, 195, 73, 0.3)', borderRadius: 20 },
  
  // Flip Hint
  flipHint: { color: '#666', fontSize: 12, fontWeight: '500', marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  
  // Status Section
  statusSection: { width: '100%', marginTop: 4 },
  statusBadgeSuccess: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 14, 
    borderWidth: 1.5, borderColor: 'rgba(76, 175, 80, 0.3)',
    flexWrap: 'wrap',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusBadgePending: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, backgroundColor: 'rgba(249, 195, 73, 0.1)', borderRadius: 14, 
    borderWidth: 1.5, borderColor: 'rgba(249, 195, 73, 0.3)',
  },
  statusTextSuccess: { color: '#4CAF50', fontWeight: '800', letterSpacing: 1, fontSize: 13 },
  statusTextPending: { color: '#f9c349', fontWeight: '800', letterSpacing: 1, fontSize: 13 },
  statusExpiry: { color: '#666', fontSize: 11, fontWeight: '500', marginLeft: 10 },
  activateBtn: { borderRadius: 14, overflow: 'hidden', elevation: 5, shadowColor: '#f9c349', shadowOpacity: 0.3, shadowRadius: 8 },
  activateBtnGradient: { padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  activateBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  
  // Promo
  promoWrapper: { width: '100%', marginTop: 16 },
  promoInputRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', 
    borderRadius: 14, borderWidth: 1.5, borderColor: '#2a2a2a', paddingHorizontal: 14, marginBottom: 10,
  },
  promoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,195,73,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  input: { flex: 1, color: '#FFF', paddingVertical: 14, fontSize: 14, fontWeight: '500' },
  applyBtn: { borderRadius: 14, overflow: 'hidden' },
  applyBtnGradient: { paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
  applyText: { color: '#f9c349', fontWeight: '800', fontSize: 13 },
  
  // Download Button
  dlBtn: { padding: 16, borderRadius: 14, width: '100%', marginTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  dlBtnActive: { overflow: 'hidden' },
  dlBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, width: '100%' },
  dlBtnDisabled: { backgroundColor: '#1a1a1a', borderWidth: 1.5, borderColor: '#2a2a2a' },
  dlTextActive: { color: '#f9c349', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  dlTextDisabled: { color: '#666', fontWeight: '600', fontSize: 13 },
  
  // Share Button
  shareBtnCard: { 
    borderRadius: 14, 
    overflow: 'hidden', 
    width: '100%',
    marginTop: 8,
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  shareBtnText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  
  // Footer
  footer: { alignItems: 'center', marginTop: 30, marginBottom: 10 },
  footerLogo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  footerText: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '500' },
});