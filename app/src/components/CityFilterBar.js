// app/src/components/CityFilterBar.js
// Horizontal city chips: Karachi | Lahore | Islamabad | ... | All
import React, { memo } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ALL_CITIES } from "../utils/cityFilter";

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
              onPress={() => {
                if (active) return;
                Haptics.selectionAsync().catch(() => {});
                onSelect(city);
              }}
            >
              <MaterialCommunityIcons
                name={city === ALL_CITIES ? "map-outline" : "map-marker"}
                size={13}
                color={active ? "#f9c349" : "#666"}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {city === ALL_CITIES ? "All Cities" : city}
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
  row: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  chipActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  chipText: { fontSize: 12.5, fontWeight: "600", color: "#444" },
  chipTextActive: { color: "#fff", fontWeight: "800" },
  count: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f3f3f3",
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: "#f9c349" },
  countText: { fontSize: 10, fontWeight: "700", color: "#777" },
  countTextActive: { color: "#000" },
});
