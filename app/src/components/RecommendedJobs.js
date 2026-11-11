// RecommendedJobs.js: "recommended for you" in the careers hub (CareerHub.js), only when FLAG_CAREER_MATCHING is on
// for the student. Jobs whose listed skills the student's resume shows evidence for (server: the skill-evidence
// matcher; never name, university or city), each with the share of skills matched and up to three of them; a tap
// opens the job in the jobs list (Career, openJobId). Renders nothing outside the pilot, without a resume or when
// nothing matches, so the hub is unchanged.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { matchingEnabled, recommendedJobs } from "../api/matchingApi";

export default function RecommendedJobs({ navigation, refreshKey }) {
  const [jobs, setJobs] = useState(null); // null: hidden
  useEffect(() => {
    let live = true;
    (async () => {
      if (!(await matchingEnabled())) { if (live) setJobs(null); return; }
      try {
        const d = await recommendedJobs(5);
        if (live) setJobs(d?.recommendations?.length ? d.recommendations : null);
      } catch {
        if (live) setJobs(null);
      }
    })();
    return () => { live = false; };
  }, [refreshKey]);
  if (!jobs) return null;
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
});
