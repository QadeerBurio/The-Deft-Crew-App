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
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SelectListingTypeScreen({ navigation }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.8)).current;
  const heroRotateAnim = useRef(new Animated.Value(0)).current;
  const floatingY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const sparkle4 = useRef(new Animated.Value(0)).current;

  const spin = heroRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floating = floatingY.interpolate({
    inputRange: [-8, 8],
    outputRange: [-8, 8],
  });

  const pulse = pulseAnim.interpolate({
    inputRange: [0.9, 1, 1.1],
    outputRange: [0.9, 1, 1.1],
  });

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, {
          toValue: 8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingY, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Sparkle animations
    const createSparkleAnimation = (sparkle) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createSparkleAnimation(sparkle1).start();
    createSparkleAnimation(sparkle2).start();
    createSparkleAnimation(sparkle3).start();
    createSparkleAnimation(sparkle4).start();

    // Hero rotation animation
    const rotateHero = Animated.loop(
      Animated.timing(heroRotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotateHero.start();

    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
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
      { anim: card2Anim, delay: 350 },
      { anim: card3Anim, delay: 500 }
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

  const renderCard = (anim, icon, title, subtitle, type, gradient, tag, iconBg) => {
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

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: anim,
            transform: [
              {
                scale: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.85, 1.05, 1]
                })
              },
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              },
              {
                rotate: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2deg', '0deg']
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
            colors={['#FFFFFF', '#F8F9FC']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconWrapper}>
                <LinearGradient
                  colors={gradient}
                  style={styles.cardIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name={iconMap[type]} size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.cardTextContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <View style={[styles.cardTag, { backgroundColor: tagColors[type] + '15' }]}>
                    <Text style={[styles.cardTagText, { color: tagColors[type] }]}>{tag}</Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
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
      
      {/* Background Decorative Elements */}
      <View style={styles.bgDecorations}>
        <Animated.View 
          style={[
            styles.bgOrb,
            styles.bgOrb1,
            {
              transform: [
                { 
                  scale: sparkle1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.8, 1.2, 0.8]
                  })
                },
                { 
                  translateX: sparkle2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 20]
                  })
                }
              ]
            }
          ]}
        />
        <Animated.View 
          style={[
            styles.bgOrb,
            styles.bgOrb2,
            {
              transform: [
                { 
                  scale: sparkle3.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.6, 1.4, 0.6]
                  })
                },
                { 
                  translateY: sparkle4.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, -20]
                  })
                }
              ]
            }
          ]}
        />
        <Animated.View 
          style={[
            styles.bgOrb,
            styles.bgOrb3,
            {
              transform: [
                { 
                  scale: sparkle2.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.7, 1.3, 0.7]
                  })
                },
                { 
                  translateX: sparkle1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, -30]
                  })
                }
              ]
            }
          ]}
        />
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                size={22} 
                color="#1C1C1E" 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Listing</Text>
            <TouchableOpacity style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <Animated.View 
            style={[
              styles.heroSection,
              { 
                transform: [
                  { scale: heroScaleAnim },
                  { translateY: floating }
                ] 
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.heroIconContainer,
                { 
                  transform: [{ rotate: spin }] 
                }
              ]}
            >
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.heroIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>What to post?</Text>
              <Text style={styles.heroSubtitle}>Choose your listing type</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>100+</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1000+</Text>
            <Text style={styles.statLabel}>Members Online</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>⭐ Rating</Text>
          </View>
        </Animated.View>

        {/* Cards Section */}
        <ScrollView 
          style={styles.cardsContainer}
          contentContainerStyle={styles.cardsContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.sectionHeader,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </Animated.View>

          {renderCard(
            card1Anim,
            'swap-horizontal',
            'Skill Exchange',
            'Trade skills with others',
            'barter',
            ['#f9c349', '#f7b731'],
            'Free'
          )}

          {renderCard(
            card2Anim,
            'cash',
            'Paid Teaching',
            'Teach and earn money',
            'paid',
            ['#34C759', '#28A745'],
            'Paid'
          )}

          {renderCard(
            card3Anim,
            'briefcase',
            'Hire Someone',
            'Find the right talent',
            'job',
            ['#FF6B6B', '#EE5A24'],
            'Hire'
          )}
        </ScrollView>

        {/* Footer */}
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <View style={styles.footerDots}>
                <View style={[styles.footerDot, styles.footerDotActive]} />
                <View style={[styles.footerDot, styles.footerDotInactive]} />
                <View style={[styles.footerDot, styles.footerDotInactive]} />
              </View>
              <Text style={styles.footerText}>Step 1 of 3</Text>
            </View>
            <TouchableOpacity style={styles.nextButton}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    marginTop:34
  },
  bgDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.06,
  },
  bgOrb1: {
    width: 120,
    height: 120,
    top: 40,
    right: -20,
    backgroundColor: '#f9c349',
  },
  bgOrb2: {
    width: 80,
    height: 80,
    top: height * 0.35,
    left: -30,
    backgroundColor: '#34C759',
  },
  bgOrb3: {
    width: 100,
    height: 100,
    bottom: height * 0.3,
    right: -20,
    backgroundColor: '#FF6B6B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  cardsContainer: {
    flex: 1,
  },
  cardsContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    color: '#f9c349',
    fontWeight: '600',
  },
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconWrapper: {
    marginRight: 14,
  },
  cardIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },
  cardArrow: {
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  footerContent: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerDots: {
    flexDirection: 'row',
    gap: 6,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerDotActive: {
    backgroundColor: '#f9c349',
    width: 20,
  },
  footerDotInactive: {
    backgroundColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c349',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});