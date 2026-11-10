// app/src/api/ratingsApi.js
// Mutual ratings (server: routes/careerRatings.routes.js, FLAG_CAREER_RATINGS). Shown only when
// GET /app/flags/me says careerRatings for this student (asked once per account, kept 5 minutes).
// Replies are { success, data }; these return `data` and throw an Error with the server's message and `code`.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const FLAGS_MAX_AGE = 5 * 60 * 1000;
let flags = { key: null, at: 0, on: false, pending: null };

/** Are ratings on for the signed-in student? Guests, errors, an unreachable server: no. */
export async function ratingsEnabled() {
  const [token, guest] = await Promise.all([AsyncStorage.getItem("token"), AsyncStorage.getItem("isGuest")]);
  if (!token || guest === "true") return false;
  if (flags.key === token && Date.now() - flags.at < FLAGS_MAX_AGE) return flags.on;
  if (flags.key === token && flags.pending) return flags.pending;
  flags = { key: token, at: 0, on: false, pending: null };
  flags.pending = api
    .get("/app/flags/me", { timeout: 6000 })
    .then((r) => !!r.data?.careerRatings)
    .catch(() => false)
    .then((on) => {
      if (flags.key === token) flags = { key: token, at: Date.now(), on, pending: null };
      return on;
    });
  return flags.pending;
}

const unwrap = (request) =>
  request
    .then((r) => r.data?.data)
    .catch((e) => {
      const body = e.response?.data || {};
      const err = new Error(body.error?.message || body.message || "something went wrong, try again");
      err.code = body.error?.code;
      err.status = e.response?.status;
      throw err;
    });

export const ratingsApi = {
  // what this student can rate on an application (a completed interview, a verified hire) and what they rated
  forApplication: (applicationId) => unwrap(api.get(`/career/ratings/applications/${applicationId}`, { timeout: 10000 })),
  rate: (body) => unwrap(api.post("/career/ratings", body, { timeout: 10000 })),
  // the job's employer average: only from 5 ratings (shown: false before that)
  employerForJob: (jobId) => unwrap(api.get(`/career/ratings/jobs/${jobId}/employer`, { timeout: 8000 })),
  // the ratings employers gave this student (released ones), to read and report
  received: () => unwrap(api.get("/career/ratings/me/received", { timeout: 10000 })),
  report: (ratingId, reason) => unwrap(api.post(`/career/ratings/${ratingId}/report`, { reason }, { timeout: 10000 })),
};

export default ratingsApi;
