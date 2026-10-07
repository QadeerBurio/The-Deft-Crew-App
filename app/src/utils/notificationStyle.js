// app/src/utils/notificationStyle.js
// ONE rule for how a notification looks and sounds, used by:
//   • the in-app popup (NotificationBanner, while the app is open)
//   • the backend push (utils/pushNotification.js, while the app is closed)
// Keep both files in sync so inside and outside the app match exactly.

import { getMoodEmoji } from './notificationIcon';

// Mood sound wins first (same as backend MOOD_SOUND)
const MOOD_SOUND = {
  sorted: 'tdc_mood_sorted',
  excited: 'tdc_mood_excited',
  panic: 'tdc_mood_panic',
  broke: 'tdc_mood_broke',
  sleepy: 'tdc_mood_sleepy',
  shook: 'tdc_mood_shook',
  sus: 'tdc_mood_sus',
  cheeky: 'tdc_mood_cheeky',
  rs: 'tdc_mood_rs',
};

// Otherwise by type (same as backend TYPE_SOUND)
const TYPE_SOUND = {
  like: 'tdc_like', comment: 'tdc_like',
  follow: 'tdc_push_message', request: 'tdc_push_message', connection_accepted: 'tdc_push_message',
  message: 'tdc_push_message', Message: 'tdc_push_message',
  new_offer: 'tdc_push_deal', offer_accepted: 'tdc_push_deal', match_created: 'tdc_push_deal',
  offer_rejected: 'tdc_nope', request_declined: 'tdc_nope',
  new_job: 'tdc_push_internship', internship: 'tdc_push_internship',
  confession: 'tdc_push_confession',
  event: 'tdc_push_event',
  streak: 'tdc_push_streak',
  points: 'tdc_push_points', rs: 'tdc_push_points',
  level_up: 'tdc_push_level_up', badge: 'tdc_push_level_up',
  reminder: 'tdc_push_reminder',
};

export function resolveSoundKey(type, mood) {
  return MOOD_SOUND[mood] || TYPE_SOUND[type] || 'tdc_push_default';
}

// Titles the backend uses for social pushes (utils/notificationHelper.js TYPE_TO_TITLE)
export const SOCIAL_TITLES = {
  like: 'new like ❤️',
  comment: 'new comment 💬',
  reply: 'new reply 💬',
  mention: 'you got mentioned 👀',
  follow: 'new follower 🌟',
  request: 'connection request 👤',
  connection_accepted: 'connection accepted 🎉',
  request_declined: 'connection update',
  alert: 'heads up ⚠️',
  message: 'new message 💬',
};

// Hermes-safe emoji check (surrogate pairs + misc symbols/dingbats)
const HAS_EMOJI = /[☀-➿]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/;

// Same as backend titleWithEmoji: put the mood emoji in front unless the title has one
export function titleWithEmoji(title, mood) {
  const t = title || 'tdc';
  if (HAS_EMOJI.test(t)) return t;
  return `${getMoodEmoji(mood)} ${t}`;
}

/**
 * Normalise anything (push content, polled notification) into the shape the
 * in-app popup needs, with the SAME title, emoji, mood and sound as the push.
 */
export function styleNotification(n = {}) {
  const meta = n.metadata || n.data || {};
  const mood = n.mood || meta.mood || 'sorted';
  const type = meta.pushType || n.pushType || n.type || meta.type || 'System';
  const soundKey = n.soundKey || meta.soundKey || resolveSoundKey(type, mood);

  return {
    ...n,
    mood,
    type,
    soundKey,
    title: titleWithEmoji(n.title, mood),
  };
}
