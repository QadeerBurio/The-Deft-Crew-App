import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
   StatusBar, Alert, Dimensions, ScrollView, Animated, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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
  const [userData, setUserData] = useState({
    name: "", id: "", phone: "", email: "", website: "www.tdc.co", cardNumber: "0000 0000 0000 0000"
  });

  const viewShotRef = useRef();
  const flipAnimation = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const res = await api.get(`/auth/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;
      setIsVip(data.isVip);
      setPaymentStatus(data.paymentStatus || "None");

      if (data.vipExpiry) {
        const date = new Date(data.vipExpiry);
        setExpiryDate(`${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`);
      }

      setUserData({
        name: data.name || "MEMBER NAME",
        id: data.rollNo || "N/A",
        phone: data.phone || "No Phone",
        email: data.email || "No Email",
        website: data.instagram ? `@${data.instagram}` : "www.tdc.co",
        cardNumber: generateCardNumber(user._id)
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

  const toggleFlip = () => {
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

  const handleDownload = async () => {
  if (!isVip) return Alert.alert("Locked", "Your Gold Membership is not active.");

  try {
    const uri = await captureRef(viewShotRef, {
      format: "png",
      quality: 1,
    });

    const fileName = `TDC_Card_${Date.now()}.png`;
    const newPath = FileSystem.documentDirectory + fileName;

    await FileSystem.copyAsync({
      from: uri,
      to: newPath,
    });

    Alert.alert(
      "Saved",
      "Card saved inside app storage (no gallery permission needed)."
    );
  } catch (e) {
    Alert.alert("Error", "Could not save image.");
  }
};

  // --- Sub-Components ---
  const GoldPattern = ({ vip }) => (
    <View style={styles.patternOverlay}>
      {[...Array(12)].map((_, i) => (
        <View key={i} style={[styles.wavyLine, { right: -50 + (i * 15), opacity: vip ? 0.2 : 0.05, borderColor: '#D4AF37' }]} />
      ))}
    </View>
  );

  const FrontContent = ({ vip }) => (
    <LinearGradient colors={vip ? ['#1a1a1a', '#000000'] : ['#2d3748', '#1a202c']} style={styles.full}>
      <GoldPattern vip={vip} />
      <View style={styles.cardPadding}>
        <View style={styles.rowBetween}>
          <View style={styles.logoContainer}>
            <Text style={[styles.textLogoMain, vip && { color: '#D4AF37' }]}>TDC</Text>
            <View style={styles.divider} />
            <Text style={styles.textLogoSub}>GOLD</Text>
          </View>
          <Image source={CHIP_IMAGE} style={styles.originalChip} resizeMode="contain" />
        </View>
        <View style={styles.middleRow}>
           <View>
              <Text style={[styles.mainTitle, vip && { color: '#E2C275' }]}>MEMBER</Text>
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
          <Text style={[styles.label, vip && { color: '#A0AEC0' }]}>ID NUMBER</Text>
          <Text style={[styles.infoValue, vip && { color: '#FFF' }]}>{userData.id}</Text>
        </View>
      </View>
      {vip && <View style={styles.goldBorder} />}
    </LinearGradient>
  );

  const BackContent = ({ vip }) => (
    <LinearGradient colors={vip ? ['#000000', '#1a1a1a'] : ['#1a202c', '#2d3748']} style={styles.full}>
      <GoldPattern vip={vip} />
      <View style={styles.securityStrip} />
      <View style={styles.cardPadding}>
        <Text style={[styles.backName, vip && { color: '#E2C275' }]}>{userData.name.toUpperCase()}</Text>
        <View style={styles.centerContactBox}>
          <Text style={[styles.contactCenterValue, vip && { color: '#FFF' }]}>{userData.phone}</Text>
          <Text style={styles.contactCenterLabel}>REGISTERED MOBILE</Text>
        </View>
        <View style={styles.backFooter}>
          <Text style={[styles.helplineValue, vip && { color: '#D4AF37' }]}>+92 315 3440945</Text>
          <Text style={[styles.vipTag, vip && { color: '#D4AF37' }]}>{vip ? "GOLD EDITION" : "BASIC MEMBER"}</Text>
        </View>
      </View>
      {vip && <View style={styles.goldBorder} />}
    </LinearGradient>
  );

  if (loading) return <View style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
            <Text style={styles.header}>Member Portal</Text>
            <Text style={styles.subHeader}>The Deft Crew Professional Identity</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={toggleFlip} style={styles.displayCardContainer}>
          <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }, styles.abs, { backfaceVisibility: 'hidden' }]}>
            <FrontContent vip={isVip} />
          </Animated.View>
          <Animated.View style={[styles.card, { transform: [{ rotateY: backInterpolate }] }, { backfaceVisibility: 'hidden' }]}>
            <BackContent vip={isVip} />
          </Animated.View>
        </TouchableOpacity>

        {/* --- DYNAMIC STATUS SECTION --- */}
        <View style={styles.statusSection}>
            {isVip ? (
                <View style={styles.statusBadgeSuccess}>
                    <Text style={styles.statusTextSuccess}>● PREMIUM ACCESS ACTIVE</Text>
                </View>
            ) : paymentStatus === "Pending Verification" ? (
                <View style={styles.statusBadgePending}>
                    <ActivityIndicator size="small" color="#D4AF37" style={{marginRight: 10}} />
                    <Text style={styles.statusTextPending}>WAITING FOR VERIFICATION</Text>
                </View>
            ) : (
                <TouchableOpacity 
                    style={styles.activateBtn} 
                    onPress={() => navigation.navigate('Payment')}
                >
                    <Text style={styles.activateBtnText}>ACTIVATE GOLD CARD (RS. 750)</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* PROMO SECTION */}
        {!isVip && paymentStatus !== "Pending Verification" && (
            <View style={styles.promoWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Promo Code"
                    placeholderTextColor="#4A5568"
                    value={redeemCode}
                    onChangeText={(val) => setRedeemCode(val.toUpperCase())}
                    autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.applyBtn} onPress={() => Alert.alert("Processing", "Validating code...")}>
                    <Text style={styles.applyText}>APPLY</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* DOWNLOAD BUTTON */}
        <TouchableOpacity 
            style={[styles.dlBtn, isVip ? styles.dlBtnActive : styles.dlBtnDisabled]} 
            onPress={handleDownload}
            disabled={!isVip}
        >
          <Text style={[styles.dlText, isVip && { color: '#000' }]}>
            {isVip ? "DOWNLOAD DIGITAL CARD" : "ACTIVATE TO DOWNLOAD"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>Tap the card to view the back side</Text>

        {/* Hidden ViewShot Capture */}
        <View style={styles.hiddenCapture}>
          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }}>
            <View style={styles.sideBySide}>
                <View style={styles.card}><FrontContent vip={isVip} /></View>
                <View style={[styles.card, { marginTop: 20 }]}><BackContent vip={isVip} /></View>
            </View>
          </ViewShot>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 20, alignItems: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 25 },
  header: { color: '#FFF', fontSize: 26, fontWeight: 'bold', letterSpacing: 1 },
  subHeader: { color: '#718096', fontSize: 13, marginTop: 4 },
  displayCardContainer: { width: width - 40, height: 230, marginBottom: 10 },
  card: { width: width - 40, height: 230, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#D4AF37', shadowOpacity: 0.1, shadowRadius: 10 },
  abs: { position: 'absolute', top: 0, zIndex: 5 },
  full: { flex: 1 },
  patternOverlay: { ...StyleSheet.absoluteFillObject },
  wavyLine: { position: 'absolute', height: '150%', width: 200, borderWidth: 0.5, borderRadius: 100, top: -50, transform: [{ rotate: '15deg' }] },
  cardPadding: { padding: 24, flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  textLogoMain: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  textLogoSub: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginLeft: 8, fontWeight: '300' },
  divider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
  originalChip: { width: 48, height: 38 },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15 },
  mainTitle: { color: '#FFF', fontSize: 24, fontWeight: '300', letterSpacing: 2 },
  cardNumberText: { color: '#FFF', fontSize: 19, fontFamily: 'monospace', marginTop: 5, letterSpacing: 1 },
  validContainer: { alignItems: 'center' },
  validLabel: { color: '#D4AF37', fontSize: 8, fontWeight: 'bold' },
  validDate: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  bottomInfo: { marginTop: 'auto' },
  label: { color: '#718096', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  infoValue: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  securityStrip: { height: 40, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', marginTop: 20 },
  backName: { color: '#FFF', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  centerContactBox: { flex: 1, justifyContent: 'center' },
  contactCenterValue: { color: '#FFF', fontSize: 18, letterSpacing: 1 },
  contactCenterLabel: { color: '#718096', fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  backFooter: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helplineValue: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  vipTag: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  goldBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.3)', borderRadius: 20 },
  statusSection: { marginTop: 25, width: '100%' },
  statusBadgeSuccess: { padding: 16, backgroundColor: 'rgba(46, 204, 113, 0.15)', borderRadius: 14, borderWidth: 1, borderColor: '#2ecc71', alignItems: 'center' },
  statusBadgePending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: 14, borderWidth: 1, borderColor: '#D4AF37' },
  statusTextSuccess: { color: '#2ecc71', fontWeight: 'bold', letterSpacing: 1 },
  statusTextPending: { color: '#D4AF37', fontWeight: 'bold', letterSpacing: 1 },
  activateBtn: { backgroundColor: '#D4AF37', padding: 18, borderRadius: 14, alignItems: 'center', shadowColor: '#D4AF37', shadowOpacity: 0.3, shadowRadius: 5 },
  activateBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  promoWrapper: { flexDirection: 'row', marginTop: 15, gap: 10, width: '100%' },
  input: { flex: 1, backgroundColor: '#1A202C', color: '#FFF', borderRadius: 12, padding: 15, fontSize: 14, borderWidth: 1, borderColor: '#2D3748' },
  applyBtn: { backgroundColor: '#2D3748', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  applyText: { color: '#FFF', fontWeight: 'bold' },
  dlBtn: { padding: 18, borderRadius: 14, width: '100%', marginTop: 15, alignItems: 'center' },
  dlBtnActive: { backgroundColor: '#D4AF37' },
  dlBtnDisabled: { backgroundColor: '#1A202C' },
  dlText: { color: '#4A5568', fontWeight: 'bold', fontSize: 14 },
  footerNote: { color: '#4A5568', fontSize: 12, marginTop: 15 },
  hiddenCapture: { position: 'absolute', left: -5000 },
  sideBySide: { padding: 20, backgroundColor: '#000' },
});