// app/src/components/notifications/NotifUI.js
// One design for every notification list in the app:
//   - Notification modal (bell on Home)       → app notifications
//   - Social › Notifications                   → likes, comments, requests…
//   - SkillShare › Notifications                → offers, matches
// Each screen keeps its own data and taps; this file is only the look.

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { color as T, font as F } from "../../theme/tokens";
export const N = {
  gold: T.yellow,
  goldSoft: T.yellowSoft,
  dark: T.ink,
  white: T.white,
  soft: T.sand,
  border: T.line,
  line: T.line,
  muted: T.textFaint,
  text2: T.textMuted,
  danger: T.danger,
  dangerSoft: T.dangerBg,
  ok: T.success,
  okSoft: T.successBg,
  blue: T.ink,
  blueSoft: '#eaf1ff',
};

// ── time ──
export const timeAgo = (date) => {
  if (!date) return 'now';
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (isNaN(s)) return '';
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Adds "today / this week / earlier" header rows into a sorted list
export const withSections = (list, getDate = (n) => n.createdAt) => {
  const out = [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startWeek = startToday - 6 * 86400000;
  let last = null;
  list.forEach((n) => {
    const t = new Date(getDate(n)).getTime() || 0;
    const label = t >= startToday ? 'today' : t >= startWeek ? 'this week' : 'earlier';
    if (label !== last) {
      out.push({ _section: true, _id: `section-${label}`, label });
      last = label;
    }
    out.push(n);
  });
  return out;
};

// ── header ──
export function NotifHeader({ title = 'notifications', unread = 0, onBack, onClose, onMarkAll, onClear, showHandle }) {
  return (
    <View style={s.header}>
      {showHandle ? <View style={s.handle} /> : null}
      <View style={s.headerRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.squareBtn} activeOpacity={0.7} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={N.dark} />
          </TouchableOpacity>
        ) : null}

        <View style={[s.titleWrap, onBack && { marginLeft: 12 }]}>
          <Text style={s.title} numberOfLines={1}>
            {title}<Text style={{ color: N.gold }}>.</Text>
          </Text>
          {unread > 0 ? (
            <View style={s.titlePill}>
              <Text style={s.titlePillText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>

        {onClose ? (
          <TouchableOpacity onPress={onClose} style={s.squareBtn} activeOpacity={0.7} hitSlop={10}>
            <Ionicons name="close" size={20} color={N.dark} />
          </TouchableOpacity>
        ) : null}
      </View>

      {(onMarkAll || onClear) ? (
        <View style={s.actions}>
          {onMarkAll ? (
            <TouchableOpacity onPress={onMarkAll} style={s.actionBtn} activeOpacity={0.75} disabled={!unread}>
              <Ionicons name="checkmark-done" size={15} color={unread ? N.dark : T.textFaint} />
              <Text style={[s.actionText, !unread && { color: T.textFaint }]}>mark all read</Text>
            </TouchableOpacity>
          ) : null}
          {onClear ? (
            <TouchableOpacity onPress={onClear} style={s.actionBtn} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={15} color={N.danger} />
              <Text style={[s.actionText, { color: N.danger }]}>clear all</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── filter chips ──
export function NotifFilters({ filters, value, onChange, counts = {} }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {filters.map((f) => {
        const on = value === f.key;
        const c = counts[f.key];
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[s.chip, on && s.chipOn]}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
            {c ? (
              <View style={[s.chipCount, on && s.chipCountOn]}>
                <Text style={[s.chipCountText, on && s.chipCountTextOn]}>{c > 99 ? '99+' : c}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── section label ──
export const NotifSection = ({ label }) => <Text style={s.section}>{label}</Text>;

// ── row ──
// item: { title, body, preview, time, unread, avatar, name, icon, tone, status, statusTone, linkable, expanded }
const TONES = {
  gold: { fg: '#b7791f', bg: N.goldSoft },
  dark: { fg: N.dark, bg: N.soft },
  ok: { fg: N.ok, bg: N.okSoft },
  danger: { fg: N.danger, bg: N.dangerSoft },
  blue: { fg: N.blue, bg: N.blueSoft },
};

export const NotifRow = memo(function NotifRow({ item, onPress, onDelete, children }) {
  const tone = TONES[item.tone] || TONES.gold;
  const hasAvatar = item.avatar || item.name;
  return (
    <TouchableOpacity
      style={[s.row, item.unread && s.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.leading}>
        {hasAvatar ? (
          item.avatar ? (
            <Image source={{ uri: item.avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )
        ) : (
          <View style={[s.iconTile, { backgroundColor: tone.bg }]}>
            <Ionicons name={item.icon || 'notifications-outline'} size={20} color={tone.fg} />
          </View>
        )}
        {hasAvatar && item.icon ? (
          <View style={[s.badge, { backgroundColor: tone.fg }]}>
            <Ionicons name={item.icon} size={10} color={N.white} />
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        <View style={s.topLine}>
          <Text style={[s.rowTitle, item.unread && s.rowTitleUnread]} numberOfLines={item.expanded ? 4 : 2}>
            {item.name ? <Text style={s.rowName}>{item.name} </Text> : null}
            {item.title}
          </Text>
          <Text style={[s.time, item.unread && s.timeUnread]}>{item.time}</Text>
        </View>

        {item.body ? (
          <Text style={s.rowBody} numberOfLines={item.expanded ? 20 : 2}>{item.body}</Text>
        ) : null}

        {item.preview ? (
          <View style={s.preview}>
            <Text style={s.previewText} numberOfLines={item.expanded ? 10 : 2}>{item.preview}</Text>
          </View>
        ) : null}

        {item.status ? (
          <View style={[s.status, { backgroundColor: (TONES[item.statusTone] || TONES.ok).bg }]}>
            <Ionicons
              name={item.statusTone === 'danger' ? 'close-circle' : 'checkmark-circle'}
              size={13}
              color={(TONES[item.statusTone] || TONES.ok).fg}
            />
            <Text style={[s.statusText, { color: (TONES[item.statusTone] || TONES.ok).fg }]}>{item.status}</Text>
          </View>
        ) : null}

        {item.linkable ? (
          <View style={s.openHint}>
            <Text style={s.openHintText}>open</Text>
            <Ionicons name="arrow-forward" size={11} color={N.dark} />
          </View>
        ) : null}

        {children}
      </View>

      <View style={s.trailing}>
        {item.unread ? <View style={s.dot} /> : <View style={{ height: 8 }} />}
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} hitSlop={10} style={s.del}>
            <Ionicons name="close" size={15} color={T.textFaint} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ── request buttons (accept / decline) ──
export function NotifRequestActions({ onAccept, onDecline, busy }) {
  return (
    <View style={s.reqRow}>
      <TouchableOpacity style={[s.reqBtn, s.reqAccept]} onPress={onAccept} disabled={busy} activeOpacity={0.85}>
        {busy ? <ActivityIndicator size="small" color={N.gold} /> : (
          <>
            <Ionicons name="checkmark" size={15} color={N.gold} />
            <Text style={s.reqAcceptText}>accept</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={[s.reqBtn, s.reqDecline]} onPress={onDecline} disabled={busy} activeOpacity={0.85}>
        <Ionicons name="close" size={15} color={N.dark} />
        <Text style={s.reqDeclineText}>decline</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── skeleton (static, no shimmer loop) ──
export function NotifSkeleton({ rows = 6 }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={s.skRow}>
          <View style={s.skIcon} />
          <View style={{ flex: 1 }}>
            <View style={[s.skLine, { width: '62%' }]} />
            <View style={[s.skLine, { width: '85%', height: 10, marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── empty ──
export function NotifEmpty({ title = 'all caught up', sub = "we'll ping you when something new lands.", icon = 'notifications-outline' }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={30} color={N.dark} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, backgroundColor: N.white },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: T.sand, alignSelf: 'center', marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: N.soft,
    borderWidth: 1,
    borderColor: N.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontFamily: F.heading, color: N.dark, letterSpacing: -0.5, flexShrink: 1 },
  titlePill: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: N.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titlePillText: { color: N.gold, fontSize: 11, fontFamily: F.bodyBold },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: N.soft,
    borderWidth: 1,
    borderColor: N.border,
  },
  actionText: { fontSize: 12.5, fontFamily: F.bodyBold, color: N.dark },

  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: N.soft,
    borderWidth: 1,
    borderColor: N.border,
  },
  chipOn: { backgroundColor: N.dark, borderColor: N.dark },
  chipText: { fontSize: 13, fontFamily: F.bodyBold, color: N.text2 },
  chipTextOn: { color: N.gold },
  chipCount: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: N.dark, justifyContent: 'center', alignItems: 'center' },
  chipCountOn: { backgroundColor: N.gold },
  chipCountText: { fontSize: 10, fontFamily: F.bodyBold, color: N.gold },
  chipCountTextOn: { color: N.dark },

  section: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: N.muted,
    textTransform: 'none',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 18,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  rowUnread: { backgroundColor: N.goldSoft },
  leading: { width: 46, height: 46, marginRight: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: N.soft },
  avatarFallback: { backgroundColor: N.gold, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 18, fontFamily: F.heading, color: N.dark },
  iconTile: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: N.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start' },
  rowTitle: { flex: 1, fontSize: 14.5, color: N.dark, fontFamily: F.bodySemi, lineHeight: 20 },
  rowTitleUnread: { fontFamily: F.bodyBold },
  rowName: { fontFamily: F.bodyBold, color: N.dark },
  time: { fontSize: 11.5, color: N.muted, fontFamily: F.bodySemi, marginLeft: 8, marginTop: 2 },
  timeUnread: { color: N.dark, fontFamily: F.bodyBold },
  rowBody: { fontSize: 13.5, fontFamily: F.body, color: N.text2, lineHeight: 19, marginTop: 3 },
  preview: { marginTop: 8, backgroundColor: N.white, borderRadius: 12, borderWidth: 1, borderColor: N.line, paddingHorizontal: 12, paddingVertical: 9 },
  previewText: { fontSize: 13, fontFamily: F.body, color: T.textMuted, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 8, paddingHorizontal: 10, height: 26, borderRadius: 13 },
  statusText: { fontSize: 12, fontFamily: F.bodyBold },
  openHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  openHintText: { fontSize: 12, fontFamily: F.bodyBold, color: N.dark },
  trailing: { alignItems: 'center', marginLeft: 6, width: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: N.gold, marginTop: 6 },
  del: { marginTop: 10 },

  reqRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reqBtn: { flex: 1, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reqAccept: { backgroundColor: N.dark },
  reqAcceptText: { color: N.white, fontSize: 13.5, fontFamily: F.bodyBold },
  reqDecline: { backgroundColor: N.soft, borderWidth: 1, borderColor: N.border },
  reqDeclineText: { color: N.dark, fontSize: 13.5, fontFamily: F.bodyBold },

  skRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  skIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: T.sand, marginRight: 12 },
  skLine: { height: 13, borderRadius: 6, backgroundColor: T.sand },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: N.goldSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontFamily: F.heading, color: N.dark },
  emptySub: { fontSize: 13.5, fontFamily: F.body, color: N.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
});
