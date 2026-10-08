// app/src/components/AuthShell.js
// Shared layout for Forgot password → Verify code → New password.
// Same header, step bar, icon, input and button on all three screens.

import React, { forwardRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color as T, font as F, MAX_FONT_SCALE } from '../theme/tokens';

// Auth screens are dark (SignIn design). Same keys as before so every screen
// that reads AUTH.* follows: "dark" is the primary TEXT colour (light on ink).
export const AUTH = {
  gold: T.yellow,
  goldSoft: T.inkSoft,
  dark: '#F5F2EA',
  soft: T.inkSoft,
  border: T.inkLine,
  muted: T.onInkMuted,
  text2: T.onInkMuted,
  danger: '#FF8F85', // red that reads on ink (≥ 4.5:1)
  ok: '#6BD49A', // green that reads on ink
  bg: T.ink,
  placeholder: '#8C877C',
};

const STEPS = ['email', 'code', 'new password'];

export function AuthShell({ step = 1, icon, title, subtitle, onBack, children, footer, top }) {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />

      <View style={s.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7} hitSlop={10} accessibilityRole="button" accessibilityLabel="back">
            <Ionicons name="chevron-back" size={22} color={AUTH.dark} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={s.brand} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          tdc<Text style={{ color: AUTH.gold }}>.</Text>
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* step bar (only on the 3 password-reset screens) */}
          {step ? (
          <View style={s.steps}>
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const on = n === step;
              return (
                <View key={label} style={s.stepItem}>
                  <View style={[s.stepBar, (done || on) && s.stepBarOn]} />
                  <Text style={[s.stepLabel, on && s.stepLabelOn, done && s.stepLabelDone]}>
                    {done ? '✓ ' : ''}{label}
                  </Text>
                </View>
              );
            })}
          </View>
          ) : null}

          {top}
          {icon ? (
            <View style={s.iconTile}>
              <Ionicons name={icon} size={26} color={AUTH.gold} />
            </View>
          ) : null}
          <Text style={s.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

          <View style={{ marginTop: 26 }}>{children}</View>

          {footer ? <View style={s.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const AuthInput = forwardRef(function AuthInput(
  { icon, label, error, secure, right, style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.inputLabel}>{label}</Text> : null}
      <View style={[s.input, focused && s.inputFocus, !!error && s.inputError, style]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? AUTH.dark : AUTH.muted} /> : null}
        <TextInput
          ref={ref}
          style={s.inputText}
          placeholderTextColor={AUTH.placeholder}
          secureTextEntry={secure && !show}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={10}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={AUTH.muted} />
          </TouchableOpacity>
        ) : null}
        {right}
      </View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
});

export function AuthButton({ title, onPress, loading, disabled, icon = 'arrow-forward' }) {
  const off = disabled || loading;
  return (
    <TouchableOpacity
      style={[s.btn, off && s.btnOff]}
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={typeof title === 'string' ? title : undefined}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={T.ink} />
      ) : (
        <>
          <Text style={s.btnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
          {icon ? <Ionicons name={icon} size={18} color={T.ink} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AUTH.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AUTH.soft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontFamily: F.heading, fontSize: 24, color: AUTH.dark },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 30 },

  steps: { flexDirection: 'row', gap: 8, marginBottom: 30 },
  stepItem: { flex: 1 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: AUTH.border },
  stepBarOn: { backgroundColor: AUTH.gold },
  stepLabel: { fontFamily: F.bodyBold, fontSize: 11, color: AUTH.muted, marginTop: 6 },
  stepLabelOn: { color: AUTH.dark },
  stepLabelDone: { color: AUTH.text2 },

  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: AUTH.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontFamily: F.heading, fontSize: 30, lineHeight: 33, letterSpacing: -0.8, color: AUTH.dark },
  subtitle: { fontFamily: F.body, fontSize: 15, color: AUTH.text2, marginTop: 8, lineHeight: 21 },

  inputLabel: { fontFamily: F.bodySemi, fontSize: 12.5, color: AUTH.muted, marginBottom: 6 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: AUTH.soft,
    borderWidth: 1,
    borderColor: AUTH.border,
  },
  inputFocus: { borderColor: AUTH.gold, borderWidth: 1.5 },
  inputError: { borderColor: AUTH.danger, borderWidth: 1.5 },
  inputText: { flex: 1, fontFamily: F.body, fontSize: 15, color: AUTH.dark, paddingVertical: 0 },
  errorText: { fontFamily: F.bodyMedium, color: AUTH.danger, fontSize: 12.5, marginTop: 6, marginLeft: 4 },

  btn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: AUTH.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnOff: { opacity: 0.45 },
  btnText: { fontFamily: F.heading, color: T.ink, fontSize: 16 },

  footer: { marginTop: 'auto', paddingTop: 30, alignItems: 'center' },
});
