// app/src/api/matchingApi.js
// Job recommendations from the skill-evidence matcher (server: GET /api/career/matching/recommended, behind
// FLAG_CAREER_MATCHING). Shown only when GET /app/flags/me says careerMatching for this student 
// (the shared flags, api/appFlags.js). The server reads the student's resume skills only: never name, university or city.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

import { flagOn } from "./appFlags";
// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function matchingEnabled() {
  return flagOn("careerMatching");
}

/** { hasResume, recommendations: [job + matchPercentage, matchedSkills, matchReasons] } */
export const recommendedJobs = (limit = 5) =>
  api.get("/career/matching/recommended", { params: { limit }, timeout: 10000 }).then((r) => r.data?.data || { hasResume: false, recommendations: [] });

const unwrap = (request) =>
  request
    .then((r) => r.data?.data)
    .catch((e) => {
      const body = e.response?.data || {};
      const err = new Error(body.error?.message || body.message || "something went wrong, try again");
      err.code = body.error?.code;
      throw err;
    });

/** { discoverable, invites: [{ id, job: { id, title, companyName, location, type }, status, sentAt }] } */
export const myInvites = () => unwrap(api.get("/career/invites/me", { timeout: 10000 }));
/** "interested" | "declined" */
export const respondInvite = (id, response) => unwrap(api.post(`/career/invites/${id}/respond`, { response }, { timeout: 10000 }));
/** the student's own match for one job (JobDetails "your match"): { hasResume, applied, match, note } where match is
 *  { score, quality: strong | medium | weak | insufficient, summary, matched: [{ skill, evidence: [text] }],
 *  missing: [skill], unknown: [skill], mandatory: [{ criterion, status, evidence }] } or null without a resume */
export const myJobMatch = (jobId) => unwrap(api.get(`/career/matching/jobs/${encodeURIComponent(String(jobId))}/me`, { timeout: 10000 }));
/** "let employers invite me to apply": saved on the professional profile (the existing route) */
export const setDiscoverable = (on) => api.post("/professional-profile", { discoverable: !!on }, { timeout: 10000 }).then((r) => !!r.data?.profile?.discoverable);

export default { matchingEnabled, recommendedJobs, myJobMatch, myInvites, respondInvite, setDiscoverable };
