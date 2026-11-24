// app/src/screens/Resume/steps/ActivitiesStep.js
// P3-3 (flag resumeV2): "leadership & activities" (societies, clubs, teams, class rep) and "volunteering", one entry
// per card: organisation, role, month + year, and up to 3 short lines on what they did. Printed as "Leadership &
// Activities" / "Volunteering". kind: "activities" | "volunteering".
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Card from "../../../ui/Card";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import MonthYearField from "./MonthYearField";
import { monthYearLabel } from "../../../resume/resumeV2";
import { saveList, addOrReplace, removeKey, clean, cleanLines, keyOf } from "./sectionList";
import MemoryJoggers from "../coach/MemoryJoggers";
import StoryPrompt from "../coach/StoryPrompt";
import LiveCheck from "../coach/LiveCheck";

const COPY = {
  activities: { org: "society, club or team", orgPh: "e.g. IEEE student branch", role: "your role", rolePh: "e.g. events lead, member, captain", add: "add activity", empty: "nothing here yet. a society, a sports team, class rep: it all counts." },
  volunteering: { org: "organisation or drive", orgPh: "e.g. Edhi, a blood drive, a school", role: "what you were", rolePh: "e.g. volunteer, organiser", add: "add volunteering", empty: "nothing here yet. one-day drives count too." },
};
const EMPTY = { organisation: "", role: "", startDate: "", endDate: "", current: false, lines: ["", "", ""] };

// coach (P3b, flags resumeV2 + resumeCoach): { programme, speak, onTap, onTyped } → memory joggers on top, "answer,
// don't write" for the entry being added (its lines fill the fields below), live checks under each line
export default function ActivitiesStep({ kind = "activities", resume, io, registerAdd, coach = null }) {
  const c = COPY[kind] || COPY.activities;
  const items = Array.isArray(resume?.[kind]) ? resume[kind] : [];
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const typed = !!(form.organisation.trim() || form.role.trim());

  const add = async ({ quiet } = {}) => {
    if (!typed) { if (!quiet) setErr(`add the ${c.org} or your role first.`); return; }
    setBusy(true); setErr("");
    try {
      const item = { organisation: clean(form.organisation, 120), role: clean(form.role, 120), startDate: form.startDate || undefined, endDate: form.current ? undefined : form.endDate || undefined, current: !!form.current, bullets: cleanLines(form.lines) };
      await saveList(io, kind, addOrReplace(item, editing));
      setForm(EMPTY); setEditing(null);
    } catch (e) {
      setErr("not saved. check your connection and try again.");
    } finally { setBusy(false); }
  };
  useEffect(() => { registerAdd?.(add); });

  const edit = (x) => {
    setEditing(keyOf(x));
    const lines = [...(x.bullets || []), "", "", ""].slice(0, 3);
    setForm({ organisation: x.organisation || "", role: x.role || "", startDate: x.startDate || "", endDate: x.endDate || "", current: !!x.current, lines });
  };
  const remove = (x) => saveList(io, kind, removeKey(keyOf(x))).catch(() => setErr("not deleted. try again."));

  // the coach's lines fill the empty line fields first (the student can still edit them before adding)
  const fillLines = (kept) => setForm((f) => {
    const lines = f.lines.filter((l) => l.trim());
    const next = [...lines, ...kept].slice(0, 3);
    return { ...f, lines: [...next, "", "", ""].slice(0, Math.max(3, next.length)) };
  });

  return (
    <View>
      {coach && <MemoryJoggers programme={coach.programme} sections={kind === "volunteering" ? ["volunteering"] : ["activities", "awards", "certifications"]} io={io} onTap={coach.onTap} onTyped={coach.onTyped} />}
      {items.length === 0 ?<Text style={s.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.empty}</Text> : items.map((x) => (
        <Card key={keyOf(x)} small style={s.item}>
          <View style={s.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{[x.role, x.organisation].filter(Boolean).join(", ")}</Text>
              <Text style={s.itemMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{[monthYearLabel(x.startDate), x.current ? "present" : monthYearLabel(x.endDate)].filter(Boolean).join(" – ")}</Text>
              {(x.bullets || []).map((b, i) => <Text key={i} style={s.bullet} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`• ${b}`}</Text>)}
            </View>
            <Pressable onPress={() => edit(x)} accessibilityRole="button" accessibilityLabel={`edit ${x.organisation || x.role}`} hitSlop={8} style={s.icon}><Ionicons name="create-outline" size={18} color={T.ink} /></Pressable>
            <Pressable onPress={() => remove(x)} accessibilityRole="button" accessibilityLabel={`delete ${x.organisation || x.role}`} hitSlop={8} style={s.icon}><Ionicons name="trash-outline" size={18} color={T.danger} /></Pressable>
          </View>
        </Card>
      ))}

      <Input label={c.org} value={form.organisation} onChangeText={(v) => set({ organisation: v })} placeholder={c.orgPh} maxLength={120} />
      <Input label={c.role} value={form.role} onChangeText={(v) => set({ role: v })} placeholder={c.rolePh} maxLength={120} />
      <MonthYearField label="from" value={form.startDate} onChange={(v) => set({ startDate: v })} />
      <MonthYearField label="to" value={form.endDate} onChange={(v) => set({ endDate: v })} present={form.current} onPresentChange={(v) => set({ current: v })} />
      <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>what did you do there? one short line each (optional)</Text>
      {coach && typed && <StoryPrompt section={kind} role={form.role} organisation={form.organisation} current={form.current} speak={coach.speak} onTap={coach.onTap} onTyped={coach.onTyped} onKeep={fillLines} />}
      {form.lines.map((l, i) => (
        <View key={i}>
          <Input value={l} onChangeText={(v) => set({ lines: form.lines.map((x, j) => (j === i ? v : x)) })} placeholder={i === 0 ? "e.g. organised the welcome week" : ""} maxLength={240} accessibilityLabel={`line ${i + 1}`} />
          {coach && !!l.trim() && <LiveCheck field="bullet" text={l} current={form.current} onFix={(v) => set({ lines: form.lines.map((x, j) => (j === i ? v : x)) })} />}
        </View>
      ))}
      {!!err && <Text style={s.err} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      <Button title={editing ? "save changes" : c.add} variant="secondary" onPress={() => add()} loading={busy} disabled={!typed} />
    </View>
  );
}

const s = StyleSheet.create({
  empty: { fontFamily: F.body, fontSize: 14, color: T.textFaint, marginBottom: 12 },
  item: { marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  itemTitle: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  itemMeta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  bullet: { fontFamily: F.body, fontSize: 13.5, color: T.ink, marginTop: 4 },
  icon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  q: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginBottom: 6 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginBottom: 8 },
});
