// app/src/resume/resumeV2.js
// Plan P3a (flag resumeV2): the builder's order per track, the new sections' steps, "build from my tdc profile",
// the one-page estimate and "~N min left". Pure functions (tested in tests/app/resume-v2.test.js).
// Flag off: none of this is used; the builder keeps its 7 steps in today's order.
import { trackOf } from "../utils/resumeRules";

// the builder's own steps are 1..7 (ResumeBuilder.js); the new sections (P3-3) get their own ids
export const EXTRA_STEPS = Object.freeze({
  8: { id: 8, key: "activities", name: "Activities", icon: "people-outline", title: "Leadership & activities", desc: "Societies, clubs, teams, class rep: what you did there" },
  9: { id: 9, key: "volunteering", name: "Volunteering", icon: "heart-outline", title: "Volunteering", desc: "Drives, NGOs, events you helped at (optional)" },
  10: { id: 10, key: "awards", name: "Awards", icon: "trophy-outline", title: "Awards & achievements", desc: "Competitions, scholarships, dean's list (optional)" },
  11: { id: 11, key: "languages", name: "Languages", icon: "chatbubbles-outline", title: "Languages", desc: "The languages you speak, and how well (optional)" },
});
export const KEY_TO_ID = Object.freeze({ personal: 1, education: 2, experience: 3, projects: 4, certifications: 5, summary: 6, skills: 7, activities: 8, volunteering: 9, awards: 10, languages: 11 });

// P3-3 orders. Fresher: what a student has first, experience last and optional. Experienced: today's 7, then the
// new sections as optional extras.
export const ORDER = Object.freeze({
  fresher: Object.freeze([1, 2, 4, 8, 9, 7, 10, 5, 11, 6, 3]),
  experienced: Object.freeze([1, 2, 3, 4, 5, 6, 7, 11, 10, 8]),
  legacy: Object.freeze([1, 2, 3, 4, 5, 6, 7]),
});

/** the builder's step ids in order (flag off: today's 1..7) */
export function stepOrder(resume, v2) {
  if (!v2) return ORDER.legacy;
  return trackOf(resume) === "fresher" ? ORDER.fresher : ORDER.experienced;
}
export const nextStep = (order, id) => order[Math.min(order.length - 1, Math.max(0, order.indexOf(id)) + 1)];
export const prevStep = (order, id) => order[Math.max(0, order.indexOf(id) - 1)];
export const stepIdFor = (step, stepKey, v2) => (v2 && stepKey && KEY_TO_ID[stepKey]) || step;

// rough minutes per step for "~N min left" (a first-time student, tapping more than typing)
const MINUTES = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0.5, 6: 1, 7: 0.5, 8: 1, 9: 0.5, 10: 0.5, 11: 0.5 };
export function minutesLeft(order, activeId) {
  const i = Math.max(0, order.indexOf(activeId));
  const left = order.slice(i).reduce((a, id) => a + (MINUTES[id] || 0.5), 0);
  return Math.max(1, Math.ceil(left));
}

// ---------- "build from my tdc profile" (P3-1) ----------
const str = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
// accounts start with these whether or not the student gave them (models/User.js defaults): never copied
const ACCOUNT_DEFAULTS = new Set(["karachi", "karachi, pakistan"]);
const real = (v) => { const s = str(v); return s && !ACCOUNT_DEFAULTS.has(s.toLowerCase()) ? s : ""; };
const LINK = { linkedin: /linkedin\.com\//i, github: /github\.com\//i };

/**
 * What tdc already knows, as a new resume, and the review screen's report. Only what the student gave: nothing is
 * guessed (no graduation month from a year, no city from the account default, no title made up).
 *   user: the signed-in account (name, email, phone, city, universityName / university.name, headline, skills,
 *         education[{ school, degree }])
 *   profile: the professional profile (headline, university, fieldOfStudy, skills, portfolioLinks) or null
 *   track: "fresher" | "experienced"
 * → { resume, report: { status, sections: [{ key, label, status, step, count }] } }
 */
export function prefillFromProfile({ user = {}, profile = null, track = "fresher" } = {}) {
  const p = profile || {};
  const [firstName, ...rest] = str(user.name || p.fullName).split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ");
  const links = (Array.isArray(p.portfolioLinks) ? p.portfolioLinks : []).map(str).filter(Boolean);
  const linkedin = links.find((l) => LINK.linkedin.test(l)) || "";
  const github = links.find((l) => LINK.github.test(l)) || "";
  const portfolio = links.find((l) => l !== linkedin && l !== github) || "";
  const personalInfo = {
    firstName: firstName || "", lastName,
    title: str(p.headline) || str(user.headline),
    email: str(user.email), phone: str(user.phone),
    city: real(user.city), location: real(user.location),
    linkedin, github, portfolio,
  };
  const uni = str(user.universityName) || str(user.university?.name) || str(p.university);
  const accountEdu = (Array.isArray(user.education) ? user.education : []).filter((e) => e && (str(e.school) || str(e.degree)));
  const education = [];
  if (uni) education.push({ institution: uni, degree: "", fieldOfStudy: str(p.fieldOfStudy), current: true });
  for (const e of accountEdu) {
    if (uni && str(e.school).toLowerCase() === uni.toLowerCase()) { if (!education[0].degree) education[0].degree = str(e.degree); continue; }
    education.push({ institution: str(e.school), degree: str(e.degree), fieldOfStudy: "" });
  }
  const seen = new Set();
  const skills = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(user.skills) ? user.skills : [])]
    .map(str).filter((s) => s && s.length <= 60 && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 20).map((name) => ({ name, level: "Intermediate" }));

  const resume = { personalInfo, education, skills, settings: { track: track === "experienced" ? "experienced" : "fresher" } };
  const contactCount = ["email", "phone"].filter((k) => personalInfo[k]).length;
  const sections = [
    { key: "personal", label: "name and contact", status: firstName && contactCount ? (contactCount === 2 && (personalInfo.city || personalInfo.location) ? "filled" : "check") : "empty", step: 1 },
    { key: "education", label: "education", status: education.length ? "check" : "empty", step: 2, count: education.length, note: education.length ? "add your programme and graduation date" : "" },
    { key: "skills", label: "skills", status: skills.length ? "filled" : "empty", step: 7, count: skills.length },
    { key: "links", label: "links", status: linkedin || github || portfolio ? "filled" : "empty", step: 1 },
    { key: "title", label: "headline", status: personalInfo.title ? "filled" : "empty", step: 1 },
  ];
  return { resume, report: { status: "complete", source: "profile", sections } };
}

