// app/src/screens/VerifyOTPScreen.js
// Step 2 of 3: 6-digit code → ResetPassword. Auto-verifies on the 6th digit.

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Pressable, Keyboard } from 'react-native';
import api from '../api/api';
import { AuthShell, AuthButton, AUTH } from '../components/AuthShell';

const LEN = 6;

export default function VerifyOTP({ route, navigation }) {
  const { userId, emailOrPhone, sentTo, retryAfter } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(retryAfter || 60);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(true);
  const inputRef = useRef(null);
  const lastTried = useRef('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value) => {
    const code = (value ?? otp).replace(/\D/g, '');
    if (code.length !== LEN) {
      setError('Enter all 6 digits');
      return;
    }
    if (loading) return;
    lastTried.current = code;
    try {
      setLoading(true);
      setError('');
      Keyboard.dismiss();
      const res = await api.post('/auth/verify-otp', { userId, otp: code }, { timeout: 15000 });
      navigation.replace('ResetPassword', { resetToken: res.data.resetToken });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'The server took too long. Please try again.' : 'Invalid or expired code');
      setError(msg);
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (t) => {
    const digits = t.replace(/\D/g, '').slice(0, LEN);
    setOtp(digits);
    if (error) setError('');
    if (digits.length === LEN && digits !== lastTried.current) verify(digits);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!emailOrPhone) {
      navigation.goBack();
      return;
    }
    try {
      setResending(true);
      const res = await api.post('/auth/forgot-password', { emailOrPhone }, { timeout: 25000 });
      setOtp('');
      setError('');
      lastTried.current = '';
      setCooldown(60);
      Alert.alert('Code sent', res.data?.message || 'A new code is on its way.');
    } catch (err) {
      if (err.response?.status === 429) setCooldown(err.response.data?.retryAfter || 60);
      Alert.alert('Error', err.response?.data?.message || "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const target = sentTo || emailOrPhone;
  const mm = String(Math.floor(cooldown / 60)).padStart(1, '0');
  const ss = String(cooldown % 60).padStart(2, '0');

  return (
    <AuthShell
      step={2}
      icon="shield-checkmark-outline"
      title="check your email"
      subtitle={
        target
          ? `We sent a 6-digit code to ${target}. Check inbox and spam.`
          : 'We sent a 6-digit code to your email. Check inbox and spam.'
      }
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>didn't get it? </Text>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending} hitSlop={8}>
            <Text style={[styles.resendLink, (cooldown > 0 || resending) && styles.resendOff]}>
              {resending ? 'sending…' : cooldown > 0 ? `resend in ${mm}:${ss}` : 'resend code'}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes}>
        {Array.from({ length: LEN }).map((_, i) => {
          const ch = otp[i] || '';
          const active = focused && i === Math.min(otp.length, LEN - 1) && !loading;
          return (
            <View
              key={i}
              style={[
                styles.box,
                ch && styles.boxFilled,
                active && styles.boxActive,
                !!error && styles.boxError,
              ]}
            >
              <Text style={styles.boxText}>{ch}</Text>
              {active && !ch ? <View style={styles.caret} /> : null}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LEN}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.hiddenInput}
          caretHidden
        />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 18 }} />}

      <AuthButton
        title="verify"
        icon="checkmark"
        onPress={() => verify()}
        loading={loading}
        disabled={otp.length !== LEN}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    flex: 1,
    marginHorizontal: 4,
    height: 58,
    maxWidth: 52,
    borderRadius: 14,
    backgroundColor: AUTH.soft,
    borderWidth: 1.5,
    borderColor: AUTH.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFilled: { backgroundColor: '#fff', borderColor: '#cfcfcf' },
  boxActive: { borderColor: AUTH.dark, backgroundColor: '#fff' },
  boxError: { borderColor: AUTH.danger },
  boxText: { fontSize: 22, fontWeight: '900', color: AUTH.dark },
  caret: { width: 2, height: 22, backgroundColor: AUTH.gold, borderRadius: 1 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  error: { color: AUTH.danger, fontSize: 12.5, fontWeight: '600', marginTop: 10, marginBottom: 4, textAlign: 'center' },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendText: { color: AUTH.muted, fontSize: 14 },
  resendLink: { color: AUTH.dark, fontSize: 14, fontWeight: '900' },
  resendOff: { color: '#b5b5b5', fontWeight: '700' },
});
