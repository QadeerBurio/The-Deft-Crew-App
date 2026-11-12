// app/src/utils/careerNav.js
// Opening a job and coming back after applying. Jobs list (Career) → JobDetails → JobApplicationForm, all in the
// home stack (navigation/DrawerNavigator.js). Pushes, invites, the Daily Drop and "recommended for you" open
// Career with { openJobId }, which pushes JobDetails, so back always lands on the jobs list.
//   openJobDetails(navigation, job | id)        push JobDetails (the job shown at once while it reloads)
//   backToJobsList(navigation, appliedJobId)    after a confirmed application: everything above the jobs list is
//                                               removed and the list marks that job "Applied"
//   jobState(job, { applied, now })             "applied" | "closed" | "external" | "open": what Apply does
//   externalApplyUrl(job)                       an external job's apply link (or null)
import { CommonActions } from "@react-navigation/native";

export const JOBS_LIST = "Career";
export const JOB_DETAILS = "JobDetails";
export const JOB_APPLICATION_FORM = "JobApplicationForm";

const idOf = (job) => String((job && typeof job === "object" ? job._id || job.id : job) || "");

export function openJobDetails(navigation, job) {
  const jobId = idOf(job);
  if (!jobId || !navigation?.navigate) return false;
  navigation.navigate(JOB_DETAILS, { jobId, ...(job && typeof job === "object" ? { preview: job } : {}) });
  return true;
}

/** Reset the stack to the jobs list (the one under the details screen, else a new one), with appliedJobId. */
export function backToJobsList(navigation, appliedJobId) {
  const state = navigation?.getState?.();
  const params = { appliedJobId: String(appliedJobId || "") };
  if (!state?.routes?.length) {
    navigation?.navigate?.(JOBS_LIST, params);
    return;
  }
  const routes = state.routes;
  let firstJobScreen = routes.findIndex((r) => r.name === JOB_DETAILS || r.name === JOB_APPLICATION_FORM);
  if (firstJobScreen < 0) firstJobScreen = routes.length;
  const below = routes.slice(0, firstJobScreen);
  const listAt = below.map((r) => r.name).lastIndexOf(JOBS_LIST);
  const next = listAt >= 0
    ? [...below.slice(0, listAt), { ...below[listAt], params: { ...(below[listAt].params || {}), ...params } }]
    : [...below, { name: JOBS_LIST, params }];
  navigation.dispatch(CommonActions.reset({ ...state, index: next.length - 1, routes: next }));
}

export function externalApplyUrl(job) {
  return job?.externalUrl || job?.applyUrl || job?.applicationLink || job?.url || null;
}

export function isExternalJob(job) {
  return job?.isExternal === true || job?.source === "external" || job?.applicationType === "external";
}

export function isClosed(job, now = new Date()) {
  if (!job) return false;
  return job.isExpired === true || job.active === false || !!(job.applicationDeadline && new Date(job.applicationDeadline) < now);
}

export function jobState(job, { applied = false, now = new Date() } = {}) {
  if (applied) return "applied";
  if (isClosed(job, now)) return "closed";
  if (isExternalJob(job)) return "external";
  return "open";
}

export default { openJobDetails, backToJobsList, jobState, isClosed, isExternalJob, externalApplyUrl, JOBS_LIST, JOB_DETAILS, JOB_APPLICATION_FORM };
