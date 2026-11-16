// StampCircles.js: a stamp card's circles (feat/loyalty-control), the same on the offer screen (LoyaltyCard) and in
// "my loyalty" (LoyaltyVisits): N circles, filled with a tick for each counted visit; all filled with a gift on the
// last one when the reward is ready.
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T } from "../theme/tokens";

/** how many circles are filled: every one when the reward is ready */
export const filledOf = ({ needed, stamps, ready }) => {
  const n = Math.max(1, Number(needed) || 1);
  return ready ? n : Math.min(Math.max(0, Number(stamps) || 0), n);
};

export default function StampCircles({ needed, stamps, ready = false, size = 26, testID }) {
  const n = Math.max(1, Number(needed) || 1);
  const have = filledOf({ needed, stamps, ready });
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={testID}>
      {Array.from({ length: n }, (_, i) => {
        const on = i < have;
        const last = i === n - 1;
        return (
          <View key={i} testID={on ? "stamp-on" : "stamp-off"} style={[styles.stamp, { width: size, height: size, borderRadius: size / 2 }, on && styles.on]}>
            {on && <Ionicons name={ready && last ? "gift" : "checkmark"} size={Math.round(size * 0.6)} color={T.ink} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  stamp: { borderWidth: 2, borderColor: T.yellow, alignItems: "center", justifyContent: "center" },
  on: { backgroundColor: T.yellow },
});
