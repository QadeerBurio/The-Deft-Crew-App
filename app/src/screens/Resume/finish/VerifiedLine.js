// app/src/screens/Resume/finish/VerifiedLine.js
// P3d "verified by tdc" (flags resumeV2 + resumeVerified): the facts tdc checked (verified student, ambassador /
// founder credential with its verify link), and whether they show on this resume (settings.verifiedLine, off until the
// student adds it). Nothing at all when tdc has no verified fact for the student (no fake line).
//   <VerifiedLine resume updateResume suggest? />   suggest: the finish screen's one-tap "add it" instead of a switch
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../ui/Button';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../../theme/tokens';
import { verifiedFacts } from '../../../resume/finishApi';
import { funnel } from '../../../analytics/funnel';

export default function VerifiedLine({ resume, updateResume, suggest = false, style }) {
  const [facts, setFacts] = useState(null);
  const [on, setOn] = useState(resume?.settings?.verifiedLine === true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { setOn(resume?.settings?.verifiedLine === true); }, [resume?.settings?.verifiedLine]);
  useEffect(() => {
    let live = true;
    verifiedFacts().then((d) => { if (live) setFacts(Array.isArray(d?.facts) ? d.facts : []); }).catch(() => { if (live) setFacts([]); });
    return () => { live = false; };
  }, []);
  if (!resume?._id || !facts || !facts.length) return null;

  const set = async (value) => {
    setBusy(true); setMsg('');
    try {
      await updateResume(resume._id, { settings: { ...(resume.settings || {}), verifiedLine: value } });
      setOn(value);
      funnel(value ? 'resume_verified_added' : 'resume_verified_removed', { refId: String(resume._id) });
    } catch { setMsg('not saved. check your connection and try again.'); } finally { setBusy(false); }
  };

  const line = facts.map((f) => f.text).join(' · ');
  return (
    <View style={[s.box, style]}>
      <View style={s.row}>
        <Ionicons name="shield-checkmark" size={20} color={T.success} />
        <View style={{ flex: 1 }}>
          <Text style={s.title} maxFontSizeMultiplier={M}>verified by tdc</Text>
          <Text style={s.text} maxFontSizeMultiplier={M}>{line}</Text>
        </View>
        {!suggest && (
          <Switch value={on} onValueChange={set} disabled={busy} accessibilityLabel="show verified by tdc on my resume" trackColor={{ false: T.sand, true: T.ink }} thumbColor={T.white} />
        )}
      </View>
      <Text style={s.hint} maxFontSizeMultiplier={M}>checked by tdc, with a link employers can open. {on ? 'it\'s on your resume.' : 'add it to your resume and your page.'}</Text>
      {suggest && !on && <Button title="add it to my resume" size="small" variant="accent" full={false} onPress={() => set(true)} loading={busy} style={{ marginTop: 8 }} accessibilityLabel="add verified by tdc to my resume" />}
      {suggest && on && <Text style={s.added} maxFontSizeMultiplier={M}>added ✓</Text>}
      {!!msg && <Text style={s.msg} accessibilityLiveRegion="polite" maxFontSizeMultiplier={M}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  text: { fontFamily: F.body, fontSize: 13.5, color: T.ink, marginTop: 2 },
  hint: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 8 },
  added: { fontFamily: F.bodySemi, fontSize: 13, color: T.success, marginTop: 8 },
  msg: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 6 },
});
