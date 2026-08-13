// screens/CommunityGuidelinesScreen.js
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function CommunityGuidelinesScreen({ navigation }) {
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCheckboxPress = () => {
    Animated.sequence([
      Animated.timing(checkboxScale, {
        toValue: 0.7,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(checkboxScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    setAgreed(!agreed);
  };

  const handleContinue = () => {
    if (agreed) {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.92,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(true);
        Animated.spring(modalAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleModalConfirm = async () => {
    try {
      // Mark that user has accepted guidelines
      await AsyncStorage.setItem("guidelinesAccepted", "true");
      // Also mark onboarding as complete for backward compatibility
      await AsyncStorage.setItem("onboardingComplete", "true");
      
      Animated.spring(modalAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
        // Navigate to Login screen
        navigation.replace('Login');
      });
    } catch (e) {
      console.log('Error saving guidelines status:', e);
      navigation.replace('Login');
    }
  };

  const prohibitedItems = [
    { icon: 'alert-circle', text: 'Harassment or bullying' },
    { icon: 'alert-circle', text: 'Hate speech' },
    { icon: 'alert-circle', text: 'Threats' },
    { icon: 'alert-circle', text: 'Sexual or explicit content' },
    { icon: 'alert-circle', text: 'Violence' },
    { icon: 'alert-circle', text: 'Spam' },
    { icon: 'alert-circle', text: 'Scams or fraudulent content' },
    { icon: 'alert-circle', text: 'Impersonation' },
    { icon: 'alert-circle', text: 'Illegal content' },
    { icon: 'alert-circle', text: 'Abusive behavior' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Community Guidelines</Text>
          
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

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
          <View style={styles.heroIcon}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.heroIconGradient}
            >
              <Ionicons name="people" size={28} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Community Guidelines</Text>
          <Text style={styles.heroSubtitle}>
            Keeping our community safe and respectful
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.introSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.introText}>
            The Deft Crew is committed to creating a safe, inclusive, and respectful 
            environment for all users. We do not tolerate any form of harmful behavior.
          </Text>
        </Animated.View>

        <View style={styles.prohibitedSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>🚫</Text>
            </View>
            <Text style={styles.sectionTitle}>We do not tolerate:</Text>
          </View>

          <View style={styles.prohibitedList}>
            {prohibitedItems.map((item, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.prohibitedItem,
                  {
                    opacity: fadeAnim,
                    transform: [{ 
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 20],
                        outputRange: [0, 20 * (index + 1) * 0.04],
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.prohibitedIcon}>
                  <Ionicons name="close-circle" size={16} color="#ff4757" />
                </View>
                <Text style={styles.prohibitedText}>{item.text}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View 
          style={[
            styles.moderationSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.moderationHeader}>
            <View style={styles.moderationIconContainer}>
              <Ionicons name="flag" size={20} color="#f9c349" />
            </View>
            <Text style={styles.moderationTitle}>Reporting & Moderation</Text>
          </View>

          <View style={styles.moderationCard}>
            <View style={styles.moderationItem}>
              <View style={styles.moderationDot} />
              <Text style={styles.moderationText}>
                Users can <Text style={styles.moderationHighlight}>report content</Text> or 
                <Text style={styles.moderationHighlight}> block other users</Text>
              </Text>
            </View>
            
            <View style={styles.moderationItem}>
              <View style={styles.moderationDot} />
              <Text style={styles.moderationText}>
                Reported content is reviewed by our <Text style={styles.moderationHighlight}>moderation team</Text>
              </Text>
            </View>
            
            <View style={styles.moderationItem}>
              <View style={styles.moderationDot} />
              <Text style={styles.moderationText}>
                Content violating these rules may be <Text style={styles.moderationHighlight}>removed</Text>
              </Text>
            </View>
            
            <View style={styles.moderationItem}>
              <View style={styles.moderationDot} />
              <Text style={styles.moderationText}>
                Accounts may be <Text style={styles.moderationHighlight}>suspended</Text> or 
                <Text style={styles.moderationHighlight}> permanently banned</Text>
              </Text>
            </View>
          </View>
        </Animated.View>

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
              {agreed && <Ionicons name="checkmark" size={14} color="#000" />}
            </Animated.View>
            <Text style={styles.agreementText}>
              I agree to follow the <Text style={styles.highlight}>Community Guidelines</Text>
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
                  size={18} 
                  color={agreed ? "#000" : "#999"} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <Text style={styles.version}>
          v1.0 • {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </Animated.ScrollView>

      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.floatingHeaderGradient}
        >
          <Text style={styles.floatingHeaderTitle}>Community Guidelines</Text>
        </LinearGradient>
      </Animated.View>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalAnim,
                transform: [
                  { 
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.modalIcon}
              >
                <Ionicons name="checkmark-circle" size={32} color="#000" />
              </LinearGradient>
            </View>
            
            <Text style={styles.modalTitle}>All Set!</Text>
            <Text style={styles.modalSubtitle}>
              You have successfully reviewed and accepted the Community Guidelines.
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleModalConfirm}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 32,
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
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  floatingHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  heroIcon: {
    marginBottom: 10,
  },
  heroIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  introSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  introText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    textAlign: 'center',
  },
  prohibitedSection: {
    marginTop: 10,
    paddingHorizontal: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionBadge: {
    marginRight: 10,
  },
  sectionBadgeText: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  prohibitedList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  prohibitedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  prohibitedIcon: {
    marginRight: 10,
  },
  prohibitedText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
  },
  moderationSection: {
    marginTop: 10,
    paddingHorizontal: 14,
  },
  moderationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  moderationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 195, 73, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  moderationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  moderationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moderationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  moderationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f9c349',
    marginRight: 10,
    marginTop: 7,
  },
  moderationText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  moderationHighlight: {
    fontWeight: '700',
    color: '#000',
  },
  agreementWrapper: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  agreementText: {
    flex: 1,
    fontSize: 12,
    color: '#444',
    lineHeight: 16,
  },
  highlight: {
    fontWeight: '700',
    color: '#000',
  },
  continueBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  continueBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 6,
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
    fontSize: 9,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});