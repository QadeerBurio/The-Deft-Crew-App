// app/src/components/AppAlert.js
// One styled popup for the whole app.
//
// installAppAlert() swaps React Native's Alert.alert for this popup, so every
// existing Alert.alert(title, message, buttons, options) call in the app shows
// the tdc design without changing those screens. Mount <AppAlertHost /> once
// at the root (App.js). If the host is not mounted yet, the native alert is used.
//
// Look is picked from the title / buttons:
//   error   → "Error", "Failed", "Invalid", ❌
//   success → "Success", "Saved", "Copied", "Verified", "Sent", ✅ 🎉
//   warning → "Required", "Limit", "Blocked", "Permission", "Login", ⚠️
//   danger  → any button with style 'destructive'
//   confirm → 2+ buttons
//   info    → everything else
//
// Sound: open plays soundPopupOpen once (skipped if another sound started < 250 ms ago,
// e.g. an error sound right before an error popup); any close plays soundPopupClose once.
// Alert.alert(title, message, buttons, { sound: false }) shows it silently (copy popup).

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
import { soundPopupOpen, soundPopupClose } from "../lib/tdcSounds";
import { msSinceLastSound } from "../lib/soundManager";
const DARK = T.ink;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const VARIANTS = {
  success: { icon: 'checkmark', color: T.success, bg: T.successBg },
  error: { icon: 'close', color: T.danger, bg: T.dangerBg },
  warning: { icon: 'alert', color: DARK, bg: T.yellowSoft },
  danger: { icon: 'warning-outline', color: T.danger, bg: T.dangerBg },
  confirm: { icon: 'help', color: DARK, bg: T.yellowSoft },
  info: { icon: 'information', color: DARK, bg: T.yellowSoft },
};

const nativeAlert = Alert.alert.bind(Alert);
let pushAlert = null; // set by the mounted host

// Emoji at the start / end of a title are dropped; the icon shows the mood.
const EDGE_EMOJI = /^(?:[☀-➿⬀-⯿ℹ‼⁉️‍\s]|[\uD83C-\uDBFF][\uDC00-\uDFFF])+|(?:[☀-➿⬀-⯿ℹ‼⁉️‍\s]|[\uD83C-\uDBFF][\uDC00-\uDFFF])+$/g;

function cleanTitle(t) {
  if (t == null) return '';
  const s = String(t).replace(EDGE_EMOJI, '').trim();
  return s || String(t).trim();
}

// tdc voice: headings are lowercase and end with a yellow "." (a "?" or "!" stays).
// Only the title and button labels are lowercased; messages keep names / acronyms.
function splitTitle(t) {
  const s = String(t).toLowerCase().trim();
  if (/[?!]$/.test(s)) return { text: s, dot: false };
  return { text: s.replace(/\.+$/, ''), dot: true };
}

function pickVariant(title, buttons) {
  const raw = String(title || '');
  const t = raw.toLowerCase();
  if ((buttons || []).some((b) => b?.style === 'destructive')) return 'danger';
  if (/❌|error|fail|invalid|went wrong|unable|couldn|could not|denied|expired/.test(t) || raw.includes('❌')) return 'error';
  if (/✅|🎉|🚀|success|saved|copied|verified|sent|submitted|done|added|updated|accepted|unblocked|removed|cancelled|declined|claimed|redeemed/.test(t)) return 'success';
  if (/⚠️|required|limit|blocked|locked|permission|login|sign in|missing|not connected|coming soon|notice|already|empty|disconnected/.test(t)) return 'warning';
  if ((buttons || []).length >= 2) return 'confirm';
  return 'info';
}

let idSeq = 0;

function appAlert(title, message, buttons, options) {
  if (!pushAlert) return nativeAlert(title, message, buttons, options);
  const list = Array.isArray(buttons) && buttons.length ? buttons.filter(Boolean) : [{ text: 'OK' }];
  pushAlert({
    id: ++idSeq,
    title: cleanTitle(title),
    message: message == null ? '' : String(message),
    buttons: list,
    options: options || {},
    variant: pickVariant(title, list),
  });
}

export function installAppAlert() {
  if (Alert.alert !== appAlert) Alert.alert = appAlert;
}

export const showAppAlert = appAlert;

