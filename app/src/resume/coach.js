// app/src/resume/coach.js
// Plan P3-4 / P3-4b (flags resumeV2 + resumeCoach): the coach's calls (/api/resume/ai/*) and the rules the coach
// screens share: memory joggers per programme, one tip per step, a labelled example per section, the "ready to
// send" checklist, and the session meter (real time and typing, sent as funnel events so minutes are measured, never
// claimed). Pure functions apart from the calls (tested in tests/app/resume-coach.test.js).
import AsyncStorage from "@react-native-async-storage/async-storage";
// the api client is loaded on first use (keeps the builder light to import, like analytics/funnel.js)
const client = () => { const m = require("../api/api"); return m.default || m; };
import { resumeStrength } from "../utils/resumeRules";
import { pageEstimate } from "./resumeV2";

export const COACH_FLAG = "resumeCoach";
export const SPEAK_FLAG = "resumeSpeak";
const data = (r) => r?.data?.data ?? null;

export const coachCall = async (action, facts) => data(await client().post("/resume/ai/coach", { action, facts }, { timeout: 45000 }));
export const checkField = async (field, text, current) => data(await client().post("/resume/ai/check", { field, text, current: !!current }, { timeout: 20000 }))?.issues || [];
export const autofixPreview = async (resumeId) => data(await client().post("/resume/ai/autofix", { resumeId }, { timeout: 20000 }));
export async function transcribe(uri, seconds) {
  const form = new FormData();
  form.append("seconds", String(Math.round(seconds || 0)));
  form.append("audio", { uri, name: "answer.m4a", type: "audio/m4a" });
  return data(await client().post("/resume/ai/transcribe", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 45000 }))?.text || "";
}

// ---------- the programme ----------
const str = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
export function programmeOf(resume) {
  const e = (Array.isArray(resume?.education) ? resume.education : []).find((x) => str(x?.degree) || str(x?.fieldOfStudy));
  return e ? [str(e.degree), str(e.fieldOfStudy)].filter(Boolean).join(", ") : "";
}
/** "cs" | "business" | "other" from the programme text */
export function fieldOf(programme) {
  const p = str(programme).toLowerCase();
  if (/(computer|software|\bcs\b|\bse\b|\bit\b|data|information tech|electrical|engineer|\bai\b)/.test(p)) return "cs";
  if (/(bba|business|commerce|account|finance|market|economic|management|\bhr\b|mba)/.test(p)) return "business";
  return "other";
}

