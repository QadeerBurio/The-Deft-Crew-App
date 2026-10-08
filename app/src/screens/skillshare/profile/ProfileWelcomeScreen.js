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
import { color as T, font as F } from "../../../theme/tokens";
import { LinearGradient } from "../../../ui/FlatGradient"; // flat fills, no gradients (design system)

const BRAND = T.yellow;
const BRAND_DARK = T.ink;

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
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

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
      T.white,
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
    <Ionicons name="arrow-back" size={22} color={T.ink} />
  </TouchableOpacity>
</ImageBackground>

      <View style={styles.content}>
        <View style={styles.pill}>
          <Ionicons name="school-outline" size={14} color={T.ink} />
          <Text style={styles.pillText}>welcome to skillshare</Text>
        </View>

        <Text style={styles.title}>
          share your skills. <Text style={{ color: BRAND_DARK }}>find opportunities.</Text>
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
            <Text style={styles.primaryText}>build your professional profile</Text>
            <Ionicons name="arrow-forward" size={18} color={T.white} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goExploreFirst} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>explore first</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.card,
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
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 16,
  },

  pillText: {
    fontSize: 11,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 28,
    fontFamily: F.heading,
    color: T.ink,
    lineHeight: 36,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 15, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 28,
  },

  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },

  primaryText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodyBold,
  },

  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.line,
    marginTop: 12,
  },

  secondaryText: {
    color: T.ink,
    fontSize: 15,
    fontFamily: F.bodySemi,
  },
});