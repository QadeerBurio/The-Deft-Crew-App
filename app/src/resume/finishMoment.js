// app/src/resume/finishMoment.js
// P3d finish moment (flags resumeV2 + resumeFinish): shown once per resume, the first time it's finished (no required
// field missing). The phone remembers which resumes already had it (AsyncStorage), so finishing again goes straight
// to the preview, as today.
//   finishShown(resumeId) → Promise<boolean>     markFinishShown(resumeId)
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tdc.resume.finishShown.v1";
const MAX = 50;

async function list() {
  try { const raw = await AsyncStorage.getItem(KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
}
export async function finishShown(resumeId) {
  if (!resumeId) return true;
  return (await list()).includes(String(resumeId));
}
export async function markFinishShown(resumeId) {
  if (!resumeId) return;
  const ids = (await list()).filter((x) => x !== String(resumeId));
  ids.push(String(resumeId));
  try { await AsyncStorage.setItem(KEY, JSON.stringify(ids.slice(-MAX))); } catch { /* the moment may show again: never a failure */ }
}