// ---------- memory joggers (P3-4b §2): what first-timers forget they have ----------
// each becomes an entry in `section`, with two quick questions
const JOGGERS = [
  { key: "tuition", label: "tuition / teaching", section: "workExperience", role: "Tutor", ask: "who did you teach? (e.g. O level maths, 3 students)", did: ["taught a subject", "prepared lessons", "helped with exams", "tracked progress"] },
  { key: "family", label: "family business help", section: "workExperience", role: "Assistant", ask: "what is the business? (e.g. my family's pharmacy)", did: ["handled customers", "kept accounts", "managed stock", "ran social media"] },
  { key: "freelance", label: "freelancing (Fiverr, Upwork)", section: "workExperience", role: "Freelancer", ask: "what did you offer? (e.g. logo design on Fiverr)", did: ["delivered client orders", "talked to clients", "met deadlines", "built a portfolio"] },
  { key: "page", label: "a social media page you run", section: "activities", role: "Page creator", ask: "what is the page about?", did: ["created content", "grew followers", "worked with brands", "edited videos"] },
  { key: "eventvol", label: "event volunteering", section: "volunteering", role: "Volunteer", ask: "which event or organisation?", did: ["managed registrations", "guided guests", "set up the venue", "handled logistics"] },
  { key: "sports", label: "sports team / captain", section: "activities", role: "Team member", ask: "which sport and team?", did: ["played in tournaments", "captained the team", "trained juniors", "organised matches"] },
  { key: "society", label: "society role", section: "activities", role: "Member", ask: "which society, and your role?", did: ["organised events", "managed social media", "handled money", "led a team"] },
  { key: "hackathon", label: "hackathon / competition", section: "awards", role: "", ask: "which competition, and how did it go?", did: [] },
  { key: "fyp", label: "final-year or semester project", section: "projects", role: "", ask: "what was the project called?", did: ["built it", "researched", "presented it", "worked in a team"] },
  { key: "course", label: "online course certificate", section: "certifications", role: "", ask: "which course, and from where? (e.g. Google Data Analytics, Coursera)", did: [] },
  { key: "ngo", label: "NGO / charity drive", section: "volunteering", role: "Volunteer", ask: "which NGO or drive?", did: ["collected donations", "packed and delivered", "raised awareness", "coordinated volunteers"] },
  { key: "parttime", label: "part-time job", section: "workExperience", role: "", ask: "where, and what was your role?", did: ["served customers", "handled cash", "worked shifts", "trained new staff"] },
  { key: "content", label: "content creation", section: "activities", role: "Content creator", ask: "what kind of content, and where?", did: ["wrote posts", "made videos", "grew an audience", "worked with brands"] },
  { key: "cr", label: "class representative (CR)", section: "activities", role: "Class representative", ask: "which class or batch?", did: ["represented the class", "coordinated with teachers", "shared updates", "organised class events"] },
  { key: "github", label: "GitHub projects", section: "projects", role: "", ask: "which project? (name or what it does)", did: ["built it", "wrote the code", "deployed it", "fixed bugs"], fields: ["cs"] },
  { key: "bizplan", label: "business plan competition / case study", section: "awards", role: "", ask: "which competition or case study?", did: [], fields: ["business"] },
];
/** the joggers for this programme (CS sees hackathon / GitHub first; BBA sees business plan / case study) */
export function joggersFor(programme, sections = null) {
  const f = fieldOf(programme);
  const firstKeys = f === "cs" ? ["hackathon", "github", "fyp", "freelance"] : f === "business" ? ["bizplan", "society", "family", "fyp"] : ["society", "tuition", "eventvol", "fyp"];
  const list = JOGGERS.filter((j) => !j.fields || j.fields.includes(f)).filter((j) => !sections || sections.includes(j.section));
  const first = firstKeys.map((k) => list.find((j) => j.key === k)).filter(Boolean); // in this order
  return [...first, ...list.filter((j) => !firstKeys.includes(j.key))];
}

// ---------- the story prompts (P3-4): "what did you do there?" chips per section ----------
export const DID_CHIPS = Object.freeze({
  activities: ["organised events", "managed social media", "handled money", "led a team", "recruited members", "designed posters"],
  volunteering: ["organised a drive", "collected donations", "taught children", "managed volunteers", "handled logistics"],
  workExperience: ["served customers", "handled data entry", "made reports", "supported the team", "managed social media", "answered queries"],
  projects: ["built it", "researched", "designed the screens", "wrote the report", "presented it", "worked in a team"],
});

// ---------- one tip per step (P3-4b §4), shown once, dismissible ----------
export const TIPS = Object.freeze({
  1: "use a firstname.lastname email and a +92 phone number: it's the first thing a recruiter checks.",
  2: "add your expected graduation date: internship screeners look for it first.",
  3: "recruiters read this in seconds, so start each line with a verb like organised, built, led.",
  4: "one line on what you built and what it does beats a long description.",
  5: "only list certificates you finished, with the platform's name.",
  6: "2–3 lines: who you are, what you're good at, what you want next.",
  7: "pick skills you could talk about in an interview, and show soft skills with an example.",
  8: "a society, a team or class rep counts: say what you did, not just the title.",
  9: "one-day drives count too: say what you did there.",
  10: "competitions, scholarships and dean's list all belong here.",
  11: "say how well you speak each one, honestly.",
});
const tipKey = (step) => `@tdc_resume_tip_seen:${step}`;
export async function tipSeen(step) { try { return (await AsyncStorage.getItem(tipKey(step))) === "1"; } catch { return false; } }
export async function dismissTip(step) { try { await AsyncStorage.setItem(tipKey(step), "1"); } catch { /* best effort */ } }

