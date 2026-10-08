// app/src/screens/ResetPasswordScreen.js
// Step 3 of 3: new password → back to Login.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Alert, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import api from '../api/api';
import { AuthShell, AuthInput, AuthButton, AUTH } from '../components/AuthShell';

const RULES = [
  { key: 'len', label: '6+ characters', test: (p) => p.length >= 6 },
  { key: 'num', label: 'a number', test: (p) => /\d/.test(p) },
  { key: 'case', label: 'upper and lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
];

const STRENGTH = [
  { label: 'too short', color: '#e5e5e5' },
  { label: 'weak', color: AUTH.danger },
  { label: 'okay', color: '#f59e0b' },
  { label: 'strong', color: AUTH.ok },
];

export default function ResetPassword({ route, navigation }) {
  const { resetToken } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const confirmRef = useRef(null);

  const passed = RULES.filter((r) => r.test(password)).length;
  const level = password.length === 0 ? 0 : password.length < 6 ? 1 : passed;
  const strength = STRENGTH[Math.min(level, 3)];

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 6 && confirm === password;

  const errors = useMemo(() => {
    if (!submitted) return {};
    return {
      password: password.length < 6 ? 'Use at least 6 characters' : '',
      confirm: !confirm ? 'Confirm your new password' : confirm !== password ? "Passwords don't match" : '',
    };
  }, [submitted, password, confirm]);

  const goLogin = () =>
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));

  const handleReset = async () => {
    setSubmitted(true);
    if (!canSubmit) return;
    if (!resetToken) {
      Alert.alert('Session expired', 'Please request a new code.', [
        { text: 'OK', onPress: () => navigation.navigate('ForgotPassword') },
      ]);
      return;
    }
    Keyboard.dismiss();
    try {
      setLoading(true);
      await api.post('/auth/reset-password', { resetToken, newPassword: password });
      Alert.alert('Password updated', 'Sign in with your new password.', [{ text: 'Sign in', onPress: goLogin }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step={3}
      icon="key-outline"
      title="set a new password"
      subtitle="Pick something you haven't used before."
      onBack={() => (navigation.canGoBack() ? navigation.goBack() : goLogin())}
    >
      <AuthInput
        label="New password"
        icon="lock-closed-outline"
        placeholder="new password"
        value={password}
        onChangeText={setPassword}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
      />

      {/* strength */}
      <View style={styles.meterRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.meter, { backgroundColor: level >= i ? strength.color : '#ededed' }]} />
        ))}
        <Text style={[styles.meterLabel, { color: level ? strength.color : AUTH.muted }]}>{strength.label}</Text>
      </View>
      <View style={styles.rules}>
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <View key={r.key} style={styles.rule}>
              <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={ok ? AUTH.ok : '#c4c4c4'} />
              <Text style={[styles.ruleText, ok && { color: AUTH.dark }]}>{r.label}</Text>
            </View>
          );
        })}
      </View>

      <AuthInput
        ref={confirmRef}
        label="Confirm password"
        icon="checkmark-done-outline"
        placeholder="type it again"
        value={confirm}
        onChangeText={setConfirm}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleReset}
        error={errors.confirm || (mismatch ? "Passwords don't match" : '')}
      />

      <AuthButton title="update password" icon="checkmark" onPress={handleReset} loading={loading} disabled={!canSubmit} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4, marginBottom: 10 },
  meter: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { fontSize: 11.5, fontWeight: '800', marginLeft: 6, minWidth: 54, textAlign: 'right' },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ruleText: { fontSize: 12, color: AUTH.muted, fontWeight: '600' },
});
