// app/src/utils/jobRoutes.js
// Where a job push / notification goes (used by every notification handler and the old-name redirect screen).
// No imports, so the push code can load it without the navigation library. utils/careerNav.js re-exports it.
// Route names job pushes and notifications have used. "TDCCareers" (the old TDC careers screen, still the server's
// route name for job notifications so installed 1.1.x apps open it) and "MyApplications" (hiring-timeline pushes;
// never a registered screen) are accepted and sent to the job.
export const OLD_JOB_ROUTES = new Set(["TDCCareers", "MyApplications"]);
const JOBS_LIST = "Career";
const JOB_DETAILS = "JobDetails";
const JOB_ROUTES = new Set([...OLD_JOB_ROUTES, JOBS_LIST, JOB_DETAILS]);

/**
 * Where a push / notification about jobs goes. route + params as the notification names them, data = the push data or
 * notification metadata (jobId, careerJobId, applicationId may sit there instead of params).
 *   a job id      → the jobs list with { openJobId }: JobDetails opens on top (Apply → JobApplicationForm)
 *   an invite to apply without a job id → the Resume dashboard, scrolled to "invites to apply"
 *   no job id, an application (old notifications) → the jobs list with "my applications" open
 *   neither (the old TDC list) → the jobs list showing TDC jobs
 * Other routes pass through unchanged.
 */
export function jobTarget(route, params = {}, data = {}) {
  if (!route || !JOB_ROUTES.has(route)) return { route, params };
  const p = params || {};
  const d = data || {};
  const jobId = p.openJobId || p.jobId || d.jobId || d.careerJobId || d.params?.openJobId || d.params?.jobId;
  if (jobId) return { route: JOBS_LIST, params: { openJobId: String(jobId?._id || jobId) } };
  if (p.careerInviteId || d.careerInviteId) return { route: "Resume", params: { screen: "ResumeDashboard", params: { openInvites: true } } };
  if (route === JOB_DETAILS) return { route: JOBS_LIST, params: {} };
  if (route === JOBS_LIST) return { route, params: p };
  if (route === "MyApplications" || p.applicationId || d.applicationId) return { route: JOBS_LIST, params: { openApplications: true } };
  return { route: JOBS_LIST, params: { tdc: true } };
}

export default { jobTarget, OLD_JOB_ROUTES };
