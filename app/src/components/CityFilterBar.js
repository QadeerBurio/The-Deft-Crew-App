// app/src/components/CityFilterBar.js
// Horizontal city chips: Karachi | Lahore | Islamabad | ... | All
import React, { memo } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ALL_CITIES } from "../utils/cityFilter";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

function CityFilterBar({ options, selected, onSelect, style }) {
  if (!options || options.length === 0) return null;

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {options.map(({ city, count }) => {
          const active = selected === city;
          return (
            <TouchableOpacity
              key={city}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={city === ALL_CITIES ? "all cities" : city}
              onPress={() => {
                if (active) return;
                Haptics.selectionAsync().catch(() => {});
                onSelect(city);
              }}
            >
              <MaterialCommunityIcons
                name={city === ALL_CITIES ? "map-outline" : "map-marker"}
                size={13}
                color={active ? T.white : T.textFaint}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {city === ALL_CITIES ? "all cities" : city}
              </Text>
              {typeof count === "number" && (
                <View style={[styles.count, active && styles.countActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(CityFilterBar);

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  chipActive: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  chipTextActive: { color: T.white, fontFamily: F.bodyBold },
  count: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: T.yellow },
  countText: { fontFamily: F.bodyBold, fontSize: 10, color: T.textMuted },
  countTextActive: { color: T.ink },
});
