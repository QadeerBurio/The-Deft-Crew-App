// app/src/screens/Resume/coach/MemoryJoggers.js
// P3-4b §2: "students often forget these. tap any you've done": tuition, family business, freelancing, a page they
// run, event volunteering, a team, a society role, a hackathon, the final-year project, an online course, an NGO
// drive, a part-time job, content creation, class rep (CS sees hackathon / GitHub first, BBA a business plan
// competition). A tap opens two quick questions and becomes a written entry in the right section; the lines come
// from the coach (fact-checked) and are kept only if the student keeps them.
//   programme; sections: which sections this step offers; io: { ensureResume, updateResume }; onAdded(section)
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Chip from "../../../ui/Chip";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Card from "../../../ui/Card";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { joggersFor, coachCall } from "../../../resume/coach";
import { saveList, clean } from "../steps/sectionList";
import SuggestionList from "./SuggestionList";

/** the entry a jogger makes, in its section's shape */
export function entryFor(j, { name, role, lines = [] }) {
  const n = clean(name, 150);
  const r = clean(role, 120);
  switch (j.section) {
    case "workExperience": return { company: n, position: r, achievements: lines, current: false };
    case "activities": case "volunteering": return { organisation: n, role: r, bullets: lines, current: false };
    case "projects": return { name: n, description: lines.join(" ") };
    case "awards": return { title: n };
    case "certifications": return { name: n };
    default: return null;
  }
}

export default function MemoryJoggers({ programme, sections, io, onAdded, onTap, onTyped }) {
  const list = joggersFor(programme, sections);
  const [open, setOpen] = useState(null); // the jogger
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [did, setDid] = useState([]);
  const [lines, setLines] = useState(null);
  const [kept, setKept] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [added, setAdded] = useState([]);

  const pick = (j) => { onTap?.(); setOpen(j); setName(""); setRole(j.role || ""); setDid([]); setLines(null); setKept([]); setMsg(""); };
  const save = async (kept = []) => {
    const e = entryFor(open, { name, role, lines: kept });
    if (!e) return;
    setBusy(true);
    try {
      await saveList(io, open.section, (l) => [...l, e]);
      setAdded((a) => [...a, open.key]);
      onAdded?.(open.section);
      setOpen(null);
    } catch { setMsg("not saved. check your connection and try again."); } finally { setBusy(false); }
  };
  const next = async () => {
    if (!name.trim()) return;
    if (!did.length) return save([]);
    setBusy(true);
    try {
      const r = await coachCall("bullets", { section: open.section, role, organisation: name, did });
      if (r?.suggestions?.length) setLines(r.suggestions); else await save(did);
    } catch { await save(did); } finally { setBusy(false); } // the coach unavailable: the student's own words
  };

  return (
    <View style={s.wrap}>
      <Text style={s.h} maxFontSizeMultiplier={MAX_FONT_SCALE}>students often forget these. tap any you've done</Text>
      <View style={s.chips}>{list.map((j) => <Chip key={j.key} label={added.includes(j.key) ? `${j.label} ✓` : j.label} selected={open?.key === j.key} onPress={() => pick(j)} />)}</View>
      {open && (
        <Card style={s.card}>
          <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>{open.ask}</Text>
          <Input value={name} onChangeText={(v) => { onTyped?.(v.length - name.length); setName(v); }} maxLength={150} accessibilityLabel={open.ask} />
          {!!open.role && <Input label="your role" value={role} onChangeText={setRole} maxLength={120} />}
          {open.did.length > 0 && (
            <>
              <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>what did you do?</Text>
              <View style={s.chips}>{open.did.map((d) => <Chip key={d} label={d} selected={did.includes(d)} onPress={() => { onTap?.(); setDid((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d])); }} />)}</View>
            </>
          )}
          {!!msg && <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{msg}</Text>}
          {lines ? (
            <>
              <SuggestionList key={lines.join("|")} items={lines} onKeep={(k) => setKept((x) => [...x, ...k])} />
              <Button title={kept.length ? `add it with ${kept.length} ${kept.length === 1 ? "line" : "lines"}` : "add it without lines"} variant="accent" onPress={() => save(kept)} loading={busy} disabled={busy} accessibilityLabel={`save ${open.label}`} />
            </>
          ) : (
            <Button title="add it" variant="accent" onPress={next} loading={busy} disabled={!name.trim() || busy} accessibilityLabel={`add ${open.label}`} />
          )}
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  h: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  card: { marginTop: 4 },
  q: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, marginBottom: 6 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginBottom: 8 },
});
