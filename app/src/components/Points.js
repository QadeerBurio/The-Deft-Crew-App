import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Share, Alert, ActivityIndicator,
  RefreshControl, Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function PointsScreen() {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    referralCount: 0,
    referralCode: "",
    canApplyForTdcCard: false,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

  const fetchUserData = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const response = await axios.get(
        "https://the-deft-crew-production.up.railway.app/api/auth/profile/me",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data;
      setUserData({
        referralCount: data.referralCount || 0,
        referralCode: data.referralCode || "GENERATING...",
        canApplyForTdcCard: data.canApplyForTdcCard || false,
      });
    } catch (error) {
      if (!refreshing) Alert.alert("Sync Error", "Unable to sync your referral data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [token]);

  useEffect(() => {
    if (userData.referralCount > 0) {
      Animated.timing(progressWidth, {
        toValue: Math.min(userData.referralCount / 10, 1),
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [userData.referralCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [token]);

  const referred = userData.referralCount;
  const target = 10;
  const progressPercent = Math.min((referred / target) * 100, 100);
  const shareLink = `https://tdc.app/signup?ref=${userData.referralCode}`;

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const onShare = async () => {
    if (userData.referralCode === "GENERATING...") {
      Alert.alert("Wait", "Your unique code is still being generated.");
      return;
    }
    Animated.sequence([
      Animated.timing(shareScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(shareScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    try {
      await Share.share({
        message: `Join TDC using my referral code: ${userData.referralCode}\nRegister here: ${shareLink}`,
      });
    } catch (error) { Alert.alert("Error", error.message); }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(shareLink);
    Alert.alert("Copied!", "Referral link copied to clipboard.");
  };

  const InfoCard = ({ icon, title, content, color, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(cardAnim, { toValue: 1, duration: 400, delay: 200 + index * 100, useNativeDriver: true }).start();
    }, []);
    
    return (
      <Animated.View style={[styles.infoCard, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <View style={[styles.infoIconCircle, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoText}>{content}</Text>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f9c349" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Progress Card */}
          <Animated.View style={[styles.progressCard, { transform: [{ scale: cardScale }] }]}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.progressGradient}>
              <Text style={styles.progressLabel}>tdc PRIVILEGE MILESTONE</Text>
              
              <View style={styles.milestoneRow}>
                <View style={styles.milestoneItem}>
                  <MaterialCommunityIcons name="account-multiple-plus" size={28} color="#fff" />
                  <Text style={styles.milestoneNum}>{referred}</Text>
                  <Text style={styles.milestoneLabel}>Joins</Text>
                </View>
                
                <View style={styles.milestoneArrow}>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" />
                </View>
                
                <View style={styles.milestoneItem}>
                  <View style={[styles.tdcCardIcon, referred >= 10 && styles.tdcCardActive]}>
                    <MaterialCommunityIcons name="card-account-details-star" size={28} color={referred >= 10 ? "#1a1a1a" : "#666"} />
                  </View>
                  <Text style={[styles.milestoneLabel, referred >= 10 && styles.goldText]}>tdc CARD</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressBar, { width: progressWidthInterpolated }]} />
              </View>
              
              <Text style={styles.progressCount}>{referred}/{target} Referrals</Text>
              <Text style={styles.progressNote}>
                {referred >= 10 
                  ? "🎉 Milestone Achieved! Claim your card below."
                  : `${10 - referred} more referrals needed for the Privilege Card.`}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Info Cards */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              How It Works
            </Text>
            <InfoCard
              icon="account-plus-outline"
              color="#f9c349"
              title="Invite Friends"
              content="Share your unique referral link with verified students to earn referral points."
              index={0}
            />
            <InfoCard
              icon="crown-outline"
              color="#f9c349"
              title="Unlock Privilege Card"
              content="Reach 10 successful referrals to activate your official tdc Privilege Card."
              index={1}
            />
            <InfoCard
              icon="pricetags-outline"
              color="#f9c349"
              title="Enjoy Exclusive Discounts"
              content="Use your tdc Privilege Card for special deals at partner brands across Pakistan."
              index={2}
            />
          </View>

          {/* Referral Link */}
          <View style={styles.linkCard}>
            <Text style={styles.linkLabel}>Your Referral Link</Text>
            <TouchableOpacity style={styles.linkRow} onPress={copyToClipboard} activeOpacity={0.7}>
              <Text style={styles.linkText} numberOfLines={1}>{shareLink}</Text>
              <View style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color="#f9c349" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <View style={styles.actionSection}>
            {referred >= 10 ? (
              <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => Alert.alert("Application Sent", "We are reviewing your referrals!")}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.claimGradient}>
                    <MaterialCommunityIcons name="card-account-details-star" size={20} color="#1a1a1a" />
                    <Text style={styles.claimBtnText}>Claim My tdc Card</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.8}>
                  <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.shareGradient}>
                    <Ionicons name="share-social-outline" size={20} color="#1a1a1a" />
                    <Text style={styles.shareBtnText}>Share My Referral Link</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={14} color="#f9c349" />
            {" "}Referrals are verified when students complete their registration.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  scrollContent: { paddingBottom: 40 },
  
  // Progress Card
  progressCard: { margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: "#f9c349", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 15 },
  progressGradient: { padding: 24, alignItems: 'center' },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 20 },
  
  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 24 },
  milestoneItem: { alignItems: 'center' },
  milestoneNum: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 6 },
  milestoneLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  milestoneArrow: { paddingHorizontal: 10 },
  tdcCardIcon: { 
    width: 50, height: 50, borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  tdcCardActive: { backgroundColor: '#fff' },
  goldText: { color: '#f9c349', fontWeight: '700' },
  
  // Progress Bar
  progressTrack: { 
    height: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 4, marginBottom: 8, overflow: 'hidden' 
  },
  progressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progressCount: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  progressNote: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  
  // Info Section
  infoSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { 
    fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 14,
    flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  infoCard: { 
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16,
    marginBottom: 12, borderWidth: 2, borderColor: '#f0f0f0', alignItems: 'flex-start' 
  },
  infoIconCircle: { 
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center', 
    alignItems: 'center', marginRight: 12 
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 3 },
  infoText: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },
  
  // Link Card
  linkCard: { 
    marginHorizontal: 16, marginTop: 10, backgroundColor: '#f8f8f8', 
    borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#f0f0f0' 
  },
  linkLabel: { fontSize: 11, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, fontSize: 13, color: '#f9c349', fontWeight: '600' },
  copyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  
  // Action
  actionSection: { paddingHorizontal: 16, marginTop: 20 },
  shareBtn: { borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: "#f9c349", shadowOpacity: 0.3, shadowRadius: 15 },
  shareGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center', gap: 10 },
  shareBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  claimBtn: { borderRadius: 16, overflow: 'hidden', elevation: 8 },
  claimGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center', gap: 10 },
  claimBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
  
  footerNote: { textAlign: 'center', color: '#999', fontSize: 11, marginTop: 20, paddingHorizontal: 20, fontWeight: '500' },
});

