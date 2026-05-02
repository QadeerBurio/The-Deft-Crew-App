import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function SignIn({ navigation }) {
  const { setUser, setToken } = useContext(AuthContext);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputAnim1 = useRef(new Animated.Value(0)).current;
  const inputAnim2 = useRef(new Animated.Value(0)).current;
  
  // Top Notification Animation
  const notificationSlide = useRef(new Animated.Value(-200)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(0.9)).current;
  
  // Loading Overlay Animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Social Buttons Animation
  const socialAnim1 = useRef(new Animated.Value(0)).current;
  const socialAnim2 = useRef(new Animated.Value(0)).current;
  const socialAnim3 = useRef(new Animated.Value(0)).current;

  // Alert States
  const [notification, setNotification] = useState(null);
  const [showLoading, setShowLoading] = useState(false);

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
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
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(inputAnim1, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.spring(inputAnim2, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.spring(socialAnim1, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.spring(socialAnim2, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.spring(socialAnim3, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
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
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideLoadingOverlay = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 30,
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

  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleLogin = async () => {
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

    if (!email || !password) {
      handleShake();
      return showNotification("Missing Information", "Please fill in all fields to continue.", "error");
    }
    if (!validateEmail(email)) {
      handleShake();
      return showNotification("Invalid Email", "Please enter a valid email address.", "error");
    }

    try {
      showLoadingOverlay();
      setLoading(true);
      
      const res = await api.post("/auth/login", { email: email.trim(), password });
      const { token, user } = res.data;

      if (user.role !== "student") {
        hideLoadingOverlay();
        setLoading(false);
        return showNotification("Access Denied", "This portal is for Students only.", "error");
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      hideLoadingOverlay();
      showNotification("Welcome Back! 🎉", `Great to see you, ${user.fullName || 'Student'}.`, "success");
      
      setTimeout(() => {
        hideNotification();
        setToken(token);
        setUser(user);
      }, 2000);

    } catch (err) {
      hideLoadingOverlay();
      const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
      handleShake();
      showNotification("Login Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardView}
      >
        <StatusBar barStyle="dark-content" />
        
        {/* Top Notification Bar */}
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
                : ['#a09c9c', '#b5b0b0']
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
                      color={notification.type === 'success' ? "#1a1a1a" : "#f9c349"} 
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
              
              {/* Fixed Progress Bar - using transform scaleX instead of width */}
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

        {/* Loading Overlay */}
        {showLoading && (
          <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
            
              <ActivityIndicator size="large" color="#f9c349" />
              <Text style={styles.loadingText}>Signing In...</Text>
              <View style={styles.loadingDots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.loadingDot} />
                ))}
              </View>
           
          </Animated.View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              
              <Text style={styles.title}>The Deft Crew</Text>
              <Text style={styles.subtitle}>Sign in to manage your Account</Text>
              
              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>

            {/* Email Input */}
            <Animated.View 
              style={[
                styles.inputWrapper, 
                focusedInput === 'email' && styles.inputFocused,
                {
                  opacity: inputAnim1,
                  transform: [
                    { 
                      translateX: inputAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      })
                    },
                    {
                      scale: inputAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                }
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="mail-outline" 
                  size={18} 
                  color={focusedInput === 'email' ? "#f9c349" : "#999"} 
                />
              </View>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {email.length > 0 && validateEmail(email) && (
                <Animated.View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                </Animated.View>
              )}
            </Animated.View>

            {/* Password Input */}
            <Animated.View 
              style={[
                styles.inputWrapper, 
                focusedInput === 'password' && styles.inputFocused,
                {
                  opacity: inputAnim2,
                  transform: [
                    { 
                      translateX: inputAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      })
                    },
                    {
                      scale: inputAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }
                  ],
                }
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={18} 
                  color={focusedInput === 'password' ? "#f9c349" : "#999"} 
                />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
                secureTextEntry={!showPassword}
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

            {/* Forgot Password */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity 
                style={styles.forgotBtn} 
                onPress={() => navigation.navigate("ForgotPassword")}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
                <Ionicons name="arrow-forward" size={14} color="#f9c349" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </Animated.View>

            {/* Login Button with Shake Animation */}
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
                onPress={handleLogin} 
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
                      <Text style={styles.buttonText}>SIGN IN</Text>
                      <Ionicons name="log-in-outline" size={20} color="#f9c349" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Social Login Options */}
            <View style={styles.socialSection}>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <View style={styles.socialButtons}>
                <Animated.View style={{ 
                  opacity: socialAnim1,
                  transform: [{ 
                    translateY: socialAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }}>
                  <TouchableOpacity 
                    style={[styles.socialButton, styles.googleButton]} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-google" size={22} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ 
                  opacity: socialAnim2,
                  transform: [{ 
                    translateY: socialAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }}>
                  <TouchableOpacity 
                    style={[styles.socialButton, styles.appleButton]} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-apple" size={24} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ 
                  opacity: socialAnim3,
                  transform: [{ 
                    translateY: socialAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }}>
                  <TouchableOpacity 
                    style={[styles.socialButton, styles.facebookButton]} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-facebook" size={24} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
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
  },

  // Top Notification Styles
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
    borderColor:'#000'
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
    borderColor:'#000'
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
    color:'#000'
  },

  notificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    opacity: 0.9,
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

  // Loading Overlay
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
    width: '70%',
    padding: 35,
    alignItems: 'center',
  },

  loadingText: {
    color: '#f9c349',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 15,
    letterSpacing: 1,
  },

  loadingDots: {
    flexDirection: 'row',
    marginTop: 15,
  },

  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginHorizontal: 4,
    opacity: 0.5,
  },

  // Card Styles
  card: {
    backgroundColor: "#fff",
    padding: 30,
    paddingTop: 50,
    width: '100%',
  },

  // Header
  header: { 
    alignItems: "center", 
    marginBottom: 30,
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
    width: 80,
    height: 80,
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
    marginTop: 6,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
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

  // Input Styles
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 56,
    width: '100%',
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

  // Forgot Password
  forgotBtn: { 
    alignSelf: "flex-end", 
    marginBottom: 25,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  forgotText: { 
    color: "#f9c349", 
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
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
    marginBottom: 10,
    width: '100%',
  },

  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 17,
    width: '100%',
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

  // Social Section
  socialSection: {
    width: '100%',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },

  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },

  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },

  // Branded Social Buttons
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  googleButton: {
    backgroundColor: '#DB4437',
    shadowColor: "#DB4437",
  },

  appleButton: {
    backgroundColor: '#000000',
    shadowColor: "#000000",
  },

  facebookButton: {
    backgroundColor: '#4267B2',
    shadowColor: "#4267B2",
  },

  // Branding Footer
  brandingFooter: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },

  brandingText: {
    color: '#ccc',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },
});