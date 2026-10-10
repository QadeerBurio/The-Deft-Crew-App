// app/src/engagement/tour/TourOverlay.js
// Dims the screen with a round cut-out around the current tab icon (yellow ring) and
// shows one card above the tab bar with an arrow pointing at the icon:
// dot face · title · line · "n of 5" · back / next (let's go on the last step) · skip.
// Tapping the dim area (or the icon in the cut-out) does nothing; hardware back = skip.
//
// Geometry, all from real layout (no hard-coded tab positions):
//   • overlay size: onLayout of the modal's root view (follows rotation)
//   • icon: measureInWindow of the tab's icon box (TabNavigator refBox), on every
//     step change and overlay size change, retried until it has a size
//   • tab bar: measureInWindow of the tab bar view ("tab_bar"), so the arrow tip
//     stays above the bar's top edge (safe area / gesture / 3-button bar included,
//     since the bar's own height already includes the bottom inset)
//   • arrow centre = icon centre x; tip = min(bar top, cut-out top) - 6
//   • card: max 420 wide, centred on the icon, clamped 16 px from the screen edges;
//     its bottom edge sits on the arrow, so a bigger font grows it upwards
// Android is edge-to-edge (Expo SDK 54), so window coordinates and the
// status-bar-translucent modal share the same origin.
import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTour } from './TourProvider';
import { TOUR_STEPS } from './tourSteps';
import { pop } from '../utils/haptics';
import Dot from '../components/Dot';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

const DIM = 'rgba(17,17,17,0.72)'; // ink at 72%
const PAD = 8; // cut-out padding around the icon
const ARROW = 10; // arrow half-width = height
const TIP_GAP = 6; // space between the arrow tip and the tab bar / cut-out
const EDGE = 16; // card distance from the screen edges
const CARD_MAX = 420;
const CARD_RADIUS = 24;
const MEASURE_TRIES = 8;
const MEASURE_EVERY_MS = 150;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const measure = (node) =>
  new Promise((resolve) => {
    if (!node?.measureInWindow) return resolve(null);
    try {
      node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, width: w, height: h } : null));
    } catch {
      resolve(null);
    }
  });

