// CareerInvites.js: "invites to apply" in the careers hub (CareerHub.js), only when FLAG_CAREER_MATCHING is on for the
// student. The switch "let employers invite me to apply" (off by default; saved on the professional profile) and the
// invites employers sent after seeing ONLY the student's skills (never their name). The student decides: view the
// job (Career, openJobId, where they can apply), or "not interested". With the flag on the card always shows (the
// switch even with no invites; "couldn't load" with try again on an error). Flag off: nothing.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { matchingEnabled, myInvites, respondInvite, setDiscoverable } from "../api/matchingApi";
import useFlag from "../hooks/useFlag";

const STATUS = { sent: "new", interested: "you're interested", declined: "not interested", applied: "you applied", expired: "closed" };

export default function CareerInvites({ navigation, refreshKey }) {
  const on = useFlag("careerMatching", matchingEnabled);
  const [state, setState] = useState(null); // null: loading; { discoverable, invites } | { error: true }
  const [saving, setSaving] = useState(false);
  const load = async (live = { on: true }) => {
    try { const d = await myInvites(); if (live.on) setState({ discoverable: !!d?.discoverable, invites: d?.invites || [] }); }
    catch (e) { console.warn("[career] invites not loaded:", e?.message); if (live.on) setState({ error: true, discoverable: false, invites: [] }); }
  };
  useEffect(() => {
    if (on !== true) { setState(null); return undefined; }
    const live = { on: true };
    load(live);
    return () => { live.on = false; };
  }, [on, refreshKey]);
  if (on !== true) return null;
  if (!state || state.error) {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="mail-unread-outline" size={18} color={T.ink} />
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">invites to apply</Text>
        </View>
        <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{state ? "couldn't load your invites." : "loading your invites…"}</Text>
        {state && (
          <TouchableOpacity style={[styles.btn, { alignSelf: "flex-start", marginTop: 8 }]} onPress={() => { setState(null); load(); }} accessibilityRole="button" accessibilityLabel="try loading invites again">
            <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>try again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const toggle = async (on) => {
    setSaving(true);
    try { const now = await setDiscoverable(on); setState((s) => ({ ...s, discoverable: now })); }
    catch { Alert.alert("couldn't save", "try again in a moment."); }
    finally { setSaving(false); }
  };
  const answer = async (inv, response) => {
    try {
      await respondInvite(inv.id, response);
      setState((s) => ({ ...s, invites: s.invites.map((x) => (x.id === inv.id ? { ...x, status: response } : x)) }));
      if (response === "interested") navigation?.navigate?.("Career", { openJobId: inv.job.id });
    } catch (e) { Alert.alert("couldn't answer", e.message); }
  };
  const open = state.invites.filter((i) => i.status === "sent" || i.status === "interested");

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="mail-unread-outline" size={18} color={T.ink} />
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">invites to apply</Text>
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>let employers invite me to apply</Text>
        <Switch value={!!state.discoverable} onValueChange={toggle} disabled={saving} accessibilityLabel="let employers invite me to apply" accessibilityHint="employers see your skills only, never your name, until you apply" />
      </View>
      <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>employers see your skills only, never your name, photo, university or contacts. you decide whether to apply.</Text>
      {state.invites.length === 0 && <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{state.discoverable ? "no invites yet." : "turn it on to get invites from employers whose jobs match your skills."}</Text>}
      {state.invites.map((inv) => (
        <View key={inv.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.job} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{inv.job.title}</Text>
            <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{[inv.job.companyName, inv.job.location].filter(Boolean).join(" · ")} · {STATUS[inv.status] || inv.status}</Text>
          </View>
          {(inv.status === "sent" || inv.status === "interested") && (
            <>
              <TouchableOpacity style={styles.btn} onPress={() => answer(inv, "interested")} accessibilityRole="button" accessibilityLabel={`view ${inv.job.title}${inv.job.companyName ? ` at ${inv.job.companyName}` : ""}`}>
                <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>view job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnQuiet]} onPress={() => answer(inv, "declined")} accessibilityRole="button" accessibilityLabel={`not interested in ${inv.job.title}`}>
                <Text style={[styles.btnText, { color: T.ink }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>not interested</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}
      {open.length > 0 && <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{open.length} open invite{open.length === 1 ? "" : "s"}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 18, backgroundColor: T.white, borderWidth: 1, borderColor: T.line },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: F.heading, fontSize: 17, color: T.ink },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, marginTop: 6 },
  body: { fontFamily: F.body, fontSize: 14.5, color: T.ink, flex: 1, paddingRight: 10 },
  note: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line, marginTop: 6 },
  job: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  sub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  btn: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: T.ink, justifyContent: "center" },
  btnQuiet: { backgroundColor: T.white, borderWidth: 1, borderColor: T.line },
  btnText: { fontFamily: F.bodyBold, fontSize: 13, color: T.white },
});
