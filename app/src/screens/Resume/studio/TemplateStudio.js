// app/src/screens/Resume/studio/TemplateStudio.js
// P3-6 template studio (flags resumeV2 + resumeTemplatesV2): "recommended for you" first (3, with the reason), then
// the gallery by collection with the student's own resume in every card, an "ATS-safe only" filter, a badge on each
// (ATS-safe: tested on the real PDF), long-press two to compare them side by side, "customise" and "use this
// template". Content never changes when the template does. Only the five and the templates the owner approved show.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../../context/ResumeContext';
import ScreenHeader from '../../../ui/ScreenHeader';
import Chip from '../../../ui/Chip';
import Button from '../../../ui/Button';
import useAction from '../../../hooks/useAction';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../../theme/tokens';
import { templateOf } from '../../../services/templateService';
import { funnel } from '../../../analytics/funnel';
import { galleryTemplates, recommend, COLLECTIONS } from '../../../resume/studio';
import TemplateThumb from './TemplateThumb';
import CustomiseSheet from './CustomiseSheet';
import useFlag from '../../../hooks/useFlag';
import { templateOutcomes, hiddenTemplates } from '../../../resume/finishApi';

const W = Dimensions.get('window').width;
const CARD_W = Math.floor((W - 16 * 2 - 12) / 2);
const CARD_H = Math.round((CARD_W - 16) * 1.414);
const REC_W = Math.round(W * 0.42);
const REC_H = Math.round((REC_W - 12) * 1.414);
const TABS = [['all', 'all'], ['ats', COLLECTIONS.ats], ['fresher', COLLECTIONS.fresher]];
// r8: each card is a WebView with the fonts embedded; with 15 templates that's too many at once on a low-end phone.
// The gallery mounts the first GALLERY_FIRST cards' previews, then GALLERY_STEP more as the student nears the end.
const GALLERY_FIRST = 8;
const GALLERY_STEP = 6;

function Badge({ ats }) {
  if (ats === 'safe') return <Text style={s.badgeSafe} maxFontSizeMultiplier={M} accessibilityLabel="ATS-safe">ATS-safe</Text>;
  if (ats === 'design') return <Text style={s.badgeDesign} maxFontSizeMultiplier={M}>design</Text>;
  return null;
}

