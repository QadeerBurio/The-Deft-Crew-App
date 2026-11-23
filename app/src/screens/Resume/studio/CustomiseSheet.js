// app/src/screens/Resume/studio/CustomiseSheet.js
// P3-6 §3 customisation (flags resumeV2 + resumeTemplatesV2), previewed live on the student's own resume:
//   colour (12 palettes, or a custom colour that must be readable: ≥ 4.5:1 on white), font pair (8), size S/M/L,
//   density, margins, heading case and style, sections (move up / down, hide, rename), photo (the profile photo,
//   off by default; circle / rounded / square), date format, page size, link style. "reset" goes back to the
//   template's own look. Saved into customStyles (and the photo link) only on "save".
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../../../ui/Sheet';
import Chip from '../../../ui/Chip';
import Input from '../../../ui/Input';
import Button from '../../../ui/Button';
import { AuthContext } from '../../../context/AuthContext';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../../theme/tokens';
import { PALETTES, FONT_PAIRS, SECTION_KEYS, MODEL_DEFAULT_COLOURS } from '../../../services/templates/styles';
import { funnel } from '../../../analytics/funnel';
import TemplateThumb from './TemplateThumb';

export const STUDIO_KEYS = ['palette', 'fontPair', 'size', 'density', 'margins', 'headingCase', 'headingStyle', 'sectionOrder', 'hiddenSections', 'headings', 'photo', 'dateFormat', 'pageSize', 'linkStyle', 'accentColor'];
// the older colour keys can't be cleared (older apps send them); "no custom colour" = the model's defaults, which the
// five always rendered with and the library templates read as "not chosen" (their own colours show)
export const COLOUR_KEYS = ['headingColor', 'textColor'];
const NAMES = { summary: 'Summary', experience: 'Experience', education: 'Education', projects: 'Projects', activities: 'Leadership & Activities', volunteering: 'Volunteering', skills: 'Skills', awards: 'Awards', certifications: 'Certifications', languages: 'Languages', achievements: 'Achievements' };

// readable on white (WCAG AA for text)
export function contrastOnWhite(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 0;
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 1.05 / (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] + 0.05);
}
/** what "save" sends: the changed keys, null for a key the student reset */
export function changesFrom(start, draft) {
  const out = {};
  for (const k of [...STUDIO_KEYS, ...COLOUR_KEYS]) {
    const a = JSON.stringify(start[k] ?? null); const b = JSON.stringify(draft[k] ?? null);
    if (a !== b) out[k] = draft[k] ?? null;
  }
  return out;
}