// ---------- "see a good example" (clearly an example, never copied into the resume) ----------
const EX = {
  cs: {
    projects: "Campus Ride (final-year project): a React Native app that matches students going the same way; built the matching screen and the login.",
    activities: "Events lead, IEEE student branch: organised a two-day coding workshop and managed the branch's Instagram.",
    summary: "Final-year computer science student who builds mobile apps in React Native. Looking for a software engineering internship.",
    workExperience: "Freelance web developer (Fiverr): built small business websites and kept clients updated until delivery.",
  },
  business: {
    projects: "Cafe business plan (class project): researched campus demand and wrote the pricing and marketing sections.",
    activities: "Marketing lead, Business Society: ran the society's Instagram and organised the welcome week.",
    summary: "BBA student who runs the business society's marketing. Looking for a marketing internship.",
    workExperience: "Assistant, family pharmacy: handled customers and kept the daily sales record.",
  },
  other: {
    projects: "Semester project: researched water use on campus and presented the findings to the department.",
    activities: "Class representative: shared updates with 40 classmates and coordinated with teachers.",
    summary: "Student who organises events and works well with people. Looking for an internship to grow in my field.",
    workExperience: "Tutor: taught O level maths to two students after classes.",
  },
};
export const exampleFor = (programme, section) => (EX[fieldOf(programme)] || EX.other)[section] || "";

// ---------- "ready to send" (P3-4b §6): advises, never blocks ----------
const dated = (e) => !!(e?.startDate || e?.endDate || e?.current || e?.date || e?.issueDate);
export function readyChecklist(resume = {}, { spellingLeft = 0, atsSafe = true } = {}) {
  const pi = resume.personalInfo || {};
  const entries = ["workExperience", "education", "projects", "activities", "volunteering"].flatMap((k) => (Array.isArray(resume[k]) ? resume[k] : []).filter((e) => e && Object.values(e).some((v) => str(typeof v === "string" ? v : ""))));
  const est = pageEstimate(resume);
  const role = str(resume.targetJob?.jobTitle || (Array.isArray(resume.targetJobs) ? resume.targetJobs[0]?.jobTitle : ""));
  const summary = str(resume.professionalSummary?.summary).toLowerCase();
  const roleWords = role.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  return [
    { key: "contact", text: "contact details complete", ok: !!(str(pi.firstName) && str(pi.email) && str(pi.phone)) },
    { key: "pages", text: est.fits ? "fits on one page" : `about ${est.pages} pages (one is best for internships)`, ok: est.fits },
    { key: "dates", text: "every entry has dates", ok: entries.length > 0 && entries.every(dated) },
    { key: "spelling", text: spellingLeft ? `${spellingLeft} spelling ${spellingLeft === 1 ? "issue" : "issues"} left` : "no spelling issues left", ok: !spellingLeft },
    { key: "ats", text: atsSafe ? "an ATS-safe template for online portals" : "a design template: best for printing", ok: !!atsSafe },
    { key: "summary", text: role ? `summary matches "${role}"` : "pick the job you want so the summary can match it", ok: !!(role && summary && roleWords.some((w) => summary.includes(w))) },
  ];
}

// ---------- the session meter: real time and typing to a one-page resume ----------
// starts when the coach opens a resume, counts characters the student typed (contact details excluded) and taps,
// and records once when the resume first reaches "strong" (80+) on one page. Sent as funnel events.
const meterKey = (id) => `@tdc_resume_meter:${id}`;
export async function meterRead(id) { try { return JSON.parse((await AsyncStorage.getItem(meterKey(id))) || "null"); } catch { return null; } }
async function meterWrite(id, m) { try { await AsyncStorage.setItem(meterKey(id), JSON.stringify(m)); } catch { /* best effort */ } }
export async function meterStart(id, mode, now = Date.now()) {
  if (!id) return null;
  const m = (await meterRead(id)) || { startedAt: now, typed: 0, taps: 0, mode, done: false };
  if (!m.mode) m.mode = mode;
  await meterWrite(id, m);
  return m;
}
export async function meterAdd(id, { typed = 0, taps = 0 } = {}) {
  if (!id) return;
  const m = await meterRead(id);
  if (!m || m.done) return;
  m.typed += Math.max(0, typed); m.taps += Math.max(0, taps);
  await meterWrite(id, m);
}
/** → { seconds, typed, taps, mode } the first time the resume is strong and fits one page, else null */
export async function meterCheck(id, resume, now = Date.now()) {
  const m = await meterRead(id);
  if (!m || m.done) return null;
  if (resumeStrength(resume).score < 80 || !pageEstimate(resume).fits) return null;
  m.done = true;
  await meterWrite(id, m);
  return { seconds: Math.round((now - m.startedAt) / 1000), typed: m.typed, taps: m.taps, mode: m.mode || "tap" };
}
