// app/src/components/CityDropdown.js
// City picker: [📍 all cities ▾] → bottom sheet with city list + counts
// variant "chip": the yellow city chip at the start of a chip row (Brands design)
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
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { SheetHandle } from "../ui/Sheet";

const label = (city) => (city === ALL_CITIES ? "all cities" : city);

function CityDropdown({ options, selected, onSelect, style, title = "select city", fullWidth = false, variant }) {
  const [open, setOpen] = useState(false);
  const chip = variant === "chip";

  // Only "All" means no city has data yet → nothing to pick
  if (!options || options.length < 2) return null;

  const pick = (city) => {
    setOpen(false);
    if (city !== selected) {
      Haptics.selectionAsync().catch(() => {});
      onSelect(city);
    }
  };

  const active = selected !== ALL_CITIES;
  const fg = chip ? T.ink : active ? T.white : T.ink;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          fullWidth && styles.triggerFull,
          active && styles.triggerActive,
          chip && styles.triggerChip,
          style,
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`city: ${label(selected)}, change`}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
      >
        {!chip && <MaterialCommunityIcons name="map-marker-outline" size={15} color={fg} />}
        <Text
          style={[styles.triggerText, fullWidth && styles.triggerTextFull, { color: fg }]}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {label(selected)}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={fg} />
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
            <SheetHandle style={{ marginBottom: 6 }} />
            <Text style={styles.sheetTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {title}
              <Text style={{ color: T.yellow }}>.</Text>
            </Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map(({ city, count }) => {
                const on = city === selected;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.row, on && styles.rowActive]}
                    activeOpacity={0.7}
                    onPress={() => pick(city)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${label(city)}, ${count}`}
                  >
                    <MaterialCommunityIcons
                      name={city === ALL_CITIES ? "map-outline" : "map-marker-outline"}
                      size={18}
                      color={on ? T.white : T.textFaint}
                    />
                    <Text style={[styles.rowText, on && styles.rowTextActive]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {label(city)}
                    </Text>
                    <View style={[styles.count, on && styles.countActive]}>
                      <Text style={[styles.countText, on && styles.countTextActive]}>{count}</Text>
                    </View>
                    {on && (
                      <MaterialCommunityIcons name="check" size={18} color={T.yellow} style={{ marginLeft: 8 }} />
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
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    maxWidth: 170,
  },
  triggerFull: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    gap: 8,
  },
  triggerTextFull: { flex: 1, fontSize: 14 },
  triggerActive: { backgroundColor: T.ink, borderColor: T.ink },
  triggerChip: { backgroundColor: T.yellow, borderColor: T.yellow, gap: 4 },
  triggerText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink, flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetTitle: { fontFamily: F.heading, fontSize: 20, color: T.ink, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: T.ink },
  rowText: { flex: 1, marginLeft: 10, fontFamily: F.bodySemi, fontSize: 15, color: T.ink },
  rowTextActive: { color: T.white, fontFamily: F.bodyBold },
  count: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: T.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: T.yellow },
  countText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.textMuted },
  countTextActive: { color: T.ink },
});
