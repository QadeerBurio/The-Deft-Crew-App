// screens/skillshare/profile/ProfileWelcomeScreen.js
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND = '#f9c349';
const BRAND_DARK = '#efa52e';

// Local hero illustration — replace with your own asset at this path.
const HERO_IMAGE = require('../../../../../assets/images/welcome_hero.png');

export default function ProfileWelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const goBuildProfile = useCallback(() => navigation.navigate('ProfileSetup', { step: 1 }), [navigation]);

  // "Explore first" -> skip straight into the app, same as returning users
  const goExploreFirst = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'DashboardMain' }] });
  }, [navigation]);

  // Usually the stack root (the gate replaced itself), so fall back to Home.
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('HomeTabs');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
     <ImageBackground
  source={HERO_IMAGE}
  style={styles.hero}
  resizeMode="cover"
  imageStyle={styles.heroImage}
>
  <LinearGradient
    colors={[
      'transparent',
      'rgba(255,255,255,0.25)',
      'rgba(255,255,255,0.75)',
      '#FFFFFF',
    ]}
    locations={[0.55, 0.72, 0.88, 1]}
    style={styles.heroFade}
  />
  <TouchableOpacity
    style={styles.backButton}
    onPress={goBack}
    activeOpacity={0.8}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel="Go back"
  >
    <Ionicons name="arrow-back" size={22} color="#1C1C1E" />
  </TouchableOpacity>
</ImageBackground>

      <View style={styles.content}>
        <View style={styles.pill}>
          <Ionicons name="school-outline" size={14} color="#8A6D1D" />
          <Text style={styles.pillText}>WELCOME TO SKILLSHARE</Text>
        </View>

        <Text style={styles.title}>
          Share your skills. <Text style={{ color: BRAND_DARK }}>Find opportunities.</Text>
        </Text>

        <Text style={styles.subtitle}>
          Connect with students to exchange services, offer your expertise, earn money, or find
          the right person for your project.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={goBuildProfile} activeOpacity={0.85}>
          <LinearGradient
            colors={[BRAND, BRAND_DARK]}
            style={styles.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryText}>Build Your Professional Profile</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goExploreFirst} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>Explore first</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scroll: {
    flexGrow: 1,
  },

  hero: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 420,
    overflow: 'hidden',
  },

  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFE3C0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 16,
  },

  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D1D',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    lineHeight: 36,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 15,
    color: '#6B6B70',
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 28,
  },

  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 12,
  },

  secondaryText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '600',
  },
});