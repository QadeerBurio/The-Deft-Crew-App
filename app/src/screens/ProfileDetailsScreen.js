// app/src/screens/ProfileDetailsScreen.js
// Profile details. Calm version: no looping animations.
// - Shows instantly from the signed-in user, refreshes in the background
//   (and again when you come back from Edit Profile).
// - One short fade on first open, nothing moving after that.

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
  Image,
  TouchableOpacity,
  Share,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Dot from "../engagement/components/Dot";
import BadgeShelf from "../engagement/components/BadgeShelf";
import StreakChip from "../engagement/components/StreakChip";
import StreakSheet from "../engagement/components/StreakSheet";
import { useEngagement } from "../engagement/hooks/useEngagement";

import { color as T, font as F } from "../theme/tokens";
import { ScreenHeader, HeaderIconButton } from "../ui";
// ─── Theme ───
const GOLD = T.yellow;
const GOLD_DARK = T.ink; // was a darker gold; ink keeps the accent readable on white
const GOLD_SOFT = T.yellowSoft;
const DARK = T.ink;
const WHITE = T.white;
const SOFT = T.sand;
const BORDER = T.line;
const LINE = T.line;
const MUTED = T.textFaint;
const DANGER = T.danger;
const SUCCESS = T.success;
const WARNING = T.ink;

const toProfile = (d = {}) => ({
  name: d.name || "",
  rollNo: d.rollNo || "",
  phone: d.phone || "",
  email: d.email || "",
  university: d.university?.name || "not assigned",
  profileImage: d.profileImage || null,
  isAlumni: d.isAlumni || false,
  isVip: d.isVip || false,
  vipExpiry: d.vipExpiry || null,
  status: d.status || "not verified",
  address: d.address || "not provided",
  instagram: d.instagram || "not provided",
  referralCode: d.referralCode || null,
  referralCount: d.referralCount || 0,
  referredBy: d.referredBy || null,
  role: d.role || "student",
  bio: d.bio || "",
  headline: d.headline || "",
  location: d.location || "not provided",
  createdAt: d.createdAt || null,
});

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusLook = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "verified") return { color: SUCCESS, icon: "checkmark-circle" };
  if (s === "pending") return { color: WARNING, icon: "time-outline" };
  return { color: DANGER, icon: "close-circle" };
};

// ─── Small pieces ───
const SectionTitle = ({ icon, title, right }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>
      <Ionicons name={icon} size={14} color={GOLD} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
    {right}
  </View>
);

const InfoRow = ({ icon, label, value, valueColor, isLast }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={16} color={DARK} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  </View>
);

const StatCard = ({ icon, label, value, accent }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, accent && { backgroundColor: GOLD_SOFT }]}>
      <Ionicons name={icon} size={16} color={accent ? GOLD_DARK : DARK} />
    </View>
    <Text style={styles.statValue} numberOfLines={1}>{String(value)}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ═══════════════════════════════════════════
