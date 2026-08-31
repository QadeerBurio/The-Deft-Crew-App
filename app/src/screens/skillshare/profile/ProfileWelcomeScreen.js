// screens/skillshare/profile/ProfileWelcomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND = '#f9c349';
const BRAND_DARK = '#efa52e';

// Local hero illustration — replace with your own asset at this path.
const HERO_IMAGE = require('../../../../../assets/images/welcome_hero.png');

export default function ProfileWelcomeScreen({ navigation }) {
  const goBuildProfile = () => navigation.navigate('ProfileSetup', { step: 1 });

  // "Explore first" -> skip straight into the app, same as returning users
 const goExploreFirst = () => {
  navigation.reset({ index: 0, routes: [{ name: 'DashboardMain' }] });
};
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  hero: {
    width: '100%',
    height: '46%',
    overflow: 'hidden',
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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