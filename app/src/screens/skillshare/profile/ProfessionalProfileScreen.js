// screens/skillshare/profile/ProfessionalProfileScreen.js
import React, { useContext, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from "../../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from '../../../context/AuthContext';
import { getMyProfessionalProfile } from '../../../api/profileApi';
import { getMyListings, getMySkillOffers, getMyMatches } from '../../../api/api';
import { goToAuth } from '../../../utils/goToAuth';

import { color as T, font as F } from "../../../theme/tokens";
// Last loaded data per user, so coming back shows it instantly.
const profileCache = {};

const BRAND = T.yellow;
const BRAND_DARK = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;


  
const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'DashboardMain' },
  { key: 'Explore', label: 'Explore', icon: 'search-outline', route: 'BrowseListings' },
  { key: 'Post', label: 'Post', icon: 'add-circle-outline', route: 'SelectListingTypeScreen' },
  { key: 'Chats', label: 'Chats', icon: 'chatbubble-ellipses-outline', route: 'MyMatches' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'SkillProfile' },
];


function SkillShareHeader({ navigation, goTo }) {
  return (
    <>
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardMain'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>
          skill<Text style={{ color: BRAND }}>share</Text>
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationSkillshare')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Profile';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : T.textMuted} />
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {active && <View style={styles.navUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

export default function ProfessionalProfileScreen({ navigation }) {
  const { user, isGuest, logout, setIsGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const cacheKey = String(user?._id || user?.id || user?.email || 'me');
  const cached = !isGuest ? profileCache[cacheKey] : null;

  const [profile, setProfile] = useState(cached?.profile ?? null);
  const [hasProfile, setHasProfile] = useState(cached?.hasProfile ?? false);
  const [stats, setStats] = useState(cached?.stats ?? { listings: 0, offers: 0, matches: 0 });
  const [loading, setLoading] = useState(!cached && !isGuest);
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);

  const goTo = (route) => {
    if (route === 'SkillProfile') return;
    navigation.navigate(route);
  };

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await getMyProfessionalProfile();
      setProfile(res.profile);
      setHasProfile(!!res.hasProfile);

      const [listings, offersRes, matchesRes] = await Promise.all([
        getMyListings().catch(() => []),
        getMySkillOffers().catch(() => ({ offers: [] })),
        getMyMatches().catch(() => ({ matches: [] })),
      ]);
      const nextStats = {
        listings: Array.isArray(listings) ? listings.length : 0,
        offers: (offersRes?.offers || []).length,
        matches: (matchesRes?.matches || []).length,
      };
      setStats(nextStats);
      profileCache[cacheKey] = { profile: res.profile, hasProfile: !!res.hasProfile, stats: nextStats };
    } catch (err) {
      console.error('Failed to load professional profile:', err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, cacheKey]);

  // Refresh in the background every time the screen is shown (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    if (inFlightRef.current) return;
    setRefreshing(true);
    load();
  }, [load]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  // --- GUEST: never call the profile API, just prompt to log in ---
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <SkillShareHeader navigation={navigation} goTo={goTo} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="person-outline" size={48} color={BRAND} />
          </View>
          <Text style={styles.emptyTitle}>login required</Text>
          <Text style={styles.emptySubtitle}>
            Create an account or log in to build your professional profile and start
            exchanging skills, offering paid services, or hiring on SkillShare.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => goToAuth(setIsGuest)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- LOGGED IN, no profile or incomplete profile ---
  const isComplete = hasProfile && profile?.isComplete;
  if (!isComplete) {
    const started = hasProfile && (profile?.lastCompletedStep || 0) > 0;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
         <SkillShareHeader navigation={navigation} goTo={goTo} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="briefcase-outline" size={48} color={BRAND} />
          </View>
          <Text style={styles.emptyTitle}>
            {started ? 'Finish Your Professional Profile' : 'No Professional Profile Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {started
              ? "You're partway through. Finish setting up your profile so other students can trust you before exchanging, buying, or hiring."
              : 'Create your professional profile so other students can see your skills and trust you before exchanging services, buying, or hiring you.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('ProfileSetup', { step: started ? (profile?.lastCompletedStep || 1) : 1 })}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>
              {started ? 'Continue Your Professional Profile' : 'Create Your Professional Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- LOGGED IN, complete profile ---
  const initial = (profile?.fullName || user?.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <SkillShareHeader navigation={navigation} goTo={goTo} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
      >
        <TouchableOpacity style={styles.logoutFloating} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={MUTED} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[BRAND, BRAND_DARK]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          )}
        </View>
        <Text style={styles.name}>{profile?.fullName || user?.name || 'Your Name'}</Text>
        <Text style={styles.headline}>{profile?.headline || 'Add a professional headline'}</Text>

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.listings}</Text>
            <Text style={styles.quickStatLabel}>listings</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.offers}</Text>
            <Text style={styles.quickStatLabel}>offers</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.matches}</Text>
            <Text style={styles.quickStatLabel}>matches</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SelectListingTypeScreen')}>
            <View style={[styles.actionIcon, { backgroundColor: BRAND }]}>
              <Ionicons name="add-outline" size={22} color={T.white} />
            </View>
            <Text style={styles.actionLabel}>create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyListings')}>
            <View style={[styles.actionIcon, { backgroundColor: T.yellowSoft }]}>
              <Ionicons name="list-outline" size={22} color={BRAND} />
            </View>
            <Text style={styles.actionLabel}>listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyOffers')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FF950015' }]}>
              <Ionicons name="git-pull-request-outline" size={22} color="#FF9500" />
            </View>
            <Text style={styles.actionLabel}>offers</Text>
          </TouchableOpacity>
        </View>

        {!!(profile?.university || profile?.fieldOfStudy) && (
          <Section icon="school-outline" title="Education">
            <Text style={styles.sectionText}>
              {profile?.university}{profile?.university && profile?.fieldOfStudy ? ' - ' : ''}
              {profile?.fieldOfStudy}
            </Text>
          </Section>
        )}

        {!!profile?.bio && (
          <Section icon="person-outline" title="About">
            <Text style={styles.sectionText}>{profile.bio}</Text>
          </Section>
        )}

        {!!profile?.skills?.length && (
          <Section icon="construct-outline" title="Skills & Expertise">
            <View style={styles.pillWrap}>
              {profile.skills.map((s, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{s.name || s}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section icon="briefcase-outline" title="Availability & Earning">
          <Row label="Starting Rate:" value={`${profile?.rateCurrency || 'PKR'} ${profile?.startingRate || 0}${profile?.startingRate ? '/hr' : ''}`} />
          <Row label="Work Mode:" value={
            profile?.workMode === 'both' ? 'Remote / On-site' :
            profile?.workMode === 'on-site' ? 'On-site' : 'Remote'
          } />
          <Row label="Weekly Availability:" value={profile?.availabilityPerWeek || 'Not set'} />
        </Section>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => navigation.navigate('ProfileSetup', { step: 1 })}
          activeOpacity={0.85}
        >
          <Text style={styles.updateButtonText}>update profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={BRAND_DARK} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({

  topHeader: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
  backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line,
},
topHeaderTitle: { fontSize: 20, fontFamily: F.heading, color: INK },
navRow: {
  flexDirection: 'row', backgroundColor: T.card,
  borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 4,
},
navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
navItemText: { fontSize: 11, color: T.textMuted, marginTop: 3, fontFamily: F.bodySemi },
navItemTextActive: { color: BRAND, fontFamily: F.bodyBold },
navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },

  container: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.paper },
  content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  logoutFloating: { alignSelf: 'flex-end', padding: 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: T.yellowSoft,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontFamily: F.heading, color: INK, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, fontFamily: F.body, color: MUTED, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  emptyButton: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 28 },
  emptyButtonText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 15 },
  avatarWrap: { marginTop: 0, marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontFamily: F.heading, color: '#4A3B10' },
  name: { fontSize: 22, fontFamily: F.heading, color: INK },
  headline: { fontSize: 14, fontFamily: F.body, color: MUTED, marginTop: 2, marginBottom: 16, textAlign: 'center' },
  quickStatsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', paddingVertical: 14, marginBottom: 14, justifyContent: 'space-around',
  },
  quickStat: { alignItems: 'center' },
  quickStatNumber: { fontSize: 18, fontFamily: F.heading, color: INK },
  quickStatLabel: { fontSize: 11, fontFamily: F.body, color: MUTED, marginTop: 2 },
  quickStatDivider: { width: 1, backgroundColor: '#EFE3C0' },
  actionsGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 14 },
  actionCard: {
    flex: 1, backgroundColor: T.card, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#EFE3C0',
  },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 11, color: INK, marginTop: 6, fontFamily: F.bodySemi },
  section: {
    width: '100%', backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', padding: 16, marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: F.bodyBold, color: INK },
  sectionText: { fontSize: 13, fontFamily: F.body, color: '#3A3A3C', lineHeight: 20 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: T.sand, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontFamily: F.bodySemi, color: INK },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontSize: 13, fontFamily: F.body, color: MUTED },
  rowValue: { fontSize: 13, fontFamily: F.bodyBold, color: INK },
  updateButton: {
    width: '100%', backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 6,
  },
  updateButtonText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 15 },
});