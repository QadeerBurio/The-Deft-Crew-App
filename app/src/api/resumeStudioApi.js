// app/src/api/resumeStudioApi.js
// AI Resume Studio (server: routes/careerResume.routes.js, behind FLAG_RESUME_STUDIO_V2). Shown only when
// GET /app/flags/me says resumeStudioV2 for this student (the shared flags, api/appFlags.js).
// Replies are { success, data }; these return `data` and throw an Error with the server's message, `code`
// and any extra fields (riskFlags, pending, ...).
// Decisions are saved as the student makes them. Offline, they wait on the phone (per draft) and are sent
// when the screen is next open with a connection; if the draft changed elsewhere meanwhile (409) the
// waiting ones are dropped and the screen reloads.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy"; // SDK 54: the old API lives here
import * as Sharing from "expo-sharing";
import api, { BASE_URL } from "./api";
import { flagOn } from "./appFlags";
import { TIMEOUT, withTimeout } from "../config/timeouts";

// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function studioEnabled() {
  return flagOn("resumeStudioV2");
}

const unwrap = (request) =>
  request
    .then((r) => r.data?.data)
    .catch((e) => {
      const body = e.response?.data || {};
      const { code, message, ...extra } = body.error || {};
      const err = new Error(message || body.message || (e.response ? "something went wrong, try again" : "you seem to be offline"));
      Object.assign(err, extra, { code, status: e.response?.status, offline: !e.response });
      throw err;
    });
export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const B = "/career/resume";

export const studioApi = {
  source: (resumeId) => unwrap(api.get(`${B}/sources/${resumeId}`, { timeout: 10000 })),
  confirmSource: (resumeId, revisionHash) => unwrap(api.post(`${B}/sources/${resumeId}/confirm`, { revisionHash }, { timeout: 10000 })),
  // { resumeId, jobId } or { resumeId, jobTitle, jobDescription }; the same idempotencyKey for a retried tap
  startTailoring: (body, idempotencyKey) => unwrap(api.post(`${B}/tailor-jobs`, { ...body, idempotencyKey }, { timeout: 15000 })),
  tailorJob: (id) => unwrap(api.get(`${B}/tailor-jobs/${id}`, { timeout: 10000 })),
  draft: (id) => unwrap(api.get(`${B}/drafts/${id}`, { timeout: 10000 })),
  decide: (id, revision, decisions) => unwrap(api.patch(`${B}/drafts/${id}/decisions`, { revision, decisions }, { timeout: 10000 })),
  approve: (id, body) => unwrap(api.post(`${B}/drafts/${id}/approve`, body, { timeout: 15000 })),
  deleteDraft: (id) => unwrap(api.delete(`${B}/drafts/${id}`, { timeout: 10000 })),
  versions: () => unwrap(api.get(`${B}/versions`, { timeout: 10000 })),
  // one version with its content and pdf status ({ urdu: none | included | not_included, message })
  version: (id) => unwrap(api.get(`${B}/versions/${id}`, { timeout: 10000 })),
  deleteVersion: (id) => unwrap(api.delete(`${B}/versions/${id}`, { timeout: 10000 })),
  attachVersion: (applicationId, versionId) => unwrap(api.post(`${B}/applications/${applicationId}/attach-version`, { versionId }, { timeout: 10000 })),
  applicationResume: (applicationId) => unwrap(api.get(`${B}/applications/${applicationId}/resume`, { timeout: 10000 })),
};

/** Poll a tailor job until it's done (succeeded / failed). onTick(status) for the progress screen. */
export async function waitForTailoring(jobId, { onTick, signal, wait = (ms) => new Promise((r) => setTimeout(r, ms)), maxMs = 120000 } = {}) {
  const started = Date.now();
  for (;;) {
    if (signal?.cancelled) return null;
    const job = await studioApi.tailorJob(jobId);
    onTick?.(job.status);
    if (job.status === "succeeded" || job.status === "failed") return job;
    if (Date.now() - started > maxMs) return { ...job, status: "failed", errorCode: "TIMED_OUT" };
    await wait(job.pollAfterMs || 1500);
  }
}

// ---------- decisions: saved now, or kept on the phone until there's a connection ----------
const pendingKey = (draftId) => `resumeStudio:pending:${draftId}`;
async function readPending(draftId) {
  try { return JSON.parse((await AsyncStorage.getItem(pendingKey(draftId))) || "null"); } catch { return null; }
}
async function writePending(draftId, value) {
  try {
    if (value) await AsyncStorage.setItem(pendingKey(draftId), JSON.stringify(value));
    else await AsyncStorage.removeItem(pendingKey(draftId));
  } catch {}
}
const merge = (a = [], b = []) => {
  const m = new Map(a.map((d) => [d.suggestionId, d]));
  for (const d of b) m.set(d.suggestionId, d);
  return [...m.values()];
};

/**
 * Save decisions. Returns { draft } when saved, { queued: true } when offline (kept for later),
 * { conflict: true, draft } when the draft changed elsewhere (reloaded, waiting ones dropped).
 * Throws the server's refusal (e.g. CONFIRMATION_REQUIRED) for the screen to show.
 */
export async function saveDecisions(draftId, revision, decisions) {
  const waiting = await readPending(draftId);
  const all = merge(waiting?.decisions, decisions);
  const rev = waiting?.revision ?? revision;
  try {
    const draft = await studioApi.decide(draftId, rev, all);
    await writePending(draftId, null);
    return { draft };
  } catch (e) {
    if (e.offline) {
      await writePending(draftId, { revision: rev, decisions: all });
      return { queued: true };
    }
    if (e.code === "STALE_REVISION") {
      await writePending(draftId, null);
      return { conflict: true, draft: await studioApi.draft(draftId) };
    }
    throw e;
  }
}

/** Send decisions kept while offline (on opening a draft). Returns the fresh draft. */
export async function flushPending(draftId) {
  const waiting = await readPending(draftId);
  if (!waiting?.decisions?.length) return { draft: await studioApi.draft(draftId), flushed: false };
  try {
    const draft = await studioApi.decide(draftId, waiting.revision, waiting.decisions);
    await writePending(draftId, null);
    return { draft, flushed: true };
  } catch (e) {
    if (e.offline) throw e;
    await writePending(draftId, null); // refused or changed elsewhere: start from the server's draft
    return { draft: await studioApi.draft(draftId), flushed: false, dropped: true };
  }
}
export const hasPending = async (draftId) => !!(await readPending(draftId))?.decisions?.length;

/** The draft being worked on, so leaving the app and coming back reopens it */
export const rememberDraft = (draftId) => AsyncStorage.setItem("resumeStudio:lastDraft", draftId || "").catch(() => {});
export const lastDraft = () => AsyncStorage.getItem("resumeStudio:lastDraft").catch(() => null);

/** Download a PDF (draft preview or approved export) and hand it to the phone's viewer / share sheet */
export async function openPdf(pathUnderStudio, name) {
  const token = await AsyncStorage.getItem("token");
  const file = `${FileSystem.cacheDirectory}${String(name).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 60) || "resume"}.pdf`;
  const res = await withTimeout(
    FileSystem.downloadAsync(`${BASE_URL}${B}/${pathUnderStudio}`, file, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
    TIMEOUT.PDF,
    "pdf download"
  );
  if (res.status !== 200) throw new Error("couldn't get the pdf, try again");
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing isn't available on this phone");
  await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: name });
}

export default studioApi;
