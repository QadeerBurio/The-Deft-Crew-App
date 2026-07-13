// screens/SelectListingTypeScreen.js
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SelectListingTypeScreen({ navigation }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const heroRotateAnim = useRef(new Animated.Value(0)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  const spin = heroRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Hero rotation animation
    const rotateHero = Animated.loop(
      Animated.sequence([
        Animated.timing(heroRotateAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        }),
        Animated.timing(heroRotateAnim, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: true,
        }),
      ])
    );
    rotateHero.start();

    // Header animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(heroScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Card animations with stagger
    const cardAnimations = [
      { anim: card1Anim, delay: 200 },
      { anim: card2Anim, delay: 400 },
      { anim: card3Anim, delay: 600 }
    ];

    cardAnimations.forEach(({ anim, delay }) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: delay,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const renderCard = (anim, icon, title, description, type, color, gradient, tag) => {
    const iconMap = {
      'barter': 'swap-horizontal',
      'paid': 'cash',
      'job': 'briefcase'
    };

    const tagColors = {
      'barter': '#f9c349',
      'paid': '#34C759',
      'job': '#FF6B6B'
    };

    const tagBgColors = {
      'barter': '#f9c34915',
      'paid': '#34C75915',
      'job': '#FF6B6B15'
    };

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: anim,
            transform: [
              {
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              },
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('CreateListing', { type })}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.cardIconContainer, { backgroundColor: color + '15' }]}>
                <LinearGradient
                  colors={gradient}
                  style={styles.cardIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name={iconMap[type]} size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{title}</Text>
                <View style={[styles.cardTag, { backgroundColor: tagBgColors[type] }]}>
                  <Text style={[styles.cardTagText, { color: tagColors[type] }]}>{tag}</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>{description}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.cardFooterLeft}>
                  <Ionicons name="arrow-forward" size={14} color={color} />
                  <Text style={[styles.cardActionText, { color: color }]}>Get Started</Text>
                </View>
                <View style={[styles.cardArrow, { backgroundColor: color + '15' }]}>
                  <Ionicons name="chevron-forward" size={18} color={color} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Hero Animation */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFDF5']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                size={24} 
                color="#1C1C1E" 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Listing</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.heroSection}>
            <Animated.View 
              style={[
                styles.heroIconContainer,
                { 
                  transform: [{ scale: heroScaleAnim }, { rotate: spin }] 
                }
              ]}
            >
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.heroIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={32} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <View style={styles.headerContent}>
              <Text style={styles.heading}>What would you like to post?</Text>
              <Text style={styles.subheading}>Choose the type of listing you want to create</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        {renderCard(
          card1Anim,
          'swap-horizontal',
          'Skill Exchange',
          'Trade your skill for one you want to learn',
          'barter',
          '#f9c349',
          ['#f9c349', '#f7b731'],
          'Exchange'
        )}

        {renderCard(
          card2Anim,
          'cash',
          'Paid Teaching',
          'Teach a skill and set your price',
          'paid',
          '#34C759',
          ['#34C759', '#28A745'],
          'Paid'
        )}

        {renderCard(
          card3Anim,
          'briefcase',
          'Hire Someone',
          'Post a need and let people apply',
          'job',
          '#FF6B6B',
          ['#FF6B6B', '#EE5A24'],
          'Job'
        )}
      </View>

      {/* Footer */}
      <Animated.View 
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#F8F9FA', '#FFFFFF']}
          style={styles.footerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.footerDots}>
            <View style={[styles.footerDot, styles.footerDotActive]} />
            <View style={[styles.footerDot, styles.footerDotInactive]} />
            <View style={[styles.footerDot, styles.footerDotInactive]} />
          </View>
          <Text style={styles.footerText}>Choose an option to get started</Text>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    marginTop: Platform.OS === 'android' ? 34 : 0,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerPlaceholder: {
    width: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 28,
  },
  subheading: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    lineHeight: 20,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardLeft: {
    marginRight: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardTag: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerGradient: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  footerDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerDotActive: {
    backgroundColor: '#f9c349',
    width: 24,
  },
  footerDotInactive: {
    backgroundColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});