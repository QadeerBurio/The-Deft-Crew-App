
//backend/app/arc/screens/skillshare/SelectListingTypeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyListings } from '../../api/api';
import { Image } from 'react-native'; // add Image to existing react-native import
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';

const TYPES = [
  { key: 'barter', title: 'Exchange', desc: 'Offer a service and receive another service in return.', icon: 'swap-horizontal-outline', iconBg: '#f0f0f0' },
  { key: 'paid', title: 'Paid Service', desc: 'Offer your skills and earn money.', icon: 'cash-outline', iconBg: BRAND, iconColor: '#fff' },
  { key: 'job', title: 'Hire', desc: 'Find a student for your project or task.', icon: 'people-outline', iconBg: '#f0f0f0' },
];

const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'DashboardMain' },
  { key: 'Explore', label: 'Explore', icon: 'search-outline', route: 'BrowseListings' },
  { key: 'Post', label: 'Post', icon: 'add-circle', route: 'SelectListingTypeScreen' },
  { key: 'Chats', label: 'Chats', icon: 'chatbubble-ellipses-outline', route: 'MyMatches' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'SkillProfile' },
];

export default function SelectListingTypeScreen({ navigation }) {
   const [counts, setCounts] = useState({ barter: 0, paid: 0, job: 0 });
  const [loading, setLoading] = useState(true);
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();

  const load = useCallback(async () => {
    try {
      const data = await getMyListings();
      const listings = Array.isArray(data) ? data : [];
      const open = listings.filter((l) => l.status !== 'closed');
      setCounts({
        barter: open.filter((l) => l.type === 'barter').length,
        paid: open.filter((l) => l.type === 'paid').length,
        job: open.filter((l) => l.type === 'job').length,
      });
    } catch (err) {
      console.error('Error loading post counts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goTo = (route) => {
    if (route === 'SelectListingTypeScreen') return;
    navigation.navigate(route);
  };

  const MY_POSTS = [
    { key: 'barter', label: 'My Exchange Offers', icon: 'swap-horizontal-outline', unit: 'active offer' },
    { key: 'paid', label: 'My Paid Services', icon: 'cash-outline', unit: 'active service' },
    { key: 'job', label: 'My Hire Listings', icon: 'people-outline', unit: 'active listing' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Skill<Text style={{ color: BRAND }}>Share</Text></Text>
         <TouchableOpacity onPress={() => navigation.navigate('SkillProfile')}>
    {myPhoto ? (
      <Image source={{ uri: myPhoto }} style={styles.headerAvatar} />
    ) : (
      <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
        <Ionicons name="person" size={14} color="#999" />
      </View>
    )}
  </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Post';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : '#666'} />
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {active && <View style={styles.navUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        <Text style={styles.sectionLabel}>MY POSTS</Text>

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
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 20, fontWeight: '800', color: INK },
  navRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemText: { fontSize: 11, color: '#666', marginTop: 3, fontWeight: '600' },
  navItemTextActive: { color: BRAND, fontWeight: '800' },
  navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },
  content: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: INK },
  pageSubtitle: { fontSize: 14, color: '#555', marginTop: 4, marginBottom: 20 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  typeIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  typeTitle: { fontSize: 18, fontWeight: '800', color: INK },
  typeDesc: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginTop: 12, marginBottom: 10 },
  postRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  postIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  postLabel: { fontSize: 15, fontWeight: '700', color: INK },
  postCount: { fontSize: 12, color: MUTED, marginTop: 2 },
  headerAvatar: { width: 28, height: 28, borderRadius: 14 },
headerAvatarFallback: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
});