// screens/CommunityGuidelinesScreen.js
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function CommunityGuidelinesScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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

  const guidelines = [
    {
      icon: 'heart-outline',
      title: 'Be Respectful',
      desc: 'Treat everyone with kindness. No harassment, bullying, or discrimination.',
      color: '#FF6B6B',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Be Authentic',
      desc: 'Share genuine content. No impersonation or misinformation.',
      color: '#4ECDC4',
    },
    {
      icon: 'lock-closed-outline',
      title: 'Protect Privacy',
      desc: "Respect others' privacy. Don't share personal info without consent.",
      color: '#A855F7',
    },
    {
      icon: 'alert-circle-outline',
      title: 'No Harmful Content',
      desc: 'No violence, self-harm, or illegal activities.',
      color: '#FF4757',
    },
    {
      icon: 'document-text-outline',
      title: 'Respect Copyright',
      desc: 'Share only content you have rights to. Give proper credit.',
      color: '#3B82F6',
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Be Constructive',
      desc: 'Engage positively. Respect different viewpoints.',
      color: '#f9c349',
    },
    {
      icon: 'megaphone-outline',
      title: 'No Spam',
      desc: 'Post meaningful content. No spam or manipulation.',
      color: '#FF9800',
    },
    {
      icon: 'flag-outline',
      title: 'Report Violations',
      desc: 'Help keep our community safe. Report violations.',
      color: '#795548',
    },
  ];

  const prohibited = [
    'Harassment & Bullying',
    'Hate Speech',
    'Threats & Intimidation',
    'Explicit Content',
    'Violence',
    'Spam',
    'Scams',
    'Impersonation',
    'Illegal Activities',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#ccbfbf14" />
      
      {/* Header */}
      <LinearGradient colors={['#fff', '#fff']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Guidelines</Text>
            <View style={styles.headerHandle} />
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
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
          <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.heroIcon}>
            <Ionicons name="people" size={28} color="#1A1A1A" />
          </LinearGradient>
          <Text style={styles.heroTitle}>Community Guidelines</Text>
          <Text style={styles.heroDesc}>Keeping TDC safe and respectful</Text>
        </Animated.View>

        {/* Intro */}
        <Animated.View 
          style={[
            styles.introCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.introText}>
            We're committed to creating a safe, inclusive community where everyone feels welcome.
          </Text>
        </Animated.View>

        {/* Guidelines */}
        <Text style={styles.sectionLabel}>Our Guidelines</Text>
        <View style={styles.card}>
          {guidelines.map((item, index) => (
            <Animated.View 
              key={index}
              style={[
                styles.guidelineItem,
                index === guidelines.length - 1 && { borderBottomWidth: 0 },
                {
                  opacity: fadeAnim,
                  transform: [
                    { 
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 20],
                        outputRange: [0, 10 * (index + 1) * 0.03],
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={[styles.guidelineIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>{item.title}</Text>
                <Text style={styles.guidelineDesc}>{item.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Prohibited */}
        <Text style={styles.sectionLabel}>Not Tolerated</Text>
        <View style={styles.card}>
          <View style={styles.prohibitedGrid}>
            {prohibited.map((item, index) => (
              <View key={index} style={styles.prohibitedItem}>
                <View style={styles.prohibitedDot} />
                <Text style={styles.prohibitedText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Moderation */}
        <Text style={styles.sectionLabel}>Moderation</Text>
        <View style={styles.card}>
          <View style={styles.moderationItem}>
            <Ionicons name="flag-outline" size={16} color="#f9c349" />
            <Text style={styles.moderationText}>
              <Text style={styles.moderationStrong}>Report</Text> content or 
              <Text style={styles.moderationStrong}> block</Text> users
            </Text>
          </View>
          <View style={[styles.moderationItem, { borderBottomWidth: 0 }]}>
            <Ionicons name="shield-outline" size={16} color="#f9c349" />
            <Text style={styles.moderationText}>
              Violations may result in <Text style={styles.moderationStrong}>removal</Text>,{' '}
              <Text style={styles.moderationStrong}>suspension</Text>, or{' '}
              <Text style={styles.moderationStrong}>ban</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.version}>
          v1.0 • {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  headerGradient: {
   
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
  },
  headerHandle: {
    width: 20,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#f9c349',
    marginTop: 3,
  },
  headerRight: {
    width: 36,
  },
  
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Hero
  heroSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Intro
  introCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  introText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  
  // Guideline Item
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  guidelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  guidelineDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '400',
    lineHeight: 15,
  },
  
  // Prohibited
  prohibitedGrid: {
    paddingVertical: 2,
  },
  prohibitedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prohibitedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF4757',
    marginRight: 10,
  },
  prohibitedText: {
    fontSize: 12.5,
    color: '#444',
    fontWeight: '500',
  },
  
  // Moderation
  moderationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  moderationText: {
    flex: 1,
    fontSize: 12.5,
    color: '#555',
    lineHeight: 18,
  },
  moderationStrong: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // Version
  version: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 10,
    paddingTop: 20,
    fontWeight: '500',
  },
});