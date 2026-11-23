// app/src/screens/Resume/coach/StoryPrompt.js
// P3-4 tap mode: "answer, don't write". For one entry: what did you do there? (chips + other), roughly how many /
// how big (optional), one thing you're proud of (optional) → "make my bullets" → 2–3 lines to keep, edit or remove.
// The server writes only from these answers (fact-checked); with no number given it asks for one, never guesses.
//   section: activities | volunteering | workExperience | projects;  onKeep(lines)
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Chip from "../../../ui/Chip";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { coachCall, DID_CHIPS } from "../../../resume/coach";
import SuggestionList from "./SuggestionList";
import HoldToTalk from "./HoldToTalk";

export default function StoryPrompt({ section = "activities", role, organisation, current, onKeep, onTyped, onTap, speak = false }) {
  const chips = DID_CHIPS[section] || DID_CHIPS.activities;
  const [did, setDid] = useState([]);
  const [other, setOther] = useState("");
  const [size, setSize] = useState("");
  const [proud, setProud] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null); // { suggestions, questions }
  const [err, setErr] = useState("");
  const toggle = (c) => { onTap?.(); setDid((d) => (d.includes(c) ? d.filter((x) => x !== c) : [...d, c])); };
  const typed = (setter) => (v) => { onTyped?.(v.length); setter(v); };

  const make = async () => {
    setBusy(true); setErr("");
    try {
      const r = await coachCall("bullets", { section, role, organisation, current: !!current, did: [...did, ...other.split(",").map((x) => x.trim()).filter(Boolean)], size, proud });
      setOut(r);
    } catch (e) {
      setErr(e?.response?.status === 429 ? "that's a lot of requests. try again in a few minutes." : "the coach couldn't help right now. you can still write the lines yourself.");
    } finally { setBusy(false); }
  };
  const ready = did.length > 0 || !!other.trim() || !!proud.trim();

  return (
    <View style={s.wrap} accessibilityLabel="answer a few questions and we write the lines">
      <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>what did you do there?</Text>
      <View style={s.chips}>{chips.map((c) => <Chip key={c} label={c} selected={did.includes(c)} onPress={() => toggle(c)} />)}</View>
      <Input value={other} onChangeText={typed(setOther)} placeholder="other… (optional)" maxLength={160} accessibilityLabel="something else you did" />
      <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>roughly how many people, or how big? (optional)</Text>
      <Input value={size} onChangeText={typed(setSize)} placeholder="e.g. 200 people, 5 events" maxLength={60} accessibilityLabel="how many or how big" />
      <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>one thing you're proud of? (optional)</Text>
      <Input value={proud} onChangeText={typed(setProud)} placeholder="one line" maxLength={240} accessibilityLabel="one thing you're proud of" />
      {speak && <HoldToTalk onText={(t) => { setProud((p) => (p ? `${p} ${t}` : t)); }} />}
      {!!err && <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      <Button title="make my bullets" variant="accent" onPress={make} loading={busy} disabled={!ready || busy} accessibilityLabel="make my bullets" />
      {!!out?.suggestions?.length && <SuggestionList key={out.suggestions.join("|")} items={out.suggestions} onKeep={(lines) => { onTap?.(); onKeep?.(lines); }} />}
      {!!out && !out.suggestions?.length && !out.questions?.length && <Text style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>nothing we could write from that without guessing. add a bit more about what you did.</Text>}
      {(out?.questions || []).map((q) => <Text key={q.key} style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{q.text}</Text>)}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: T.yellowSoft },
  q: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, marginBottom: 6, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginBottom: 8 },
  note: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 6 },
});
