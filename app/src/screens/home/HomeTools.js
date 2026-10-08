// app/src/screens/home/HomeTools.js
// "your tdc." — the 8 tools in a 4 × 2 grid with mood faces and "sorted." pills.
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FeatureDot from "../../engagement/components/FeatureDot";
import { FEATURE_ID_TO_MISSION } from "../../engagement/utils/mood";
import SectionTitle from "../../ui/SectionTitle";
import PressScale from "../../ui/PressScale";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";

const COLUMNS = 4;

const ToolCell = React.memo(function ToolCell({ feature, sorted, onPress }) {
  const missionKey = FEATURE_ID_TO_MISSION[feature.id];

  // Pop animation for the "sorted." pill (same as the old feature card)
  const pillScale = useRef(new Animated.Value(sorted ? 1 : 0)).current;
  const pillFade = useRef(new Animated.Value(sorted ? 1 : 0)).current;

  useEffect(() => {
    if (sorted) {
      Animated.parallel([
        Animated.spring(pillScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(pillFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(pillScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(pillFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [sorted, pillScale, pillFade]);

  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={sorted ? `${feature.label}, sorted` : feature.label}
      containerStyle={styles.cellWrap}
      style={styles.cell}
    >
      <View style={[styles.circle, { backgroundColor: feature.well }]}>
        <Ionicons name={feature.icon} size={23} color={feature.stroke} />
        {missionKey && <FeatureDot missionKey={missionKey} sorted={!!sorted} />}
      </View>
      <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {feature.label}
      </Text>
      {sorted && (
        <Animated.View style={[styles.pill, { opacity: pillFade, transform: [{ scale: pillScale }] }]}>
          <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            sorted<Text style={styles.pillDot}>.</Text>
          </Text>
        </Animated.View>
      )}
    </PressScale>
  );
});

export default function HomeTools({ features, sortedFeatureIds, sortedLabel, onFeaturePress }) {
  const rows = [];
  for (let i = 0; i < features.length; i += COLUMNS) rows.push(features.slice(i, i + COLUMNS));

  return (
    <View style={styles.section}>
      <SectionTitle title="your tdc" right={sortedLabel} />
      <View style={styles.card}>
        {rows.map((row, r) => (
          <View key={r} style={[styles.row, r > 0 && styles.rowGap]}>
            {row.map((feat) => {
              const missionKey = FEATURE_ID_TO_MISSION[feat.id];
              const sorted = !!missionKey && sortedFeatureIds.has(missionKey);
              return (
                <ToolCell
                  key={feat.id}
                  feature={feat}
                  sorted={sorted}
                  onPress={() => onFeaturePress(feat.screen)}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24, paddingHorizontal: 16 },
  card: {
    marginTop: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  row: { flexDirection: "row", gap: 4 },
  rowGap: { marginTop: 16 },
  cellWrap: { flex: 1, minWidth: 0 },
  cell: { alignItems: "center", minHeight: 44 },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  label: {
    marginTop: 7,
    fontFamily: font.bodySemi,
    fontSize: 11.5,
    color: color.ink,
    textAlign: "center",
    alignSelf: "stretch",
  },
  pill: {
    marginTop: 4,
    height: 18,
    paddingHorizontal: 7,
    borderRadius: 9,
    backgroundColor: color.ink,
    justifyContent: "center",
  },
  pillText: { fontFamily: font.bodyBold, fontSize: 10, color: color.white },
  pillDot: { color: color.yellow },
});
