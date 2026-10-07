// app/src/components/CityDropdown.js
// Right-side city picker: [📍 All Cities ▾] → bottom sheet with city list + counts
import React, { memo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ALL_CITIES } from "../utils/cityFilter";
import { colors } from "../theme";

const label = (city) => (city === ALL_CITIES ? "All Cities" : city);

function CityDropdown({ options, selected, onSelect, style, title = "Select City", fullWidth = false }) {
  const [open, setOpen] = useState(false);

  // Only "All" means no city has data yet → nothing to pick
  if (!options || options.length < 2) return null;

  const pick = (city) => {
    setOpen(false);
    if (city !== selected) {
      Haptics.selectionAsync().catch(() => {});
      onSelect(city);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          fullWidth && styles.triggerFull,
          selected !== ALL_CITIES && styles.triggerActive,
          style,
        ]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
      >
        <MaterialCommunityIcons
          name="map-marker"
          size={14}
          color={selected !== ALL_CITIES ? colors.yellow : "#000"}
        />
        <Text
          style={[
            styles.triggerText,
            fullWidth && styles.triggerTextFull,
            selected !== ALL_CITIES && styles.triggerTextActive,
          ]}
          numberOfLines={1}
        >
          {fullWidth && selected === ALL_CITIES ? "All Cities" : label(selected)}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={16}
          color={selected !== ALL_CITIES ? colors.yellow : "#000"}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map(({ city, count }) => {
                const active = city === selected;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.row, active && styles.rowActive]}
                    activeOpacity={0.7}
                    onPress={() => pick(city)}
                  >
                    <MaterialCommunityIcons
                      name={city === ALL_CITIES ? "map-outline" : "map-marker-outline"}
                      size={18}
                      color={active ? colors.yellow : "#666"}
                    />
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {label(city)}
                    </Text>
                    <View style={[styles.count, active && styles.countActive]}>
                      <Text style={[styles.countText, active && styles.countTextActive]}>
                        {count}
                      </Text>
                    </View>
                    {active && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={colors.yellow}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default memo(CityDropdown);

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F7F9F8",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxWidth: 150,
  },
  triggerFull: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  triggerTextFull: { flex: 1, fontSize: 14 },
  triggerActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  triggerText: { fontSize: 12.5, fontWeight: "700", color: "#000", flexShrink: 1 },
  triggerTextActive: { color: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#000", marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: "#1a1a1a" },
  rowText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "600", color: "#222" },
  rowTextActive: { color: "#fff", fontWeight: "800" },
  count: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: colors.yellow },
  countText: { fontSize: 11.5, fontWeight: "700", color: "#666" },
  countTextActive: { color: "#000" },
});
