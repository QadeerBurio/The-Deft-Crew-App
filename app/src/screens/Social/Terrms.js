// screens/TermsScreen.js
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsScreen({ navigation }) {
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

  const termsData = [
    { num: '01', title: 'Acceptance of Terms', text: 'By using The Deft Crew (TDC) application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
    { num: '02', title: 'User Account', text: '• Must be 13+ years old\n• Maintain account confidentiality\n• Provide accurate information\n• Responsible for all account activity' },
    { num: '03', title: 'User-Generated Content', text: '• You retain ownership of content\n• Grant TDC license to use content\n• No content violating guidelines\n• TDC may remove violating content' },
    { num: '04', title: 'Intellectual Property', text: '• Content protected by copyright\n• No reproduction without permission\n• TDC trademarks are property of The Deft Crew' },
    { num: '05', title: 'Limitation of Liability', text: 'TDC is provided "as is" without warranties. We are not liable for any damages arising from use of our services.' },
    { num: '06', title: 'Termination', text: 'We reserve the right to terminate or suspend your account for violations of these terms or Community Guidelines.' },
    { num: '07', title: 'Changes to Terms', text: 'TDC may update these terms at any time. You will be notified of significant changes.' },
    { num: '08', title: 'Contact', text: 'support@thedeftcrew.com\nKarachi, Pakistan' },
    { num: '09', title: 'Governing Law', text: 'These terms are governed by the laws of Pakistan. Disputes resolved in Karachi, Pakistan.' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#d6cfcf4e" />
      
      {/* Header */}
      <LinearGradient colors={['#fff', '#fff']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#040404" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
            <View style={styles.headerHandle} />
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.heroTitle}>Terms & Conditions</Text>
          <Text style={styles.heroSubtitle}>Please review before continuing</Text>
          <View style={styles.heroDivider} />
        </Animated.View>

        <View style={styles.contentContainer}>
          {termsData.map((item, index) => (
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
                      })
                    }
                  ]
                }
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

        <Text style={styles.version}>v2.0 • Updated {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
   
    borderBottomWidth: 0,
   
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    paddingBottom: 30,
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