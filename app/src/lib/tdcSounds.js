// app/src/lib/tdcSounds.js
// Feature-specific sound helpers for TDC

import { playSound } from "./soundManager";

// ═══════════════════════════════════════════
// UI SOUNDS
// ═══════════════════════════════════════════
export const soundTap              = () => playSound("tdc_tap");
export const soundPopupOpen        = () => playSound("tdc_popup_open");
export const soundPopupClose       = () => playSound("tdc_popup_close");
export const soundSheetUp          = () => playSound("tdc_sheet_up");
export const soundSheetDown        = () => playSound("tdc_sheet_down");
export const soundToast            = () => playSound("tdc_toast");
export const soundSuccess          = () => playSound("tdc_success");
export const soundNope             = () => playSound("tdc_nope");
export const soundError            = () => playSound("tdc_error");
export const soundConfirm          = () => playSound("tdc_confirm");
export const soundSwipe            = () => playSound("tdc_swipe");
export const soundRefresh          = () => playSound("tdc_refresh");
export const soundLike             = () => playSound("tdc_like");
export const soundSend             = () => playSound("tdc_send");
export const soundCopy             = () => playSound("tdc_copy");
export const soundDealClaimed      = () => playSound("tdc_deal_claimed");
export const soundQrScanSuccess    = () => playSound("tdc_qr_scan_success");
export const soundBadgeUnlock      = () => playSound("tdc_badge_unlock");
export const soundAppOpen          = () => playSound("tdc_app_open");
export const soundInAppNotification= () => playSound("tdc_notification_in_app");

// ═══════════════════════════════════════════
// MOOD SOUNDS
// ═══════════════════════════════════════════
export const soundSorted      = () => playSound("tdc_mood_sorted");
export const soundExcited     = () => playSound("tdc_mood_excited");
export const soundPanic       = () => playSound("tdc_mood_panic");
export const soundBroke       = () => playSound("tdc_mood_broke");
export const soundSleepy      = () => playSound("tdc_mood_sleepy");
export const soundShook       = () => playSound("tdc_mood_shook");
export const soundSus         = () => playSound("tdc_mood_sus");
export const soundCheeky      = () => playSound("tdc_mood_cheeky");
export const soundRs          = () => playSound("tdc_mood_rs");
export const soundStreakBroke = () => playSound("tdc_streak_broke");
export const soundStreakSaved = () => playSound("tdc_streak_saved");
export const soundStreakFire  = () => playSound("tdc_streak_on_fire");
export const soundDealExpiring= () => playSound("tdc_deal_expiring");
export const soundWelcomeBack = () => playSound("tdc_welcome_back");
export const soundNotEnough   = () => playSound("tdc_not_enough_points");

// ═══════════════════════════════════════════
// PUSH NOTIFICATION SOUNDS
// ═══════════════════════════════════════════
export const soundPushDefault    = () => playSound("tdc_push_default");
export const soundPushDeal       = () => playSound("tdc_push_deal");
export const soundPushMessage    = () => playSound("tdc_push_message");
export const soundPushInternship = () => playSound("tdc_push_internship");
export const soundPushReminder   = () => playSound("tdc_push_reminder");
export const soundPushPoints     = () => playSound("tdc_push_points");
export const soundPushStreak     = () => playSound("tdc_push_streak");
export const soundPushConfession = () => playSound("tdc_push_confession");
export const soundPushEvent      = () => playSound("tdc_push_event");
export const soundPushLevelUp    = () => playSound("tdc_push_level_up");

// ═══════════════════════════════════════════
// SMART ROUTER — Notification type → sound
// Use this in your NotificationModal
// ═══════════════════════════════════════════
export const playSoundForNotification = (type, mood) => {
  // If mood provided, prefer mood sound
  if (mood) {
    switch (mood) {
      case "sorted":  return soundSorted();
      case "excited": return soundExcited();
      case "panic":   return soundPanic();
      case "broke":   return soundBroke();
      case "sleepy":  return soundSleepy();
      case "shook":   return soundShook();
      case "sus":     return soundSus();
      case "cheeky":  return soundCheeky();
      case "rs":      return soundRs();
    }
  }

  // Otherwise map by notification type
  switch (type) {
    case "like":
    case "comment":
      return soundLike();
    case "follow":
    case "request":
    case "connection_accepted":
      return soundPushMessage();
    case "message":
      return soundPushMessage();
    case "new_offer":
    case "offer_accepted":
    case "match_created":
      return soundPushDeal();
    case "offer_rejected":
    case "request_declined":
      return soundNope();
    case "new_job":
    case "internship":
      return soundPushInternship();
    case "confession":
      return soundPushConfession();
    case "event":
      return soundPushEvent();
    case "streak":
      return soundPushStreak();
    case "points":
    case "rs":
      return soundPushPoints();
    case "level_up":
    case "badge":
      return soundPushLevelUp();
    case "reminder":
      return soundPushReminder();
    default:
      return soundPushDefault();
  }
};