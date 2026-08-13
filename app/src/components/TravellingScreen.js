import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import TravelChatBot from './TravelChatBot';

const TravelingScreen = () => {
  const navigation = useNavigation();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel Assistant</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Compact */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1A1A2E', '#2D2D44']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubbles" size={40} color="#f9c349" />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>AI Travel Assistant</Text>
                <Text style={styles.heroSubtitle}>
                  Available 24/7 • Always ready to help
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Assistant</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={22} color="#f9c349" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Available 24/7</Text>
                <Text style={styles.infoValue}>Always ready to help you anytime</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="globe" size={22} color="#f9c349" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Multi-language</Text>
                <Text style={styles.infoValue}>Communicate in your preferred language</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="rocket" size={22} color="#f9c349" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Instant Responses</Text>
                <Text style={styles.infoValue}>Get answers to your queries in real-time</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="shield-check" size={22} color="#f9c349" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Secure & Private</Text>
                <Text style={styles.infoValue}>Your conversations are encrypted and safe</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What I Can Do</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Plan Your Trips</Text>
              <Text style={styles.featureDescription}>
                Get personalized itineraries based on your preferences, budget, and duration
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Find Best Places</Text>
              <Text style={styles.featureDescription}>
                Discover top-rated restaurants, attractions, and hidden gems at your destination
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Travel Tips & Advice</Text>
              <Text style={styles.featureDescription}>
                Get expert recommendations on packing, safety, local customs, and more
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Book Recommendations</Text>
              <Text style={styles.featureDescription}>
                Receive suggestions for accommodations, flights, and activities
              </Text>
            </View>
          </View>
        </View>

        {/* How to Use */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Use</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Tap the Chat Icon</Text>
              <Text style={styles.stepDescription}>
                Click on the chat bubble at the bottom right to start a conversation
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Type Your Question</Text>
              <Text style={styles.stepDescription}>
                Ask anything about travel, destinations, planning, or recommendations
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get Instant Help</Text>
              <Text style={styles.stepDescription}>
                Receive helpful responses and guidance for your travel needs
              </Text>
            </View>
          </View>
        </View>

        
      </ScrollView>

      {/* Chatbot */}
      <TravelChatBot />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA', // Yellow background
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00000',
  },
  headerRight: {
    width: 32,
  },

  // Container
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  contentContainer: {
    paddingBottom: 0,
  },

  // Hero Section - Compact
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(249, 195, 73, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  infoValue: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },

  // Feature Items
  featureItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginTop: 6,
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 20,
  },

  // Steps
  stepContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    color: '#f9c349',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 20,
  },
});

export default TravelingScreen;