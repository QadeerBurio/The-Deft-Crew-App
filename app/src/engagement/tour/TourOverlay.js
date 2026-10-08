// app/src/engagement/tour/TourOverlay.js
// Dims the screen, rings the current tab in yellow and shows one card above it:
// dot face · title · line · "n of 5" · back / next (let's go on the last step) · skip.
// Tapping the dim area does nothing; hardware back = skip.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTour } from './TourProvider';
import { TOUR_STEPS } from './tourSteps';
import { pop } from '../utils/haptics';
import Dot from '../components/Dot';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

const DIM = 'rgba(17,17,17,0.72)';
const PAD = 8; // ring padding around the tab
const ARROW = 10;

export default function TourOverlay() {
  const { running, stop, getTargets } = useTour();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (running) setStepIdx(0);
  }, [running]);

  // Measure the current step's tab
  useEffect(() => {
    if (!running) {
      setRect(null);
      return undefined;
    }
    const step = TOUR_STEPS[stepIdx];
    if (!step) {
      stop();
      return undefined;
    }
    setRect(null);
    const node = getTargets().get(step.id);
    if (!node?.measureInWindow) return undefined;
    const measure = () => {
      try {
        node.measureInWindow((x, y, w, h) => {
          setRect(w > 0 && h > 0 ? { x, y, width: w, height: h } : null);
        });
      } catch {
        setRect(null);
      }
    };
    // measure, then again once any screen transition has settled
    const a = setTimeout(measure, 160);
    const b = setTimeout(measure, 600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [running, stepIdx, getTargets, stop]);

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

  // Ring + card position (card sits above the ringed tab; falls back above the tab bar)
  const ring = rect && {
    left: rect.x - PAD,
    top: rect.y - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const cardBottom = ring ? height - ring.top + ARROW + 6 : insets.bottom + 96;
  const sidePad = 16;
  const arrowLeft = ring
    ? Math.max(24, Math.min(width - sidePad * 2 - 24 - ARROW * 2, ring.left + ring.width / 2 - sidePad - ARROW))
    : null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={skip}>
      {/* Tapping the dim area does nothing (no accidental skips) */}
      <Pressable style={StyleSheet.absoluteFill} accessible={false}>
        {ring ? (
          <>
            <View style={[s.dim, { top: 0, left: 0, right: 0, height: Math.max(0, ring.top) }]} />
            <View style={[s.dim, { top: ring.top + ring.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[s.dim, { top: ring.top, left: 0, width: Math.max(0, ring.left), height: ring.height }]} />
            <View style={[s.dim, { top: ring.top, left: ring.left + ring.width, right: 0, height: ring.height }]} />
            <View pointerEvents="none" style={[s.ring, ring]} />
          </>
        ) : (
          <View style={[s.dim, StyleSheet.absoluteFillObject]} />
        )}
      </Pressable>

      <View style={[s.cardWrap, { bottom: cardBottom, paddingHorizontal: sidePad }]} pointerEvents="box-none">
        <View
          style={s.card}
          accessible={false}
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
                accessibilityLabel="previous step"
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

        {ring && (
          <View style={[s.arrowRow, { paddingLeft: arrowLeft }]} pointerEvents="none">
            <View style={s.arrow} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: T.yellow,
  },
  cardWrap: { position: 'absolute', left: 0, right: 0 },
  card: {
    backgroundColor: T.card,
    borderRadius: 24,
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
  arrowRow: { width: '100%' },
  arrow: {
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
