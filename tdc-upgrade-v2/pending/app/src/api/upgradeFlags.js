// app/src/api/upgradeFlags.js
// The flag names of the upgrade v2 plan (tdc-upgrade-v2/TDC_UPGRADE_PLAN.md), in one place so a typo can't
// silently keep a feature off. Read them like any other flag: useFlag(FLAGS.confessionSafety).
// Every one is off unless the server turns it on for this account (server config/featureFlags.js). An older
// server that doesn't know a flag simply leaves it out of /app/flags/me, which reads as off: today's behaviour.
export const FLAGS = Object.freeze({
  growthV2: "growthV2", // invite links, referral fixes, leaderboard (P1)
  ambassadorV2: "ambassadorV2", // ambassador invitation, intro, in-app application, hub (P2)
  resumeV2: "resumeV2", // resume builder v2 (P3)
  confessionsV2: "confessionsV2", // handles, tags, moods, polls, sort, follow (P4-2 to P4-6)
  confessionSafety: "confessionSafety", // pre-post check, report, mute author (P4-1)
  shareCards: "shareCards", // branded share cards (P1-5)
});

export const UPGRADE_FLAG_NAMES = Object.freeze(Object.values(FLAGS));
