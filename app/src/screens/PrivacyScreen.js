// screens/TermsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function TermsScreen({ navigation }) {
  const [agreed, setAgreed] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    checkLaunchStatus();
    
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

  const checkLaunchStatus = async () => {
    try {
      const termsAccepted = await AsyncStorage.getItem("termsAccepted");
      if (termsAccepted === "true") {
        // User already accepted terms, skip to guidelines if not completed
        const guidelinesAccepted = await AsyncStorage.getItem("guidelinesAccepted");
        if (guidelinesAccepted === "true") {
          // Both accepted, go directly to Login
          navigation.replace('Login');
        } else {
          // Go to guidelines
          navigation.replace('CommunityGuidelines');
        }
      }
    } catch (e) {
      console.log('Error checking launch status:', e);
    }
  };

  const handleCheckboxPress = () => {
    Animated.sequence([
      Animated.timing(checkboxScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(checkboxScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    setAgreed(!agreed);
  };

  const handleContinue = () => {
    if (agreed) {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        try {
          // Save that user accepted terms
          await AsyncStorage.setItem("termsAccepted", "true");
          // Navigate to Community Guidelines
          navigation.replace('CommunityGuidelines');
        } catch (e) {
          console.log('Error saving terms status:', e);
          navigation.replace('CommunityGuidelines');
        }
      });
    }
  };

  const TermsContent = () => (
    <>
      {[
        { num: '01', title: 'Acceptance of Terms', text: 'By using The Deft Crew (TDC) application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
        { num: '02', title: 'User Account', text: '• Must be 13+ years old\n• Maintain account confidentiality\n• Provide accurate information\n• Responsible for all account activity' },
        { num: '03', title: 'User-Generated Content', text: '• You retain ownership of content\n• Grant TDC license to use content\n• No content violating guidelines\n• TDC may remove violating content' },
        { num: '04', title: 'Intellectual Property', text: '• Content protected by copyright\n• No reproduction without permission\n• TDC trademarks are property of The Deft Crew' },
        { num: '05', title: 'Limitation of Liability', text: 'TDC is provided "as is" without warranties. We are not liable for any damages arising from use of our services.' },
        { num: '06', title: 'Termination', text: 'We reserve the right to terminate or suspend your account for violations of these terms or Community Guidelines.' },
        { num: '07', title: 'Changes to Terms', text: 'TDC may update these terms at any time. You will be notified of significant changes.' },
        { num: '08', title: 'Contact', text: 'support@thedeftcrew.com\nKarachi, Pakistan' },
        { num: '09', title: 'Governing Law', text: 'These terms are governed by the laws of Pakistan. Disputes resolved in Karachi, Pakistan.' },
      ].map((item, index) => (
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
    </>
  );

  const PrivacyContent = () => (
    <>
      {[
        { num: '01', title: 'Information We Collect', text: '• Name, email, phone number\n• Profile information & preferences\n• Content you create or share\n• Device & usage data' },
        { num: '02', title: 'How We Use Data', text: '• Provide & improve services\n• Personalize experience\n• Send updates & promotions\n• Prevent fraud' },
        { num: '03', title: 'Information Sharing', text: '• No selling of data\n• Shared with service providers\n• When required by law\n• With your consent' },
        { num: '04', title: 'Data Security', text: 'We implement strong security measures to protect your data. However, no method is 100% secure.' },
        { num: '05', title: 'Your Rights', text: '• Access & update data\n• Request deletion\n• Opt-out of marketing\n• Withdraw consent' },
        { num: '06', title: 'Cookies', text: 'We use cookies to enhance experience, analyze usage, and deliver personalized content.' },
        { num: '07', title: 'Data Retention', text: 'We retain data as long as necessary for services, legal obligations, and dispute resolution.' },
        { num: '08', title: 'Children\'s Privacy', text: 'Services not for under 13. We do not knowingly collect data from children.' },
        { num: '09', title: 'Policy Changes', text: 'We may update this policy. Changes will be posted here with updated date.' },
        { num: '10', title: 'Contact Us', text: 'privacy@thedeftcrew.com\nKarachi, Pakistan' },
      ].map((item, index) => (
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
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Legal</Text>
          </View>
          
          <TouchableOpacity style={styles.headerRight}>
            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
          onPress={() => setActiveTab('terms')}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <View style={[styles.tabIcon, activeTab === 'terms' && styles.tabIconActive]}>
              <Ionicons 
                name="document-text-outline" 
                size={18} 
                color={activeTab === 'terms' ? '#f9c349' : '#999'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
              Terms & Conditions
            </Text>
          </View>
          {activeTab === 'terms' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
          onPress={() => setActiveTab('privacy')}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <View style={[styles.tabIcon, activeTab === 'privacy' && styles.tabIconActive]}>
              <Ionicons 
                name="shield-outline" 
                size={18} 
                color={activeTab === 'privacy' ? '#f9c349' : '#999'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
              Privacy Policy
            </Text>
          </View>
          {activeTab === 'privacy' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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
          <Text style={styles.heroTitle}>
            {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {activeTab === 'terms' ? 'Please review before continuing' : 'Your data is safe with us'}
          </Text>
          <View style={styles.heroDivider} />
        </Animated.View>

        <View style={styles.contentContainer}>
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </View>

        <Animated.View 
          style={[
            styles.agreementWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={handleCheckboxPress}
            activeOpacity={0.7}
          >
            <Animated.View 
              style={[
                styles.checkbox, 
                agreed && styles.checkboxChecked,
                { transform: [{ scale: checkboxScale }] }
              ]}
            >
              {agreed && <Ionicons name="checkmark" size={16} color="#000" />}
            </Animated.View>
            <Text style={styles.agreementText}>
              I agree to the{' '}
              <Text style={styles.highlight}>Terms</Text>,{' '}
              <Text style={styles.highlight}>Privacy</Text>, and{' '}
              <Text style={styles.highlight}>Guidelines</Text>
            </Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.continueBtn, !agreed && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={!agreed}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={agreed ? ['#f9c349', '#f5a623'] : ['#e0e0e0', '#e0e0e0']}
                style={styles.continueGradient}
              >
                <Text style={[styles.continueText, !agreed && styles.continueTextDisabled]}>
                  Continue
                </Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={20} 
                  color={agreed ? "#000" : "#999"} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <Text style={styles.version}>v2.0 • Updated {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
      </Animated.ScrollView>

      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.floatingHeaderGradient}
        >
          <Text style={styles.floatingHeaderTitle}>
            {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
          </Text>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    borderBottomWidth: 0,
    shadowColor: '#000',
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
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingHeaderGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    position: 'relative',
  },
  tabActive: {},
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tabIconActive: {
    backgroundColor: 'rgba(249, 195, 73, 0.15)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
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
  agreementWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  agreementText: {
    flex: 1,
    fontSize: 12.5,
    color: '#444',
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '700',
    color: '#000',
  },
  continueBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    gap: 8,
  },
  continueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  continueTextDisabled: {
    color: '#999',
  },
  version: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 10,
    paddingTop: 10,
  },
});