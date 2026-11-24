// app/src/screens/Resume/finish/PublicPageCard.js
// P3d public resume page (owner #1; flags resumeV2 + resumePublicPage): the student's controls on the share screen.
// Private by default: no page until the student turns it on. Then: the link (gettdc.pk/r/…), "open my page" (their
// own visits aren't counted), phone / e-mail on the page (off until chosen), "new link" (the old one stops working),
// and the real number of views (only the student sees it). The share screen's QR, copy and LinkedIn use the link.
//   <PublicPageCard resume onLink={(url | '') => …} />
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../ui/Button';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../../theme/tokens';
import { getPublicPage, setPublicPage, newPublicLink } from '../../../resume/finishApi';
import { funnel } from '../../../analytics/funnel';

export default function PublicPageCard({ resume, onLink, style }) {
  const id = resume?._id;
  const [page, setPage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const apply = (p) => { setPage(p); onLink?.(p?.on && p.url ? p.url : ''); };
  useEffect(() => {
    let live = true;
    if (!id) return undefined;
    getPublicPage(id).then((p) => { if (live) apply(p); }).catch(() => { if (live) { setPage(null); setMsg('your page settings didn\'t load. try again later.'); } });
    return () => { live = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn, event) => {
    setBusy(true); setMsg('');
    try { apply(await fn()); if (event) funnel(event, { refId: String(id) }); } catch { setMsg('not saved. check your connection and try again.'); } finally { setBusy(false); }
  };
  const toggle = (on) => run(() => setPublicPage(id, { on }), on ? 'resume_public_on' : 'resume_public_off');
  const newLink = () => Alert.alert('make a new link?', 'your old link stops working right away. anyone you sent it to won\'t be able to open it.', [
    { text: 'cancel', style: 'cancel' },
    { text: 'new link', style: 'destructive', onPress: () => run(() => newPublicLink(id), 'resume_public_new_link') },
  ]);

  if (!id) return null;
  const on = !!page?.on;
  return (
    <View style={[s.box, style]}>
      <View style={s.row}>
        <Ionicons name="globe-outline" size={20} color={T.ink} />
        <View style={{ flex: 1 }}>
          <Text style={s.title} maxFontSizeMultiplier={M}>your resume page</Text>
          <Text style={s.text} maxFontSizeMultiplier={M}>{on ? 'anyone with the link can see it. search engines can\'t.' : 'off: no one can see it. turn it on to get a link you can share.'}</Text>
        </View>
        <Switch value={on} onValueChange={toggle} disabled={busy || !page} accessibilityLabel="share my resume page" trackColor={{ false: T.sand, true: T.ink }} thumbColor={T.white} />
      </View>
      {on && (
        <>
          <Text style={s.link} selectable maxFontSizeMultiplier={M} accessibilityLabel={`your link: ${page.url}`}>{page.url}</Text>
          <Text style={s.views} maxFontSizeMultiplier={M}>{page.views === 1 ? '1 view' : `${page.views} views`} · your own visits aren't counted</Text>
          <View style={s.toggles}>
            <View style={s.toggle}>
              <Text style={s.tLabel} maxFontSizeMultiplier={M}>show my phone</Text>
              <Switch value={!!page.showPhone} onValueChange={(v) => run(() => setPublicPage(id, { showPhone: v }))} disabled={busy} accessibilityLabel="show my phone on the page" trackColor={{ false: T.sand, true: T.ink }} thumbColor={T.white} />
            </View>
            <View style={s.toggle}>
              <Text style={s.tLabel} maxFontSizeMultiplier={M}>show my e-mail</Text>
              <Switch value={!!page.showEmail} onValueChange={(v) => run(() => setPublicPage(id, { showEmail: v }))} disabled={busy} accessibilityLabel="show my e-mail on the page" trackColor={{ false: T.sand, true: T.ink }} thumbColor={T.white} />
            </View>
          </View>
          <Text style={s.hint} maxFontSizeMultiplier={M}>your street address and postal code never show. your city shows only if it's on your resume.</Text>
          <View style={s.actions}>
            <Button title="open my page" size="small" variant="secondary" full={false} onPress={() => Linking.openURL(page.selfUrl || page.url).catch(() => {})} accessibilityLabel="open my resume page" />
            <Button title="new link" size="small" variant="ghost" full={false} onPress={newLink} disabled={busy} accessibilityLabel="make a new link" />
          </View>
        </>
      )}
      {!!msg && <Text style={s.msg} accessibilityLiveRegion="polite" maxFontSizeMultiplier={M}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  text: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 2 },
  link: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink, marginTop: 10 },
  views: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4 },
  toggles: { marginTop: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  tLabel: { fontFamily: F.body, fontSize: 14, color: T.ink },
  hint: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  msg: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 6 },
});
