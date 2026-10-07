// app/src/engagement/components/MoodIcon.js
// The single source for every mood icon in the app.
//
// Resolution order:
//   1. Remote URL (push data.iconUrl or CDN)
//   2. Local PNG (assets/dots/{mood}.png) — if bundled
//   3. Emoji + colored circle — always renders, no asset deps
//
// 14 moods from spec §5.1.

import React, { useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as tdcColors } from '../../theme';

// ─── The 14 moods (§5.1) ───
export const MOODS = {
  sorted:   { emoji: '😌', color: '#10b981', label: 'sorted' },
  panic:    { emoji: '😰', color: '#ef4444', label: 'panic' },
  excited:  { emoji: '🤩', color: tdcColors.yellow, label: 'excited' },
  broke:    { emoji: '😔', color: '#94a3b8', label: 'broke' },
  sleepy:   { emoji: '😴', color: '#8b5cf6', label: 'sleepy' },
  shook:    { emoji: '😳', color: '#a855f7', label: 'shook' },
  sus:      { emoji: '👀', color: '#f97316', label: 'sus' },
  cheeky:   { emoji: '😜', color: '#ec4899', label: 'cheeky' },
  hype:     { emoji: '🤩', color: '#f97316', label: 'hype' },
  smug:     { emoji: '😏', color: '#3b82f6', label: 'smug' },
  shock:    { emoji: '😮', color: '#eab308', label: 'shock' },
  urgent:   { emoji: '🚨', color: '#ff6b6b', label: 'urgent' },
  money:    { emoji: '🤑', color: '#d4a373', label: 'money' },
  ghost:    { emoji: '👻', color: '#94a3b8', label: 'ghost' },
  default:  { emoji: '✨', color: tdcColors.yellow, label: 'new' },
};

// ─── Optional local PNGs ───
// Only require if the file exists. Wrap in try/catch so missing
// PNGs don't crash — they silently fall through to emoji.
const LOCAL_ICONS = (() => {
  const map = {};
  const tryRequire = (mood, path) => {
    try {
      map[mood] = require(path);
    } catch {}
  };
  tryRequire('sorted',   '../../assets/dots/sorted.png');
  tryRequire('panic',    '../../assets/dots/panic.png');
  tryRequire('excited',  '../../assets/dots/excited.png');
  tryRequire('broke',    '../../assets/dots/broke.png');
  tryRequire('sleepy',   '../../assets/dots/sleepy.png');
  tryRequire('shook',    '../../assets/dots/shook.png');
  tryRequire('sus',      '../../assets/dots/sus.png');
  tryRequire('cheeky',   '../../assets/dots/cheeky.png');
  tryRequire('hype',     '../../assets/dots/hype.png');
  tryRequire('smug',     '../../assets/dots/smug.png');
  tryRequire('shock',    '../../assets/dots/shock.png');
  tryRequire('urgent',   '../../assets/dots/urgent.png');
  tryRequire('money',    '../../assets/dots/money.png');
  tryRequire('ghost',    '../../assets/dots/ghost.png');
  return map;
})();

/**
 * MoodIcon
 *
 * @param {string} mood       - one of the 14 moods; defaults to 'sorted'
 * @param {number} size       - box size in px (default 44)
 * @param {string} remoteUrl  - optional CDN URL (overrides local PNG)
 * @param {boolean} glow      - soft colored shadow ring
 * @param {boolean} square    - rounded square instead of circle
 * @param {boolean} dashed    - dashed border (used for `ghost`)
 */
export default function MoodIcon({
  mood = 'sorted',
  size = 44,
  remoteUrl = null,
  glow = false,
  square = false,
  dashed = false,
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);

  const meta = MOODS[mood] || MOODS.default;
  const localSource = LOCAL_ICONS[mood] || null;
  const showRemote = !!remoteUrl && !remoteFailed;

  const borderRadius = square ? Math.round(size * 0.28) : size / 2;

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        width: size,
        height: size,
        borderRadius,
        backgroundColor: meta.color + '1A',
        borderColor: meta.color + (dashed ? 'AA' : '55'),
        borderStyle: dashed ? 'dashed' : 'solid',
        borderWidth: dashed ? 2 : 1.5,
      },
      glow && {
        shadowColor: meta.color,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      },
    ],
    [size, borderRadius, meta.color, dashed, glow]
  );

  // ── 1. Remote URL ──
  if (showRemote) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: remoteUrl }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      </View>
    );
  }

  // ── 2. Local PNG ──
  if (localSource) {
    return (
      <View style={containerStyle}>
        <Image
          source={localSource}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // ── 3. Emoji + gradient fallback ──
  return (
    <LinearGradient
      colors={[meta.color + '40', meta.color + '10']}
      style={containerStyle}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text
        style={[styles.emoji, { fontSize: Math.round(size * 0.5) }]}
        allowFontScaling={false}
      >
        {meta.emoji}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});