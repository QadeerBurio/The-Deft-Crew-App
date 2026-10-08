// screens/skillshare/profile/ProfileSuccessScreen.js
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  BackHandler,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from '../../../context/AuthContext';
import { getMyProfessionalProfile } from '../../../api/profileApi';

import { color as T, font as F } from "../../../theme/tokens";
const BRAND = T.yellow;
const BRAND_DARK = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;

export default function ProfileSuccessScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const leavingRef = useRef(false);

  // One-time, short pop-in for the check mark (stops on its own).
  const pop = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (loading) return;
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [loading, pop]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { profile } = await getMyProfessionalProfile();
        if (alive) setProfile(profile);
      } catch (err) {
        console.error('Failed to load completed profile:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The setup form is finished: no swiping or back-pressing into it again.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const goExplore = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    navigation.reset({ index: 0, routes: [{ name: 'DashboardMain' }] });
  }, [navigation]);

  const goViewProfile = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    // Dashboard stays underneath, so back from the profile lands there.
    navigation.reset({
      index: 1,
      routes: [{ name: 'DashboardMain' }, { name: 'ProfessionalProfile' }],
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goExplore();
        return true;
      });
      return () => sub.remove();
    }, [goExplore])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  const initial = (profile?.fullName || user?.name || 'U').charAt(0).toUpperCase();
  const topSkills = (profile?.skills || []).slice(0, 3).map((s) => s.name || s);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: pop }] }]}>
          <Ionicons name="checkmark" size={36} color={INK} />
        </Animated.View>

        <Text style={styles.title}>Your Professional{'\n'}Profile is Ready!</Text>
        <View style={styles.strengthRow}>
          <Text style={styles.strengthText}>Profile Strength: {profile?.profileStrength ?? 100}%</Text>
          <Ionicons name="flash" size={16} color={BRAND_DARK} />
        </View>

        <View style={styles.previewCard}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[BRAND, BRAND_DARK]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.previewName}>{profile?.fullName || user?.name}</Text>
            <Text style={styles.previewHeadline} numberOfLines={2}>{profile?.headline}</Text>
          </View>
        </View>

        {topSkills.length > 0 && (
          <View style={styles.skillCard}>
            <Text style={styles.skillCardLabel}>top skills</Text>
            <View style={styles.skillRow}>
              {topSkills.map((skill) => (
                <View key={skill} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={goExplore} activeOpacity={0.85}>
          <Text style={styles.primaryText}>explore skillshare</Text>
          <Ionicons name="arrow-forward" size={18} color={T.ink} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goViewProfile} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>view my profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.paper },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 36, alignItems: 'center' },
  checkCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: BRAND,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontFamily: F.heading, color: INK, textAlign: 'center', lineHeight: 32 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 30 },
  strengthText: { fontSize: 14, color: MUTED, fontFamily: F.bodySemi },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: '#EFE3C0',
    padding: 16, marginBottom: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#4A3B10', fontSize: 22, fontFamily: F.heading },
  previewName: { fontSize: 16, fontFamily: F.bodyBold, color: INK },
  previewHeadline: { fontSize: 12, fontFamily: F.body, color: MUTED, marginTop: 2 },
  skillCard: {
    width: '100%', backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', padding: 16, marginBottom: 30,
  },
  skillCardLabel: { fontSize: 10, fontFamily: F.bodyBold, color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: T.sand, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  skillPillText: { fontSize: 12, fontFamily: F.bodySemi, color: INK },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16,
  },
  primaryText: { fontSize: 15, fontFamily: F.bodyBold, color: INK },
  secondaryButton: {
    width: '100%', alignItems: 'center', paddingVertical: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA',
  },
  secondaryText: { fontSize: 15, fontFamily: F.bodySemi, color: INK },
});