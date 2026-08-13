import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const PermissionScreen = ({ onPermissionsGranted, onSkip }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [modalVisible, setModalVisible] = useState(true);
  const [permissions, setPermissions] = useState({
    location: false,
    mediaLibrary: false,
    microphone: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const steps = [
    { 
      icon: 'location-outline', 
      title: 'Location Access', 
      key: 'location', 
      description: 'Allow TDC to access your location for personalized experiences',
      benefit: '📍 Find nearby events & connect locally'
    },
    { 
      icon: 'images-outline', 
      title: 'Photo Library', 
      key: 'mediaLibrary', 
      description: 'Grant access to your photos to share memories and build your profile',
      benefit: '🖼️ Showcase your journey & achievements'
    },
    { 
      icon: 'mic-outline', 
      title: 'Microphone Access', 
      key: 'microphone', 
      description: 'Enable microphone for voice features and interactive sessions',
      benefit: '🎤 Participate in voice events & connect'
    },
  ];

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const checkPermissions = async () => {
    try {
      const location = await Location.getForegroundPermissionsAsync();
      const media = await ImagePicker.getMediaLibraryPermissionsAsync();
      const audio = await Audio.getPermissionsAsync();

      const status = {
        location: location.status === 'granted',
        mediaLibrary: media.status === 'granted',
        microphone: audio.status === 'granted',
      };

      setPermissions(status);
      if (status.location && status.mediaLibrary && status.microphone) {
        setModalVisible(false);
        setTimeout(() => onPermissionsGranted(), 300);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const requestPermission = async () => {
    setLoading(true);
    try {
      const currentStep = steps[step];
      let granted = false;

      switch (currentStep.key) {
        case 'location':
          const loc = await Location.requestForegroundPermissionsAsync();
          granted = loc.status === 'granted';
          setPermissions(prev => ({ ...prev, location: granted }));
          break;
        case 'mediaLibrary':
          const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
          granted = media.status === 'granted';
          setPermissions(prev => ({ ...prev, mediaLibrary: granted }));
          break;
        case 'microphone':
          const audio = await Audio.requestPermissionsAsync();
          granted = audio.status === 'granted';
          setPermissions(prev => ({ ...prev, microphone: granted }));
          break;
      }

      if (granted && step < 2) setStep(step + 1);
      else if (granted && step === 2) {
        setModalVisible(false);
        onPermissionsGranted();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (step < 2) setStep(step + 1);
    else {
      setModalVisible(false);
      onSkip();
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const current = steps[step];
  const isGranted = permissions[current.key];

  return (
    <Modal
      animationType="fade"
      transparent
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(false);
        onSkip();
      }}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modal,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Luxury Card Border */}
          <View style={styles.cardBorder} />
          <View style={[styles.cornerAccent, styles.topLeftAccent]} />
          <View style={[styles.cornerAccent, styles.bottomRightAccent]} />

          {/* Progress Dots - Luxury Style */}
          <View style={styles.dotsContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === step && styles.activeDot,
                  index < step && styles.completedDot,
                ]}
              />
            ))}
          </View>

          {/* Icon Circle - Matching Luxury Style */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <Ionicons name={current.icon} size={32} color="#f9c349" />
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.titleAccent}>
              <View style={styles.accentDot} />
              <Text style={styles.titlePrefix}>TDC PERMISSION</Text>
            </View>

            <Text style={styles.title}>{current.title}</Text>
            <View style={styles.titleUnderline} />

            <Text style={styles.description}>{current.description}</Text>

            {/* Benefit Badge */}
            <View style={styles.benefitContainer}>
              <Text style={styles.benefitText}>{current.benefit}</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, isGranted ? styles.grantedBadge : styles.deniedBadge]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, isGranted ? styles.grantedText : styles.deniedText]}>
                {isGranted ? '✓ Permission Granted' : '⚠️ Permission Required'}
              </Text>
            </View>
          </View>

          {/* Buttons - Luxury Style */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.allowButton]}
              onPress={isGranted ? handleSkip : requestPermission}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isGranted ? ['#f9c349', '#f9c349'] : ['#000', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[styles.buttonText, isGranted && styles.buttonTextGold]}>
                      {isGranted ? (step === 2 ? 'Continue' : 'Next') : 'Allow Access'}
                    </Text>
                    <Ionicons
                      name={isGranted ? (step === 2 ? 'checkmark-circle' : 'arrow-forward') : 'lock-open-outline'}
                      size={20}
                      color={isGranted ? '#000' : '#f9c349'}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>
                {step === 2 ? 'Skip for now' : 'Skip'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Counter */}
          <Text style={styles.counter}>
            {step + 1} / {steps.length}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 28,
    width: Math.min(width - 40, 340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f9c349',
  },
  cornerAccent: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#f9c349',
  },
  topLeftAccent: {
    top: 10,
    left: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRightAccent: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activeDot: {
    backgroundColor: '#f9c349',
    width: 28,
  },
  completedDot: {
    backgroundColor: '#000',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9c349',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  titleAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  titlePrefix: {
    fontSize: 11,
    color: '#f9c349',
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#f9c349',
    marginBottom: 16,
    borderRadius: 1.5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  benefitContainer: {
    backgroundColor: '#f9c34920',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  benefitText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 4,
  },
  grantedBadge: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#000',
  },
  deniedBadge: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  grantedText: {
    color: '#000',
  },
  deniedText: {
    color: '#FF3B30',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  button: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    width: '100%',
  },
  allowButton: {
    shadowColor: '#f9c349',
    shadowOpacity: 0.3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 54,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: 1,
  },
  buttonTextGold: {
    color: '#000',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  counter: {
    marginTop: 12,
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
});

export default PermissionScreen;