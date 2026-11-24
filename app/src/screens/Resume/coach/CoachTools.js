// app/src/screens/Resume/coach/CoachTools.js
// P3-4b done-for-you (flags resumeV2 + resumeCoach), each previewed, nothing saved until the student says so:
//   CoachSummary   "write my summary": 3 options from their programme, target role and strongest facts
//   CoachSkills    "suggest my skills": hard skills to tap in; soft skills each with where they showed it
//   CoachBar       "fix everything" (the server's auto-fixes, listed before / after, applied in one tap) and "fit on
//                  one page" (only when it doesn't fit: trims to 3 lines per entry, before / after)
//   ReadyCheck     "ready to send?": 6 checks before the preview / download; advises, never blocks
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Button from "../../../ui/Button";
import Chip from "../../../ui/Chip";
import Sheet from "../../../ui/Sheet";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { coachCall, autofixPreview, checkField, readyChecklist } from "../../../resume/coach";
import { pageEstimate } from "../../../resume/resumeV2";
import { funnel } from "../../../analytics/funnel";
import { saveList } from "../steps/sectionList";
import SuggestionList from "./SuggestionList";

const RULE_NAMES = { order: "newest first", capitals: "capital letters", bullets: "the same line endings", title: "no 'CV' / 'Resume' as a title", address: "home address removed (your city stays)", summary: "'references available' removed", empty: "empty entries removed" };
const show = (v) => (Array.isArray(v) ? v.join(" · ") : String(v == null ? "" : v)) || "(empty)";
const errText = (e) => (e?.response?.status === 429 ? "that's a lot of requests. try again in a few minutes." : "the coach couldn't help right now. try again.");

