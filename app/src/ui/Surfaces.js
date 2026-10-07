// app/src/ui/Surfaces.js
// Cards, chips, pills, progress bars and segmented controls.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';
import { Text } from './Text';

// ── Card ────────────────────────────────────────────────────
// variant: default (white) | ink (black hero) | tint (soft yellow) | accent (yellow) | raised (dark-mode card)
const CARD = {
  default: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1 },
  ink: { backgroundColor: colors.ink, borderColor: colors.ink, borderWidth: 0 },
  tint: { backgroundColor: colors.yellowSoft, borderColor: colors.yellowSoft, borderWidth: 0 },
  accent: { backgroundColor: colors.yellow, borderColor: colors.yellow, borderWidth: 0 },
  raised: { backgroundColor: colors.inkRaised, borderColor: colors.inkRaised, borderWidth: 0 },
};

export function Card({ variant = 'default', padding = space.lg, rounded = radius.xl, onPress, style, children, ...rest }) {
  const body = [CARD[variant] || CARD.default, { borderRadius: rounded, padding }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [body, { opacity: pressed ? 0.9 : 1 }]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={body} {...rest}>
      {children}
    </View>
  );
}

// ── Chip (filters) ──────────────────────────────────────────
export function Chip({ label, selected = false, onPress, accent = false, dark = false, right, style }) {
  const on = selected;
  const bg = accent ? colors.yellow : on ? (dark ? colors.yellow : colors.ink) : dark ? colors.transparent : colors.card;
  const fg = accent ? colors.ink : on ? (dark ? colors.ink : colors.white) : dark ? colors.inkSoft : colors.ink;
  const border = accent ? colors.yellow : on ? bg : dark ? colors.inkLine : colors.line;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 }, style]}
    >
      <Text variant="label" color={fg}>
        {label}
      </Text>
      {right}
    </Pressable>
  );
}

// ── Pill (small status tag) ─────────────────────────────────
// tone: accent | ink | soft | sand | success | muted | danger
const PILL = {
  accent: [colors.yellow, colors.ink],
  ink: [colors.ink, colors.yellow],
  soft: [colors.yellowSoft, colors.ink],
  sand: [colors.lineSoft, colors.ink],
  success: [colors.successSoft, colors.successText],
  muted: [colors.sand, colors.textMuted],
  danger: [colors.dangerSoft, colors.danger],
};

export function Pill({ label, tone = 'accent', style, textStyle }) {
  const [bg, fg] = PILL[tone] || PILL.accent;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text variant="caption" color={fg} style={[styles.pillText, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ── ProgressBar ─────────────────────────────────────────────
export function ProgressBar({ value = 0, tone = 'ink', dark = false, height = 6, style }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = tone === 'accent' ? colors.yellow : colors.ink;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: dark ? colors.inkLine : colors.lineSoft, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${pct}%`, height, backgroundColor: fill }} />
    </View>
  );
}

// ── Segmented ───────────────────────────────────────────────
//   <Segmented options={['feed','confessions']} value={tab} onChange={setTab} />
// options can be strings or { value, label }.
export function Segmented({ options = [], value, onChange, dark = false, style }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segTrack, { backgroundColor: dark ? colors.inkRaised : colors.lineSoft }, style]}
    >
      {items.map((o) => {
        const on = o.value === value;
        const bg = on ? (dark ? colors.yellow : colors.ink) : colors.transparent;
        const fg = on ? (dark ? colors.ink : colors.white) : dark ? colors.inkSoft : colors.ink;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange && onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, { backgroundColor: bg }]}
          >
            <Text variant="label" color={fg} style={{ fontWeight: on ? '700' : '600' }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Divider ─────────────────────────────────────────────────
export function Divider({ dark = false, style }) {
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: dark ? colors.inkLine : colors.lineSoft }, style]} />;
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillText: { fontWeight: '800' },
  segTrack: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
