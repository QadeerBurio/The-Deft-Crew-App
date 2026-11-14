// app/src/api/careerApi.js
// Hiring timeline (server: routes/career.routes.js, behind FLAG_CAREER_TIMELINE). Shown only when
// GET /app/flags/me says careerTimeline for this student (the shared flags, api/appFlags.js).
// Replies are { success, data }; these return `data` and throw an Error with the server's message and
// `code`. Every answer sends the version the screen saw and a fresh Idempotency-Key.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy"; // SDK 54: the old API lives here
import * as Sharing from "expo-sharing";
import api, { BASE_URL } from "./api";

import { flagOn } from "./appFlags";
// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function careerEnabled() {
  return flagOn("careerTimeline");
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
const key = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const post = (url, body) => unwrap(api.post(url, body, { headers: { "Idempotency-Key": key() }, timeout: 10000 }));

export const careerApi = {
  myApplications: () => unwrap(api.get("/career/applications/me", { timeout: 10000 })),
  timeline: (applicationId) => unwrap(api.get(`/career/applications/${applicationId}/timeline`, { timeout: 10000 })),
  // WITHDRAWN | HIRE_DISPUTED (note: the reason)
  event: (applicationId, { type, version, note }) => post(`/career/applications/${applicationId}/events`, { type, version, note }),
  // accept | decline | reschedule | employer_no_show | dispute
  respondInterview: (interviewId, { version, response, message }) => post(`/career/interviews/${interviewId}/respond`, { version, response, message }),
  // accept | decline
  respondOffer: (offerId, { version, response, message }) => post(`/career/offers/${offerId}/respond`, { version, response, message }),
  myOutcomes: () => unwrap(api.get("/career/outcomes/me", { timeout: 10000 })),
  setOutcomeVisibility: (outcomeId, visibility) => unwrap(api.patch(`/career/outcomes/${outcomeId}`, { visibility })),
};

/** Add to calendar: download the interview's .ics (same UID, newer SEQUENCE after a change) and open it */
export async function addInterviewToCalendar(interviewId) {
  const token = await AsyncStorage.getItem("token");
  const file = `${FileSystem.cacheDirectory}interview-${interviewId}.ics`;
  const res = await FileSystem.downloadAsync(`${BASE_URL}/career/interviews/${interviewId}/ics`, file, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status !== 200) throw new Error("couldn't get the calendar file, try again");
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing isn't available on this phone");
  await Sharing.shareAsync(res.uri, { mimeType: "text/calendar", UTI: "com.apple.ical.ics", dialogTitle: "add the interview to your calendar" });
}

export default careerApi;
