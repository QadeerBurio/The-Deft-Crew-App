// app/src/engagement/copy.js
// Client-side fallback copy ONLY. Server copy always wins.
// Use these strings if the server doesn't send a line.

export const MISSION_LINES = {
  discounts: {
    before: 'paying full price? never again.',
    after: 'Discount saved. sorted.',
  },
  resume: {
    before: 'No experiance, No problem',
    after: 'your cv is sorted.',
  },
  jobs: {
    before: 'your first internship wont apply itself.',
    after: 'you applied. thats the hard part.',
  },
  social: {
    before: 'say it. anonymously or not.',
    after: 'you said it.',
  },
  events: {
    before: 'something happening on campus.',
    after: 'you’re going. see you there.',
  },
  scholarship: {
    before: 'big dreams. bigger applications.',
    after: 'you went for it. sorted',
  },
  skillshare: {
    before: 'teach something. learn something.',
    after: 'skill swapped. sorted',
  },
  traveling: {
    before: 'somewhere new is waiting.',
    after: 'Travel. sorted',
  },

};

export const POPUP_LINES = {
  card_sorted: 'sorted.',
  fully_sorted: 'all 8. fully sorted.',
  freeze_used: 'we saved your streak. one freeze used.',
  streak_milestone: 'your streak. respect.',
  badge: 'new badge.',
  points: 'points added.',
};

export const STREAK_LINES = {
  warning: 'your streak ends at midnight. one vote saves it.',
  freeze: 'we saved your streak. one freeze used.',
  broken: 'your streak broke. come back stronger.',
  extended: 'streak extended.',
};

// Helper to grab a mission line safely
export const missionLine = (feature, sorted = false) => {
  const entry = MISSION_LINES[feature];
  if (!entry) return sorted ? 'sorted.' : 'lets get sorted.';
  return sorted ? entry.after : entry.before;
};