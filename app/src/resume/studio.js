// app/src/resume/studio.js
// P3-6 template studio (flags resumeV2 + resumeTemplatesV2): what the gallery shows and recommends. Pure functions
// (tests/app/resume-studio.test.js).
//   galleryTemplates()      the five + the library templates the owner approved, each with its collection and badge
//   recommend(resume, list) up to 3 { id, reason }: from the track, the strongest section, the programme, the target
//   badgeOf(id)             "safe" (ATS-safe, tested on the real PDF) | "design" | null
import { TEMPLATES } from '../services/templateService';
import { approvedLibrary, OLD_BADGES, COLLECTIONS } from '../services/templates/library';
import { trackOf } from '../utils/resumeRules';
import { programmeOf, fieldOf } from './coach';

export { COLLECTIONS };
export const STUDIO_FLAG = 'resumeTemplatesV2';

// hidden: ids the admin took out (GET /resume/templates/hidden); keep: the student's applied template stays listed
export function galleryTemplates(hidden = [], keep = null) {
  const out = new Set(Array.isArray(hidden) ? hidden.filter((id) => id !== keep) : []);
  return [
    ...TEMPLATES.map((t) => ({ ...t, collection: 'ats', ats: OLD_BADGES[t.id] || null, older: true })),
    ...approvedLibrary().map((t) => ({ id: t.id, name: t.name, description: t.description, collection: t.collection, ats: t.ats || null, older: false })),
  ].filter((t) => !out.has(t.id));
}

export function badgeOf(id, list = galleryTemplates()) {
  return (list.find((t) => t.id === id) || {}).ats || null;
}

const count = (v) => (Array.isArray(v) ? v.filter(Boolean).length : 0);
const role = (r) => String(r?.targetJob?.jobTitle || (Array.isArray(r?.targetJobs) ? r.targetJobs[0]?.jobTitle : '') || '').toLowerCase();

/** up to 3 recommendations with the reason shown under each (only templates in the list) */
export function recommend(resume = {}, list = galleryTemplates()) {
  const have = new Set(list.map((t) => t.id));
  const out = [];
  const add = (id, reason) => { if (have.has(id) && !out.some((x) => x.id === id) && out.length < 3) out.push({ id, reason }); };
  const fresher = trackOf(resume) === 'fresher';
  const field = fieldOf(programmeOf(resume));
  const target = role(resume);
  const projects = count(resume.projects);
  const acts = count(resume.activities) + count(resume.volunteering);
  if (/\b(ms|mphil|phd|research|scholarship|graduate school)\b/.test(target)) add('scholar', 'you\'re aiming for further study: education and awards lead');
  if (/intern/.test(target)) add('internship_ready', 'built for internship applications: education and skills up front');
  if (fresher) {
    if (projects >= 2 && projects >= acts) add('project_first', 'your projects are your strongest section');
    if (acts >= 2) add('society_leader', 'you lead activities: they come right after education');
    if (field === 'cs') add('project_first', 'computer science: recruiters look at what you built');
    add('campus', 'made for students: education first, clean and bold');
    add('first_step', 'made for students: calm and easy to read');
  } else {
    add('harvard', 'ATS Pro: the classic layout portals and banks expect');
    add('clean_line', 'ATS Pro: minimal and easy to scan');
  }
  add('modern_ats', 'clean and safe for any job portal');
  add('stanford', 'classic and safe for any job portal');
  add('jakes', 'compact: fits more on one page');
  return out;
}
