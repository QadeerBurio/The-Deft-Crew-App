// app/src/utils/notificationIcon.js
// Maps server `mood` keys → local PNG (if bundled) + emoji + color.
// Used by NotificationBanner for in-app toast icons.

// ─── Emoji + color per mood (always available) ───
const MOOD_META = {
  sorted:   { emoji: '😌', color: '#10b981' },
  panic:    { emoji: '😰', color: '#ef4444' },
  excited:  { emoji: '🤩', color: '#f9c349' },
  broke:    { emoji: '😔', color: '#94a3b8' },
  sleepy:   { emoji: '😴', color: '#8b5cf6' },
  shook:    { emoji: '😳', color: '#a855f7' },
  sus:      { emoji: '👀', color: '#f97316' },
  cheeky:   { emoji: '😜', color: '#ec4899' },
  hype:     { emoji: '🔥', color: '#f97316' },
  smug:     { emoji: '😏', color: '#3b82f6' },
  shock:    { emoji: '😮', color: '#eab308' },
  urgent:   { emoji: '🚨', color: '#ff6b6b' },
  money:    { emoji: '💰', color: '#d4a373' },
  ghost:    { emoji: '👻', color: '#94a3b8' },
  default:  { emoji: '✨', color: '#f9c349' },
};

// ─── Bundled PNGs (static requires — Metro-safe) ───
// Leave commented until PNG files exist in assets/dots/.
// Metro can't wrap `require()` in try/catch for missing files.
const MOOD_ICONS = {
  sorted:   require('./assets/sorted.png'),
  panic:    require('./assets/panic.png'),
  excited:  require('./assets/excited.png'),
  broke:    require('./assets/broke.png'),
  sleepy:   require('./assets/sleepy.png'),
  shook:    require('./assets/shook.png'),
  sus:      require('./assets/sus.png'),
  cheeky:   require('./assets/cheeky.png'),
  hype:     require('./assets/hype.png'),
  smug:     require('./assets/smug.png'),
  shock:    require('./assets/shock.png'),
  urgent:   require('./assets/urgent.png'),
  money:    require('./assets/money.png'),
  ghost:    require('./assets/ghost.png'),
};

// ─── Public API ───

// Returns { icon, emoji, color } — icon is null if PNG missing
export function getMoodMeta(mood) {
  const meta = MOOD_META[mood] || MOOD_META.default;
  return {
    icon: MOOD_ICONS[mood] || null,
    emoji: meta.emoji,
    color: meta.color,
  };
}

// Returns just the PNG (or null if not bundled)
export function getMoodIcon(mood) {
  return MOOD_ICONS[mood] || null;
}

// Returns just the emoji (always available)
export function getMoodEmoji(mood) {
  return (MOOD_META[mood] || MOOD_META.default).emoji;
}

// Returns just the color (always available)
export function getMoodColor(mood) {
  return (MOOD_META[mood] || MOOD_META.default).color;
}

// Named exports for raw maps
export { MOOD_ICONS };
export const MOODS = MOOD_META;