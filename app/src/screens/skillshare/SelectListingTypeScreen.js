
//backend/app/arc/screens/skillshare/SelectListingTypeScreen.js
import React, { useState, useCallback, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyListings } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

import { color as T, font as F } from "../../theme/tokens";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;

const TYPES = [
  { key: 'barter', title: 'Exchange', desc: 'Offer a service and receive another service in return.', icon: 'swap-horizontal-outline', iconBg: T.sand },
  { key: 'paid', title: 'Paid Service', desc: 'Offer your skills and earn money.', icon: 'cash-outline', iconBg: BRAND, iconColor: T.white },
  { key: 'job', title: 'Hire', desc: 'Find a student for your project or task.', icon: 'people-outline', iconBg: T.sand },
];

const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'DashboardMain' },
  { key: 'Explore', label: 'Explore', icon: 'search-outline', route: 'BrowseListings' },
  { key: 'Post', label: 'Post', icon: 'add-circle', route: 'SelectListingTypeScreen' },
  { key: 'Chats', label: 'Chats', icon: 'chatbubble-ellipses-outline', route: 'MyMatches' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'SkillProfile' },
];

// module-level cache of post counts per user, shown instantly on return
const COUNTS_CACHE = {};

export default function SelectListingTypeScreen({ navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const cacheKey = String(getCurrentUserId?.() || 'anon');
  const cached = COUNTS_CACHE[cacheKey];
  const [counts, setCounts] = useState(cached || { barter: 0, paid: 0, job: 0 });
  const [loading, setLoading] = useState(!cached);
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await getMyListings();
      const listings = Array.isArray(data) ? data : [];
      const open = listings.filter((l) => l.status !== 'closed');
      const next = {
        barter: open.filter((l) => l.type === 'barter').length,
        paid: open.filter((l) => l.type === 'paid').length,
        job: open.filter((l) => l.type === 'job').length,
      };
      COUNTS_CACHE[cacheKey] = next;
      setCounts(next);
    } catch (err) {
      console.error('Error loading post counts:', err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [cacheKey]);

  // refresh counts on focus (e.g. after creating a listing)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goTo = (route) => {
    if (route === 'SelectListingTypeScreen') return;
    if (route === 'DashboardMain') {
      // return to the existing dashboard instead of stacking a second one
      if (typeof navigation.popTo === 'function') navigation.popTo('DashboardMain');
      else navigation.navigate('DashboardMain');
      return;
    }
    navigation.navigate(route);
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  };

  const MY_POSTS = [
    { key: 'barter', label: 'My Exchange Offers', icon: 'swap-horizontal-outline', unit: 'active offer' },
    { key: 'paid', label: 'My Paid Services', icon: 'cash-outline', unit: 'active service' },
    { key: 'job', label: 'My Hire Listings', icon: 'people-outline', unit: 'active listing' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={goBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>skill<Text style={{ color: BRAND }}>share</Text></Text>
        <TouchableOpacity onPress={() => navigation.navigate('SkillProfile')} hitSlop={10}>
          {myPhoto ? (
            <Image source={{ uri: myPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Ionicons name="person" size={14} color={T.textFaint} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Post';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : T.textMuted} />
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {active && <View style={styles.navUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.pageTitle}>What do you want to post?</Text>
        <Text style={styles.pageSubtitle}>Select the type of opportunity you're creating.</Text>

        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={styles.typeCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateListing', { type: t.key })}
          >
            <View style={[styles.typeIconCircle, { backgroundColor: t.iconBg }]}>
              <Ionicons name={t.icon} size={22} color={t.iconColor || INK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeTitle}>{t.title}</Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>my posts</Text>

        {loading ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 20 }} />
        ) : (
          MY_POSTS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={styles.postRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MyPostsByType', { type: p.key, title: p.label })}
            >
              <View style={styles.postIconCircle}>
                <Ionicons name={p.icon} size={18} color={INK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.postLabel}>{p.label}</Text>
                <Text style={styles.postCount}>
                  {counts[p.key]} {p.unit}{counts[p.key] === 1 ? '' : 's'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  topHeaderTitle: { fontSize: 20, fontFamily: F.heading, color: INK },
  navRow: { flexDirection: 'row', backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemText: { fontSize: 11, color: T.textMuted, marginTop: 3, fontFamily: F.bodySemi },
  navItemTextActive: { color: BRAND, fontFamily: F.bodyBold },
  navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },
  content: { padding: 20 },
  pageTitle: { fontSize: 26, fontFamily: F.heading, color: INK },
  pageSubtitle: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginTop: 4, marginBottom: 20 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.card,
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  typeIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  typeTitle: { fontSize: 18, fontFamily: F.heading, color: INK },
  typeDesc: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginTop: 2, lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontFamily: F.bodyBold, color: T.textFaint, letterSpacing: 0.6, marginTop: 12, marginBottom: 10 },
  postRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  postIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  postLabel: { fontSize: 15, fontFamily: F.bodyBold, color: INK },
  postCount: { fontSize: 12, fontFamily: F.body, color: MUTED, marginTop: 2 },
  headerAvatar: { width: 28, height: 28, borderRadius: 14 },
headerAvatarFallback: { backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
});