export function AppAlertHost() {
  const [queue, setQueue] = useState([]);
  const current = queue[0] || null;

  // Hold the app tour while an alert is on screen
  useEffect(() => {
    if (current) holdTour("app-alert");
    else releaseTour("app-alert");
  }, [current]);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const busyRef = useRef(false);
  const currentRef = useRef(null);
  currentRef.current = current;

  useEffect(() => {
    pushAlert = (a) => setQueue((q) => [...q, a]);
    return () => {
      pushAlert = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    busyRef.current = false;
    if (current.options?.sound !== false && msSinceLastSound() > 250) soundPopupOpen();
    fade.setValue(0);
    scale.setValue(0.94);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [current?.id]);

  const finish = useCallback(
    (cb) => {
      if (busyRef.current) return;
      busyRef.current = true;
      if (currentRef.current?.options?.sound !== false) soundPopupClose();
      Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
        setQueue((q) => q.slice(1));
        // run after the popup is gone, so a follow-up Alert or navigation works
        if (typeof cb === 'function') setTimeout(() => {
          try { cb(); } catch (e) { console.log('[AppAlert] button error', e?.message); }
        }, 0);
      });
    },
    [fade]
  );

  const onBackdrop = useCallback(() => {
    if (!current) return;
    const { buttons, options } = current;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) return finish(cancelBtn.onPress);
    if (buttons.length === 1) return finish(buttons[0].onPress);
    if (options.cancelable) return finish(options.onDismiss);
  }, [current, finish]);

  // Android back always closes the popup: the cancel action if there is one,
  // otherwise it just dismisses (no other button's action runs).
  const onBack = useCallback(() => {
    if (!current) return;
    const { buttons, options } = current;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) return finish(cancelBtn.onPress);
    if (buttons.length === 1) return finish(buttons[0].onPress);
    return finish(options.onDismiss);
  }, [current, finish]);

  if (!current) return null;

  const v = VARIANTS[current.variant] || VARIANTS.info;
  const { buttons } = current;
  const stacked = buttons.length > 2;
  // cancel first (left), the rest after
  const ordered = stacked
    ? buttons
    : [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];
  const hasTitle = !!current.title;
  const title = hasTitle ? splitTitle(current.title) : null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onBack}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: v.bg }]}>
            <Ionicons name={v.icon} size={26} color={v.color} />
          </View>

          {hasTitle ? (
            <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
              {title.text}
              {title.dot ? <Text style={styles.titleDot}>.</Text> : null}
            </Text>
          ) : null}

          {current.message ? (
            <ScrollView
              style={styles.msgScroll}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.message, !hasTitle && styles.messageOnly]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {current.message}
              </Text>
            </ScrollView>
          ) : null}

          <View style={[styles.btnRow, stacked && styles.btnCol]}>
            {ordered.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              const btnStyle = isDanger ? styles.btnDanger : isCancel ? styles.btnGhost : styles.btnPrimary;
              const txtStyle = isDanger ? styles.btnDangerText : isCancel ? styles.btnGhostText : styles.btnPrimaryText;
              return (
                <TouchableOpacity
                  key={`${b.text || 'btn'}-${i}`}
                  activeOpacity={0.85}
                  style={[styles.btn, btnStyle, !stacked && { flex: 1 }]}
                  onPress={() => finish(b.onPress)}
                  accessibilityRole="button"
                >
                  <Text style={[txtStyle, styles.btnText]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {String(b.text || 'ok').toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_W - 48, 340),
    backgroundColor: T.paper,
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: F.heading,
    color: DARK,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleDot: { color: T.yellow },
  msgScroll: { maxHeight: SCREEN_H * 0.4, marginTop: 6, alignSelf: 'stretch' },
  message: {
    fontSize: 14, fontFamily: F.body,
    lineHeight: 20,
    color: T.ink,
    textAlign: 'center',
  },
  messageOnly: { color: DARK, fontSize: 15, fontFamily: F.bodySemi },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  btnCol: { flexDirection: 'column' },
  btn: {
    minHeight: 48, // at least 44 dp; grows with large text
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  // primary = tdc yellow; destructive = solid red with white text (clearly different);
  // cancel = sand outline
  btnPrimary: { backgroundColor: T.yellow },
  btnDanger: { backgroundColor: T.danger },
  btnGhost: { backgroundColor: T.sand, borderWidth: 1, borderColor: T.line },
  btnText: { textAlign: 'center' },
  btnPrimaryText: { color: DARK, fontSize: 15, fontFamily: F.bodyBold },
  btnDangerText: { color: T.white, fontSize: 15, fontFamily: F.bodyBold },
  btnGhostText: { color: DARK, fontSize: 15, fontFamily: F.bodyBold },
});

export default AppAlertHost;