export default function TourOverlay() {
  const { running, stop, getTargets } = useTour();
  const insets = useSafeAreaInsets();
  const [stepIdx, setStepIdx] = useState(0);
  const [size, setSize] = useState(null); // overlay { width, height }
  const [icon, setIcon] = useState(null);
  const [bar, setBar] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduceMotion(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduceMotion(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (running) setStepIdx(0);
  }, [running]);

  // Measure the current step's icon and the tab bar (again on rotation / resize)
  useEffect(() => {
    if (!running) {
      setIcon(null);
      setBar(null);
      return undefined;
    }
    const step = TOUR_STEPS[stepIdx];
    if (!step) {
      stop();
      return undefined;
    }
    setIcon(null);
    let cancelled = false;
    let tries = 0;
    let timer = null;
    const run = async () => {
      if (cancelled) return;
      tries += 1;
      const targets = getTargets();
      const [i, b] = await Promise.all([measure(targets.get(step.id)), measure(targets.get('tab_bar'))]);
      if (cancelled) return;
      const sane = i && (!size || (i.y + i.height <= size.height + 1 && i.x + i.width <= size.width + 1));
      if (sane) setIcon(i);
      if (b) setBar(b);
      if ((!sane || !b) && tries < MEASURE_TRIES) timer = setTimeout(run, retryDelay(tries));
      else if (tries < 3) timer = setTimeout(run, 450); // once more after transitions settle
    };
    timer = setTimeout(run, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, stepIdx, getTargets, stop, size?.width, size?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRootLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  if (!running) return null;

  const step = TOUR_STEPS[stepIdx];
  if (!step) return null;
  const total = TOUR_STEPS.length;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === total - 1;

  const next = () => {
    pop();
    if (isLast) stop();
    else setStepIdx((i) => i + 1);
  };
  const back = () => {
    pop();
    setStepIdx((i) => Math.max(0, i - 1));
  };
  const skip = () => {
    pop();
    stop();
  };

  // ── Geometry
  const W = size?.width || 0;
  const H = size?.height || 0;
  const g = icon && W && H ? geometry({ icon, bar, W, H }) : null;
  const cardW = W ? Math.min(W - EDGE * 2, CARD_MAX) : null;
  const B = Math.max(W, H) * 2; // border width that covers the screen around the cut-out

  return (
    <Modal
      visible
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={skip}
    >
      <View style={StyleSheet.absoluteFill} onLayout={onRootLayout}>
        {/* Catches every touch outside the card: tapping the dim area or the icon does nothing */}
        <Pressable style={StyleSheet.absoluteFill} accessible={false} />

        {g ? (
          <>
            {/* dim with a round hole: one view whose huge border is the dim */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: g.holeLeft - B,
                top: g.holeTop - B,
                width: g.hole + B * 2,
                height: g.hole + B * 2,
                borderRadius: g.hole / 2 + B,
                borderWidth: B,
                borderColor: DIM,
              }}
            />
            <View
              pointerEvents="none"
              style={[
                s.ring,
                { left: g.holeLeft, top: g.holeTop, width: g.hole, height: g.hole, borderRadius: g.hole / 2 },
              ]}
            />
          </>
        ) : (
          <View pointerEvents="none" style={[s.dim, StyleSheet.absoluteFillObject]} />
        )}

        {!!W && (
          <View
            style={[
              s.card,
              g
                ? {
                    left: g.cardLeft,
                    width: g.cardW,
                    bottom: H - g.cardBottomY,
                    borderBottomLeftRadius: g.radiusLeft,
                    borderBottomRightRadius: g.radiusRight,
                  }
                : { left: (W - cardW) / 2, width: cardW, bottom: insets.bottom + 96 },
            ]}
            accessibilityViewIsModal
          >
            <View style={s.top}>
              <Text style={s.counter} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {stepIdx + 1} of {total}
              </Text>
              <TouchableOpacity
                onPress={skip}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="skip the tour"
              >
                <Text style={s.skip} maxFontSizeMultiplier={MAX_FONT_SCALE}>skip</Text>
              </TouchableOpacity>
            </View>

            <View style={s.body} accessible accessibilityLabel={`${step.title} ${step.line}`}>
              <Dot mood={step.mood} size={48} animated={false} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {step.title.replace(/\.$/, '')}
                  <Text style={{ color: T.yellow }}>.</Text>
                </Text>
                <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{step.line}</Text>
              </View>
            </View>

            <View style={s.foot}>
              <View style={s.dots}>
                {TOUR_STEPS.map((x, i) => (
                  <View key={x.id} style={[s.dot, i === stepIdx && s.dotOn]} />
                ))}
              </View>
              {!isFirst && (
                <TouchableOpacity
                  onPress={back}
                  style={s.backBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="back, previous step"
                >
                  <Text style={s.backText} maxFontSizeMultiplier={MAX_FONT_SCALE}>back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={next}
                style={s.nextBtn}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={isLast ? 'finish the tour' : 'next step'}
              >
                <Text style={s.nextText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {isLast ? "let's go" : 'next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* arrow: on the card's bottom edge, tip above the icon */}
        {g && <View pointerEvents="none" style={[s.arrow, { left: g.arrowLeft, top: g.arrowTop }]} />}
      </View>
    </Modal>
  );
}

// retry spacing: quick first, then a little slower
function retryDelay(tries) {
  return tries < 3 ? MEASURE_EVERY_MS : MEASURE_EVERY_MS * 2;
}

// Pure layout maths (screen coordinates)
export function geometry({ icon, bar, W, H }) {
  const cx = icon.x + icon.width / 2;
  const cy = icon.y + icon.height / 2;
  const hole = Math.max(icon.width, icon.height) + PAD * 2;
  const holeLeft = cx - hole / 2;
  const holeTop = cy - hole / 2;
  const barTop = bar ? bar.y : holeTop; // bar not measured yet → stay above the cut-out
  const tipY = Math.min(barTop, holeTop) - TIP_GAP;
  const arrowTop = tipY - ARROW; // the triangle's top edge = the card's bottom edge
  const cardW = Math.min(W - EDGE * 2, CARD_MAX);
  const cardLeft = clamp(cx - cardW / 2, EDGE, W - EDGE - cardW);
  const arrowLeft = cx - ARROW;
  // near a card corner, round that corner less so the arrow sits on a straight edge
  const radiusLeft = clamp(arrowLeft - cardLeft - 2, 6, CARD_RADIUS);
  const radiusRight = clamp(cardLeft + cardW - (cx + ARROW) - 2, 6, CARD_RADIUS);
  return { cx, hole, holeLeft, holeTop, tipY, arrowTop, arrowLeft, cardW, cardLeft, cardBottomY: arrowTop, radiusLeft, radiusRight, H };
}

const s = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: T.yellow,
  },
  card: {
    position: 'absolute',
    backgroundColor: T.card,
    borderRadius: CARD_RADIUS,
    padding: 16,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.textMuted },
  skip: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink, textDecorationLine: 'underline', paddingVertical: 4 },
  body: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 },
  title: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  line: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20, color: T.textMuted, marginTop: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  dots: { flex: 1, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.handle },
  dotOn: { width: 18, backgroundColor: T.ink },
  backBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: 'center',
  },
  backText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  nextBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: T.yellow,
    justifyContent: 'center',
  },
  nextText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: T.card,
  },
});
