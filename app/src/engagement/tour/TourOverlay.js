// app/src/engagement/tour/TourOverlay.js
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTour } from './TourProvider';
import { TOUR_STEPS } from './tourSteps';
import { pop } from '../utils/haptics';

import { color as T, font as F } from "../../theme/tokens";
const { width, height } = Dimensions.get('window');
const GOLD = T.yellow;
const DARK = T.ink;
const DIM = 'rgba(0,0,0,0.75)';

// Height of the tab bar (keep in sync with TabNavigator.js)
const TAB_HEIGHT = 55;
const BOTTOM_INSET = 30;
// Distance from bottom of screen where the sheet sits.
// Leaves room BELOW the sheet for the downward caret to point at the tab.
const SHEET_BOTTOM_OFFSET = TAB_HEIGHT + BOTTOM_INSET;

const ARROW_W = 14;   // half-width of the caret
const ARROW_H = 12;   // height of the caret

export default function TourOverlay() {
  const { running, stop, getTargets } = useTour();
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);

  // Reset step on start
  useEffect(() => {
    if (running) setStepIdx(0);
  }, [running]);

  // Measure the current step's target
  useEffect(() => {
    if (!running) {
      setRect(null);
      return;
    }
    const step = TOUR_STEPS[stepIdx];
    if (!step) {
      stop();
      return;
    }
    const node = getTargets().get(step.id);
    if (node && node.measureInWindow) {
      const id = setTimeout(() => {
        try {
          node.measureInWindow((x, y, w, h) => {
            if (w > 0 && h > 0) {
              setRect({ x, y, width: w, height: h });
            } else {
              setRect(null);
            }
          });
        } catch {
          setRect(null);
        }
      }, 180);
      return () => clearTimeout(id);
    }
    setRect(null);
  }, [running, stepIdx, getTargets, stop]);

  if (!running) return null;

  const step = TOUR_STEPS[stepIdx];
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const total = TOUR_STEPS.length;

  const onNext = () => {
    pop();
    if (isLast) {
      stop();
      return;
    }
    setStepIdx((i) => i + 1);
  };

  const onSkip = () => {
    pop();
    stop();
  };

  const onBackdrop = () => onNext();

  // ── Spotlight rect padding
  const PAD = 12;
  const spotlightLeft = rect ? rect.x - PAD : 0;
  const spotlightTop = rect ? rect.y - PAD : 0;
  const spotlightW = rect ? rect.width + PAD * 2 : 0;
  const spotlightH = rect ? rect.height + PAD * 2 : 0;

  // ── Arrow horizontal alignment (center of the highlighted icon)
  const spotlightCenterX = rect ? rect.x + rect.width / 2 : width / 2;
  const sheetHPad = 16; // matches styles.sheetWrap.paddingHorizontal
  const sheetWidth = width - sheetHPad * 2;
  let arrowLeft = spotlightCenterX - sheetHPad - ARROW_W;
  // Clamp inside the sheet so it never overflows
  arrowLeft = Math.max(16, Math.min(sheetWidth - ARROW_W * 2 - 16, arrowLeft));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.root} onPress={onBackdrop}>
        {/* ── DIM + SPOTLIGHT LAYER ───────────────────────────── */}
        {rect ? (
          <>
            {/* top dim */}
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: spotlightTop }]} />
            {/* bottom dim */}
            <View
              style={[
                styles.dim,
                { top: spotlightTop + spotlightH, left: 0, right: 0, bottom: 0 },
              ]}
            />
            {/* left dim */}
            <View
              style={[
                styles.dim,
                { top: spotlightTop, left: 0, width: spotlightLeft, height: spotlightH },
              ]}
            />
            {/* right dim */}
            <View
              style={[
                styles.dim,
                {
                  top: spotlightTop,
                  left: spotlightLeft + spotlightW,
                  right: 0,
                  height: spotlightH,
                },
              ]}
            />

            {/* Gold spotlight ring */}
            <View
              style={[
                styles.spotlight,
                {
                  left: spotlightLeft,
                  top: spotlightTop,
                  width: spotlightW,
                  height: spotlightH,
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFillObject]} />
        )}

        {/* ── SHEET + ARROW (sits ABOVE the tab bar) ─────────── */}
        <View
          style={[styles.sheetWrap, { bottom: SHEET_BOTTOM_OFFSET }]}
          pointerEvents="box-none"
        >
          <View style={styles.sheetInner}>
            <View style={styles.headerRow}>
              <Text style={styles.counter}>
                {stepIdx + 1} of {total}
              </Text>
              <TouchableOpacity onPress={onSkip} hitSlop={12}>
                <Text style={styles.skipText}>skip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.line}>{step.line}</Text>

            <View style={styles.footerRow}>
              <View style={styles.dotsRow}>
                {TOUR_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dotIndicator, i === stepIdx && styles.dotIndicatorActive]}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.9}>
                <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
                {isLast && (
                  <Ionicons name="checkmark" size={16} color={DARK} style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ✅ Arrow BELOW the sheet, pointing DOWN at the tab icon */}
          {rect && (
            <View
              style={[styles.arrowRow, { paddingLeft: arrowLeft }]}
              pointerEvents="none"
            >
              <View style={styles.arrowOuter} />
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // dim: {
  //   position: 'absolute',
  //   backgroundColor: DIM,
  // },
  // spotlight: {
  //   position: 'absolute',
  //   borderRadius: 16,
  //   borderWidth: 2.5,
  //   borderColor: GOLD,
  //   backgroundColor: T.yellowSoft,
  // },
  // ── Sheet wrapper: absolutely positioned above the tab bar
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  // ── Arrow row sits UNDER the sheet, aligned with the highlighted tab
  arrowRow: {
    height: ARROW_H,
  },
  // Downward-pointing caret (speech-bubble tail below the card)
  arrowOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_W,
    borderRightWidth: ARROW_W,
    borderTopWidth: ARROW_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: T.white,
  },
  sheetInner: {
    backgroundColor: T.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counter: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textFaint,
    letterSpacing: 0.3,
  },
  skipText: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.textFaint,
  },
  line: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: DARK,
    lineHeight: 22,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.sand,
  },
  dotIndicatorActive: {
    backgroundColor: GOLD,
    width: 18,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    minWidth: 90,
  },
  nextText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: DARK,
    letterSpacing: 0.3,
  },
});