export default function TemplateStudio() {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { resumes = [], currentResume, updateResume } = useContext(ResumeContext);
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null) || (!resumeId ? resumes[0] : null);
  const applied = templateOf(resume?.template).id;
  // owner (25 Nov 2026): templates the admin hid (no app update); none hidden until the server answers or if it can't
  const [hidden, setHidden] = useState([]);
  useEffect(() => {
    let live = true;
    hiddenTemplates().then((h) => { if (live && Array.isArray(h)) setHidden(h); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const list = useMemo(() => galleryTemplates(hidden, applied), [hidden, applied]);
  const [selected, setSelected] = useState(applied);
  const [tab, setTab] = useState('all');
  const [atsOnly, setAtsOnly] = useState(false);
  const [compare, setCompare] = useState([]);
  const [customising, setCustomising] = useState(false);
  const [previews, setPreviews] = useState(GALLERY_FIRST); // gallery cards with a live preview (r8)
  useEffect(() => { setPreviews(GALLERY_FIRST); }, [tab, atsOnly]);
  const nearEnd = ({ nativeEvent: e }) => {
    if (e && e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - CARD_H * 2) setPreviews((n) => n + GALLERY_STEP);
  };
  const recs = useMemo(() => recommend(resume || {}, list), [resume, list]);
  // P3d (resumeOutcomeStats): the real interview rate, only for templates the server says have enough data (>= 30
  // applications and >= 10 interviews); nothing at all for the rest
  const statsOn = useFlag('resumeOutcomeStats') === true;
  const [stats, setStats] = useState({});
  useEffect(() => {
    let live = true;
    if (!statsOn) { setStats({}); return undefined; }
    templateOutcomes().then((d) => { if (live) setStats(Object.fromEntries((d?.templates || []).filter((t) => t && t.id && t.applications > 0).map((t) => [t.id, t]))); }).catch(() => {});
    return () => { live = false; };
  }, [statsOn]);

  const pick = (id) => { setSelected(id); funnel(`template_previewed`, { refId: id }); };
  const toggleCompare = (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));

  const apply = useAction(async (_c, id = selected) => {
    if (!resume?._id) return;
    await updateResume(resume._id, { template: id });
    const badge = list.find((t) => t.id === id)?.ats;
    funnel('template_selected', { refId: id });
    if (badge) funnel(`resume_ats_badge_${badge}`, { refId: id });
    navigation.navigate('ResumeView', { resumeId: resume._id });
  }, { errorTitle: 'template not saved', fallback: 'please try again.' });

  if (!resume) {
    return (
      <SafeAreaView style={s.safe}>
        <ScreenHeader title="templates" />
        <View style={s.center}><Text style={s.muted} maxFontSizeMultiplier={M}>open a resume first, then pick its template.</Text></View>
      </SafeAreaView>
    );
  }
  const shown = list.filter((t) => (tab === 'all' || t.collection === tab) && (!atsOnly || t.ats === 'safe'));
  const card = (t, w, h, preview = true) => {
    const on = selected === t.id;
    const cmp = compare.includes(t.id);
    return (
      <TouchableOpacity
        key={t.id}
        style={[s.card, { width: w + 12 }, on && s.cardOn, cmp && s.cardCompare]}
        onPress={() => pick(t.id)}
        onLongPress={() => toggleCompare(t.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${t.name} template${applied === t.id ? ', in use' : ''}${t.ats === 'safe' ? ', ATS-safe' : ''}`}
        accessibilityHint="long-press to compare with another template"
        testID={`template-${t.id}`}
      >
        {preview ? <TemplateThumb resume={resume} templateId={t.id} width={w} height={h} /> : <View style={[s.thumbWait, { width: w, height: h }]} />}
        <View style={s.cardFoot}>
          <Text style={s.name} maxFontSizeMultiplier={M} numberOfLines={1}>{t.name}</Text>
          {on ? <Ionicons name="checkmark-circle" size={18} color={T.ink} /> : null}
        </View>
        <View style={s.badges}>
          <Badge ats={t.ats} />
          {applied === t.id ? <Text style={s.inUse} maxFontSizeMultiplier={M}>in use</Text> : null}
          {cmp ? <Text style={s.inUse} maxFontSizeMultiplier={M}>comparing</Text> : null}
        </View>
        {stats[t.id] ? <Text style={s.stat} maxFontSizeMultiplier={M} accessibilityLabel={`${stats[t.id].rate} percent of ${stats[t.id].applications} applications on tdc jobs got an interview`}>{stats[t.id].rate}% got an interview ({stats[t.id].applications} applications)</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="templates" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} scrollEventThrottle={200} onScroll={nearEnd}>
        <Text style={s.h} maxFontSizeMultiplier={M}>recommended for you</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recRow}>
          {recs.map((r) => {
            const t = list.find((x) => x.id === r.id);
            return t ? (
              <View key={r.id} style={{ width: REC_W + 12 }}>
                {card(t, REC_W, REC_H)}
                <Text style={s.reason} maxFontSizeMultiplier={M}>{r.reason}</Text>
              </View>
            ) : null;
          })}
        </ScrollView>
        <View style={s.tabs}>
          {TABS.map(([id, label]) => <Chip key={id} label={label} selected={tab === id} onPress={() => setTab(id)} />)}
          <Chip label="ATS-safe only" selected={atsOnly} onPress={() => setAtsOnly((v) => !v)} />
        </View>
        <Text style={s.note} maxFontSizeMultiplier={M}>every card is your own resume. switching template never changes your text. long-press two to compare.</Text>
        <View style={s.grid}>{shown.map((t, i) => card(t, CARD_W - 16, CARD_H, i < previews))}</View>
        {!shown.length && <Text style={s.muted} maxFontSizeMultiplier={M}>no template matches these filters.</Text>}
      </ScrollView>
      <View style={s.footer}>
        <Button title="customise" variant="secondary" full={false} onPress={() => setCustomising(true)} accessibilityLabel="customise colours, fonts and sections" />
        <View style={{ flex: 1 }}><Button title="use this template" variant="accent" onPress={() => apply.run(selected)} loading={apply.running} /></View>
      </View>

      <Modal visible={compare.length === 2} animationType="slide" onRequestClose={() => setCompare([])}>
        <SafeAreaView style={s.safe}>
          <ScreenHeader title="compare" onBack={() => setCompare([])} />
          <View style={s.compareRow}>
            {compare.map((id) => {
              const t = list.find((x) => x.id === id);
              return (
                <View key={id} style={{ flex: 1, alignItems: 'center' }}>
                  <TemplateThumb resume={resume} templateId={id} width={(W - 48) / 2} height={((W - 48) / 2) * 1.414} />
                  <Text style={s.name} maxFontSizeMultiplier={M}>{t?.name}</Text>
                  <Badge ats={t?.ats} />
                  <Button title="use this" size="small" variant="accent" full={false} onPress={() => { setCompare([]); apply.run(id); }} style={{ marginTop: 8 }} />
                </View>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>

      <CustomiseSheet visible={customising} onClose={() => setCustomising(false)} resume={resume} templateId={selected} updateResume={updateResume} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { fontFamily: F.body, fontSize: 14, color: T.textMuted, textAlign: 'center', padding: 16 },
  h: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  recRow: { paddingHorizontal: 16, gap: 12 },
  reason: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  note: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: { backgroundColor: T.card, borderRadius: 12, borderWidth: 2, borderColor: T.line, padding: 6 },
  thumbWait: { borderRadius: 6, borderWidth: 1, borderColor: T.lineSoft, backgroundColor: T.paper }, // r8: preview not mounted yet
  cardOn: { borderColor: T.ink },
  cardCompare: { borderStyle: 'dashed' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  name: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  badges: { flexDirection: 'row', gap: 6, marginTop: 2, minHeight: 16 },
  badgeSafe: { fontFamily: F.bodySemi, fontSize: 11, color: T.success },
  badgeDesign: { fontFamily: F.bodySemi, fontSize: 11, color: '#8A5A00' },
  inUse: { fontFamily: F.bodySemi, fontSize: 11, color: T.textMuted },
  stat: { fontFamily: F.body, fontSize: 11, color: T.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: T.line },
  compareRow: { flexDirection: 'row', gap: 16, padding: 16 },
});
