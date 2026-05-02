import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";
import api from "../api/api";

const { width, height } = Dimensions.get("window");

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  // Staggered input animations
  const inputAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Top Notification Animation
  const notificationSlide = useRef(new Animated.Value(-200)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(0.9)).current;

  // Loading Overlay Animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  // States
  const [notification, setNotification] = useState(null);
  const [showLoading, setShowLoading] = useState(false);

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Capture Referral Code from Link
  useEffect(() => {
    if (route.params?.ref) {
      setReferralCode(route.params.ref);
    }
  }, [route.params?.ref]);

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      // Staggered input animations
      ...inputAnims.map((anim, index) =>
        Animated.sequence([
          Animated.delay(300 + index * 80),
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const showNotification = (title, message, type = "success") => {
    setNotification({ title, message, type });
    
    notificationSlide.setValue(-200);
    notificationOpacity.setValue(0);
    notificationScale.setValue(0.9);
    
    Animated.parallel([
      Animated.spring(notificationSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(notificationScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (type === "success") {
      setTimeout(() => {
        hideNotification();
      }, 3000);
    }
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(notificationSlide, {
        toValue: -200,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationScale, {
        toValue: 0.9,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  const showLoadingOverlay = () => {
    setShowLoading(true);
    loadingProgress.setValue(0);
    
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(loadingProgress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const hideLoadingOverlay = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLoading(false);
    });
  };

  const handleShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const universities = [
    "Aga Khan University", "Baqai Medical University", "Bahria University Karachi",
    "NED University of Engineering & Technology", "University of Karachi", "IBA Karachi",
    "IoBM", "SZABIST", "FAST-NUCES Karachi", "Sir Syed University", "Dawood UET",
    "Hamdard University", "Iqra University", "Jinnah Sindh Medical University", "Dow University"
  ];

  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const validatePassword = (pass) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(pass);
  const validatePhone = (num) => /^[0]\d{10}$/.test(num);

  const handleSignup = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (!email || !password || !name || !university) {
      handleShake();
      return showNotification("Required Fields", "Please complete all mandatory fields.", "error");
    }
    if (password !== confirmPassword) {
      handleShake();
      return showNotification("Password Mismatch", "Passwords do not match.", "error");
    }
    if (!validatePassword(password)) {
      handleShake();
      return showNotification("Weak Password", "Use 6+ characters with uppercase, lowercase, and a number.", "error");
    }
    if (!validatePhone(phone)) {
      handleShake();
      return showNotification("Invalid Phone", "Enter an 11-digit number starting with 0.", "error");
    }
    if (!validateEmail(email)) {
      handleShake();
      return showNotification("Invalid Email", "Please enter a valid email address.", "error");
    }

    try {
      showLoadingOverlay();
      setLoading(true);
      
      const body = {
        role: "student",
        email: email.trim().toLowerCase(),
        password,
        fullName: name,
        rollNo,
        phone,
        universityName: university,
        referralCodeInput: referralCode,
        isAlumni: isAlumni,
      };

      await api.post("/auth/signup", body);
      
      hideLoadingOverlay();
      setLoading(false);
      
      // Show success notification and navigate
      showNotification("Welcome to the Crew! 🎉", "Account created successfully. Redirecting to login...", "success");
      
      setTimeout(() => {
        hideNotification();
        navigation.replace("Login");
      }, 2500);

    } catch (err) {
      hideLoadingOverlay();
      setLoading(false);
      handleShake();
      showNotification("Signup Error", err.response?.data?.error || "Connection error. Please try again.", "error");
    }
  };

  const inputFields = [
    { key: 'name', icon: 'person-outline', placeholder: 'Full Name', value: name, onChange: setName, type: 'default' },
    { key: 'roll', icon: 'id-card-outline', placeholder: isAlumni ? 'Old Roll No (Optional)' : 'Current Roll No / ID', value: rollNo, onChange: setRollNo, type: 'default' },
    { key: 'phone', icon: 'call-outline', placeholder: 'Phone (03xxxxxxxxx)', value: phone, onChange: setPhone, type: 'phone-pad' },
    { key: 'email', icon: 'mail-outline', placeholder: 'Email Address', value: email, onChange: setEmail, type: 'email-address', autoCapitalize: 'none' },
  ];

  // FIXED: Use transform scaleX instead of width for animation
  const loadingScaleX = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardView}
      >
        <StatusBar barStyle="dark-content" />
        
        {/* Top Notification Bar - FIXED */}
        {notification && (
          <Animated.View 
            style={[
              styles.notificationContainer,
              {
                transform: [
                  { translateY: notificationSlide },
                  { scale: notificationScale },
                ],
                opacity: notificationOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={notification.type === 'success' 
                ? ['#fff', '#fff'] 
                : ['#f0f0f0', '#e0e0e0']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.notificationGradient}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationIconRow}>
                  <Animated.View style={[
                    styles.notificationIconCircle,
                    {
                      transform: [{
                        scale: notificationScale.interpolate({
                          inputRange: [0.9, 1],
                          outputRange: [0.5, 1],
                        })
                      }]
                    }
                  ]}>
                    <Ionicons 
                      name={notification.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                      size={24} 
                      color={notification.type === 'success' ? "#f9c349" : "#f9c349"} 
                    />
                  </Animated.View>
                  <View style={styles.notificationTextContainer}>
                    <Text style={[
                      styles.notificationTitle,
                      { color: notification.type === 'success' ? '#1a1a1a' : '#1a1a1a' }
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>
                </View>
                
                {notification.type === 'error' && (
                  <TouchableOpacity 
                    onPress={hideNotification}
                    style={styles.notificationClose}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* FIXED: Progress bar using transform scaleX instead of width */}
              {notification.type === 'success' && (
                <View style={styles.notificationProgressBar}>
                  <Animated.View 
                    style={[
                      styles.notificationProgress,
                      {
                        transform: [{
                          scaleX: notificationSlide.interpolate({
                            inputRange: [-200, 0],
                            outputRange: [0, 1],
                          })
                        }]
                      }
                    ]}
                  />
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        )}

        {/* Compact Loading Overlay - FIXED */}
        {showLoading && (
          <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
            
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#f9c349" />
                <Text style={styles.loadingText}>Creating Account</Text>
                
                <View style={styles.loadingProgressContainer}>
                  <Animated.View 
                    style={[
                      styles.loadingProgressBar,
                      { 
                        transform: [{
                          scaleX: loadingScaleX
                        }]
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={['#f9c349', '#f7b733']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressGradient}
                    />
                  </Animated.View>
                </View>
                
                <Text style={styles.loadingSubtext}>Please wait...</Text>
              </View>
           
          </Animated.View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <Animated.View 
                style={[
                  styles.logoBadge,
                  { 
                    transform: [
                      { scale: logoScale },
                      { rotate: logoSpin },
                    ] 
                  }
                ]}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#1a1a1a']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.logoText}>tdc<Text style={{color:"#f9c349"}}>.</Text></Text>
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.title}>Join The Crew</Text>
              <Text style={styles.subtitle}>Unlock exclusive student & alumni deals</Text>
              
              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>

            {/* Student / Alumni Toggle */}
            <Animated.View 
              style={[
                styles.toggleContainer,
                {
                  opacity: inputAnims[0],
                  transform: [
                    { 
                      translateX: inputAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      })
                    },
                    {
                      scale: inputAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.toggleButton, !isAlumni && styles.toggleActive]} 
                onPress={() => setIsAlumni(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleLabel, !isAlumni && styles.toggleLabelActive]}>
                  Current Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, isAlumni && styles.toggleActive]} 
                onPress={() => setIsAlumni(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleLabel, isAlumni && styles.toggleLabelActive]}>
                  Alumni
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Input Fields with Staggered Animations */}
            {inputFields.map((field, index) => (
              <Animated.View
                key={field.key}
                style={[
                  styles.inputWrapper,
                  focusedInput === field.key && styles.inputFocused,
                  {
                    opacity: inputAnims[index + 1],
                    transform: [
                      { 
                        translateX: inputAnims[index + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [index % 2 === 0 ? -60 : 60, 0],
                        })
                      },
                      {
                        scale: inputAnims[index + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        })
                      }
                    ],
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Ionicons 
                    name={field.icon} 
                    size={18} 
                    color={focusedInput === field.key ? "#f9c349" : "#999"} 
                  />
                </View>
                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor="#999"
                  value={field.value}
                  onChangeText={field.onChange}
                  onFocus={() => setFocusedInput(field.key)}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                  keyboardType={field.type}
                  autoCapitalize={field.autoCapitalize || 'words'}
                />
                {field.key === 'email' && field.value.length > 0 && validateEmail(field.value) && (
                  <Animated.View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                  </Animated.View>
                )}
              </Animated.View>
            ))}

            {/* University Picker */}
            <Animated.View
              style={[
                styles.pickerWrapper,
                focusedInput === 'uni' && styles.inputFocused,
                {
                  opacity: inputAnims[5],
                  transform: [
                    { 
                      translateX: inputAnims[5].interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      })
                    },
                    {
                      scale: inputAnims[5].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="school-outline" 
                  size={18} 
                  color={focusedInput === 'uni' ? "#f9c349" : "#999"} 
                />
              </View>
              <Picker
                selectedValue={university}
                onValueChange={(v) => setUniversity(v)}
                style={styles.picker}
                onFocus={() => setFocusedInput('uni')}
                onBlur={() => setFocusedInput(null)}
              >
                <Picker.Item label="Select University" value="" color="#999" />
                {universities.map((uni, i) => (
                  <Picker.Item key={i} label={uni} value={uni} color="#1a1a1a" />
                ))}
              </Picker>
            </Animated.View>

            {/* Password Fields */}
            <Animated.View
              style={[
                styles.inputWrapper,
                focusedInput === 'pass' && styles.inputFocused,
                {
                  opacity: inputAnims[6],
                  transform: [
                    { 
                      translateX: inputAnims[6].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      })
                    },
                    {
                      scale: inputAnims[6].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={18} 
                  color={focusedInput === 'pass' ? "#f9c349" : "#999"} 
                />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('pass')}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color="#999" 
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputWrapper,
                focusedInput === 'confirm' && styles.inputFocused,
                {
                  opacity: inputAnims[7],
                  transform: [
                    { 
                      translateX: inputAnims[7].interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      })
                    },
                    {
                      scale: inputAnims[7].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={18} 
                  color={focusedInput === 'confirm' ? "#f9c349" : "#999"} 
                />
              </View>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedInput('confirm')}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color="#999" 
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Referral Code */}
            <Animated.View
              style={[
                styles.inputWrapper,
                styles.referralWrapper,
                focusedInput === 'ref' && styles.referralFocused,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpAnim }],
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="gift-outline" 
                  size={18} 
                  color={focusedInput === 'ref' ? "#f9c349" : "#f9c349"} 
                />
              </View>
              <TextInput
                placeholder="Referral Code (Optional)"
                placeholderTextColor="#999"
                value={referralCode}
                onChangeText={setReferralCode}
                onFocus={() => setFocusedInput('ref')}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
                autoCapitalize="characters"
              />
            </Animated.View>

            {/* Signup Button with Shake Animation */}
            <Animated.View 
              style={[
                { 
                  transform: [
                    { translateX: shakeAnim }, 
                    { scale: buttonScale },
                  ] 
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleSignup} 
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#1a1a1a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#f9c349" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                      <Ionicons name="person-add-outline" size={20} color="#f9c349" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already in the crew? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signupLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom Branding */}
          <Animated.View style={[styles.brandingFooter, { opacity: fadeAnim }]}>
            <Text style={styles.brandingText}><Text style={{fontSize:14}}>tdc</Text><Text style={{color:'#f9c349', fontSize:20}}>.</Text> KARACHI • 2026</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  keyboardView: {
    flex: 1,
  },
  
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: "center", 
    padding: 0,
  },

  // Top Notification Bar - Full Width, Reduced Height
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },

  notificationGradient: {
    width: '100%',
  },

  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },

  notificationIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  notificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#f9c349',
  },

  notificationTextContainer: {
    flex: 1,
  },

  notificationTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 1,
    letterSpacing: 0.5,
  },

  notificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },

  notificationClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  notificationProgressBar: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: '100%',
    overflow: 'hidden',
  },

  notificationProgress: {
    height: '100%',
    backgroundColor: '#f9c349',
    transform: [{ scaleX: 1 }],
    flex: 1,
  },

  // Compact Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  loadingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    width: '75%',
    padding: 30,
    alignItems: 'center',
  },

  loadingContent: {
    alignItems: 'center',
  },

  loadingText: {
    color: '#f9c349',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 15,
    letterSpacing: 1,
  },

  loadingSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 1,
  },

  loadingProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },

  loadingProgressBar: {
    height: '100%',
    borderRadius: 2,
    transform: [{ scaleX: 0 }],
    width: '100%',
    backgroundColor: '#f9c349',
  },

  progressGradient: {
    width: '100%',
    height: '100%',
  },

  // Card Styles - Full Width
  card: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 30,
    borderWidth: 0,
    borderColor: 'transparent',
    width: '100%',
  },

  // Header
  header: { 
    alignItems: "center", 
    marginBottom: 10,
    marginTop: 2,
  },

  logoBadge: { 
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },

  logoGradient: {
    width: 70,
    height: 70,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  logoText: { 
    fontSize: 32, 
    color: "#fff", 
    fontWeight: "900",
    letterSpacing: -1,
  },

  title: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#1a1a1a",
    letterSpacing: 1,
  },

  subtitle: { 
    color: "#666", 
    marginTop: 3,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  lineSegment: {
    width: 25,
    height: 2,
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },

  diamond: {
    width: 7,
    height: 7,
    backgroundColor: '#1a1a1a',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },

  // Toggle Styles
  toggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f8f8f8', 
    borderRadius: 16, 
    padding: 4, 
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },

  toggleButton: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 13,
  },

  toggleActive: { 
    backgroundColor: '#1a1a1a',
    elevation: 4,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  toggleLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#999',
    letterSpacing: 0.5,
  },

  toggleLabelActive: { 
    color: '#f9c349',
  },

  // Input Styles
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 7,
    height: 56,
  },

  inputFocused: { 
    borderColor: "#f9c349", 
    backgroundColor: "#fff",
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  referralWrapper: { 
    backgroundColor: "#fffbf0",
    borderColor: '#f9c34930',
    marginTop: 8,
  },

  referralFocused: {
    borderColor: "#f9c349",
    backgroundColor: "#fff",
  },

  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  input: { 
    flex: 1, 
    paddingVertical: 8, 
    fontSize: 15, 
    color: "#1a1a1a",
    fontWeight: '500',
  },

  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },

  checkmarkContainer: {
    marginLeft: 4,
  },

  // Picker Styles
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 7,
    height: 56,
  },

  picker: { 
    flex: 1,
    color: "#1a1a1a",
    fontWeight: '500',
  },

  // Button Styles
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginTop: 15,
    marginBottom: 10,
  },

  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 17,
  },

  buttonText: { 
    color: "#f9c349", 
    fontSize: 16, 
    fontWeight: "800",
    letterSpacing: 2,
    marginRight: 8,
  },

  // Footer
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 20,
    marginBottom: 20,
  },

  footerText: { 
    color: "#999",
    fontSize: 14,
  },

  signupLink: { 
    color: "#1a1a1a", 
    fontWeight: "800",
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Branding Footer
  brandingFooter: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },

  brandingText: {
    color: '#ccc',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },
});