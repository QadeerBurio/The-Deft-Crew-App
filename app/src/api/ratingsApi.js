// app/src/api/ratingsApi.js
// Mutual ratings (server: routes/careerRatings.routes.js, FLAG_CAREER_RATINGS). Shown only when
// GET /app/flags/me says careerRatings for this student (the shared flags, api/appFlags.js).
// Replies are { success, data }; these return `data` and throw an Error with the server's message and `code`.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

import { flagOn } from "./appFlags";
// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function ratingsEnabled() {
  return flagOn("careerRatings");
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
