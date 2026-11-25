// app/src/resume/finishApi.js
// P3d calls (server routes/resumeFinish.routes.js, each behind resumeV2 + its own flag):
//   getFeedback(resumeId)              POST /resume/:id/feedback        → { strong, weak, improvements, ai, cached }
//   verifiedFacts()                    GET  /resume/verified-facts      → { facts: [{ kind, text, url? }] }
//   getPublicPage(resumeId)            GET  /resume/:id/public-page     → { on, url, showPhone, showEmail, views, selfUrl }
//   setPublicPage(resumeId, patch)     PUT  /resume/:id/public-page     { on?, showPhone?, showEmail? }
//   newPublicLink(resumeId)            POST /resume/:id/public-page/new-link
//   templateOutcomes()                 GET  /resume/template-outcomes   → { templates: [{ id, applications, interviews, rate }] }
// The api client is loaded on first use (keeps the screens light to import and testable).
const client = () => { const m = require("../api/api"); return m.default || m; };
const data = (r) => r?.data?.data;

export const getFeedback = async (resumeId) => data(await client().post(`/resume/${encodeURIComponent(resumeId)}/feedback`, {}, { timeout: 45000 }));
export const verifiedFacts = async () => data(await client().get("/resume/verified-facts", { timeout: 15000 })) || { facts: [] };
export const getPublicPage = async (resumeId) => data(await client().get(`/resume/${encodeURIComponent(resumeId)}/public-page`, { timeout: 15000 }));
export const setPublicPage = async (resumeId, patch) => data(await client().put(`/resume/${encodeURIComponent(resumeId)}/public-page`, patch, { timeout: 15000 }));
export const newPublicLink = async (resumeId) => data(await client().post(`/resume/${encodeURIComponent(resumeId)}/public-page/new-link`, {}, { timeout: 15000 }));
// r7 (P3-9, resumeWriter): { paragraphs, ai, message? } and { headline, about, ai, message? } (ai false: nothing written)
export const writeCoverLetter = async (resumeId, body) => data(await client().post(`/resume/${encodeURIComponent(resumeId)}/cover-letter`, body, { timeout: 60000 }));
export const writeLinkedin = async (resumeId) => data(await client().post(`/resume/${encodeURIComponent(resumeId)}/linkedin`, {}, { timeout: 60000 }));
// owner (25 Nov 2026): GET /resume/templates/hidden → the template ids the admin took out of the gallery
export const hiddenTemplates = async () => (data(await client().get("/resume/templates/hidden", { timeout: 15000 })) || {}).hidden || [];
export const templateOutcomes = async () => data(await client().get("/resume/template-outcomes", { timeout: 15000 })) || { templates: [] };
