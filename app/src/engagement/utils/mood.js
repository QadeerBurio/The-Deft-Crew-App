// app/src/engagement/utils/moods.js
// Closed set of moods shared with the backend.

export const MOODS = [
  'excited',
  'broke',
  'panic',
  'sus',
  'shook',      // ✅ corrected spelling (was 'shook' — matches asset shook.png)
  'sleepy',
  'cheeky',
  'sorted',
];

export const MOOD_COLORS = {
  excited: '#F9C349',
  broke: '#F97316',
  panic: '#EF4444',
  sus: '#8B5CF6',
  shook: '#06B6D4',
  sleepy: '#94A3B8',
  cheeky: '#EC4899',
  sorted: '#10B981',
};

export const getMoodColor = (mood) =>
  MOOD_COLORS[mood] || MOOD_COLORS.sorted;

// Static require map — React Native needs literal paths, cannot be dynamic.
// These resolve from app/src/engagement/utils/ → ../../assets/dots/
export const MOOD_IMAGES = {
  broke:   require('../../../../assets/dots/broke.png'),
  cheeky:  require('../../../../assets/dots/cheeky.png'),
  excited: require('../../../../assets/dots/excited.png'),
  panic:   require('../../../../assets/dots/panic.png'),
  shook:   require('../../../../assets/dots/shook.png'),
  sleepy:  require('../../../../assets/dots/sleepy.png'),
  sorted:  require('../../../../assets/dots/sorted.png'),
  sus:     require('../../../../assets/dots/sus.png'),
};

export const YELLOW_DOT = require('../../../../assets/dots/dot.png');
export const RS_COIN = require('../../../../assets/rs-coin.png');

// Home FEATURES.id → mission feature key (source: Home.js L34-43)
export const FEATURE_ID_TO_MISSION = {
  discount: 'discounts',
  traveling: 'traveling',
  dashboard: 'skillshare',
  events: 'events',
  resume: 'resume',
  jobs: 'jobs',
  scholar: 'scholarship',
  social: 'social',
};

// Mission feature key → Home FEATURES.id (reverse map)
export const MISSION_TO_FEATURE_ID = Object.fromEntries(
  Object.entries(FEATURE_ID_TO_MISSION).map(([k, v]) => [v, k])
);

// 🔑 ADDENDUM ITEM #1 — mood map for the 8 Home features
// Before sorting: problem mood. After sorting: 'sorted'.
export const FEATURE_MOOD_BEFORE = {
  discounts:   'broke',
  traveling:   'cheeky',
  skillshare:  'sleepy',
  events:      'excited',
  resume:      'panic',
  jobs:        'panic',
  scholarship: 'shook',
  social:      'sus',
};

export const FEATURE_MOOD_AFTER = 'sorted';

// Helper: get the mood for a feature given its sorted state
export const moodForFeature = (missionKey, isSorted) => {
  if (isSorted) return FEATURE_MOOD_AFTER;
  return FEATURE_MOOD_BEFORE[missionKey] || 'sorted';
};

// Streak health → mood mapping
export const STREAK_HEALTH_TO_MOOD = {
  safe:    'sorted',
  at_risk: 'panic',
  broken:  'sleepy',
  none:    'sleepy',
};

export const STREAK_HEALTH_TO_COLOR = {
  safe:    '#10B981',
  at_risk: '#EF4444',
  broken:  '#94A3B8',
  none:    '#94A3B8',
};