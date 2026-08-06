import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// IMPORTANT: Define your API URL here or import from config
const API_URL = 'https://the-deft-crew-production.up.railway.app/api'; // Replace with your actual API URL

export default function ChangePassword({ navigation }) {
  const { token } = useContext(AuthContext);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    let newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
  if (!validate()) return;
  
  setLoading(true);
  try {
    const response = await axios.post(  // Changed from .put to .post
      `${API_URL}/auth/change-password`,
      {
        currentPassword,
        newPassword
      },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    if (response.data.success) {
      Alert.alert(
        "Success! 🎉",
        "Your password has been changed successfully!",
        [
          { 
            text: "Done", 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } else {
      Alert.alert("Error", response.data.message || "Failed to change password");
    }
  } catch (error) {
    console.error("Change password error:", error);
    
    let errorMessage = "Failed to change password. Please try again.";
    if (error.response) {
      errorMessage = error.response.data?.message || errorMessage;
    } else if (error.request) {
      errorMessage = "Network error. Please check your connection.";
    }
    
    Alert.alert(
      "Error",
      errorMessage
    );
  } finally {
    setLoading(false);
  }
};

  const renderInput = ({
    label,
    value,
    onChangeText,
    secureTextEntry,
    showPassword,
    onTogglePassword,
    placeholder,
    icon,
    error,
    fieldName,
    autoCapitalize = 'none'
  }) => {
    const isFocused = focusedInput === fieldName;
    
    return (
      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>{label}</Text>
          {value.length > 0 && !error && (
            <View style={styles.validIndicator}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            </View>
          )}
        </View>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError
        ]}>
          <View style={styles.inputIconWrapper}>
            <Ionicons name={icon} size={20} color={isFocused ? '#f9c349' : '#999'} />
          </View>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry ? !showPassword : false}
            placeholder={placeholder}
            placeholderTextColor="#bbb"
            autoCapitalize={autoCapitalize}
            onFocus={() => setFocusedInput(false)}
            onBlur={() => setFocusedInput(false)}
          />
          {secureTextEntry && (
            <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={isFocused ? '#f9c349' : '#999'}
              />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color="#ff4757" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!newPassword) return { label: 'None', color: '#ddd', score: 0 };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    
    const strengths = [
      { label: 'Weak', color: '#ff4757' },
      { label: 'Fair', color: '#ff6b35' },
      { label: 'Good', color: '#ffd93d' },
      { label: 'Strong', color: '#6bcb77' },
      { label: 'Very Strong', color: '#4CAF50' },
    ];
    return { ...strengths[score], score };
  };

  const strength = getPasswordStrength();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideUpAnim }] 
          }}>
            
            {/* Header Icon */}
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
              <LinearGradient 
                colors={['#f9c349', '#e6b800']} 
                style={styles.iconGradient}
              >
                <Ionicons name="key-outline" size={44} color="#1a1a1a" />
              </LinearGradient>
              <View style={styles.iconGlow} />
            </Animated.View>

            <Text style={styles.title}>Update Password</Text>
            <Text style={styles.subtitle}>
              Create a strong password to keep your account secure
            </Text>

            {/* Input Fields */}
            <View style={styles.form}>
              {renderInput({
                label: "Current Password",
                value: currentPassword,
                onChangeText: setCurrentPassword,
                secureTextEntry: true,
                showPassword: showCurrentPassword,
                onTogglePassword: () => setShowCurrentPassword(!showCurrentPassword),
                placeholder: "Enter your current password",
                icon: "lock-closed-outline",
                error: errors.currentPassword,
                fieldName: 'current'
              })}

              {/* New Password with Strength Indicator */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  {newPassword.length > 0 && (
                    <View style={styles.strengthBadge}>
                      <Text style={[styles.strengthText, { color: strength.color }]}>
                        {strength.label}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'new' && styles.inputFocused,
                  errors.newPassword && styles.inputError
                ]}>
                  <View style={styles.inputIconWrapper}>
                    <Ionicons name="key-outline" size={20} color={focusedInput === 'new' ? '#f9c349' : '#999'} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#bbb"
                    autoCapitalize="none"
                    onFocus={() => setFocusedInput('false')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}>
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={focusedInput === 'new' ? '#f9c349' : '#999'}
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Bar */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthBar}>
                    <View style={styles.strengthBarTrack}>
                      <View style={[
                        styles.strengthBarFill,
                        { 
                          width: `${(strength.score / 4) * 100}%`,
                          backgroundColor: strength.color 
                        }
                      ]} />
                    </View>
                  </View>
                )}
                
                {errors.newPassword && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color="#ff4757" />
                    <Text style={styles.errorText}>{errors.newPassword}</Text>
                  </View>
                )}
              </View>

              {renderInput({
                label: "Confirm New Password",
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                secureTextEntry: true,
                showPassword: showConfirmPassword,
                onTogglePassword: () => setShowConfirmPassword(!showConfirmPassword),
                placeholder: "Confirm your new password",
                icon: "checkmark-circle-outline",
                error: errors.confirmPassword,
                fieldName: 'confirm'
              })}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>
                <Ionicons name="list-outline" size={16} color="#f9c349" /> Password Requirements:
              </Text>
              <View style={styles.requirementsGrid}>
                <View style={styles.requirementItem}>
                  <View style={[styles.requirementDot, { 
                    backgroundColor: newPassword.length >= 6 ? '#4CAF50' : '#ddd' 
                  }]} />
                  <Text style={[styles.requirementText, {
                    color: newPassword.length >= 6 ? '#4CAF50' : '#999'
                  }]}>
                    Min 6 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <View style={[styles.requirementDot, { 
                    backgroundColor: /[A-Z]/.test(newPassword) ? '#4CAF50' : '#ddd' 
                  }]} />
                  <Text style={[styles.requirementText, {
                    color: /[A-Z]/.test(newPassword) ? '#4CAF50' : '#999'
                  }]}>
                    Uppercase
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <View style={[styles.requirementDot, { 
                    backgroundColor: /[a-z]/.test(newPassword) ? '#4CAF50' : '#ddd' 
                  }]} />
                  <Text style={[styles.requirementText, {
                    color: /[a-z]/.test(newPassword) ? '#4CAF50' : '#999'
                  }]}>
                    Lowercase
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <View style={[styles.requirementDot, { 
                    backgroundColor: /[0-9]/.test(newPassword) ? '#4CAF50' : '#ddd' 
                  }]} />
                  <Text style={[styles.requirementText, {
                    color: /[0-9]/.test(newPassword) ? '#4CAF50' : '#999'
                  }]}>
                    Number
                  </Text>
                </View>
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity 
              style={styles.updateBtn}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#f9c349', '#e6b800']} 
                style={styles.updateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#1a1a1a" />
                    <Text style={styles.updateText}>Update Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <View style={styles.securityIconWrapper}>
                <Ionicons name="shield-checkmark" size={16} color="#f9c349" />
              </View>
              <Text style={styles.securityText}>
                Your password is encrypted and stored securely
              </Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fc' 
  },
  flex: {
    flex: 1,
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 7,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    backgroundColor: '#fff'
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f5f6f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    letterSpacing: 0.3 
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  
  // Icon Container
  iconContainer: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 11,
    position: 'relative',
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#f9c34915',
    zIndex: 1,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  
  // Form
  form: {
    marginBottom: 6,
  },
  inputContainer: {
    marginBottom: 13,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  validIndicator: {
    marginLeft: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    paddingHorizontal: 4,
    height: 47,
  },
  inputFocused: {
    borderColor: '#f9c349',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ff4757',
    borderWidth: 1.5,
  },
  inputIconWrapper: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  eyeButton: {
    padding: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#ff4757',
    fontWeight: '500',
  },
  
  // Strength Indicator
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f8f9fc',
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '700',
  },
  strengthBar: {
    marginTop: 8,
  },
  strengthBarTrack: {
    height: 3,
    backgroundColor: '#e8e8e8',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  
  // Requirements Card
  requirementsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 13,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
    gap: 6,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  requirementDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Update Button
  updateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  updateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  updateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
  },
  securityIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});