export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const { me } = useEngagement();
  const [profile, setProfile] = useState(() => toProfile(user || {}));
  const [refreshing, setRefreshing] = useState(false);
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const loadingRef = useRef(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [fade]);

  // keep in step with AuthContext (e.g. after Edit Profile saves)
  useEffect(() => {
    if (user) setProfile(toProfile(user));
  }, [user]);

  const fetchProfile = useCallback(async (showError = false) => {
    if (!user?._id || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await api.get(`/auth/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res?.data) {
        setProfile(toProfile(res.data));
        setUser(res.data);
      }
    } catch (e) {
      if (showError) Alert.alert("Error", "Couldn't refresh your profile. Pull down to try again.");
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
    }
  }, [user?._id, token, setUser]);

  // refresh on open and when coming back to this screen
  useFocusEffect(
    useCallback(() => {
      fetchProfile(false);
    }, [fetchProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile(true);
  };

  const handleShareReferral = async () => {
    if (!profile.referralCode) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Share.share({
        message: `join the deft crew using my referral code: ${profile.referralCode}\n\ndownload tdc and start saving on student discounts.`,
        title: "share referral code",
      });
    } catch (error) {
      console.log("share error:", error);
    }
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("HomeTabs");
  };

  const earnedBadges = me?.badges?.earned || 0;
  const totalBadges = me?.badges?.total || 17;
  const badgePercent = Math.min(100, Math.round((earnedBadges / Math.max(totalBadges, 1)) * 100));
  const st = statusLook(profile.status);
  const vipRow = profile.isVip && profile.vipExpiry;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScreenHeader
        title="profile"
        onBack={goBack}
        right={
          profile.referralCode ? (
            <HeaderIconButton icon="share-social-outline" label="share your referral code" onPress={handleShareReferral} />
          ) : null
        }
      />

      <Animated.ScrollView
        style={{ opacity: fade }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DARK]} tintColor={DARK} />}
      >
        {/* Hero card */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.avatarRing, profile.isVip && styles.avatarRingVip]}>
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{profile.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                </View>
              )}
              {profile.isVip ? (
                <View style={styles.vipCrown}>
                  <MaterialCommunityIcons name="crown" size={11} color={DARK} />
                </View>
              ) : null}
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{profile.name || "your name"}</Text>
                <Dot mood="sorted" size={14} animated={false} />
              </View>
              {!!profile.headline && (
                <Text style={styles.headline} numberOfLines={1}>{profile.headline}</Text>
              )}
              <View style={styles.uniRow}>
                <MaterialCommunityIcons name="school-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={styles.uniText} numberOfLines={1}>{profile.university}</Text>
              </View>
            </View>
          </View>

          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: T.inkSoft }]}>
              <Ionicons name={st.icon} size={12} color={T.yellow} />
              <Text style={[styles.pillText, { color: T.white }]}>
                {profile.status}
              </Text>
            </View>
            {profile.isVip ? (
              <View style={[styles.pill, { backgroundColor: GOLD + "26" }]}>
                <MaterialCommunityIcons name="crown" size={11} color={GOLD} />
                <Text style={[styles.pillText, { color: GOLD }]}>vip</Text>
              </View>
            ) : null}
            {profile.referralCode ? (
              <TouchableOpacity style={[styles.pill, styles.pillGold]} onPress={handleShareReferral} activeOpacity={0.8}>
                <Ionicons name="gift-outline" size={11} color={DARK} />
                <Text style={[styles.pillText, { color: DARK }]}>refer · {profile.referralCode}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ marginTop: 14, alignItems: "flex-start" }}>
            <StreakChip onPress={() => setStreakSheetVisible(true)} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="card-outline" label="roll no." value={profile.rollNo || "—"} />
          <StatCard icon={profile.isAlumni ? "school" : "school-outline"} label="status" value={profile.isAlumni ? "alumni" : "student"} />
          <StatCard icon="people-outline" label="referrals" value={profile.referralCount || 0} accent />
        </View>

        {/* Badges */}
        <View style={styles.card}>
          <SectionTitle
            icon="ribbon-outline"
            title="badges"
            right={
              <View style={styles.countPill}>
                <Text style={styles.countText}>{earnedBadges}/{totalBadges}</Text>
              </View>
            }
          />
          <View style={{ marginTop: 14 }}>
            <BadgeShelf max={7} onSeeAll={() => navigation.navigate("Badges")} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${badgePercent}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>{badgePercent}% collected</Text>
            <Text style={styles.progressHint}>{Math.max(totalBadges - earnedBadges, 0)} to go</Text>
          </View>
        </View>

        {/* Personal info */}
        <View style={styles.card}>
          <SectionTitle icon="person-outline" title="personal information" />
          <View style={{ marginTop: 6 }}>
            <InfoRow icon="mail-outline" label="email" value={profile.email || "not provided"} />
            <InfoRow icon="call-outline" label="phone" value={profile.phone || "not provided"} />
            <InfoRow icon="location-outline" label="location" value={profile.location || "not provided"} />
            <InfoRow icon="home-outline" label="address" value={profile.address || "not provided"} />
            <InfoRow
              icon="ribbon-outline"
              label="role"
              value={profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "—"}
            />
            <InfoRow
              icon="calendar-outline"
              label="member since"
              value={formatDate(profile.createdAt || user?.createdAt) || "—"}
              isLast={!vipRow}
            />
            {vipRow ? (
              <InfoRow
                icon="star-outline"
                label="vip membership"
                value={`expires ${formatDate(profile.vipExpiry)}`}
                valueColor={GOLD_DARK}
                isLast
              />
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {!!profile.bio && (
          <View style={styles.card}>
            <SectionTitle icon="chatbox-ellipses-outline" title="about" />
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Edit */}
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            navigation.navigate("EditProfileScreen", { profile });
          }}
        >
          <Ionicons name="create-outline" size={17} color={GOLD} />
          <Text style={styles.editBtnText}>edit profile</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      <StreakSheet visible={streakSheetVisible} onClose={() => setStreakSheetVisible(false)} />
    </SafeAreaView>
  );
}

const card = {
  backgroundColor: WHITE,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: T.line,
  shadowColor: T.ink,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 1,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: F.heading, color: DARK, letterSpacing: -0.3 },

  // hero
  hero: { backgroundColor: DARK, borderRadius: 22, padding: 18, marginTop: 6 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  avatarRingVip: { backgroundColor: GOLD },
  avatarImage: { width: "100%", height: "100%", borderRadius: 35, backgroundColor: T.ink },
  avatarFallback: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 28, fontFamily: F.heading, color: DARK },
  vipCrown: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { flexShrink: 1, fontSize: 20, fontFamily: F.heading, color: WHITE, letterSpacing: -0.3 },
  headline: { fontSize: 13, fontFamily: F.body, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  uniRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  uniText: { flex: 1, fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontFamily: F.bodySemi },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
  },
  pillGold: { backgroundColor: GOLD },
  pillText: { fontSize: 11.5, fontFamily: F.bodyBold },

  // stats
  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statCard: { ...card, flex: 1, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SOFT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 15, fontFamily: F.bodyBold, color: DARK },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2, fontFamily: F.bodySemi },

  // cards
  card: { ...card, padding: 16, marginTop: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center" },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: DARK,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: { flex: 1, fontSize: 15.5, fontFamily: F.bodyBold, color: DARK },
  countPill: { backgroundColor: GOLD_SOFT, paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: "center" },
  countText: { fontSize: 12, fontFamily: F.bodyBold, color: GOLD_DARK },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: T.sand, marginTop: 16, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: GOLD },
  progressMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressLabel: { fontSize: 12, fontFamily: F.bodyBold, color: DARK },
  progressHint: { fontSize: 12, color: MUTED, fontFamily: F.bodySemi },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: SOFT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoLabel: { fontSize: 11.5, color: MUTED, fontFamily: F.bodyBold },
  infoValue: { fontSize: 14.5, color: DARK, fontFamily: F.bodyBold, marginTop: 2 },

  bioText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, lineHeight: 21, marginTop: 12 },

  editBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  editBtnText: { color: WHITE, fontSize: 15.5, fontFamily: F.bodyBold },
});
