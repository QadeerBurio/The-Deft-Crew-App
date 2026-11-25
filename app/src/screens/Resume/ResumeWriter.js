// app/src/screens/Resume/ResumeWriter.js
// r7, plan P3-9 (flags resumeV2 + resumeWriter): a cover letter from this resume + a job, and a LinkedIn headline and
// about. English only. The server writes from the resume's own facts and drops anything they don't support (server
// services/resumeWriter.js); when it can't write (the AI busy, too little supported) nothing is shown but "try again".
// The letter is editable, then copied or saved as a PDF in the resume's own design (same theme and fonts). Nothing is
// stored on the server.
import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenHeader from '../../ui/ScreenHeader';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import Input from '../../ui/Input';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';
import { ResumeContext } from '../../context/ResumeContext';
import { writeCoverLetter, writeLinkedin } from '../../resume/finishApi';
import { coverLetterHtmlWithFonts } from '../../services/templates/print';
import { copyToClipboard } from '../../utils/clipboard';
import { funnel } from '../../analytics/funnel';

const errorText = (e) => {
  const status = e?.response?.status;
  const msg = e?.response?.data?.message;
  if (status === 429) return "you've asked for a lot of help this hour. try again a little later.";
  if (status === 400 && typeof msg === 'string') return msg;
  return "that didn't work. check your connection and try again.";
};
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ResumeWriter() {
  const { resumeId } = useRoute().params || {};
  const { resumes = [], currentResume } = useContext(ResumeContext) || {};
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null);
  const [tab, setTab] = useState('letter');
  const [job, setJob] = useState({ jobTitle: '', company: '', jobDescription: '' });
  const [letter, setLetter] = useState(null); // { paragraphs }
  const [li, setLi] = useState(null); // { headline, about }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = { refId: String(resumeId || '') };

  const write = async () => {
    setMsg(''); setBusy(true);
    try {
      const d = await writeCoverLetter(resumeId, { jobTitle: job.jobTitle.trim(), company: job.company.trim(), ...(job.jobDescription.trim() ? { jobDescription: job.jobDescription.trim() } : {}) });
      if (d?.ai && Array.isArray(d.paragraphs) && d.paragraphs.length) { setLetter({ paragraphs: d.paragraphs }); funnel('resume_writer_letter', ref); }
      else { setLetter(null); setMsg(d?.message || 'the writer is busy right now. try again in a minute.'); }
    } catch (e) { setMsg(errorText(e)); } finally { setBusy(false); }
  };
  const writeLi = async () => {
    setMsg(''); setBusy(true);
    try {
      const d = await writeLinkedin(resumeId);
      if (d?.ai && (d.headline || (d.about || []).length)) { setLi({ headline: d.headline || '', about: d.about || [] }); funnel('resume_writer_linkedin', ref); }
      else { setLi(null); setMsg(d?.message || 'the writer is busy right now. try again in a minute.'); }
    } catch (e) { setMsg(errorText(e)); } finally { setBusy(false); }
  };
  const letterText = () => [`Dear hiring team${job.company.trim() ? ` at ${job.company.trim()}` : ''},`, ...(letter?.paragraphs || []).map((p) => p.trim()).filter(Boolean), `Sincerely,\n${[resume?.personalInfo?.firstName, resume?.personalInfo?.lastName].filter(Boolean).join(' ')}`].join('\n\n');
  const copy = async (text, what) => { if (await copyToClipboard(text, { title: 'copied', message: `${what} copied` })) funnel('resume_writer_copied', ref); };
  const pdf = async () => {
    setBusy(true);
    try {
      const html = await coverLetterHtmlWithFonts(resume, { company: job.company.trim(), paragraphs: letter.paragraphs.map((p) => p.trim()).filter(Boolean), date: today() });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'cover letter', UTI: 'com.adobe.pdf' });
      funnel('resume_writer_pdf', ref);
    } catch (e) { setMsg("the pdf didn't save. try again."); } finally { setBusy(false); }
  };

  if (!resume) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="cover letter & linkedin" />
        <View style={s.body}><Text style={s.muted} maxFontSizeMultiplier={M}>open a resume first.</Text></View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="cover letter & linkedin" />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.tabs}>
          <Chip label="cover letter" selected={tab === 'letter'} onPress={() => { setTab('letter'); setMsg(''); }} />
          <Chip label="linkedin" selected={tab === 'linkedin'} onPress={() => { setTab('linkedin'); setMsg(''); }} />
        </View>
        <Text style={s.muted} maxFontSizeMultiplier={M}>written from your resume only. nothing is added that your resume doesn't say. read it before you send it.</Text>
        {!!msg && <Text style={s.msg} accessibilityRole="alert" maxFontSizeMultiplier={M}>{msg}</Text>}

        {tab === 'letter' && (
          <>
            <Card style={s.card}>
              <Input label="job title" value={job.jobTitle} onChangeText={(v) => setJob((j) => ({ ...j, jobTitle: v }))} maxLength={120} placeholder="e.g. marketing intern" accessibilityLabel="job title" />
              <Input label="company" value={job.company} onChangeText={(v) => setJob((j) => ({ ...j, company: v }))} maxLength={120} placeholder="e.g. the company's name" accessibilityLabel="company" />
              <Input label="job description (optional, paste it)" value={job.jobDescription} onChangeText={(v) => setJob((j) => ({ ...j, jobDescription: v }))} maxLength={3000} multiline accessibilityLabel="job description" />
              <Button title={letter ? 'write it again' : 'write my cover letter'} onPress={write} loading={busy} disabled={!job.jobTitle.trim() || !job.company.trim()} />
            </Card>
            {letter && (
              <Card style={s.card}>
                <Text style={s.label} maxFontSizeMultiplier={M}>your letter (edit anything)</Text>
                {letter.paragraphs.map((p, i) => (
                  <Input key={i} value={p} multiline onChangeText={(v) => setLetter((l) => ({ paragraphs: l.paragraphs.map((x, j) => (j === i ? v : x)) }))} accessibilityLabel={`paragraph ${i + 1}`} />
                ))}
                <Button title="save as pdf" onPress={pdf} loading={busy} />
                <Button title="copy the text" variant="secondary" onPress={() => copy(letterText(), 'cover letter')} />
              </Card>
            )}
          </>
        )}

        {tab === 'linkedin' && (
          <>
            <Card style={s.card}>
              <Button title={li ? 'write them again' : 'write my headline and about'} onPress={writeLi} loading={busy} />
            </Card>
            {li && (
              <Card style={s.card}>
                {!!li.headline && (
                  <>
                    <Text style={s.label} maxFontSizeMultiplier={M}>headline</Text>
                    <Text style={s.text} selectable maxFontSizeMultiplier={M}>{li.headline}</Text>
                    <Button title="copy headline" variant="secondary" onPress={() => copy(li.headline, 'headline')} />
                  </>
                )}
                {li.about.length > 0 && (
                  <>
                    <Text style={s.label} maxFontSizeMultiplier={M}>about</Text>
                    {li.about.map((p, i) => <Text key={i} style={s.text} selectable maxFontSizeMultiplier={M}>{p}</Text>)}
                    <Button title="copy about" variant="secondary" onPress={() => copy(li.about.join('\n\n'), 'about')} />
                  </>
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 8 },
  card: { gap: 10 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  text: { fontFamily: F.body, fontSize: 15, color: T.ink, lineHeight: 22 },
  muted: { fontFamily: F.body, fontSize: 13, color: T.textMuted },
  msg: { fontFamily: F.bodyBold, fontSize: 14, color: T.danger },
});
