// app/src/screens/ForgotPassword.js
// Step 1 of 3: email → code is sent → VerifyOTP.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { AuthShell, AuthInput, AuthButton, AUTH } from '../components/AuthShell';

export default function ForgotPassword({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'));

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    const value = emailOrPhone.trim();
    if (!value) {
      setError('Enter the email or phone number on your account');
      return;
    }
    setError('');

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { emailOrPhone: value }, { timeout: 25000 });

      if (!res.data?.userId) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
        return;
      }

      navigation.navigate('VerifyOTP', {
        userId: res.data.userId,
        emailOrPhone: value,
        sentTo: res.data.email || null,
      });
    } catch (err) {
      // Code already sent less than a minute ago: go enter that one
      if (err.response?.status === 429 && err.response.data?.userId) {
        navigation.navigate('VerifyOTP', {
          userId: err.response.data.userId,
          emailOrPhone: value,
          retryAfter: err.response.data.retryAfter || 60,
        });
        return;
      }

      let msg = 'Server not reachable. Please try again.';
      if (err.response) msg = err.response.data?.message || err.response.data?.error || 'Server error occurred.';
      else if (err.code === 'ECONNABORTED') msg = 'The server took too long. Please try again.';
      else if (err.request) msg = 'No internet connection. Please check and try again.';

      if (err.response?.status === 404) setError(msg);
      else Alert.alert('Request failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step={1}
      icon="lock-open-outline"
      title="forgot password?"
      subtitle="No stress. Enter your email or phone and we'll send you a 6-digit code."
      onBack={goBack}
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>remembered it? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text style={styles.footerLink}>sign in</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <AuthInput
        label="Email or phone"
        icon="mail-outline"
        placeholder="you@university.edu.pk"
        value={emailOrPhone}
        onChangeText={(t) => {
          setEmailOrPhone(t);
          if (error) setError('');
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={handleSendOTP}
        editable={!loading}
        error={error}
        right={
          emailOrPhone.length > 0 && !loading ? (
            <TouchableOpacity onPress={() => setEmailOrPhone('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={AUTH.muted} />
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.note}>
        <Ionicons name="time-outline" size={15} color={AUTH.text2} />
        <Text style={styles.noteText}>The code works for 10 minutes. Check spam if it's not in your inbox.</Text>
      </View>

      <AuthButton title="send code" onPress={handleSendOTP} loading={loading} disabled={!emailOrPhone.trim()} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: AUTH.goldSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noteText: { flex: 1, fontSize: 12.5, color: AUTH.text2, lineHeight: 18 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: AUTH.muted, fontSize: 14 },
  footerLink: { color: AUTH.dark, fontSize: 14, fontFamily: 'DMSans_700Bold' },
});
