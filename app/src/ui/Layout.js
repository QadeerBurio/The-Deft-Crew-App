// app/src/ui/Layout.js
// Screen, Header, SectionHeader, ListRow, SearchInput, EmptyState, MoodDot.

import React from 'react';
import { View, ScrollView, Pressable, TextInput, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Dot from '../engagement/components/Dot';
import { colors, type, radius, space, gutter } from '../theme';
import { Text, Heading } from './Text';
import { IconButton, Button } from './Button';

// space the bottom of tab screens so content clears the tab bar
export const TAB_BAR_SPACE = 100;

// ── Screen ──────────────────────────────────────────────────
//   <Screen scroll tabBar> ... </Screen>
//   <Screen dark> ... </Screen>   for confessions / sign in
export function Screen({ children, scroll = false, dark = false, tabBar = false, edges = ['top'], padded = false, style, contentStyle, ...rest }) {
  const bg = dark ? colors.ink : colors.paper;
  const pad = { paddingHorizontal: padded ? gutter : 0, paddingBottom: tabBar ? TAB_BAR_SPACE : space.xxl };
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false} {...rest}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Header ──────────────────────────────────────────────────
//   <Header title="brands" onBack={nav.goBack} right={<IconButton .../>} />
//   <Header overline="student hub" title="explore" large />
export function Header({ title, overline, subtitle, onBack, right, large = false, dark = false, mark = '.', style }) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <IconButton icon="chevron-back" onPress={onBack} variant={dark ? 'inkRaised' : 'light'} accessibilityLabel="back" />
      ) : null}
      <View style={{ flex: 1 }}>
        {overline ? (
          <Text variant="overline" tone={dark ? 'inverseMuted' : 'muted'}>
            {overline}
          </Text>
        ) : null}
        <Heading variant={large ? 'display' : 'title'} tone={dark ? 'inverse' : 'default'} mark={mark} numberOfLines={1}>
          {title}
        </Heading>
        {subtitle ? (
          <Text variant="label" tone={dark ? 'inverseMuted' : 'muted'} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

// ── SectionHeader ───────────────────────────────────────────
//   <SectionHeader title="recent activity" action="view all" onAction={...} />
export function SectionHeader({ title, action, onAction, meta, dark = false, style }) {
  return (
    <View style={[styles.section, style]}>
      <Heading variant="heading" tone={dark ? 'inverse' : 'default'}>
        {title}
      </Heading>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text variant="label" tone={dark ? 'inverseMuted' : 'muted'}>
            {action}
          </Text>
        </Pressable>
      ) : meta ? (
        <Text variant="label" tone={dark ? 'inverseMuted' : 'muted'}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

// ── ListRow ─────────────────────────────────────────────────
//   <ListRow icon="pricetag-outline" title="my discounts" subtitle="codes and qr" onPress={...} />
//   <ListRow left={<Logo/>} title="[BRAND]" right={<Pill label="10% off" />} card />
export function ListRow({ icon, left, title, subtitle, right, onPress, card = false, divider = false, dark = false, chevron, style }) {
  const showChevron = chevron ?? (!!onPress && !right);
  const body = (
    <View style={[styles.row, card && styles.rowCard, divider && styles.rowDivider, dark && card && styles.rowCardDark, style]}>
      {left ||
        (icon ? (
          <View style={[styles.rowIcon, dark && { backgroundColor: colors.inkLine }]}>
            <Ionicons name={icon} size={18} color={dark ? colors.white : colors.ink} />
          </View>
        ) : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" tone={dark ? 'inverse' : 'default'} numberOfLines={1} style={{ fontSize: 14.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone={dark ? 'inverseMuted' : 'muted'} numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showChevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

// ── SearchInput ─────────────────────────────────────────────
export function SearchInput({ value, onChangeText, placeholder = 'search', dark = false, style, ...rest }) {
  return (
    <View style={[styles.search, dark && styles.searchDark, style]}>
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={placeholder}
        style={[type.body, { flex: 1, color: dark ? colors.white : colors.text, paddingVertical: 0 }]}
        {...rest}
      />
    </View>
  );
}

// ── MoodDot ─────────────────────────────────────────────────
// The brand dot with a mood face. `muted` greys it out (locked / not used yet).
export function MoodDot({ mood = 'sorted', size = 44, muted = false, style }) {
  return (
    <View style={[{ opacity: muted ? 0.4 : 1 }, style]} accessibilityLabel={mood}>
      <Dot mood={mood} size={size} />
    </View>
  );
}

// ── EmptyState ──────────────────────────────────────────────
//   <EmptyState mood="sleepy" title="no discounts yet" body="claim one and it shows up here." action="explore offers" onAction={...} />
export function EmptyState({ mood = 'sleepy', title, body, action, onAction, dark = false, style }) {
  return (
    <View style={[styles.empty, style]}>
      <MoodDot mood={mood} size={88} />
      <Heading variant="heading" tone={dark ? 'inverse' : 'default'} style={{ marginTop: space.lg, textAlign: 'center' }}>
        {title}
      </Heading>
      {body ? (
        <Text tone={dark ? 'inverseMuted' : 'muted'} style={{ marginTop: space.xs, textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action ? <Button title={action} onPress={onAction} variant={dark ? 'accent' : 'primary'} style={{ marginTop: space.lg, alignSelf: 'center' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.sm + 2 },
  rowCard: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg },
  rowCardDark: { backgroundColor: colors.inkRaised, borderColor: colors.inkRaised },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  searchDark: { backgroundColor: colors.inkRaised, borderColor: colors.inkLine },
  empty: { alignItems: 'center', paddingHorizontal: space.xxxl, paddingVertical: space.xxxl },
});
