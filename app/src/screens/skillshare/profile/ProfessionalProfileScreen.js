// screens/skillshare/profile/ProfessionalProfileScreen.js
import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../../context/AuthContext';
import { getMyProfessionalProfile } from '../../../api/profileApi';
import { getMyListings, getMySkillOffers, getMyMatches } from '../../../api/api';

const BRAND = '#f9c349';
const BRAND_DARK = '#f5a623';
const INK = '#1C1C1E';
const MUTED = '#8E8E93';


  
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
       <TouchableOpacity onPress={() => navigation.getParent()?.navigate('HomeTabs')}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>
          Skill<Text style={{ color: BRAND }}>Share</Text>
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Profile';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : '#666'} />
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
  const { user, isGuest, logout, getUserName } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [stats, setStats] = useState({ listings: 0, offers: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


const goTo = (route) => {
  if (route === 'SkillProfile') return;
  navigation.navigate(route);
};
  

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    try {
      const res = await getMyProfessionalProfile();
      setProfile(res.profile);
      setHasProfile(!!res.hasProfile);

      const [listings, offersRes, matchesRes] = await Promise.all([
        getMyListings().catch(() => []),
        getMySkillOffers().catch(() => ({ offers: [] })),
        getMyMatches().catch(() => ({ matches: [] })),
      ]);
      setStats({
        listings: Array.isArray(listings) ? listings.length : 0,
        offers: (offersRes?.offers || []).length,
        matches: (matchesRes?.matches || []).length,
      });
    } catch (err) {
      console.error('Failed to load professional profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  // --- GUEST: never call the profile API, just prompt to log in ---
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SkillShareHeader navigation={navigation} goTo={goTo} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="person-outline" size={48} color={BRAND} />
          </View>
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptySubtitle}>
            Create an account or log in to build your professional profile and start
            exchanging skills, offering paid services, or hiring on SkillShare.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.getParent()?.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>Login</Text>
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
              ? "You're partway through — finish setting up your profile so other students can trust you before exchanging, buying, or hiring."
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SkillShareHeader navigation={navigation} goTo={goTo} />

      <ScrollView
        contentContainerStyle={styles.content}
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
            <Text style={styles.quickStatLabel}>Listings</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.offers}</Text>
            <Text style={styles.quickStatLabel}>Offers</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.matches}</Text>
            <Text style={styles.quickStatLabel}>Matches</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SelectListingTypeScreen')}>
            <View style={[styles.actionIcon, { backgroundColor: BRAND }]}>
              <Ionicons name="add-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyListings')}>
            <View style={[styles.actionIcon, { backgroundColor: '#f9c34915' }]}>
              <Ionicons name="list-outline" size={22} color={BRAND} />
            </View>
            <Text style={styles.actionLabel}>Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyOffers')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FF950015' }]}>
              <Ionicons name="git-pull-request-outline" size={22} color="#FF9500" />
            </View>
            <Text style={styles.actionLabel}>Offers</Text>
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
          <Text style={styles.updateButtonText}>Update Profile</Text>
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
  backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
},
topHeaderTitle: { fontSize: 20, fontWeight: '800', color: INK },
navRow: {
  flexDirection: 'row', backgroundColor: '#fff',
  borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4,
},
navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
navItemText: { fontSize: 11, color: '#666', marginTop: 3, fontWeight: '600' },
navItemTextActive: { color: BRAND, fontWeight: '800' },
navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },

  container: { flex: 1, backgroundColor: '#FDF9F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF9F0' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  logoutFloating: { alignSelf: 'flex-end', padding: 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#f9c34915',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: INK, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  emptyButton: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 28 },
  emptyButtonText: { color: '#1C1C1E', fontWeight: '700', fontSize: 15 },
  avatarWrap: { marginTop: 0, marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#4A3B10' },
  name: { fontSize: 22, fontWeight: '800', color: INK },
  headline: { fontSize: 14, color: MUTED, marginTop: 2, marginBottom: 16, textAlign: 'center' },
  quickStatsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', paddingVertical: 14, marginBottom: 14, justifyContent: 'space-around',
  },
  quickStat: { alignItems: 'center' },
  quickStatNumber: { fontSize: 18, fontWeight: '800', color: INK },
  quickStatLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  quickStatDivider: { width: 1, backgroundColor: '#EFE3C0' },
  actionsGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 14 },
  actionCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#EFE3C0',
  },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 11, color: INK, marginTop: 6, fontWeight: '600' },
  section: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', padding: 16, marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: INK },
  sectionText: { fontSize: 13, color: '#3A3A3C', lineHeight: 20 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#F8F9FA', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: '600', color: INK },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontSize: 13, color: MUTED },
  rowValue: { fontSize: 13, fontWeight: '700', color: INK },
  updateButton: {
    width: '100%', backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 6,
  },
  updateButtonText: { color: '#1C1C1E', fontWeight: '700', fontSize: 15 },
});