// app/src/api/matchingApi.js
// Job recommendations from the skill-evidence matcher (server: GET /api/career/matching/recommended, behind
// FLAG_CAREER_MATCHING). Shown only when GET /app/flags/me says careerMatching for this student (asked once per
// account, kept 5 minutes). The server reads the student's resume skills only: never name, university or city.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const FLAGS_MAX_AGE = 5 * 60 * 1000;
let flags = { key: null, at: 0, on: false, pending: null };

/** Is candidate matching on for the signed-in student? Guests, errors, an unreachable server: no. */
export async function matchingEnabled() {
  const [token, guest] = await Promise.all([AsyncStorage.getItem("token"), AsyncStorage.getItem("isGuest")]);
  if (!token || guest === "true") return false;
  if (flags.key === token && Date.now() - flags.at < FLAGS_MAX_AGE) return flags.on;
  if (flags.key === token && flags.pending) return flags.pending;
  flags = { key: token, at: 0, on: false, pending: null };
  flags.pending = api
    .get("/app/flags/me", { timeout: 6000 })
    .then((r) => !!r.data?.careerMatching)
    .catch(() => false)
    .then((on) => {
      if (flags.key === token) flags = { key: token, at: Date.now(), on, pending: null };
      return on;
    });
  return flags.pending;
}

/** { hasResume, recommendations: [job + matchPercentage, matchedSkills, matchReasons] } */
export const recommendedJobs = (limit = 5) =>
  api.get("/career/matching/recommended", { params: { limit }, timeout: 10000 }).then((r) => r.data?.data || { hasResume: false, recommendations: [] });

export default { matchingEnabled, recommendedJobs };
