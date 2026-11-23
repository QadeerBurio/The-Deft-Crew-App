// app/src/components/crew/levels.js
// The crew levels (moved unchanged out of components/Points.js).
import { color as T } from "../../theme/tokens";

// ═══════════════════════════════════════════════════════════════════════
// LEVELS — mirrors config/badges.config.js
// ═══════════════════════════════════════════════════════════════════════
// LEVELS — mirrors config/badges.config.js
// icons: MaterialCommunityIcons · Gen Z/Alpha palette
// ═══════════════════════════════════════════════════════════════════════
export const LEVELS = [
  {
    id: 'rookie',
    name: 'deft rookie',
    points: 300,
    activityFloor: 300,
    referrals: 0,
    icon: 'egg-easter',                 // 🥚 was: 'egg'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'digital badge with your name',
    perks: ['Digital badge'],
  },
  {
    id: 'starter',
    name: 'deft insider',
    points: 1000,
    activityFloor: 300,
    referrals: 10,
    icon: 'gamepad-variant',            // 👾 was: 'gamepad'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'upgraded badge . verified starter status',
    perks: ['Upgraded badge', 'Starter status'],
  },
  {
    id: 'silver',
    name: 'deft main character',
    points: 2000,
    activityFloor: 600,
    referrals: 20,
    icon: 'star-four-points',           // ✨ was: 'sparkles'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'silver card . 10% off for 1 year (cap Rs 350) . tdc starter pack',
    perks: ['Silver card', '10% off, 1 year', 'tdc starter pack'],
    discount: { pct: 10, capRs: 350 },
  },
  {
    id: 'gold',
    name: 'deft pro',
    points: 3000,
    activityFloor: 900,
    referrals: 30,
    icon: 'lightning-bolt',             // ⚡ was: 'crown'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'gold card . 15% off for 1 year (cap Rs 500) . Instagram feature . tdc essentials',
    perks: ['Gold card', '15% off, 1 year', 'Instagram feature'],
    discount: { pct: 15, capRs: 500 },
  },
  {
    id: 'platinum',
    name: 'deft goat',
    points: 6000,
    activityFloor: 1800,
    referrals: 40,
    icon: 'infinity',                   // 🐐 was: 'diamond-stone'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'platinum card . 20% off for 1 year (cap Rs 750) . tdc delux pack',
    perks: ['Platinum card', '20% off, 1 year', 'Ambassador cert'],
    discount: { pct: 20, capRs: 750 },
  },
  {
    id: 'founder',
    name: 'founder circle',
    points: 8000,
    activityFloor: 2400,
    referrals: 50,
    icon: 'rocket-launch',              // 🚀 was: 'crown-circle'
    color: T.ink,
    gradient: [T.ink, T.ink],
    reward: 'founder card . 25% off (cap Rs 1000) . internship referral . signature box',
    perks: ['Founder card', '25% off, 1 year', 'Internship referral'],
    discount: { pct: 25, capRs: 1000 },
    requiresApply: true,
    maxSeats: 50,
  },
];
