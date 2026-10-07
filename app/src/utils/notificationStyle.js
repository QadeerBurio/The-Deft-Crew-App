// app/src/utils/notificationStyle.js
// ONE rule for how a notification looks and sounds, used by:
//   • the in-app popup (NotificationBanner, while the app is open)
//   • the backend push (utils/pushNotification.js, while the app is closed)
// Keep both files in sync so inside and outside the app match exactly.

import { getMoodEmoji } from './notificationIcon';

import { FEATURES, featureMood, featureSound } from './notificationFeatures';

// Same rule as the backend (utils/pushNotification.js resolveSoundKey):
// the feature decides the sound, mood sound only for generic types.
export function resolveSoundKey(type, mood) {
  return featureSound(type, mood);
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
  // The push data carries the real feature in data.type / pushType
  const type = meta.pushType || meta.type || n.pushType || n.type || 'System';
  // Feature decides emoji + sound (new offer = 🤑 + deal sound), like the push.
  // If the backend already sent mood/soundKey, those are the exact push values.
  const mood = meta.mood && !FEATURES[type] ? meta.mood : featureMood(type, n.mood || meta.mood);
  const soundKey = n.soundKey || meta.soundKey || featureSound(type, mood);

  return {
    ...n,
    mood,
    type,
    soundKey,
    title: titleWithEmoji(n.title, mood),
  };
}
