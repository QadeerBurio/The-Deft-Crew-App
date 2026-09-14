// screens/PrivacyScreen.js
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const privacyData = [
    { num: '01', title: 'Information We Collect', text: '• Name, email, phone number\n• Profile information & preferences\n• Content you create or share\n• Device & usage data' },
    { num: '02', title: 'How We Use Data', text: '• Provide & improve services\n• Personalize experience\n• Send updates & promotions\n• Prevent fraud' },
    { num: '03', title: 'Information Sharing', text: '• No selling of data\n• Shared with service providers\n• When required by law\n• With your consent' },
    { num: '04', title: 'Data Security', text: 'We implement strong security measures to protect your data. However, no method is 100% secure.' },
    { num: '05', title: 'Your Rights', text: '• Access & update data\n• Request deletion\n• Opt-out of marketing\n• Withdraw consent' },
    { num: '06', title: 'Cookies', text: 'We use cookies to enhance experience, analyze usage, and deliver personalized content.' },
    { num: '07', title: 'Data Retention', text: 'We retain data as long as necessary for services, legal obligations, and dispute resolution.' },
    { num: '08', title: "Children's Privacy", text: 'Services not for under 13. We do not knowingly collect data from children.' },
    { num: '09', title: 'Policy Changes', text: 'We may update this policy. Changes will be posted here with updated date.' },
    { num: '10', title: 'Contact Us', text: 'privacy@thedeftcrew.com\nKarachi, Pakistan' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Header wrapped in SafeAreaView (top only) */}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeHeader}>
        <LinearGradient colors={['#fff', '#fff']} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color="#050505" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Privacy Policy</Text>
              <View style={styles.headerHandle} />
            </View>

            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Ensure bottom content clears home indicator / gesture bar
            paddingBottom: Math.max(insets.bottom, 20) + 30,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSubtitle}>Your data is safe with us</Text>
          <View style={styles.heroDivider} />
        </Animated.View>

        <View style={styles.contentContainer}>
          {privacyData.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30 * (index + 1) * 0.05],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>{item.num}</Text>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
              <Text style={styles.sectionText}>{item.text}</Text>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.version}>
          v2.0 • Updated{' '}
          {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeHeader: {
    backgroundColor: '#fff',
    // Shadow stays on the header container so it's visible over content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerGradient: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  headerHandle: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#f9c349',
    marginTop: 4,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom is set dynamically using insets
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  heroDivider: {
    width: 32,
    height: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
    marginTop: 10,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f9c349',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
  },
  sectionText: {
    fontSize: 12.5,
    color: '#666',
    lineHeight: 19,
    paddingLeft: 20,
  },
  version: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 10,
    paddingTop: 20,
  },
});