// ---------- one-page estimate (P3-5) ----------
// A4 at the templates' size: about 60 lines of ~95 characters. An estimate, shown as advice only.
const LINES_PER_PAGE = 60;
const CHARS_PER_LINE = 95;
const lines = (t) => (str(t) ? Math.ceil(str(t).length / CHARS_PER_LINE) : 0);
const list = (v) => (Array.isArray(v) ? v : []);
export function pageEstimate(r = {}) {
  let n = 4; // name, title, contact
  const section = (items, per) => { const xs = list(items).filter(Boolean); if (!xs.length) return; n += 2; xs.forEach((x) => { n += per(x); }); };
  if (str(r.professionalSummary?.summary)) n += 2 + lines(r.professionalSummary.summary);
  section(r.workExperience, (w) => 1 + lines(w.description) + list(w.achievements).reduce((a, b) => a + lines(b), 0));
  section(r.education, (e) => 1 + (str(e.degree) || str(e.fieldOfStudy) || str(e.grade) ? 1 : 0) + lines(e.description));
  if (list(r.coursework).length) n += lines(list(r.coursework).join(", "));
  section(r.projects, (p) => 1 + (list(p.technologies).length ? 1 : 0) + lines(p.description));
  section(r.activities, (a) => 1 + lines(a.description) + list(a.bullets).reduce((x, b) => x + lines(b), 0));
  section(r.volunteering, (a) => 1 + lines(a.description) + list(a.bullets).reduce((x, b) => x + lines(b), 0));
  section(r.awards, (a) => 1 + lines(a.note));
  section(r.certifications, () => 1);
  const sk = list(r.skills).map((s) => str(typeof s === "string" ? s : s?.name)).filter(Boolean);
  if (sk.length) n += 2 + lines(sk.join(", "));
  const lg = list(r.languages).filter((l) => str(l?.name));
  if (lg.length) n += 2 + lines(lg.map((l) => l.name).join(", "));
  const ach = list(r.achievements).filter((a) => str(a));
  if (ach.length) n += 2 + ach.reduce((a, b) => a + lines(b), 0);
  const pages = Math.max(1, Math.ceil(n / LINES_PER_PAGE));
  return { lines: n, pages, fits: n <= LINES_PER_PAGE, over: Math.max(0, n - LINES_PER_PAGE) };
}
export function fitLine(est) {
  if (est.fits) return "fits on 1 page ✓";
  return `spills by about ${est.over} line${est.over === 1 ? "" : "s"}: shorten a few lines or pick Compact`;
}

// ---------- month + year (P3-5) ----------
export const MONTHS = Object.freeze(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
/** a stored date → { m: 0-11, y } or null */
export function toMonthYear(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return { m: d.getUTCMonth(), y: d.getUTCFullYear() };
}
/** the month and year the student picked → "YYYY-MM-01" (the day is never shown) */
export const fromMonthYear = (m, y) => `${y}-${String(m + 1).padStart(2, "0")}-01`;
export const monthYearLabel = (v) => { const my = toMonthYear(v); return my ? `${MONTHS[my.m]} ${my.y}` : ""; };
