// ==================== PremiumMemberCard.js (UPDATED WITH IMAGE STYLE) ====================
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  StatusBar, Alert, Dimensions, ScrollView, Animated, ActivityIndicator, Image,
  Platform, PermissionsAndroid, Linking, ImageBackground
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
const BACKGROUND_IMAGE = require('../../../assets/images/background.jpeg');

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

  const handleDownload = async () => {
    if (!isVip) {
      Alert.alert("Locked", "Your Gold Membership is not active.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      if (Platform.OS === 'android') {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          Alert.alert("Permission Denied", "Cannot save card without storage permission.");
          setDownloading(false);
          return;
        }
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Cannot save card without media library permission.");
        setDownloading(false);
        return;
      }

      console.log("📸 Starting capture...");
      const uri = await viewShotRef.current.capture();
      console.log("📸 Captured URI:", uri);

      if (!uri) {
        Alert.alert("Error", "Failed to capture card image.");
        setDownloading(false);
        return;
      }

      if (!uri.startsWith('file://') && !uri.startsWith('/')) {
        console.error("Invalid URI format:", uri);
        Alert.alert("Error", "Invalid image format captured.");
        setDownloading(false);
        return;
      }

      const fileName = `TDC_Card_${Date.now()}.png`;
      
      let fileUri;
      if (Platform.OS === 'android') {
        fileUri = FileSystem.cacheDirectory + fileName;
      } else {
        fileUri = FileSystem.documentDirectory + fileName;
      }
      
      console.log("💾 Saving to:", fileUri);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        console.error("Source file does not exist:", uri);
        Alert.alert("Error", "Image file not found. Please try again.");
        setDownloading(false);
        return;
      }

      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });

      const copiedFileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!copiedFileInfo.exists) {
        console.error("File was not copied successfully");
        Alert.alert("Error", "Failed to save image. Please try again.");
        setDownloading(false);
        return;
      }

      console.log("✅ File saved successfully at:", fileUri);

      try {
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        console.log("📱 Asset created:", asset);
        
        const albumName = 'TDC Cards';
        const album = await MediaLibrary.getAlbumAsync(albumName);
        
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          console.log("✅ Added to existing album:", albumName);
        } else {
          await MediaLibrary.createAlbumAsync(albumName, asset, false);
          console.log("✅ Created new album:", albumName);
        }

        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log("🧹 Cleaned up temporary file");

        Alert.alert(
          "✅ Card Saved!",
          `Your TDC Card has been saved to your device gallery in the "${albumName}" album.`,
          [
            { 
              text: "Open Gallery", 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('photos://');
                } else {
                  Linking.openURL('content://media/internal/images/media');
                }
              }
            },
            { text: "OK", style: "cancel" }
          ]
        );
      } catch (mediaError) {
        console.error("❌ MediaLibrary error:", mediaError);
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        Alert.alert("✅ Card Saved!", "Your TDC Card has been saved to your device gallery.");
      }

    } catch (error) {
      console.error("❌ Download error:", error);
      Alert.alert("Error", error.message || "Could not save image. Please try again.");
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
        await new Promise(resolve => setTimeout(resolve, 300));
      }

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
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }

    } catch (error) {
      console.error("❌ Share error:", error);
      Alert.alert("Error", "Could not share card. Please try again.");
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
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // ==========================================
  // FRONT CARD - Updated Design
  // ==========================================
  const FrontContent = ({ vip }) => (
    <ImageBackground 
      source={BACKGROUND_IMAGE} 
      style={styles.full}
      imageStyle={styles.backgroundImageStyle}
    >
      <LinearGradient 
        colors={vip ? ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)'] : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} 
        style={styles.overlayGradient}
      />
      
      <GoldPattern vip={vip} />
      
      <View style={styles.cardPadding}>
        {/* Top Row: Logo + Chip */}
        <View style={styles.rowBetween}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.textLogoMain}>tdc<Text style={styles.logoHighlight}>.</Text></Text>
            </View>
          </View>
          <Image source={CHIP_IMAGE} style={styles.originalChip} resizeMode="contain" />
        </View>
        
        {/* Middle: Member ID in Center */}
        <View style={styles.middleRowCentered}>
          <View style={styles.centerContent}>
            <Text style={styles.memberLabel}>CARD NUMBER</Text>
            <Text style={[styles.memberIdText, vip && styles.vipText]}>{userData.cardNumber}</Text>
          </View>
        </View>
        
        {/* Bottom: Card Number and Valid Thru */}
        <View style={styles.bottomRow}>
          <View style={styles.cardNumberContainer}>
            <Text style={styles.cardNumberLabel}>MEMBER</Text>
            <Text style={[styles.memberIdText, vip && styles.vipText]}>{userData.id}</Text>
          </View>
          {vip && (
            <View style={styles.validContainer}>
              <Text style={styles.validLabel}>VALID THRU</Text>
              <Text style={styles.validDate}>{expiryDate}</Text>
            </View>
          )}
        </View>
      </View>
      
      {vip && <View style={styles.goldBorder} />}
    </ImageBackground>
  );

  // ==========================================
  // BACK CARD - Updated Design
  // ==========================================
  const BackContent = ({ vip }) => (
    <ImageBackground 
      source={BACKGROUND_IMAGE} 
      style={styles.full}
      imageStyle={styles.backgroundImageStyle}
    >
      <LinearGradient 
        colors={vip ? ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)'] : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} 
        style={styles.overlayGradient}
      />
      
      <GoldPattern vip={vip} />
      
      <View style={styles.cardPadding}>
        {/* Black Bar - Barcode Style */}
        <View style={styles.barcodeStrip}>
          <View style={styles.barcodePattern}>
            {[...Array(30)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.barcodeLine, 
                  { 
                    height: 20 + Math.random() * 15,
                    width: 2 + Math.random() * 7,
                    backgroundColor: i % 3 === 0 ? '#000' : '#333'
                  }
                ]} 
              />
            ))}
          </View>
        </View>
        
        {/* Name */}
        <Text style={[styles.backName, vip && styles.vipName]}>{userData.name.toUpperCase()}</Text>
        
        {/* Contact Info - Centered */}
        <View style={styles.centerContactBox}>
          <Text style={[styles.contactValue, vip && styles.vipText]}>{userData.phone}</Text>
          <Text style={styles.contactLabel}>REGISTERED MOBILE</Text>
        </View>
        
        {/* Bottom Footer */}
        <View style={styles.backFooter}>
          <Text style={[styles.footerTag, vip && styles.vipTag]}>
            {vip ? " PREMIER CARD" : "BASIC MEMBER"}
          </Text>
          <Text style={[styles.footerTag, vip && styles.vipTag]}>tdc<Text style={styles.logoHighlight}>.</Text></Text>
        </View>
      </View>
      
      {vip && <View style={styles.goldBorder} />}
    </ImageBackground>
  );

  const GoldPattern = ({ vip }) => (
    <View style={styles.patternOverlay}>
      {[...Array(12)].map((_, i) => (
        <View key={i} style={[styles.wavyLine, { right: -50 + (i * 15), opacity: vip ? 0.12 : 0.05, borderColor: '#FFD700' }]} />
      ))}
    </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Animated.View style={[styles.headerNav, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Membership Card</Text>
          <Text style={styles.headerSubtitle}>@{user?.name?.toLowerCase()?.replace(/\s/g, '') || 'member'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.displayCardContainer}>
          <ViewShot 
            ref={viewShotRef} 
            options={{ 
              format: "png", 
              quality: 1.0,
              snapshotContentContainer: true,
            }}
            style={styles.viewShotStyle}
          >
            <TouchableOpacity activeOpacity={0.95} onPress={toggleFlip} style={styles.cardWrapper}>
              <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }, styles.abs, { backfaceVisibility: 'hidden' }]}>
                <FrontContent vip={isVip} />
              </Animated.View>
              <Animated.View style={[styles.card, { transform: [{ rotateY: backInterpolate }] }, styles.abs, { backfaceVisibility: 'hidden' }]}>
                <BackContent vip={isVip} />
              </Animated.View>
            </TouchableOpacity>
          </ViewShot>
        </View>

        <Text style={styles.flipHint}>
          <Ionicons name="swap-horizontal-outline" size={14} color="#666" /> Tap card to flip
        </Text>

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
              <LinearGradient colors={['#f9c349', '#e8b830']} style={styles.activateBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="diamond" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.activateBtnText}>ACTIVATE GOLD CARD (RS. 750)</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>

        {!isVip && paymentStatus !== "Pending Verification" && (
          <Animated.View style={[styles.promoWrapper, { opacity: sectionFade }]}>
            <View style={styles.promoInputRow}>
              <View style={styles.promoIconBox}>
                <Ionicons name="pricetag-outline" size={18} color="#f9c349" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter Promo Code"
                placeholderTextColor="#999"
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

        <Animated.View style={[styles.actionButtons, { opacity: sectionFade }]}>
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
              <View style={styles.dlBtnDisabledContent}>
                <Ionicons name="lock-closed-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.dlTextDisabled}>ACTIVATE TO DOWNLOAD</Text>
              </View>
            )}
          </TouchableOpacity>

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

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>tdc<Text style={styles.logoHighlight}>.</Text></Text>
          <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  
  headerNav: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 14, 
    paddingVertical: Platform.OS === 'ios' ? 6 : 10,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    backgroundColor: '#ffffff',
  },
  backBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#f5f5f5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#050505', 
    letterSpacing: 0.5 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: '#666', 
    fontWeight: '500', 
    marginTop: 1 
  },
  
  scrollContent: { 
    padding: 16, 
    alignItems: 'center', 
    paddingBottom: 40 
  },
  
  displayCardContainer: { 
    width: width - 32, 
    height: 220, 
    marginTop: 12, 
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewShotStyle: {
    width: width - 32,
    height: 220,
  },
  cardWrapper: { 
    width: width - 32, 
    height: 220,
    position: 'relative',
  },
  card: { 
    width: width - 32, 
    height: 220, 
    borderRadius: 20, 
    overflow: 'hidden', 
    elevation: 10, 
    shadowColor: '#f9c349', 
    shadowOpacity: 0.1, 
    shadowRadius: 10,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  abs: { position: 'absolute', top: 0, left: 0, zIndex: 5 },
  full: { flex: 1 },
  
  backgroundImageStyle: {
    resizeMode: 'cover',
    borderRadius: 20,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  
  patternOverlay: { ...StyleSheet.absoluteFillObject },
  wavyLine: { 
    position: 'absolute', 
    height: '150%', 
    width: 200, 
    borderWidth: 0.5, 
    borderRadius: 100, 
    top: -50, 
    transform: [{ rotate: '15deg' }] 
  },
  cardPadding: { padding: 20, flex: 1 },
  
  // Front Card Styles
  rowBetween: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  logoContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  logoCircle: {
    backgroundColor: '#000',
    height: 45, 
    width: 45, 
    borderRadius: 45, 
    alignContent: 'center', 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  textLogoMain: { 
    color: '#FFF', 
    fontSize: 22, 
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
  },
  logoHighlight: {
    color: '#f9c349'
  },
  originalChip: { width: 48, height: 38 },
  
  // Member ID in Center
  middleRowCentered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginVertical: 5,
  },
  centerContent: { 
    alignItems: 'center',
  },
  memberLabel: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 12, 
    fontWeight: '900', 
    letterSpacing: 2,
    marginBottom: 4,
  },
  memberIdText: { 
    color: '#FFF', 
    fontSize: 28, 
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 4,
  },
  vipText: {
    color: '#f9c349'
  },
  
  // Bottom Row
  bottomRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  cardNumberContainer: { 
    flex: 1,
  },
  cardNumberLabel: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 8, 
    fontWeight: '600', 
    letterSpacing: 1 
  },
  validContainer: { 
    alignItems: 'center',
    marginLeft: 10,
  },
  validLabel: { 
    color: '#f9c349', 
    fontSize: 7, 
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  validDate: { 
    color: '#FFF', 
    fontSize: 12, 
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 2,
  },
  
  // Back Card Styles
  barcodeStrip: {
    backgroundColor: 'rgba(255, 248, 220, 0.95)',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodePattern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    height: 35,
    flexWrap: 'wrap',
  },
  barcodeLine: {
    marginHorizontal: 0.5,
  },
  
  backName: { 
    color: '#FFF', 
    fontSize: 20, 
    fontWeight: 'bold', 
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
    marginBottom: 8,
  },
  vipName: {
    color: '#f9c349'
  },
  centerContactBox: { 
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactValue: { 
    color: '#FFF', 
    fontSize: 18, 
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
  },
  contactLabel: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 8, 
    marginTop: 4, 
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backFooter: { 
    marginTop: 'auto', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerTag: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 1,
  },
  vipTag: {
    color: '#f9c349'
  },
  
  goldBorder: { 
    ...StyleSheet.absoluteFillObject, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 215, 0, 0.3)', 
    borderRadius: 20,
  },
  
  flipHint: { 
    color: '#666', 
    fontSize: 12, 
    fontWeight: '500', 
    marginBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  statusSection: { width: '100%', marginTop: 4 },
  statusBadgeSuccess: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 16, 
    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: 'rgba(76, 175, 80, 0.3)',
    flexWrap: 'wrap',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusBadgePending: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 16, 
    backgroundColor: 'rgba(255, 215, 0, 0.1)', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statusTextSuccess: { 
    color: '#4CAF50', 
    fontWeight: '800', 
    letterSpacing: 1, 
    fontSize: 13 
  },
  statusTextPending: { 
    color: '#f9c349', 
    fontWeight: '800', 
    letterSpacing: 1, 
    fontSize: 13 
  },
  statusExpiry: { 
    color: '#666', 
    fontSize: 11, 
    fontWeight: '500', 
    marginLeft: 10 
  },
  activateBtn: { 
    borderRadius: 14, 
    overflow: 'hidden', 
    elevation: 5, 
    shadowColor: '#f9c349', 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  activateBtnGradient: { 
    padding: 16, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  activateBtnText: { 
    color: '#000000', 
    fontWeight: '900', 
    fontSize: 14, 
    letterSpacing: 0.5 
  },
  
  promoWrapper: { width: '100%', marginTop: 16 },
  promoInputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#e0e0e0', 
    paddingHorizontal: 14, 
    marginBottom: 10,
  },
  promoIconBox: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,215,0,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  input: { 
    flex: 1, 
    color: '#0b0b0b', 
    paddingVertical: 14, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  applyBtn: { borderRadius: 14, overflow: 'hidden' },
  applyBtnGradient: { 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    alignItems: 'center' 
  },
  applyText: { 
    color: '#f9c349', 
    fontWeight: '800', 
    fontSize: 13 
  },
  
  actionButtons: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  
  dlBtn: { 
    borderRadius: 14, 
    width: '100%', 
    overflow: 'hidden',
  },
  dlBtnActive: { 
    overflow: 'hidden' 
  },
  dlBtnGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 14, 
    width: '100%' 
  },
  dlBtnDisabled: { 
    backgroundColor: '#f5f5f5', 
    borderWidth: 1.5, 
    borderColor: '#e0e0e0',
    padding: 16,
    borderRadius: 14,
  },
  dlBtnDisabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlTextActive: { 
    color: '#f9c349', 
    fontWeight: '800', 
    fontSize: 14, 
    letterSpacing: 0.5 
  },
  dlTextDisabled: { 
    color: '#999', 
    fontWeight: '600', 
    fontSize: 13 
  },
  
  shareBtnCard: { 
    borderRadius: 14, 
    overflow: 'hidden', 
    width: '100%',
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
  
  footer: { 
    alignItems: 'center', 
    marginTop: 30, 
    marginBottom: 10 
  },
  footerLogo: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#000' 
  },
  footerText: { 
    fontSize: 11, 
    color: '#666', 
    marginTop: 4, 
    fontWeight: '500' 
  },
});