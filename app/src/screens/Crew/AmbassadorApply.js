// app/src/screens/Crew/AmbassadorApply.js
// Plan P2-3 (flag ambassadorV2): the in-app application. Name and university come from the profile (not typed again);
// why (chips and / or a line), campus groups, a handle. The draft stays on the phone until it's sent. The status
// comes from the server (pending / approved / rejected with the note and when to apply again). Sent → the old
// "applied" key is written too, so the crew screen shows "applied" as it did with the Google Form.
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import Screen from "../../ui/Screen";
import ScreenHeader from "../../ui/ScreenHeader";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { SkeletonBlock } from "../../ui/Skeleton";
import { AuthContext } from "../../context/AuthContext";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { WHY_CHIPS, myApplication, sendApplication, applicationBody, readDraft, saveDraft, markApplied, statusLine, canApply, crewError } from "../../crew/crew";

const EMPTY = { why: "", whyChips: [], groups: "", handle: "" };

export default function AmbassadorApply({ navigation }) {
  const { user } = useContext(AuthContext) || {};
  const userId = user?._id || user?.id || null;
  const [st, setSt] = useState(undefined); // undefined: loading
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [status, draft] = await Promise.all([myApplication().catch(() => null), readDraft(userId)]);
      if (!live) return;
      setSt(status);
      if (draft) setForm({ ...EMPTY, ...draft });
      loaded.current = true;
    })();
    return () => { live = false; };
  }, [userId]);

  const update = useCallback((patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (loaded.current) saveDraft(userId, next);
      return next;
    });
  }, [userId]);

  const toggleChip = (c) => update({ whyChips: form.whyChips.includes(c) ? form.whyChips.filter((x) => x !== c) : [...form.whyChips, c] });

  const body = applicationBody(form);
  const ready = body.why.length >= 3 || body.whyChips.length > 0;
  const university = user?.university?.name || user?.universityName || "";

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await sendApplication(body);
      await markApplied(userId);
      setSt(res);
    } catch (e) {
      setErr(crewError(e, "your application didn't send. try again."));
    } finally {
      setBusy(false);
    }
  };

  if (st === undefined) {
    return (
      <Screen>
        <ScreenHeader title="apply" />
        <View style={s.body}><SkeletonBlock height={120} radius={22} /><SkeletonBlock height={52} radius={16} style={{ marginTop: 14 }} /></View>
      </Screen>
    );
  }

  if (!canApply(st)) {
    return (
      <Screen>
        <ScreenHeader title="your application" />
        <View style={s.body}>
          <Card>
            <Text style={s.statusTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{st?.status === "approved" ? "you're in." : st?.status === "pending" ? "sent." : "not this time."}</Text>
            <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{statusLine(st)}</Text>
          </Card>
          {st?.status === "approved" && <Button title="open your hub" onPress={() => navigation.navigate("AmbassadorHub")} style={{ marginTop: 16 }} />}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="apply" />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {st?.status === "rejected" && <Text style={[s.line, { marginBottom: 12 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{statusLine(st)}</Text>}
        <Card style={{ marginBottom: 16 }}>
          <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>you</Text>
          <Text style={s.value} maxFontSizeMultiplier={MAX_FONT_SCALE}>{user?.name || ""}</Text>
          <Text style={[s.label, { marginTop: 10 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>university</Text>
          <Text style={s.value} maxFontSizeMultiplier={MAX_FONT_SCALE}>{university || "add your university to your profile first."}</Text>
        </Card>

        <Text style={s.q} maxFontSizeMultiplier={MAX_FONT_SCALE}>why you?</Text>
        <View style={s.chips}>
          {WHY_CHIPS.map((c) => (
            <Chip key={c} label={c} selected={form.whyChips.includes(c)} onPress={() => toggleChip(c)} />
          ))}
        </View>
        <Input label="anything else (optional)" value={form.why} onChangeText={(v) => update({ why: v })} multiline maxLength={600} placeholder="one line is enough" />
        <Input label="campus groups or societies (optional)" value={form.groups} onChangeText={(v) => update({ groups: v })} placeholder="e.g. ieee, debating society" maxLength={300} />
        <Input label="instagram or tiktok handle (optional)" value={form.handle} onChangeText={(v) => update({ handle: v })} autoCapitalize="none" placeholder="@you" maxLength={40} />

        {!!err && <Text style={s.err} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{err.message}</Text>}
        <Button title="send application" variant="accent" onPress={submit} loading={busy} disabled={!ready || !university} style={{ marginTop: 8 }} />
        <Text style={s.small} maxFontSizeMultiplier={MAX_FONT_SCALE}>we reply within 7 working days.</Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textFaint },
  value: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink, marginTop: 2 },
  q: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  line: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted },
  statusTitle: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginBottom: 6 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 8 },
  small: { fontFamily: F.body, fontSize: 12, color: T.textFaint, textAlign: "center", marginTop: 10 },
});
