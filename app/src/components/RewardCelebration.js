// RewardCelebration.js: the loyalty moments (feat/loyalty-control), shown over any screen:
//   reward unlocked  a card with confetti: "reward unlocked at Chai Cafe: 25% off your next bill" (once per reward)
//   reward used      a short card: "reward used, you saved PKR 400" (once per reward)
// Fed by app/src/loyalty/celebrations.js (push / in-app notification, or a stamp card with an uncelebrated reward).
// Confetti is plain Animated (no native module); with "reduce motion" on it's skipped. Screen readers hear the text.
import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, AccessibilityInfo, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { onCelebration, breakdownLines } from "../loyalty/celebrations";

const COLORS = [T.yellow, "#E8505B", "#2B7FC0", "#1E6B3A", "#C77700", "#8E5BD9"];
const PIECES = 28;

function Confetti() {
  const { width, height } = Dimensions.get("window");
  const pieces = useRef(Array.from({ length: PIECES }, (_, i) => ({
    x: Math.random() * width, drift: (Math.random() - 0.5) * 80, delay: Math.random() * 400, size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length], v: new Animated.Value(0),
  }))).current;
  useEffect(() => {
    const anims = pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: 1600 + Math.random() * 900, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="confetti" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: "absolute", left: p.x, top: -20, width: p.size, height: p.size * 1.6, borderRadius: 2, backgroundColor: p.color,
          transform: [
            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.75] }) },
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 + i * 20}deg`] }) },
          ],
          opacity: p.v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
        }} />
      ))}
    </View>
  );
}

export default function RewardCelebration() {
  const [queue, setQueue] = useState([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => onCelebration((m) => setQueue((q) => [...q, m])), []);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo?.isReduceMotionEnabled?.().then((v) => alive && setReduceMotion(!!v)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const current = queue[0] || null;
  useEffect(() => {
    if (current) AccessibilityInfo?.announceForAccessibility?.(current.text);
  }, [current]);
  if (!current) return null;
  const close = () => setQueue((q) => q.slice(1));
  const unlocked = current.kind === "unlocked";
  return (
    <Modal transparent visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop} testID={unlocked ? "reward-unlocked" : "reward-used"}>
        {unlocked && !reduceMotion && <Confetti />}
        <View style={styles.card} accessible accessibilityRole="alert" accessibilityLabel={current.text}>
          <View style={[styles.icon, { backgroundColor: unlocked ? T.yellow : T.successBg || T.yellowSoft }]}>
            <Ionicons name={unlocked ? "gift" : "checkmark-circle"} size={34} color={unlocked ? T.ink : T.success || T.ink} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{unlocked ? "reward unlocked" : "reward used"}<Text style={{ color: T.yellow }}>.</Text></Text>
          <Text style={styles.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>{current.text}</Text>
          {unlocked && <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>show your qr on your next visit and the brand applies it to your bill.</Text>}
          {/* reward used: the same breakdown the brand saw (bill, offer, reward, what you paid) */}
          {!unlocked && breakdownLines(current.breakdown).length > 0 && (
            <View style={styles.breakdown} testID="reward-breakdown">
              {breakdownLines(current.breakdown).map((l, i, all) => (
                <Text key={l} style={[styles.line, i === all.length - 1 && styles.lineTotal]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{l}</Text>
              ))}
            </View>
          )}
          <Pressable onPress={close} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={unlocked ? "nice, close" : "ok, close"} hitSlop={8}>
            <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{unlocked ? "nice!" : "ok"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: T.card, borderRadius: 24, padding: 22, alignItems: "center" },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontFamily: F.heading, fontSize: 22, color: T.ink },
  text: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink, textAlign: "center", marginTop: 8, lineHeight: 21 },
  breakdown: { alignSelf: "stretch", marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: T.sand || "#F5F2EA", gap: 4 },
  line: { fontFamily: F.body, fontSize: 13.5, color: T.ink },
  lineTotal: { fontFamily: F.bodyBold },
  hint: { fontFamily: F.body, fontSize: 13, color: T.textMuted, textAlign: "center", marginTop: 8 },
  button: { marginTop: 18, minHeight: 48, minWidth: 140, paddingHorizontal: 22, borderRadius: 24, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: F.bodyBold, fontSize: 15, color: T.card },
});