export default function CustomiseSheet({ visible, onClose, resume, templateId, updateResume }) {
  const { user } = useContext(AuthContext) || {};
  const start = useMemo(() => ({ ...(resume?.customStyles || {}) }), [resume]);
  const [draft, setDraft] = useState(start);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (visible) { setDraft({ ...(resume?.customStyles || {}) }); setMsg(''); } }, [visible, resume]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const order = useMemo(() => {
    const chosen = Array.isArray(draft.sectionOrder) ? draft.sectionOrder : [];
    return [...chosen, ...SECTION_KEYS.filter((k) => !chosen.includes(k))];
  }, [draft.sectionOrder]);
  const hidden = new Set(draft.hiddenSections || []);
  const move = (k, dir) => { const o = order.slice(); const i = o.indexOf(k); const j = i + dir; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; set({ sectionOrder: o }); };
  const photoUrl = /^https:\/\//i.test(String(user?.profileImage || '')) ? user.profileImage : '';
  const previewResume = useMemo(() => (draft.photo?.on && photoUrl ? { ...resume, personalInfo: { ...(resume?.personalInfo || {}), photoUrl } } : resume), [resume, draft.photo, photoUrl]);
  const W = Dimensions.get('window').width - 40;

  const applyCustom = () => {
    const hex = custom.trim().startsWith('#') ? custom.trim() : `#${custom.trim()}`;
    const r = contrastOnWhite(hex);
    if (!r) return setMsg('type a colour like #1E6B3A.');
    if (r < 4.5) return setMsg(`too light to read on white (${r.toFixed(1)}:1, needs 4.5:1). pick a darker colour.`);
    setMsg(''); set({ palette: 'custom', accentColor: hex.toUpperCase() });
  };

  const save = async () => {
    const changes = changesFrom(start, draft);
    if (!Object.keys(changes).length) return onClose?.();
    setBusy(true); setMsg('');
    try {
      const patch = { customStyles: changes };
      if (changes.photo !== undefined) patch.personalInfo = { photoUrl: draft.photo?.on ? photoUrl : '' };
      await updateResume(resume._id, patch);
      Object.keys(changes).forEach((k) => funnel(`template_customised_${k.toLowerCase()}`, { refId: String(resume._id) }));
      onClose?.();
    } catch { setMsg('not saved. check your connection and try again.'); } finally { setBusy(false); }
  };
  // the template's own look, completely: the studio keys go (save sends null for each) and the colours go back to the
  // "no custom colour" defaults (a typed custom colour included)
  const reset = () => { setDraft({ ...Object.fromEntries(Object.entries(start).filter(([k]) => !STUDIO_KEYS.includes(k))), ...MODEL_DEFAULT_COLOURS }); setCustom(''); setMsg(''); };

  const Row = ({ title, children }) => (<View style={s.row}><Text style={s.label} maxFontSizeMultiplier={M}>{title}</Text><View style={s.chips}>{children}</View></View>);
  return (
    <Sheet visible={visible} onClose={onClose} title="customise" maxHeight="92%">
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <TemplateThumb resume={previewResume} templateId={templateId} styles={draft} width={Math.min(W, 300)} height={Math.min(W, 300) * 1.414} />
        </View>
        <Row title="colour">
          {PALETTES.map((p) => (
            <Pressable key={p.id} onPress={() => set({ palette: p.id })} accessibilityRole="button" accessibilityLabel={`${p.name} colour`} accessibilityState={{ selected: draft.palette === p.id }} style={[s.swatch, { backgroundColor: p.accent }, draft.palette === p.id && s.swatchOn]}>
              {draft.palette === p.id ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </Pressable>
          ))}
        </Row>
        <View style={s.customRow}>
          <View style={{ flex: 1 }}><Input value={custom} onChangeText={setCustom} placeholder="#1E6B3A" maxLength={7} autoCapitalize="characters" accessibilityLabel="a custom colour" /></View>
          <Button title="use colour" size="small" variant="secondary" full={false} onPress={applyCustom} />
        </View>
        {!!msg && <Text style={s.msg} accessibilityLiveRegion="polite" maxFontSizeMultiplier={M}>{msg}</Text>}
        <Row title="font">{FONT_PAIRS.map((p) => <Chip key={p.id} label={p.name} selected={draft.fontPair === p.id} onPress={() => set({ fontPair: p.id })} />)}</Row>
        <Row title="size">{[['S', 'small'], ['M', 'medium'], ['L', 'large']].map(([v, l]) => <Chip key={v} label={l} selected={(draft.size || 'M') === v} onPress={() => set({ size: v })} />)}</Row>
        <Row title="spacing">{['compact', 'normal', 'airy'].map((v) => <Chip key={v} label={v} selected={(draft.density || 'normal') === v} onPress={() => set({ density: v })} />)}</Row>
        <Row title="margins">{['narrow', 'normal', 'wide'].map((v) => <Chip key={v} label={v} selected={(draft.margins || 'normal') === v} onPress={() => set({ margins: v })} />)}</Row>
        <Row title="headings">
          <Chip label="AA" selected={draft.headingCase !== 'title'} onPress={() => set({ headingCase: 'upper' })} />
          <Chip label="Aa" selected={draft.headingCase === 'title'} onPress={() => set({ headingCase: 'title' })} />
          {['rule', 'bar', 'underline', 'none'].map((v) => <Chip key={v} label={v} selected={draft.headingStyle === v} onPress={() => set({ headingStyle: v })} />)}
        </Row>
        <Text style={s.label} maxFontSizeMultiplier={M}>sections</Text>
        {order.map((k, i) => (
          <View key={k} style={s.secRow}>
            <Switch value={!hidden.has(k)} onValueChange={(on) => set({ hiddenSections: on ? [...hidden].filter((x) => x !== k) : [...hidden, k] })} accessibilityLabel={`show ${NAMES[k]}`} trackColor={{ true: T.yellow, false: T.line }} thumbColor={T.white} />
            <View style={{ flex: 1 }}><Input value={(draft.headings || {})[k] ?? ''} onChangeText={(v) => set({ headings: { ...(draft.headings || {}), [k]: v } })} placeholder={NAMES[k]} maxLength={40} accessibilityLabel={`name for ${NAMES[k]}`} /></View>
            <Pressable onPress={() => move(k, -1)} disabled={i === 0} style={s.arrow} accessibilityRole="button" accessibilityLabel={`move ${NAMES[k]} up`}><Ionicons name="chevron-up" size={18} color={i === 0 ? T.line : T.ink} /></Pressable>
            <Pressable onPress={() => move(k, 1)} disabled={i === order.length - 1} style={s.arrow} accessibilityRole="button" accessibilityLabel={`move ${NAMES[k]} down`}><Ionicons name="chevron-down" size={18} color={i === order.length - 1 ? T.line : T.ink} /></Pressable>
          </View>
        ))}
        <Row title="photo">
          <Chip label="no photo" selected={!draft.photo?.on} onPress={() => set({ photo: { on: false, shape: draft.photo?.shape || 'circle' } })} />
          {photoUrl ? ['circle', 'rounded', 'square'].map((v) => <Chip key={v} label={v} selected={!!draft.photo?.on && draft.photo.shape === v} onPress={() => set({ photo: { on: true, shape: v } })} />) : null}
        </Row>
        <Text style={s.hint} maxFontSizeMultiplier={M}>{photoUrl ? 'uses your profile photo. many job portals remove photos: leave it off for online applications.' : 'add a profile photo in your profile to use one here.'}</Text>
        <Row title="dates">{[['mon-yyyy', 'Jan 2026'], ['mm/yyyy', '01/2026']].map(([v, l]) => <Chip key={v} label={l} selected={(draft.dateFormat || 'mon-yyyy') === v} onPress={() => set({ dateFormat: v })} />)}</Row>
        <Row title="page">{[['A4', 'A4'], ['Letter', 'US Letter']].map(([v, l]) => <Chip key={v} label={l} selected={(draft.pageSize || 'A4') === v} onPress={() => set({ pageSize: v })} />)}</Row>
        <Row title="links">{[['full', 'linkedin.com/in/you'], ['short', 'LinkedIn']].map(([v, l]) => <Chip key={v} label={l} selected={(draft.linkStyle || 'full') === v} onPress={() => set({ linkStyle: v })} />)}</Row>
        <Button title="save" variant="accent" onPress={save} loading={busy} disabled={busy} style={{ marginTop: 16 }} accessibilityLabel="save these changes" />
        <Button title="reset to the template's look" variant="ghost" onPress={reset} disabled={busy} />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { marginTop: 12 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginBottom: 6, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: T.ink },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  msg: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow: { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 4 },
});
