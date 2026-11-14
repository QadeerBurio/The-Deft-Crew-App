// RecommendedJobs.js: "recommended for you" in the careers hub (CareerHub.js), whenever FLAG_CAREER_MATCHING is on
// for the student. Jobs whose listed skills the student's resume shows evidence for (server: the skill-evidence
// matcher; never name, university or city), each with the share of skills matched and up to three of them; a tap
// opens the job in the jobs list (Career, openJobId). With the flag on it always shows: "add a resume to get job
// matches" (with a button) without a resume, "no strong matches yet" when nothing scores 60%+. Flag off: nothing.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { matchingEnabled, recommendedJobs } from "../api/matchingApi";
import useFlag from "../hooks/useFlag";

export default function RecommendedJobs({ navigation, refreshKey }) {
  const on = useFlag("careerMatching", matchingEnabled);
  const [data, setData] = useState(null); // null: loading; { hasResume, recommendations } | { error: true }
  useEffect(() => {
    if (on !== true) { setData(null); return undefined; }
    let live = true;
    recommendedJobs(5)
      .then((d) => { if (live) setData(d || { hasResume: false, recommendations: [] }); })
      .catch((e) => { console.warn("[career] recommended jobs not loaded:", e?.message); if (live) setData({ error: true }); });
    return () => { live = false; };
  }, [on, refreshKey]);
  if (on !== true) return null;
  const jobs = data?.recommendations || [];
  if (!data || data.error || !data.hasResume || jobs.length === 0) {
    const noResume = data && !data.error && !data.hasResume;
    const line = !data
      ? "finding jobs that match your resume…"
      : data.error
      ? "couldn't load your matches. pull down to try again."
      : noResume
      ? "add a resume to get job matches."
      : "no strong matches yet. jobs that match 60% or more of their skills show here.";
    return (
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.head}>
          <Ionicons name="sparkles-outline" size={18} color={T.ink} />
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">recommended for you</Text>
        </View>
        <Text style={styles.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>{line}</Text>
        {noResume && (
          <TouchableOpacity style={styles.cta} onPress={() => navigation?.navigate?.("Resume")} accessibilityRole="button" accessibilityLabel="add a resume">
            <Text style={styles.ctaText} maxFontSizeMultiplier={MAX_FONT_SCALE}>add a resume</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.head}>
        <Ionicons name="sparkles-outline" size={18} color={T.ink} />
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">recommended for you</Text>
      </View>
      <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>jobs whose skills your resume shows. an estimate, not a promise.</Text>
      {jobs.map((j) => {
        const skills = (j.matchedSkills || []).slice(0, 3);
        const company = j.companyName || j.company || "";
        return (
          <TouchableOpacity
            key={String(j._id)}
            style={styles.row}
            onPress={() => navigation?.navigate?.("Career", { openJobId: String(j._id) })}
            accessibilityRole="button"
            accessibilityLabel={`${j.title}${company ? ` at ${company}` : ""}. ${j.matchPercentage}% of its skills on your resume${skills.length ? `: ${skills.join(", ")}` : ""}. opens the job`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.job} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{j.title}</Text>
              {!!company && <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{company}{j.location ? ` · ${j.location}` : ""}</Text>}
              {skills.length > 0 && <Text style={styles.skills} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>you show: {skills.join(", ")}</Text>}
            </View>
            <Text style={styles.pct} maxFontSizeMultiplier={MAX_FONT_SCALE}>{j.matchPercentage}%</Text>
            <Ionicons name="chevron-forward" size={18} color={T.ink} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 18, backgroundColor: T.white, borderWidth: 1, borderColor: T.line || "#ECE7DA" },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: F.heading, fontSize: 17, color: T.ink },
  note: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line || "#ECE7DA" },
  job: { fontFamily: F.bodyBold || F.body, fontSize: 15, color: T.ink },
  sub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  skills: { fontFamily: F.body, fontSize: 12.5, color: T.success || T.ink, marginTop: 2 },
  pct: { fontFamily: F.heading, fontSize: 16, color: T.ink },
  empty: { fontFamily: F.body, fontSize: 14, color: T.textMuted, marginTop: 6 },
  cta: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: T.ink, justifyContent: "center", marginTop: 10 },
  ctaText: { fontFamily: F.bodyBold || F.body, fontSize: 14, color: T.white },
});
