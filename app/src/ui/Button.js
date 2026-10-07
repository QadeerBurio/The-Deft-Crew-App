// app/src/ui/Button.js
// Pill buttons. One primary action per screen.
//   <Button title="claim offer" onPress={...} />                 ink (default)
//   <Button title="apply now" variant="accent" />                 yellow
//   <Button title="my discounts" variant="outline" />
//   <Button title="not now" variant="ghost" size="sm" />
//   <IconButton icon="notifications-outline" badge onPress={...} accessibilityLabel="notifications" />

import React from 'react';
import { Pressable, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, touch } from '../theme';
import { Text } from './Text';

const VARIANTS = {
  primary: { bg: colors.ink, fg: colors.white, border: colors.ink },
  accent: { bg: colors.yellow, fg: colors.ink, border: colors.yellow },
  outline: { bg: colors.transparent, fg: colors.ink, border: colors.ink },
  ghost: { bg: colors.transparent, fg: colors.ink, border: colors.transparent },
  light: { bg: colors.card, fg: colors.ink, border: colors.line },
  // for dark screens
  inverse: { bg: colors.white, fg: colors.ink, border: colors.white },
  inverseOutline: { bg: colors.transparent, fg: colors.white, border: colors.inkLine },
};

const SIZES = {
  sm: { height: 36, px: 14, font: 13, icon: 16 },
  md: { height: 48, px: 18, font: 15, icon: 18 },
  lg: { height: 56, px: 22, font: 16, icon: 20 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon, // Ionicons name, shown before the title
  left, // custom node before the title (e.g. a MoodDot)
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const off = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      hitSlop={s.height < touch ? (touch - s.height) / 2 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: off ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {left}
          {icon ? <Ionicons name={icon} size={s.icon} color={v.fg} /> : null}
          {title ? (
            <Text variant="button" color={v.fg} style={[{ fontSize: s.font }, textStyle]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  variant = 'light', // light | ink | accent | ghost | inkRaised
  size = touch,
  iconSize = 20,
  badge = false, // true for a dot, or a number/string for a count
  style,
  accessibilityLabel,
  ...rest
}) {
  const map = {
    light: { bg: colors.card, fg: colors.ink, border: colors.line },
    ink: { bg: colors.ink, fg: colors.yellow, border: colors.ink },
    accent: { bg: colors.yellow, fg: colors.ink, border: colors.yellow },
    ghost: { bg: colors.transparent, fg: colors.ink, border: colors.transparent },
    inkRaised: { bg: colors.inkRaised, fg: colors.white, border: colors.inkRaised },
  };
  const v = map[variant] || map.light;
  const hasCount = badge !== true && badge !== false && badge !== null && badge !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Ionicons name={icon} size={iconSize} color={v.fg} />
      {badge ? (
        <View style={[styles.badge, hasCount && styles.badgeCount]}>
          {hasCount ? (
            <Text variant="caption" color={colors.ink} style={styles.badgeText}>
              {String(badge)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.yellow,
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeCount: {
    top: 6,
    right: 6,
    width: undefined,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});

export default Button;