export function CoachSummary({ programme, university, targetRole, strengths = [], skills = [], onPick }) {
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr("");
    try { setOut(await coachCall("summary", { programme, university, targetRole, strengths, skills })); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <View style={s.box}>
      <Button title="write my summary" variant="accent" onPress={run} loading={busy} disabled={busy} accessibilityLabel="write my summary" />
      {!!err && <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      {(out?.questions || []).map((q) => <Text key={q.key} style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{q.text}</Text>)}
      {!!out?.suggestions?.length && <SuggestionList key={out.suggestions.join("|")} items={out.suggestions} single keepLabel="use this" onKeep={(t) => onPick?.(t)} />}
    </View>
  );
}

export function CoachSkills({ resume, programme, targetRole, io }) {
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState([]);
  const have = (Array.isArray(resume?.skills) ? resume.skills : []).map((x) => String(typeof x === "string" ? x : x?.name || ""));
  const run = async () => {
    setBusy(true); setErr("");
    try {
      setOut(await coachCall("skills", { programme, targetRole, current: have, projects: resume?.projects || [], activities: [...(resume?.activities || []), ...(resume?.volunteering || [])], experience: resume?.workExperience || [] }));
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const add = async (name, category) => {
    if (added.includes(name)) return;
    setAdded((a) => [...a, name]);
    try { await saveList(io, "skills", (l) => (l.some((x) => String(x?.name || x).toLowerCase() === name.toLowerCase()) ? l : [...l, { name, level: "Intermediate", category }])); } catch { setAdded((a) => a.filter((x) => x !== name)); setErr("not saved. try again."); }
  };
  return (
    <View style={s.box}>
      <Button title="suggest my skills" variant="accent" onPress={run} loading={busy} disabled={busy} accessibilityLabel="suggest my skills" />
      {!!err && <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      {(out?.questions || []).map((q) => <Text key={q.key} style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{q.text}</Text>)}
      {!!out?.suggestions?.length && (
        <>
          <Text style={s.h} maxFontSizeMultiplier={MAX_FONT_SCALE}>tap the ones you really have</Text>
          <View style={s.chips}>{out.suggestions.map((n) => <Chip key={n} label={added.includes(n) ? `${n} ✓` : n} selected={added.includes(n)} onPress={() => add(n, "Technical")} />)}</View>
        </>
      )}
      {!!out?.soft?.length && (
        <>
          <Text style={s.h} maxFontSizeMultiplier={MAX_FONT_SCALE}>soft skills you've shown</Text>
          {out.soft.map((x) => (
            <View key={x.skill} style={s.softRow}>
              <Chip label={added.includes(x.skill) ? `${x.skill} ✓` : x.skill} selected={added.includes(x.skill)} onPress={() => add(x.skill, "Soft")} />
              <Text style={s.where} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`shown at ${x.where}`}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// apply "fit" changes: path "workExperience[2].achievements" → the latest list with that entry's lines replaced
const PATH = /^(\w+)\[(\d+)\]\.(\w+)$/;
export function applyFit(resume, changes) {
  const patch = {};
  for (const c of changes) {
    const m = PATH.exec(c.path || "");
    if (!m) continue;
    const [, sec, i, key] = m;
    const list = patch[sec] || JSON.parse(JSON.stringify(resume?.[sec] || []));
    if (list[Number(i)]) list[Number(i)][key] = c.after;
    patch[sec] = list;
  }
  return patch;
}

export function CoachBar({ resume, io, onChat }) {
  const [sheet, setSheet] = useState(null); // { kind: "fix" | "fit", changes, patch? }
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const est = pageEstimate(resume || {});
  const fixAll = async () => {
    if (!resume?._id) { setMsg("save something first, then we can tidy it."); return; }
    setBusy("fix"); setMsg("");
    try {
      const r = await autofixPreview(resume._id);
      if (!r?.changes?.length) setMsg("nothing to fix. it's tidy.");
      else setSheet({ kind: "fix", changes: r.changes, patch: r.patch });
    } catch (e) { setMsg(errText(e)); } finally { setBusy(""); }
  };
  const fit = async () => {
    setBusy("fit"); setMsg("");
    try {
      const r = await coachCall("fit", { resume });
      if (!r?.suggestions?.length) setMsg("nothing to trim automatically: shorten a few long lines, or pick Compact.");
      else setSheet({ kind: "fit", changes: r.suggestions });
    } catch (e) { setMsg(errText(e)); } finally { setBusy(""); }
  };
  const apply = async () => {
    const patch = sheet.kind === "fix" ? sheet.patch : applyFit(resume, sheet.changes);
    setBusy("apply");
    try {
      const r = await io.ensureResume();
      await io.updateResume(r._id, patch);
      if (sheet.kind === "fix") funnel("resume_fix_everything", { refId: String(r._id), changes: sheet.changes.length });
      setSheet(null); setMsg(sheet.kind === "fix" ? "fixed." : "trimmed.");
    } catch { setMsg("not saved. check your connection and try again."); } finally { setBusy(""); }
  };
  return (
    <View style={s.bar}>
      <View style={s.row}>
        <Button title="fix everything" variant="secondary" size="small" full={false} onPress={fixAll} loading={busy === "fix"} disabled={!!busy} accessibilityLabel="fix everything: preview the tidy-ups" />
        {!est.fits && <Button title="fit on one page" variant="secondary" size="small" full={false} onPress={fit} loading={busy === "fit"} disabled={!!busy} />}
        {onChat && <Button title="build it by chatting" variant="ghost" size="small" full={false} onPress={onChat} />}
      </View>
      {!!msg && <Text style={s.note} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{msg}</Text>}
      <Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheet?.kind === "fit" ? "fit on one page" : "fix everything"}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sheet?.kind === "fit" ? "we'd keep 3 lines per entry (the ones with numbers first):" : "here's what we'd change. nothing is saved until you tap apply."}</Text>
          {(sheet?.changes || []).slice(0, 30).map((c, i) => (
            <View key={i} style={s.change}>
              <Text style={s.rule} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sheet.kind === "fit" ? `${c.path} · about ${c.linesSaved} lines saved` : RULE_NAMES[c.rule] || c.rule}</Text>
              <Text style={s.before} maxFontSizeMultiplier={MAX_FONT_SCALE}>{show(c.before)}</Text>
              <Text style={s.after} maxFontSizeMultiplier={MAX_FONT_SCALE}>{show(c.after)}</Text>
            </View>
          ))}
          <Button title="apply" variant="accent" onPress={apply} loading={busy === "apply"} disabled={!!busy} style={{ marginTop: 8 }} accessibilityLabel="apply these changes" />
          <Button title="not now" variant="ghost" onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </View>
  );
}

/** the spelling issues left in the summary and the lines (the server caches each text) */
export async function spellingLeft(resume) {
  const texts = [resume?.professionalSummary?.summary, ...["workExperience", "activities", "volunteering"].flatMap((k) => (resume?.[k] || []).flatMap((e) => e?.achievements || e?.bullets || []))].map((t) => String(t || "").trim()).filter((t) => t.length >= 15).slice(0, 12);
  let n = 0;
  for (const t of texts) { try { n += (await checkField(t === resume?.professionalSummary?.summary ? "summary" : "bullet", t)).filter((i) => i.code === "spelling").length; } catch { /* offline: not counted */ } }
  return n;
}

export function ReadyCheck({ visible, items = [], loading, onContinue, onClose }) {
  const done = items.filter((i) => i.ok).length;
  return (
    <Sheet visible={visible} onClose={onClose} title="ready to send?">
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }} accessibilityLabel={`ready to send: ${done} of ${items.length} done`}>
        {loading ? <Text style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>checking…</Text> : items.map((i) => (
          <View key={i.key} style={s.checkRow}>
            <Text style={[s.mark, { color: i.ok ? T.success : T.textFaint }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{i.ok ? "✓" : "○"}</Text>
            <Text style={s.checkText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{i.text}</Text>
          </View>
        ))}
        <Text style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>this is advice: you can continue with items open.</Text>
        <Button title="continue" variant="accent" onPress={onContinue} disabled={loading} style={{ marginTop: 8 }} accessibilityLabel="continue to the preview" />
        <Button title="keep editing" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
export { readyChecklist };

const s = StyleSheet.create({
  box: { marginTop: 12, marginBottom: 8 },
  bar: { marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  h: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, marginTop: 10, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  softRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  where: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, flex: 1 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 6 },
  note: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 6 },
  change: { borderBottomWidth: 1, borderBottomColor: T.lineSoft, paddingVertical: 8 },
  rule: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.ink },
  before: { fontFamily: F.body, fontSize: 13, color: T.textFaint, textDecorationLine: "line-through", marginTop: 2 },
  after: { fontFamily: F.body, fontSize: 13, color: T.ink, marginTop: 2 },
  checkRow: { flexDirection: "row", gap: 10, minHeight: 32, alignItems: "center" },
  mark: { fontFamily: F.bodyBold, fontSize: 16, width: 18 },
  checkText: { fontFamily: F.body, fontSize: 14, color: T.ink, flex: 1 },
});
