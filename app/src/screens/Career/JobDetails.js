// app/src/screens/Career/JobDetails.js
// One job, full screen (route "JobDetails", params { jobId, preview? }): title, company and logo, location, type,
// salary, deadline, description, responsibilities, required skills, requirements, benefits and the employer's
// rating. Students with FLAG_CAREER_MATCHING also see "your match" (server: the skill-evidence matcher, an estimate
// from their resume; never name, university or city). A fixed bar at the bottom:
//   Apply                → JobApplicationForm (guests: sign up first)
//   Applied (disabled)   already applied, with the application's status
//   Closed (disabled)    past the deadline or no longer active
//   Apply on company site  external jobs: the company's page in the in-app browser
// Opened from the jobs list, pushes, invites, the Daily Drop and "recommended for you" (utils/careerNav.js).
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Linking, Share, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, HeaderIconButton, Button } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import api from "../../api/api";
import { matchingEnabled, myJobMatch } from "../../api/matchingApi";
import { studioEnabled } from "../../api/resumeStudioApi";
import { AuthContext } from "../../context/AuthContext";
import { useGuestGate } from "../../guest/GuestGate";
import { EmployerRating } from "../../components/CareerRatings";
import { WebViewModal, buildLocationUrl } from "../../components/career/JobWebView";
import { JOB_APPLICATION_FORM, jobState, externalApplyUrl, openMyApplications } from "../../utils/careerNav";
import { plainError } from "../../utils/plainError";

const QUALITY_LABEL = { strong: "strong match", medium: "medium match", weak: "weak match", insufficient: "not enough info" };
const STATUS_LABEL = { pending: "sent, waiting for the employer", reviewed: "seen by the employer", shortlisted: "shortlisted", interview: "interview", interviewed: "interviewed", offered: "offer", hired: "hired", accepted: "accepted", rejected: "not selected" };

const list = (v) => (Array.isArray(v) ? v.map((x) => String(x || "").trim()).filter(Boolean) : []);
const dateText = (d) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t) ? t.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
};
export const salaryText = (job) => {
  if (job?.salary && String(job.salary).trim() && String(job.salary).trim() !== "0") return String(job.salary).trim();
  const min = Number(job?.salaryMin) || 0, max = Number(job?.salaryMax) || 0;
  if (!min && !max) return null;
  const cur = job?.currency || "";
  return min && max ? `${cur} ${min.toLocaleString()} - ${max.toLocaleString()}`.trim() : `${cur} ${(min || max).toLocaleString()}`.trim();
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
      {children}
    </View>
  );
}
function Bullets({ items, icon = "ellipse", color = T.ink }) {
  return items.map((t, i) => (
    <View key={i} style={styles.bullet}>
      <Ionicons name={icon} size={icon === "ellipse" ? 6 : 15} color={color} style={icon === "ellipse" ? styles.dot : styles.bulletIcon} />
      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t}</Text>
    </View>
  ));
}

