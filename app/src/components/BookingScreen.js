import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get("window");

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/bookings';

const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user } = useContext(AuthContext);
  const { item } = route.params;

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardRotateY = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  
  // Notification Animation
  const notificationSlide = useRef(new Animated.Value(-200)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(0.9)).current;
  
  // Loading Overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  // Pulse animation for submit button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [notification, setNotification] = useState(null);
  const [showLoading, setShowLoading] = useState(false);

  // Form state - Updated with PKR currency
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    travelDate: new Date(),
    numberOfTravelers: 1,
    specialRequests: '',
    paymentMethod: 'Cash on Delivery',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const cardSpin = cardRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Entrance animations sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardRotateY, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Keyboard listeners for auto-scroll
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardShow
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleKeyboardShow = (event) => {
    // Scroll to focused input
    const inputName = focusedInput;
    if (inputName && inputRefs.current[inputName]) {
      setTimeout(() => {
        inputRefs.current[inputName]?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            const keyboardHeight = event.endCoordinates.height;
            const inputPosition = y - 100;
            if (inputPosition > 0) {
              scrollViewRef.current?.scrollTo({
                y: inputPosition,
                animated: true,
              });
            }
          },
          () => {}
        );
      }, 300);
    }
  };

  const handleKeyboardHide = () => {
    // Optionally scroll back to top or maintain position
  };

  const showNotification = (title, message, type = "success") => {
    setNotification({ title, message, type });
    
    notificationSlide.setValue(-200);
    notificationOpacity.setValue(0);
    notificationScale.setValue(0.9);
    
    Animated.parallel([
      Animated.spring(notificationSlide, {
        toValue: 0,
        friction: 5,
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
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (type === "success") {
      setTimeout(() => hideNotification(), 3000);
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
    ]).start(() => setNotification(null));
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
    }).start(() => setShowLoading(false));
  };

  const handleShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateField = (field, value) => {
    switch(field) {
      case 'fullName':
        return !value.trim() ? 'Full name is required' : '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^[0-9+\-\s()]{10,15}$/.test(value)) return 'Invalid phone number';
        return '';
      case 'travelDate':
        if (!value) return 'Travel date is required';
        if (value < new Date()) return 'Travel date cannot be in the past';
        return '';
      case 'numberOfTravelers':
        if (value < 1) return 'At least 1 traveler required';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors({ ...errors, [field]: errorMsg || null });
    }
  };

  const handleInputFocus = (field) => {
    setFocusedInput(field);
    // Highlight the input
    if (inputRefs.current[field]) {
      // The input will be scrolled on keyboard show
    }
  };

  const handleInputBlur = (field) => {
    setFocusedInput(null);
    setTouched({ ...touched, [field]: true });
    
    const errorMsg = validateField(field, formData[field]);
    setErrors({ ...errors, [field]: errorMsg || null });
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(formData).forEach(field => {
      if (field !== 'specialRequests' && field !== 'paymentMethod') {
        const errorMsg = validateField(field, formData[field]);
        if (errorMsg) {
          newErrors[field] = errorMsg;
          isValid = false;
        }
      }
    });
    
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      travelDate: true,
      numberOfTravelers: true,
    });
    
    setErrors(newErrors);
    return isValid;
  };

  const calculateTotalPrice = () => {
    // Convert to PKR (assuming 1 USD = 280 PKR)
    const pkrRate = 280;
    const totalInPKR = (item.price * formData.numberOfTravelers * pkrRate);
    return totalInPKR.toFixed(0);
  };

  const handleSubmit = async () => {
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

    if (!validateForm()) {
      handleShake();
      return showNotification("Validation Error", "Please fill all required fields correctly.", "error");
    }

    showLoadingOverlay();
    setLoading(true);
    
    const pkrRate = 280;
    const totalInPKR = (item.price * formData.numberOfTravelers * pkrRate);
    
    const bookingData = {
      packageId: item._id,
      packageName: item.name,
      packageCategory: item.category,
      packageLocation: item.location,
      packagePrice: item.price,
      customerName: formData.fullName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      travelDate: formData.travelDate,
      numberOfTravelers: formData.numberOfTravelers,
      totalAmount: parseFloat(totalInPKR),
      currency: 'PKR',
      specialRequests: formData.specialRequests,
      paymentMethod: formData.paymentMethod,
      status: 'pending',
      bookingDate: new Date(),
    };

    try {
      const response = await axios.post(API_URL, bookingData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success || response.data._id) {
        hideLoadingOverlay();
        setLoading(false);
        showNotification("Booking Submitted! 🎉", "Your booking request has been sent successfully.", "success");
        
        setTimeout(() => {
          hideNotification();
          navigation.navigate('Travelling');
        }, 2500);
      }
    } catch (error) {
      hideLoadingOverlay();
      setLoading(false);
      handleShake();
      showNotification("Booking Failed", error.response?.data?.message || 'Unable to submit booking. Please try again.', "error");
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleInputChange('travelDate', selectedDate);
      const errorMsg = validateField('travelDate', selectedDate);
      setErrors({ ...errors, travelDate: errorMsg || null });
      setTouched({ ...touched, travelDate: true });
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const loadingScaleX = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const notificationScaleX = notificationSlide.interpolate({
    inputRange: [-200, 0],
    outputRange: [0, 1],
  });

  // Payment methods with icons
  const paymentMethods = [
    { id: 'Cash on Delivery', icon: 'cash-outline', label: 'Cash on Delivery' },
    { id: 'Credit Card', icon: 'card-outline', label: 'Credit Card' },
    { id: 'Bank Transfer', icon: 'swap-horizontal-outline', label: 'Bank Transfer' },
    { id: 'JazzCash', icon: 'phone-portrait-outline', label: 'JazzCash' },
    { id: 'EasyPaisa', icon: 'phone-portrait-outline', label: 'EasyPaisa' },
  ];

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.topSafeArea} edges={['top']} />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
                      { color: notification.type === 'success' ? '#1a1a1a' : '#f9c349' }
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>
                </View>
                
                {notification.type === 'error' && (
                  <TouchableOpacity onPress={hideNotification} style={styles.notificationClose}>
                    <Ionicons name="close" size={20} color="#f9c349" />
                  </TouchableOpacity>
                )}
              </View>
              
              {notification.type === 'success' && (
                <View style={styles.notificationProgressBar}>
                  <Animated.View 
                    style={[
                      styles.notificationProgress,
                      {
                        transform: [{ scaleX: notificationScaleX }]
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
            <Text style={styles.loadingText}>Submitting Booking...</Text>
            
            <View style={styles.loadingProgressContainer}>
              <Animated.View 
                style={[
                  styles.loadingProgressBar,
                  { transform: [{ scaleX: loadingScaleX }] }
                ]}
              >
                <LinearGradient
                  colors={['#f9c349', '#f7b733']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradientFill}
                />
              </Animated.View>
            </View>
          </Animated.View>
        )}

        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerFade }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Your Trip</Text>
            <View style={styles.headerRight} />
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Package Summary Card */}
            <Animated.View style={[
              styles.packageCard,
              { 
                transform: [
                  { scale: cardScale },
                  { rotateY: cardSpin },
                ] 
              }
            ]}>
              <LinearGradient
                colors={['#1a1a1a', '#1a1a1a']}
                style={styles.packageCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />
                
                <View style={styles.packageCardTop}>
                  <View style={styles.packageIconContainer}>
                    <Ionicons name="airplane" size={24} color="#1a1a1a" />
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceCurrency}>PKR</Text>
                    <Text style={styles.priceTagText}>{(item.price * 280).toFixed(0)}</Text>
                    <Text style={styles.priceTagSub}>/person</Text>
                  </View>
                </View>
                
                <Text style={styles.packageName}>{item.name}</Text>
                
                <View style={styles.packageDetails}>
                  <View style={styles.detailChip}>
                    <Ionicons name="location-outline" size={14} color="#f9c349" />
                    <Text style={styles.detailChipText}>{item.location}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#f9c349" />
                    <Text style={styles.detailChipText}>Flexible</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Ionicons name="star" size={14} color="#f9c349" />
                    <Text style={styles.detailChipText}>Premium</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Booking Form */}
            <Animated.View style={[styles.formContainer, { transform: [{ translateY: slideUpAnim }] }]}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f9c349', '#f9c349']}
                  style={styles.sectionDot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>
              
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <View 
                  ref={ref => inputRefs.current['fullName'] = ref}
                  style={[
                    styles.inputWrapper, 
                    focusedInput === 'fullName' && styles.inputFocused, 
                    errors.fullName && touched.fullName && styles.inputError
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="person-outline" size={18} color={focusedInput === 'fullName' ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={formData.fullName}
                    onChangeText={(text) => handleInputChange('fullName', text)}
                    onFocus={() => handleInputFocus('fullName')}
                    onBlur={() => handleInputBlur('fullName')}
                    editable={!loading}
                    returnKeyType="next"
                  />
                  {formData.fullName.length > 0 && !errors.fullName && (
                    <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                  )}
                </View>
                {errors.fullName && touched.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View 
                  ref={ref => inputRefs.current['email'] = ref}
                  style={[
                    styles.inputWrapper, 
                    focusedInput === 'email' && styles.inputFocused, 
                    errors.email && touched.email && styles.inputError
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="mail-outline" size={18} color={focusedInput === 'email' ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => handleInputFocus('email')}
                    onBlur={() => handleInputBlur('email')}
                    editable={!loading}
                    returnKeyType="next"
                  />
                  {formData.email.length > 0 && !errors.email && /\S+@\S+\.\S+/.test(formData.email) && (
                    <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                  )}
                </View>
                {errors.email && touched.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View 
                  ref={ref => inputRefs.current['phone'] = ref}
                  style={[
                    styles.inputWrapper, 
                    focusedInput === 'phone' && styles.inputFocused, 
                    errors.phone && touched.phone && styles.inputError
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="call-outline" size={18} color={focusedInput === 'phone' ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    keyboardType="phone-pad"
                    onFocus={() => handleInputFocus('phone')}
                    onBlur={() => handleInputBlur('phone')}
                    editable={!loading}
                    returnKeyType="next"
                  />
                </View>
                {errors.phone && touched.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f9c349', '#f9c349']}
                  style={styles.sectionDot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.sectionTitle}>Travel Details</Text>
              </View>

              {/* Travel Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Travel Date *</Text>
                <TouchableOpacity 
                  ref={ref => inputRefs.current['travelDate'] = ref}
                  style={[styles.inputWrapper, errors.travelDate && touched.travelDate && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="calendar-outline" size={18} color="#f9c349" />
                  </View>
                  <Text style={styles.dateText}>{formatDate(formData.travelDate)}</Text>
                  <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-down" size={18} color="#f9c349" />
                  </View>
                </TouchableOpacity>
                {errors.travelDate && touched.travelDate && <Text style={styles.errorText}>{errors.travelDate}</Text>}
              </View>

              {/* Number of Travelers */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Travelers *</Text>
                <View style={[styles.travelerContainer, errors.numberOfTravelers && touched.numberOfTravelers && styles.inputError]}>
                  <TouchableOpacity 
                    style={styles.travelerBtn}
                    onPress={() => {
                      const newValue = Math.max(1, formData.numberOfTravelers - 1);
                      handleInputChange('numberOfTravelers', newValue);
                      setTouched({ ...touched, numberOfTravelers: true });
                    }}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={20} color="#1a1a1a" />
                  </TouchableOpacity>
                  <View style={styles.travelerCountContainer}>
                    <Text style={styles.travelerCount}>{formData.numberOfTravelers}</Text>
                    <Text style={styles.travelerLabel}>travelers</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.travelerBtn, styles.travelerBtnAdd]}
                    onPress={() => {
                      const newValue = formData.numberOfTravelers + 1;
                      handleInputChange('numberOfTravelers', newValue);
                      setTouched({ ...touched, numberOfTravelers: true });
                    }}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                {errors.numberOfTravelers && touched.numberOfTravelers && <Text style={styles.errorText}>{errors.numberOfTravelers}</Text>}
              </View>

              {/* Payment Method - Grid Layout */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.paymentGrid}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentGridItem,
                        formData.paymentMethod === method.id && styles.paymentGridItemActive
                      ]}
                      onPress={() => handleInputChange('paymentMethod', method.id)}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.paymentIconContainer,
                        formData.paymentMethod === method.id && styles.paymentIconContainerActive
                      ]}>
                        <Ionicons 
                          name={method.icon} 
                          size={24} 
                          color={formData.paymentMethod === method.id ? '#f9c349' : '#666'} 
                        />
                      </View>
                      <Text style={[
                        styles.paymentGridLabel,
                        formData.paymentMethod === method.id && styles.paymentGridLabelActive
                      ]}>
                        {method.label}
                      </Text>
                      {formData.paymentMethod === method.id && (
                        <View style={styles.paymentCheckmark}>
                          <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Special Requests */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Special Requests (Optional)</Text>
                <View 
                  ref={ref => inputRefs.current['requests'] = ref}
                  style={[styles.inputWrapper, styles.textAreaWrapper, focusedInput === 'requests' && styles.inputFocused]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Any special requirements or preferences?"
                    placeholderTextColor="#999"
                    value={formData.specialRequests}
                    onChangeText={(text) => handleInputChange('specialRequests', text)}
                    multiline
                    numberOfLines={4}
                    onFocus={() => handleInputFocus('requests')}
                    onBlur={() => setFocusedInput(null)}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Price Summary - Updated with PKR */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="receipt-outline" size={20} color="#1a1a1a" />
                  <Text style={styles.summaryTitle}>Price Summary</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Package Price (PKR)</Text>
                  <Text style={styles.summaryValue}>PKR {(item.price * 280).toFixed(0)} × {formData.numberOfTravelers}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service Fee</Text>
                  <Text style={styles.summaryValueIncluded}>Included</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Taxes</Text>
                  <Text style={styles.summaryValueIncluded}>Included</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <View style={styles.totalAmountContainer}>
                    <Text style={styles.totalCurrency}>PKR</Text>
                    <Text style={styles.totalAmount}>{calculateTotalPrice()}</Text>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <Animated.View style={{ 
                transform: [
                  { translateX: shakeAnim }, 
                  { scale: Animated.multiply(buttonScale, pulseAnim) }
                ] 
              }}>
                <TouchableOpacity 
                  style={styles.submitBtn}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#1a1a1a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>SUBMIT BOOKING</Text>
                        <View style={styles.submitIconContainer}>
                          <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={{ height: 20 }} />
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.travelDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
      
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topSafeArea: {
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bottomSafeArea: {
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Notification Styles
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
    transform: [{ scaleX: 0 }],
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
  loadingText: {
    color: '#f9c349',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 15,
    marginBottom: 15,
    letterSpacing: 1,
  },
  loadingProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    height: '100%',
    borderRadius: 2,
    transform: [{ scaleX: 0 }],
    width: '100%',
    backgroundColor: '#f9c349',
  },
  progressGradientFill: {
    width: '100%',
    height: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
    height: 40,
  },

  // Package Card
  packageCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  packageCardGradient: {
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 20,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 15,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  packageCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  packageIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 2,
  },
  priceTagText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  priceTagSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  packageName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  packageDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  detailChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Form
  formContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    height: 56,
  },
  textAreaWrapper: {
    height: 'auto',
    minHeight: 56,
    alignItems: 'flex-start',
  },
  inputFocused: {
    borderColor: '#f9c349',
    backgroundColor: '#fff',
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  inputError: {
    borderColor: '#F56565',
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
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    paddingVertical: 8,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    paddingVertical: 8,
  },
  chevronContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  travelerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 15,
    height: 56,
  },
  travelerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  travelerBtnAdd: {
    backgroundColor: '#f9c349',
  },
  travelerCountContainer: {
    alignItems: 'center',
  },
  travelerCount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  travelerLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Payment Methods - Grid Layout
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentGridItem: {
    flex: 1,
    minWidth: (width - 60) / 3 - 10,
    maxWidth: (width - 60) / 3 - 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    paddingTop: 16,
    paddingBottom: 16,
  },
  paymentGridItemActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#f9c349',
    elevation: 5,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentIconContainerActive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#f9c349',
  },
  paymentGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  paymentGridLabelActive: {
    color: '#f9c349',
  },
  paymentCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Price Summary
  summaryCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  summaryValueIncluded: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '700',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  totalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f9c349',
    marginRight: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f9c349',
  },

  // Submit Button
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    marginTop: 10,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginRight: 10,
  },
  submitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#F56565',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    marginLeft: 5,
  },
});

export default BookingScreen;