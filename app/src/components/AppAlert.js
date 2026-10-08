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

import { color as T, font as F } from "../theme/tokens";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
const DARK = T.ink;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const VARIANTS = {
  success: { icon: 'checkmark', color: T.success, bg: T.successBg },
  error: { icon: 'close', color: T.danger, bg: T.dangerBg },
  warning: { icon: 'alert', color: '#b7791f', bg: '#fff6e0' },
  danger: { icon: 'warning-outline', color: T.danger, bg: T.dangerBg },
  confirm: { icon: 'help', color: DARK, bg: '#fff6e0' },
  info: { icon: 'information', color: DARK, bg: '#fff6e0' },
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

  useEffect(() => {
    pushAlert = (a) => setQueue((q) => [...q, a]);
    return () => {
      pushAlert = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    busyRef.current = false;
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

  if (!current) return null;

  const v = VARIANTS[current.variant] || VARIANTS.info;
  const { buttons } = current;
  const stacked = buttons.length > 2;
  // cancel first (left), the rest after
  const ordered = stacked
    ? buttons
    : [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];
  const hasTitle = !!current.title;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onBackdrop}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: v.bg }]}>
            <Ionicons name={v.icon} size={26} color={v.color} />
          </View>

          {hasTitle ? <Text style={styles.title}>{current.title}</Text> : null}

          {current.message ? (
            <ScrollView
              style={styles.msgScroll}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.message, !hasTitle && styles.messageOnly]}>{current.message}</Text>
            </ScrollView>
          ) : null}

          <View style={[styles.btnRow, stacked && styles.btnCol]}>
            {ordered.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              const btnStyle = isDanger ? styles.btnDanger : isCancel ? styles.btnGhost : styles.btnPrimary;
              const txtStyle = isCancel ? styles.btnGhostText : styles.btnPrimaryText;
              return (
                <TouchableOpacity
                  key={`${b.text || 'btn'}-${i}`}
                  activeOpacity={0.85}
                  style={[styles.btn, btnStyle, !stacked && { flex: 1 }]}
                  onPress={() => finish(b.onPress)}
                >
                  <Text style={txtStyle} numberOfLines={1}>{b.text || 'OK'}</Text>
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
    backgroundColor: 'rgba(10,10,10,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_W - 48, 340),
    backgroundColor: T.card,
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
  msgScroll: { maxHeight: SCREEN_H * 0.4, marginTop: 6, alignSelf: 'stretch' },
  message: {
    fontSize: 14, fontFamily: F.body,
    lineHeight: 20,
    color: T.textMuted,
    textAlign: 'center',
  },
  messageOnly: { color: DARK, fontSize: 15, fontFamily: F.bodySemi },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  btnCol: { flexDirection: 'column' },
  btn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  btnPrimary: { backgroundColor: DARK },
  btnDanger: { backgroundColor: T.danger },
  btnGhost: { backgroundColor: T.sand, borderWidth: 1, borderColor: T.line },
  btnPrimaryText: { color: T.white, fontSize: 15, fontFamily: F.bodyBold },
  btnGhostText: { color: DARK, fontSize: 15, fontFamily: F.bodyBold },
});

export default AppAlertHost;
