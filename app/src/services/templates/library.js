// app/src/services/templates/library.js
// P3c template studio: the new templates as config (layout + theme), rendered by templateService's engine. Step 1
// (owner): the first 10 for design approval: 7 Fresher & Student + 3 ATS Pro. All single column with real text, so
// all are ATS-safe candidates (the badge comes only after the PDF text test in step 2). Not selectable in the app
// until step 2 (flag resumeTemplatesV2); the picker still shows the five.
// Fonts: DM Sans / Outfit are already in the app; serif themes use Georgia with serif fallbacks. The final embedded
// font pairs (owner #3) come in step 2, so the type in these previews may change slightly then.

const DM = "'DM Sans', 'Helvetica Neue', Helvetica, Arial, 'Noto Sans', 'Noto Naskh Arabic', sans-serif";
const OUTFIT = "'Outfit', 'DM Sans', 'Helvetica Neue', Arial, 'Noto Sans', 'Noto Naskh Arabic', sans-serif";
const SERIF = "Georgia, 'Times New Roman', 'Noto Serif', 'Noto Naskh Arabic', serif";
// a little tighter than the five (10 pt, 1.35): a typical fresher fits on one A4 page by default (plan P3-6 §4)
const BASE = { body: DM, head: DM, size: 10, line: 1.35, nameSize: 22, align: 'left', h2: 'plain', gap: 8 };

// a student leads with education, projects and activities; experience (optional) last
const FRESHER_ORDER = ['education', 'projects', 'activities', 'volunteering', 'skills', 'awards', 'certifications', 'languages', 'experience'];

export const LIBRARY = [
  // ---------- Fresher & Student ----------
  {
    id: 'campus', name: 'Campus', collection: 'fresher', description: 'a colour band for your name, clean sections',
    look: { ...BASE, head: OUTFIT, band: true, h2x: 'caps-spaced', accent: '#0F766E', heading: '#0F172A', text: '#1F2937', order: FRESHER_ORDER, skillSep: ' · ' },
  },
  {
    id: 'first_step', name: 'First Step', collection: 'fresher', description: 'centred and calm, serif headings',
    look: { ...BASE, head: SERIF, nameSize: 24, align: 'center', h2: 'full-rule', accent: '#1E3A8A', heading: '#111827', text: '#1F2937', order: FRESHER_ORDER },
  },
  {
    id: 'fresh_start', name: 'Fresh Start', collection: 'fresher', description: 'bold name, a coloured bar on each heading',
    look: { ...BASE, head: OUTFIT, nameSize: 25, h2x: 'bar-left', accent: '#C2410C', heading: '#111827', text: '#1F2937', order: FRESHER_ORDER, nameAccent: false },
  },
  {
    id: 'society_leader', name: 'Society Leader', collection: 'fresher', description: 'leadership and activities right after education',
    look: { ...BASE, head: OUTFIT, nameAccent: true, h2x: 'underline-accent', accent: '#6D28D9', heading: '#111827', text: '#1F2937',
      order: ['education', 'activities', 'volunteering', 'projects', 'skills', 'awards', 'certifications', 'languages', 'experience'] },
  },
  {
    id: 'project_first', name: 'Project First', collection: 'fresher', description: 'projects on top, for builders and makers',
    look: { ...BASE, h2x: 'thin-rule', dateAccent: true, accent: '#2563EB', heading: '#0F172A', text: '#1E293B', skillSep: ' · ',
      order: ['projects', 'education', 'skills', 'activities', 'volunteering', 'awards', 'certifications', 'languages', 'experience'] },
  },
  {
    id: 'internship_ready', name: 'Internship Ready', collection: 'fresher', description: 'compact, education and skills up front',
    look: { ...BASE, size: 9.5, line: 1.3, nameSize: 20, gap: 7, margin: '12mm 13mm', h2: 'accent-rule', accent: '#15803D', heading: '#0F172A', text: '#1F2937', subPlain: true,
      order: ['education', 'skills', 'projects', 'activities', 'volunteering', 'experience', 'awards', 'certifications', 'languages'] },
  },
  {
    id: 'scholar', name: 'Scholar', collection: 'fresher', description: 'academic: education, awards and research first',
    // owner: distinct from Harvard: a short burgundy line under letter-spaced headings, the name in burgundy
    look: { ...BASE, body: SERIF, head: SERIF, nameSize: 22, align: 'center', h2x: 'short-rule', nameAccent: true, accent: '#7F1D1D', heading: '#111111', text: '#222222',
      order: ['education', 'awards', 'projects', 'activities', 'volunteering', 'skills', 'languages', 'certifications', 'experience'],
      headings: { projects: 'Research & Projects', awards: 'Honours & Awards' } },
  },
  // ---------- ATS Pro ----------
  {
    id: 'harvard', name: 'Harvard', collection: 'ats', description: 'the classic: serif, centred, ruled headings',
    look: { ...BASE, body: SERIF, head: SERIF, size: 10, line: 1.32, nameSize: 20, align: 'center', h2x: 'smallcaps-rule', accent: '#111111', heading: '#111111', text: '#111111', subPlain: false },
  },
  {
    id: 'clean_line', name: 'Clean Line', collection: 'ats', description: 'minimal sans, thin lines, lots of air',
    look: { ...BASE, line: 1.36, gap: 8, nameSize: 22, h2x: 'thin-rule', accent: '#0F172A', heading: '#0F172A', text: '#334155', second: '#94A3B8', subPlain: true },
  },
  {
    id: 'two_tone', name: 'Two-tone', collection: 'ats', description: 'name and headings in two calm colours',
    look: { ...BASE, head: OUTFIT, nameAccent: true, second: '#0E7490', h2x: 'thin-rule', accent: '#1E3A8A', heading: '#0F172A', text: '#1F2937', dateAccent: true },
  },
];

export const COLLECTIONS = Object.freeze({ fresher: 'Fresher & Student', ats: 'ATS Pro' });
