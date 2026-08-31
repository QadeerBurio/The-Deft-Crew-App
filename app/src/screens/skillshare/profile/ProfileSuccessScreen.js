// screens/skillshare/profile/ProfileSuccessScreen.js
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../../context/AuthContext';
import { getMyProfessionalProfile } from '../../../api/profileApi';

const BRAND = '#f9c349';
const BRAND_DARK = '#f5a623';
const INK = '#1C1C1E';
const MUTED = '#8E8E93';

export default function ProfileSuccessScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { profile } = await getMyProfessionalProfile();
        setProfile(profile);
      } catch (err) {
        console.error('Failed to load completed profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goExplore = () => {
    navigation.reset({ index: 0, routes: [{ name: 'DashboardMain' }] });
  };

  const goViewProfile = () => {
    navigation.navigate('ProfessionalProfile');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  const initial = (profile?.fullName || user?.name || 'U').charAt(0).toUpperCase();
  const topSkills = (profile?.skills || []).slice(0, 3).map((s) => s.name || s);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF9F0" />
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={36} color={INK} />
        </View>

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
            <Text style={styles.skillCardLabel}>TOP SKILLS</Text>
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
          <Text style={styles.primaryText}>Explore SkillShare</Text>
          <Ionicons name="arrow-forward" size={18} color="#1C1C1E" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goViewProfile} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>View My Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF9F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF9F0' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  checkCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: BRAND,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: INK, textAlign: 'center', lineHeight: 32 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 30 },
  strengthText: { fontSize: 14, color: MUTED, fontWeight: '600' },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EFE3C0',
    padding: 16, marginBottom: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#4A3B10', fontSize: 22, fontWeight: '800' },
  previewName: { fontSize: 16, fontWeight: '700', color: INK },
  previewHeadline: { fontSize: 12, color: MUTED, marginTop: 2 },
  skillCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EFE3C0', padding: 16, marginBottom: 30,
  },
  skillCardLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: '#F8F9FA', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  skillPillText: { fontSize: 12, fontWeight: '600', color: INK },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: INK },
  secondaryButton: {
    width: '100%', alignItems: 'center', paddingVertical: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA',
  },
  secondaryText: { fontSize: 15, fontWeight: '600', color: INK },
});