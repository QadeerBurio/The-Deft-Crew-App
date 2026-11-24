// app/src/screens/Resume/ResumeFinish.js
// P3d finish moment (plan P3-8; flags resumeV2 + resumeFinish): once per resume, the first time it's finished.
// The celebration (the app's own popup, sound tdc_success), then what to do next:
//   download pdf (the preview, where it's saved and shared) · share link (only with the public page: resumePublicPage)
//   · apply to matching jobs (only with careerMatching: the dashboard at "recommended for you")
// then "verified by tdc" as a one-tap suggestion (resumeVerified; only with a verified fact) and the "my resume is
// ready" card (shareCards). A cover letter comes later (P3-9), not here.
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../ui/Button';
import ShareCardSheet from '../../ui/ShareCard';
import CelebrationPopup from '../../engagement/components/CelebrationPopup';
import { ResumeContext } from '../../context/ResumeContext';
import useFlag from '../../hooks/useFlag';
import { FLAGS } from '../../api/upgradeFlags';
import { matchingEnabled } from '../../api/matchingApi';
import { soundSuccess } from '../../lib/tdcSounds';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';
import { funnel } from '../../analytics/funnel';
import { markFinishShown } from '../../resume/finishMoment';
import { resumeName } from '../../utils/resumeRules';
import VerifiedLine from './finish/VerifiedLine';
import { useReferrals } from '../../engagement/hooks/useReferrals';

export default function ResumeFinish() {
  const navigation = useNavigation();
  const { resumeId } = useRoute().params || {};
  const { resumes = [], currentResume, updateResume } = useContext(ResumeContext) || {};
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null);
  // hooks always called, in the same order
  const pageOn = useFlag('resumePublicPage') === true;
  const verifiedOn = useFlag('resumeVerified') === true;
  const matchingOn = useFlag('careerMatching', matchingEnabled) === true;
  const cardsOn = useFlag(FLAGS.shareCards) === true;
  const { referralCode } = useReferrals(); // the card's QR is the student's own invite link
  const [popup, setPopup] = useState(() => ({ id: `resume_finish_${resumeId}`, line: 'your resume is ready.', mood: 'sorted' }));
  const [cardOpen, setCardOpen] = useState(false);

  useEffect(() => {
    if (!resumeId) return;
    markFinishShown(resumeId);
    try { soundSuccess(); } catch { /* no sound: still the moment */ }
    funnel('resume_finish_shown', { refId: String(resumeId) });
  }, [resumeId]);

  const ref = { refId: String(resumeId || '') };
  const go = (event, screen, params) => { funnel(event, ref); navigation.navigate(screen, params); };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.big} accessibilityRole="header" maxFontSizeMultiplier={M}>your resume is ready.</Text>
        {!!resume && <Text style={s.name} maxFontSizeMultiplier={M}>{resumeName(resume)}</Text>}
        <Text style={s.lead} maxFontSizeMultiplier={M}>what next?</Text>

        <Button title="download pdf" variant="accent" onPress={() => go('resume_finish_download', 'ResumeView', { resumeId })} accessibilityLabel="download my resume as a pdf" />
        {pageOn && <Button title="share link" variant="secondary" onPress={() => go('resume_finish_share_link', 'ResumeShare', { resumeId })} style={s.gap} accessibilityLabel="share a link to my resume page" />}
        {matchingOn && <Button title="apply to matching jobs" variant="secondary" onPress={() => go('resume_finish_jobs', 'ResumeDashboard', { openMatches: true, at: Date.now() })} style={s.gap} accessibilityLabel="see jobs that match my resume" />}

        {verifiedOn && !!resume && <VerifiedLine resume={resume} updateResume={updateResume} suggest style={s.card} />}

        {cardsOn && !!referralCode && (
          <Button title="tell your friends" variant="ghost" onPress={() => { funnel('resume_ready_card', ref); setCardOpen(true); }} style={s.gap} accessibilityLabel="share a 'my resume is ready' card" />
        )}
        <Button title="done" variant="ghost" onPress={() => navigation.navigate('ResumeDashboard')} style={s.gap} />
      </ScrollView>
      {!!popup && <CelebrationPopup popup={popup} onClose={() => setPopup(null)} onClosed={() => setPopup(null)} />}
      {cardsOn && !!referralCode && <ShareCardSheet visible={cardOpen} onClose={() => setCardOpen(false)} variant="resumeReady" code={referralCode} onShared={(v) => funnel(`share_card_${String(v).toLowerCase()}`)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { padding: 20, paddingTop: 40, paddingBottom: 32 },
  big: { fontFamily: F.heading, fontSize: 30, lineHeight: 36, color: T.ink },
  name: { fontFamily: F.bodySemi, fontSize: 15, color: T.textMuted, marginTop: 6 },
  lead: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginTop: 28, marginBottom: 12 },
  gap: { marginTop: 10 },
  card: { marginTop: 20 },
});