/** "your match": the estimate, top strengths (skill + resume line), gaps, criteria to check, one honest line */
export function YourMatch({ data }) {
  if (!data) return null;
  if (!data.hasResume || !data.match) {
    return (
      <View style={styles.matchCard} accessibilityLabel="your match: add a resume to see how your skills match this job">
        <Text style={styles.matchTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>your match</Text>
        <Text style={styles.matchNote} maxFontSizeMultiplier={MAX_FONT_SCALE}>add a resume to see how your skills match this job.</Text>
      </View>
    );
  }
  const m = data.match;
  const strengths = (m.matched || []).slice(0, 3);
  const toCheck = (m.mandatory || []).filter((c) => c.status !== "met");
  const pct = m.score == null ? null : `${m.score}%`;
  return (
    <View style={styles.matchCard} accessibilityLabel={`your match: ${pct ? pct + ", " : ""}${QUALITY_LABEL[m.quality] || ""}. ${m.summary || ""}`}>
      <View style={styles.matchHead}>
        <Text style={styles.matchTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>your match</Text>
        {pct ? <Text style={styles.matchPct} maxFontSizeMultiplier={MAX_FONT_SCALE}>{pct}</Text> : null}
        <View style={[styles.qualityPill, m.quality === "strong" && { backgroundColor: T.successBg }]}>
          <Text style={[styles.qualityText, m.quality === "strong" && { color: T.success }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{QUALITY_LABEL[m.quality] || "estimate"}</Text>
        </View>
      </View>
      {!!m.summary && <Text style={styles.matchSummary} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.summary}</Text>}
      {strengths.length > 0 && (
        <View style={styles.matchBlock}>
          <Text style={styles.matchLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>your strengths</Text>
          {strengths.map((s) => (
            <View key={s.skill} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={15} color={T.success} style={styles.bulletIcon} />
              <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                <Text style={styles.bold}>{s.skill}</Text>
                {s.evidence?.[0] ? `: "${s.evidence[0]}"` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
      {(m.missing || []).length > 0 && (
        <View style={styles.matchBlock}>
          <Text style={styles.matchLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>not in your resume yet</Text>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.missing.join(", ")}</Text>
        </View>
      )}
      {toCheck.length > 0 && (
        <View style={styles.matchBlock}>
          <Text style={styles.matchLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>requirements to check</Text>
          {toCheck.map((c, i) => (
            <View key={i} style={styles.bullet}>
              <Ionicons name={c.status === "not_met" ? "close-circle-outline" : "help-circle-outline"} size={15} color={c.status === "not_met" ? T.danger : T.textMuted} style={styles.bulletIcon} />
              <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.criterion}{c.status === "not_met" ? " (not shown in your resume)" : " (couldn't tell from your resume)"}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.matchNote} maxFontSizeMultiplier={MAX_FONT_SCALE}>an estimate from your resume's skills, not a promise of an interview. check the job yourself before deciding.</Text>
    </View>
  );
}

export default function JobDetails({ navigation, route }) {
  const jobId = String(route?.params?.jobId || route?.params?.preview?._id || "");
  const insets = useSafeAreaInsets();
  const { token, isGuest } = React.useContext(AuthContext) || {};
  const { requireAccount } = useGuestGate();
  const [job, setJob] = useState(route?.params?.preview || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [match, setMatch] = useState(null);
  const [studioOn, setStudioOn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [web, setWeb] = useState(null); // { url, title }
  const signedIn = !!token && !isGuest;

  const load = useCallback(async () => {
    if (!jobId) { setError("This job couldn't be found."); setLoading(false); return; }
    setError(null);
    try {
      const r = await api.get(`/jobs/public/job/${encodeURIComponent(jobId)}`, { timeout: 10000 });
      if (r.data?._id) setJob(r.data);
    } catch (e) {
      setError(e?.response?.status === 404 ? "This job is no longer listed." : plainError(e, "Couldn't load this job."));
    }
    if (signedIn) {
      const [apps, m, studio] = await Promise.all([
        api.get("/jobs/my-applications", { timeout: 10000 }).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => null),
        matchingEnabled().then((on) => (on ? myJobMatch(jobId).catch(() => null) : null)).catch(() => null),
        studioEnabled().catch(() => false),
      ]);
      if (apps) setApplication(apps.find((a) => String(a.jobId?._id || a.jobId) === jobId) || null);
      setMatch(m);
      setStudioOn(!!studio);
    }
    setLoading(false);
    setRefreshing(false);
  }, [jobId, signedIn]);
  useEffect(() => { load(); }, [load]);

  const state = jobState(job, { applied: !!application || !!match?.applied });

  const apply = () => {
    if (!job) return;
    if (state === "external") {
      const url = externalApplyUrl(job);
      const q = encodeURIComponent(`${job.companyName || job.title} careers`);
      setWeb({ url: url || `https://www.google.com/search?q=${q}`, title: job.companyName || job.title });
      return;
    }
    if (state !== "open") return;
    if (!requireAccount()) return;
    navigation.navigate(JOB_APPLICATION_FORM, { jobId, job: { _id: jobId, title: job.title, companyName: job.companyName || job.company || "", location: job.location || "" } });
  };
  const share = async () => {
    if (!job) return;
    try { await Share.share({ message: `${job.title}\n${job.companyName || job.department || ""}\n${job.location || ""}\n\nApply via the TDC app` }); } catch {}
  };
  const openMap = () => {
    const url = buildLocationUrl(job?.location);
    if (!url) return;
    Linking.openURL(url).catch(() => setWeb({ url, title: job.location }));
  };

  if (!job) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScreenHeader title="job" />
        <View style={styles.center}>
          {loading ? <ActivityIndicator size="large" color={T.ink} /> : (
            <>
              <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite">{error || "This job couldn't be found."}</Text>
              <Button title="try again" variant="secondary" full={false} onPress={() => { setLoading(true); load(); }} style={{ marginTop: 16 }} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const salary = salaryText(job);
  const deadline = dateText(job.applicationDeadline);
  const skills = list(job.skills), requirements = list(job.requirements), responsibilities = list(job.responsibilities), benefits = list(job.benefits);
  const company = job.companyName || job.company || job.department || "";
  const facts = [
    job.location && { icon: "location-outline", text: job.location, onPress: openMap, label: `location ${job.location}, open the map` },
    job.type && { icon: "briefcase-outline", text: [job.type, job.locationType].filter(Boolean).join(" · ") },
    job.experienceLevel && { icon: "trending-up-outline", text: job.experienceLevel },
    salary && { icon: "cash-outline", text: salary },
    deadline && { icon: "calendar-outline", text: `apply by ${deadline}` },
  ].filter(Boolean);
  const button = {
    applied: { title: "Applied", disabled: true, icon: "checkmark-circle" },
    closed: { title: "Closed", disabled: true, icon: "lock-closed-outline" },
    external: { title: "Apply on company site", disabled: false, icon: "open-outline" },
    open: { title: "Apply", disabled: false, icon: "paper-plane-outline" },
  }[state];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="job" right={<HeaderIconButton icon="share-outline" label="share this job" onPress={share} />} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={T.ink} />}
      >
        <View style={styles.top}>
          {job.companyLogo ? (
            <Image source={{ uri: job.companyLogo }} style={styles.logo} accessibilityIgnoresInvertColors accessibilityLabel={`${company} logo`} />
          ) : (
            <View style={[styles.logo, styles.logoBlank]}><Ionicons name="business-outline" size={24} color={T.textMuted} /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{job.title}</Text>
            {!!company && <Text style={styles.company} maxFontSizeMultiplier={MAX_FONT_SCALE}>{company}</Text>}
          </View>
        </View>
        <EmployerRating jobId={job?._id} />
        <View style={styles.facts}>
          {facts.map((f, i) => {
            const row = (
              <View style={styles.fact}>
                <Ionicons name={f.icon} size={16} color={T.ink} />
                <Text style={[styles.factText, f.onPress && styles.link]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.text}</Text>
              </View>
            );
            return f.onPress ? <TouchableOpacity key={i} onPress={f.onPress} accessibilityRole="link" accessibilityLabel={f.label}>{row}</TouchableOpacity> : <View key={i}>{row}</View>;
          })}
        </View>
        {state === "applied" && (
          <View style={styles.banner} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={T.success} />
            <Text style={styles.bannerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>you applied{application?.status ? `: ${STATUS_LABEL[application.status] || application.status}` : ""}</Text>
          </View>
        )}
        {state === "applied" && signedIn && (
          <Button
            title="open my application"
            variant="secondary"
            icon={<Ionicons name="list-outline" size={16} color={T.ink} />}
            accessibilityLabel="open my application: interviews, offers and updates"
            onPress={() => openMyApplications(navigation)}
            style={{ marginTop: 10 }}
          />
        )}
        {state === "closed" && (
          <View style={[styles.banner, { backgroundColor: T.sand }]}>
            <Ionicons name="lock-closed-outline" size={18} color={T.textMuted} />
            <Text style={[styles.bannerText, { color: T.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>applications for this job are closed</Text>
          </View>
        )}
        <YourMatch data={match} />
        {studioOn && state === "open" && (
          <Button
            title="Tailor my resume for this job"
            variant="secondary"
            icon={<Ionicons name="sparkles-outline" size={16} color={T.ink} />}
            accessibilityLabel="tailor my resume for this job"
            onPress={() => navigation.navigate("ResumeStudio", { jobId: job._id, jobTitle: job.title, fresh: true })}
            style={{ marginTop: 12 }}
          />
        )}
        {!!job.description && <Section title="about the job"><Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{job.description}</Text></Section>}
        {responsibilities.length > 0 && <Section title="responsibilities"><Bullets items={responsibilities} /></Section>}
        {skills.length > 0 && (
          <Section title="required skills">
            <View style={styles.chips}>
              {skills.map((s) => <View key={s} style={styles.chip}><Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s}</Text></View>)}
            </View>
          </Section>
        )}
        {requirements.length > 0 && <Section title="requirements"><Bullets items={requirements} icon="checkmark-circle-outline" /></Section>}
        {benefits.length > 0 && <Section title="benefits"><Bullets items={benefits} icon="star-outline" /></Section>}
        {!!job.companyWebsite && (
          <Section title="company">
            <TouchableOpacity onPress={() => setWeb({ url: job.companyWebsite, title: company })} accessibilityRole="link">
              <Text style={[styles.body, styles.link]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{job.companyWebsite}</Text>
            </TouchableOpacity>
          </Section>
        )}
        {!!error && <Text style={[styles.body, { color: T.danger, marginTop: 12 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{error}</Text>}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <Button
          title={button.title}
          disabled={button.disabled}
          onPress={apply}
          icon={<Ionicons name={button.icon} size={17} color={button.disabled ? T.textFaint : T.white} />}
          accessibilityLabel={button.disabled ? `${button.title}` : `${button.title}: ${job.title}`}
        />
      </View>
      <WebViewModal visible={!!web} url={web?.url} title={web?.title} onClose={() => setWeb(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  logoBlank: { alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.heading, fontSize: 22, color: T.ink },
  company: { fontFamily: F.bodySemi, fontSize: 15, color: T.textMuted, marginTop: 2 },
  facts: { backgroundColor: T.card, borderRadius: 18, borderWidth: 1, borderColor: T.line, padding: 14, gap: 10, marginTop: 10 },
  fact: { flexDirection: "row", alignItems: "center", gap: 10 },
  factText: { fontFamily: F.body, fontSize: 14, color: T.ink, flexShrink: 1 },
  link: { textDecorationLine: "underline" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: T.successBg, borderRadius: 14, padding: 12, marginTop: 12 },
  bannerText: { fontFamily: F.bodySemi, fontSize: 14, color: T.success, flexShrink: 1 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: F.headingBold, fontSize: 17, color: T.ink, marginBottom: 8 },
  body: { fontFamily: F.body, fontSize: 14.5, color: T.ink, lineHeight: 21, flexShrink: 1 },
  bold: { fontFamily: F.bodyBold },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  dot: { marginTop: 8 },
  bulletIcon: { marginTop: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: T.yellowSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  matchCard: { backgroundColor: T.card, borderRadius: 18, borderWidth: 1.5, borderColor: T.yellow, padding: 14, marginTop: 14 },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  matchTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  matchPct: { fontFamily: F.heading, fontSize: 18, color: T.ink },
  qualityPill: { backgroundColor: T.sand, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  qualityText: { fontFamily: F.bodySemi, fontSize: 12, color: T.textMuted },
  matchSummary: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink, marginTop: 8 },
  matchBlock: { marginTop: 10 },
  matchLabel: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted, marginBottom: 4 },
  matchNote: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 10 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: T.paper, borderTopWidth: 1, borderTopColor: T.line },
});
