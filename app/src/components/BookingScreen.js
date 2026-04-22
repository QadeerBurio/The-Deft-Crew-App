// BookingScreen.js - Using Expo's DateTimePicker
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/bookings';

const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user } = useContext(AuthContext);
  const { item } = route.params;

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form state
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

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    if (!formData.travelDate) {
      newErrors.travelDate = 'Travel date is required';
    } else if (formData.travelDate < new Date()) {
      newErrors.travelDate = 'Travel date cannot be in the past';
    }
    
    if (formData.numberOfTravelers < 1) {
      newErrors.numberOfTravelers = 'At least 1 traveler required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalPrice = () => {
    return (item.price * formData.numberOfTravelers).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    setLoading(true);
    
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
      totalAmount: parseFloat(calculateTotalPrice()),
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
        Alert.alert(
          'Booking Submitted!',
          'Your booking request has been sent successfully. You will receive a confirmation email shortly.',
          [
            
            {
              text: 'Back to Home',
              onPress: () => navigation.navigate('Travelling')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Booking Error:', error.response?.data || error.message);
      Alert.alert(
        'Booking Failed',
        error.response?.data?.message || 'Unable to submit booking. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleInputChange('travelDate', selectedDate);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Your Trip</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Package Summary */}
          <View style={styles.packageCard}>
            <Text style={styles.packageName}>{item.name}</Text>
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#007AFF" />
                <Text style={styles.packageLocation}>{item.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <FontAwesome5 name="tag" size={14} color="#007AFF" />
                <Text style={styles.packagePrice}>{item.price} / person</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#000000" />
                <Text style={styles.packageDuration}>Flexible Duration</Text>
              </View>
            </View>
          </View>

          {/* Booking Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={(text) => handleInputChange('fullName', text)}
                  editable={!loading}
                />
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Travel Details</Text>

            {/* Travel Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Travel Date *</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, errors.travelDate && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
                <Text style={styles.dateText}>
                  {formatDate(formData.travelDate)}
                </Text>
              </TouchableOpacity>
              {errors.travelDate && <Text style={styles.errorText}>{errors.travelDate}</Text>}
            </View>

            {/* Number of Travelers */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Travelers *</Text>
              <View style={[styles.travelerContainer, errors.numberOfTravelers && styles.inputError]}>
                <TouchableOpacity 
                  style={styles.travelerBtn}
                  onPress={() => handleInputChange('numberOfTravelers', Math.max(1, formData.numberOfTravelers - 1))}
                  disabled={loading}
                >
                  <Ionicons name="remove" size={20} color="#000000" />
                </TouchableOpacity>
                <Text style={styles.travelerCount}>{formData.numberOfTravelers}</Text>
                <TouchableOpacity 
                  style={styles.travelerBtn}
                  onPress={() => handleInputChange('numberOfTravelers', formData.numberOfTravelers + 1)}
                  disabled={loading}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
              {errors.numberOfTravelers && <Text style={styles.errorText}>{errors.numberOfTravelers}</Text>}
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentOptions}>
                {['Cash on Delivery', 'Credit Card', 'Bank Transfer'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentOption,
                      formData.paymentMethod === method && styles.paymentOptionActive
                    ]}
                    onPress={() => handleInputChange('paymentMethod', method)}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.paymentOptionText,
                      formData.paymentMethod === method && styles.paymentOptionTextActive
                    ]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Special Requests */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Special Requests (Optional)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any special requirements or preferences?"
                  value={formData.specialRequests}
                  onChangeText={(text) => handleInputChange('specialRequests', text)}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Price Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Price Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package Price</Text>
                <Text style={styles.summaryValue}>{item.price} x {formData.numberOfTravelers}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>{calculateTotalPrice()}</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Booking</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fabd',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginTop:30,
    paddingTop:10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  packageCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
  },
  packageDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageLocation: {
    fontSize: 14,
    color: '#718096',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  packageDuration: {
    fontSize: 14,
    color: '#718096',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputError: {
    borderColor: '#F56565',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    paddingVertical: 12,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    paddingVertical: 12,
  },
  travelerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
    height: 50,
  },
  travelerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  travelerCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  paymentOptionActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#4A5568',
  },
  paymentOptionTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#718096',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  submitBtn: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#F56565',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default BookingScreen;