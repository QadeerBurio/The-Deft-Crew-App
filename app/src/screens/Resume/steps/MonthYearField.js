// app/src/screens/Resume/steps/MonthYearField.js
// P3-5 (flag resumeV2): month + year only, picked from chips in a sheet (no day, no typing). Optional "present"
// switch for entries that are still going on. value: a stored date ("YYYY-MM-01") or "".
import React, { useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import Sheet from "../../../ui/Sheet";
import Chip from "../../../ui/Chip";
import Button from "../../../ui/Button";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { MONTHS, toMonthYear, fromMonthYear, monthYearLabel } from "../../../resume/resumeV2";

export default function MonthYearField({ label, value, onChange, present, onPresentChange, presentLabel = "i'm still doing this", now = new Date() }) {
  const [open, setOpen] = useState(false);
  const cur = toMonthYear(value);
  const [m, setM] = useState(cur ? cur.m : null);
  const [y, setY] = useState(cur ? cur.y : null);
  const thisYear = now.getFullYear();
  const years = [];
  for (let yy = thisYear + 6; yy >= thisYear - 12; yy -= 1) years.push(yy);
  const shown = present ? "present" : monthYearLabel(value) || "pick month and year";

  const openSheet = () => { const c = toMonthYear(value); setM(c ? c.m : null); setY(c ? c.y : null); setOpen(true); };
  const done = () => { if (m != null && y != null) onChange(fromMonthYear(m, y)); setOpen(false); };

  return (
    <View style={s.wrap}>
      <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      {typeof onPresentChange === "function" && (
        <View style={s.presentRow}>
          <Text style={s.presentText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{presentLabel}</Text>
          <Switch value={!!present} onValueChange={onPresentChange} accessibilityLabel={presentLabel} trackColor={{ true: T.yellow, false: T.line }} thumbColor={T.white} />
        </View>
      )}
      {!present && (
        <Pressable onPress={openSheet} style={s.box} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`}>
          <Text style={[s.value, !value && { color: T.textFaint }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{shown}</Text>
        </Pressable>
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>month</Text>
          <View style={s.chips}>
            {MONTHS.map((name, i) => <Chip key={name} label={name} selected={m === i} onPress={() => setM(i)} />)}
          </View>
          <Text style={[s.label, { marginTop: 12 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>year</Text>
          <View style={s.chips}>
            {years.map((yy) => <Chip key={yy} label={String(yy)} selected={y === yy} onPress={() => setY(yy)} />)}
          </View>
          <Button title="done" onPress={done} disabled={m == null || y == null} style={{ marginTop: 16 }} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginBottom: 6 },
  box: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, paddingHorizontal: 14, justifyContent: "center" },
  value: { fontFamily: F.body, fontSize: 15, color: T.ink },
  presentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, minHeight: 44 },
  presentText: { fontFamily: F.body, fontSize: 14, color: T.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
