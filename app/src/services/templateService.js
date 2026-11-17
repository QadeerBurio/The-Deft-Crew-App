// app/src/services/templateService.js — the resume as HTML, for the preview, the PDF (expo-print) and sharing.
// One renderer, five ATS-friendly looks: single column, real text (no tables, no columns, no images), the same
// fonts and spacing rules, A4 with page margins on every page, and an entry never split across two pages.
// The preview and the PDF use the same HTML; `isPrinting` is kept for old callers and changes nothing.
//   renderResumeHTML(resume, templateId, customStyles?) -> full HTML document
//   TEMPLATES                                            -> [{ id, name, description }] for the picker
//   canonicalTemplate(id)                                -> one of the five ids (old ids map to their closest)

export const TEMPLATES = [
  { id: 'modern_ats', name: 'Modern', description: 'clean sans-serif, coloured headings' },
  { id: 'stanford', name: 'Classic', description: 'serif, centred name, ruled headings' },
  { id: 'jakes', name: 'Compact', description: 'tight spacing, fits more on one page' },
  { id: 'rezi', name: 'Minimal', description: 'black and white, no colour at all' },
  { id: 'faang', name: 'Executive', description: 'serif headings, bold name bar' },
];

const LEGACY = { modern: 'modern_ats', classic: 'stanford', creative: 'modern_ats', canva: 'modern_ats', flowcv: 'modern_ats', reactive: 'jakes', minimal: 'rezi', professional: 'faang' };
export const canonicalTemplate = (id) => (TEMPLATES.some((t) => t.id === id) ? id : LEGACY[id] || 'modern_ats');

const SANS = "'Helvetica Neue', Helvetica, Arial, 'Noto Sans', 'Noto Naskh Arabic', sans-serif";
const SERIF = "Georgia, 'Times New Roman', 'Noto Serif', 'Noto Naskh Arabic', serif";

// the five looks: only type, size, colour and heading style differ
const LOOKS = {
  modern_ats: { body: SANS, head: SANS, size: 10.5, line: 1.4, nameSize: 22, align: 'left', h2: 'accent-rule', gap: 10 },
  stanford: { body: SERIF, head: SERIF, size: 10.5, line: 1.38, nameSize: 22, align: 'center', h2: 'full-rule', gap: 10 },
  jakes: { body: SANS, head: SANS, size: 9.5, line: 1.3, nameSize: 19, align: 'center', h2: 'full-rule', gap: 7 },
  rezi: { body: SANS, head: SANS, size: 10.5, line: 1.4, nameSize: 21, align: 'left', h2: 'plain', gap: 10, mono: true },
  faang: { body: SANS, head: SERIF, size: 10.5, line: 1.4, nameSize: 23, align: 'left', h2: 'accent-rule', gap: 10, nameBar: true },
};

export const getDisplayLocation = (resume) => {
  if (!resume) return '';
  const pi = resume.personalInfo || {};
  if (typeof pi.location === 'string' && pi.location.trim()) return pi.location.trim();
  const parts = [pi.city, pi.state, pi.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (typeof resume.targetJob?.location === 'string' && resume.targetJob.location.trim()) return resume.targetJob.location.trim();
  return '';
};

const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const list = (v) => (Array.isArray(v) ? v : []);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ISO dates from the server -> "Jun 2023"; what the student typed ("Jun 2023", "2021") stays as typed
export const formatDate = (d) => {
  const t = str(d);
  if (!t) return '';
  const m = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:T.*)?$/);
  if (m) return t.length > 7 && m[2] === '01' && m[3] === '01' && /T00:00:00/.test(t) ? m[1] : `${MONTHS[+m[2] - 1] || ''} ${m[1]}`.trim();
  return t;
};
export const formatDateRange = (start, end, current) => {
  const a = formatDate(start);
  const b = current ? 'Present' : formatDate(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
};

const link = (u) => {
  const t = str(u);
  if (!t) return '';
  const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return `<a href="${esc(href)}">${esc(t.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))}</a>`;
};

// a description: lines starting with -, • or * become bullets, other lines stay paragraphs
const lines = (text, extra = []) => {
  const all = [...str(text).split(/\n+/), ...list(extra)].map(str).filter(Boolean);
  const bullets = [];
  const paras = [];
  for (const l of all) {
    if (/^[-•*▪◦]\s*/.test(l) || extra.includes(l)) bullets.push(l.replace(/^[-•*▪◦]\s*/, ''));
    else paras.push(l);
  }
  return paras.map((p) => `<p dir="auto">${esc(p)}</p>`).join('') + (bullets.length ? `<ul>${bullets.map((b) => `<li dir="auto">${esc(b)}</li>`).join('')}</ul>` : '');
};

const entry = (title, sub, date, body) => `
  <div class="entry">
    <div class="row"><span class="t" dir="auto">${title}</span>${date ? `<span class="d">${esc(date)}</span>` : ''}</div>
    ${sub ? `<div class="sub" dir="auto">${sub}</div>` : ''}
    ${body || ''}
  </div>`;

const section = (title, inner) => (inner ? `<section><h2>${esc(title)}</h2>${inner}</section>` : '');

function body(resume) {
  const r = resume || {};
  const pi = r.personalInfo || {};
  const name = [str(pi.firstName), str(pi.lastName)].filter(Boolean).join(' ');
  const title = str(pi.title) || str(r.professionalSummary?.title);
  const contact = [esc(getDisplayLocation(r)), esc(str(pi.phone)), str(pi.email) ? `<a href="mailto:${esc(str(pi.email))}">${esc(str(pi.email))}</a>` : '', link(pi.linkedin), link(pi.github), link(pi.portfolio)].filter(Boolean);

  const work = list(r.workExperience).filter((w) => w && (str(w.company) || str(w.position))).map((w) => entry(
    esc(str(w.position) || str(w.company)),
    esc([str(w.position) ? str(w.company) : '', str(w.location)].filter(Boolean).join(' · ')),
    formatDateRange(w.startDate, w.endDate, w.current),
    lines(w.description, list(w.achievements)),
  )).join('');

  const edu = list(r.education).filter((e) => e && (str(e.institution) || str(e.degree))).map((e) => {
    const degree = [str(e.degree), str(e.fieldOfStudy)].filter(Boolean).join(', ');
    const grade = str(e.grade) || (e.gpa ? `GPA ${e.gpa}` : '');
    return entry(esc(str(e.institution) || degree), esc([str(e.institution) ? degree : '', grade].filter(Boolean).join(' · ')), formatDateRange(e.startDate, e.endDate, e.current), lines(e.description));
  }).join('');

  const projects = list(r.projects).filter((p) => p && str(p.name)).map((p) => entry(
    esc(str(p.name)) + (str(p.url) ? ` · ${link(p.url)}` : '') + (str(p.githubUrl) ? ` · ${link(p.githubUrl)}` : ''),
    esc(list(p.technologies).map(str).filter(Boolean).join(', ')),
    formatDateRange(p.startDate, p.endDate, false),
    lines(p.description),
  )).join('');

  const skills = list(r.skills).map((s) => str(typeof s === 'string' ? s : s?.name)).filter(Boolean);
  const certs = list(r.certifications).filter((c) => c && str(c.name)).map((c) => entry(esc(str(c.name)), esc(str(c.organization)), formatDate(c.issueDate), str(c.credentialUrl) ? `<p>${link(c.credentialUrl)}</p>` : '')).join('');
  const langs = list(r.languages).filter((l) => l && str(l.name)).map((l) => esc(str(l.name)) + (str(l.proficiency) ? ` (${esc(str(l.proficiency))})` : ''));
  const achievements = list(r.achievements).map(str).filter(Boolean);
  const summary = str(r.professionalSummary?.summary);

  const workFirst = work.length > 0;
  return `
  <header>
    <h1 dir="auto">${esc(name || 'Your name')}</h1>
    ${title ? `<div class="title" dir="auto">${esc(title)}</div>` : ''}
    ${contact.length ? `<div class="contact">${contact.join('<span class="sep"> | </span>')}</div>` : ''}
  </header>
  ${section('Summary', summary ? `<p dir="auto">${esc(summary)}</p>` : '')}
  ${workFirst ? section('Experience', work) : ''}
  ${section('Education', edu)}
  ${workFirst ? '' : section('Experience', work)}
  ${section('Projects', projects)}
  ${section('Skills', skills.length ? `<p class="skills" dir="auto">${skills.map(esc).join(', ')}</p>` : '')}
  ${section('Certifications', certs)}
  ${section('Languages', langs.length ? `<p dir="auto">${langs.join(', ')}</p>` : '')}
  ${section('Achievements', achievements.length ? `<ul>${achievements.map((a) => `<li dir="auto">${esc(a)}</li>`).join('')}</ul>` : '')}
  ${section('Additional information', str(r.otherNotes) ? lines(r.otherNotes) : '')}`;
}

function css(look, styles) {
  const accent = look.mono ? '#111111' : str(styles.accentColor) || '#1E3A8A';
  const heading = look.mono ? '#111111' : str(styles.headingColor) || '#0F172A';
  const text = look.mono ? '#222222' : str(styles.textColor) || '#334155';
  const h2 = {
    'accent-rule': `color:${accent}; border-bottom: 1.5px solid ${accent}; padding-bottom: 2px;`,
    'full-rule': `color:${heading}; border-bottom: 1px solid ${heading}; padding-bottom: 1px; font-variant: small-caps; letter-spacing: 0.04em;`,
    plain: `color:${heading}; letter-spacing: 0.08em;`,
  }[look.h2];
  return `
  @page { size: A4; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: ${look.body}; font-size: ${look.size}pt; line-height: ${look.line}; color: ${text}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { background: #ffffff; }
  header { text-align: ${look.align}; margin-bottom: ${look.gap}px; ${look.nameBar ? `border-bottom: 3px solid ${accent}; padding-bottom: 6px;` : ''} }
  h1 { font-family: ${look.head}; font-size: ${look.nameSize}pt; line-height: 1.15; margin: 0; color: ${heading}; font-weight: 700; }
  .title { font-size: ${look.size + 1.5}pt; color: ${look.mono ? heading : accent}; margin-top: 2px; font-weight: 600; }
  .contact { margin-top: 4px; font-size: ${look.size - 0.5}pt; }
  .contact a, .entry a { color: ${text}; text-decoration: none; }
  .sep { opacity: 0.6; }
  section { margin-top: ${look.gap}px; }
  h2 { font-family: ${look.head}; font-size: ${look.size + 1.5}pt; text-transform: uppercase; margin: 0 0 ${Math.round(look.gap / 2)}px; font-weight: 700; ${h2} break-after: avoid; page-break-after: avoid; }
  .entry { margin-bottom: ${Math.round(look.gap * 0.7)}px; break-inside: avoid; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .t { font-weight: 700; color: ${heading}; }
  .d { white-space: nowrap; font-size: ${look.size - 0.5}pt; }
  .sub { font-style: italic; }
  p { margin: 2px 0; }
  ul { margin: 2px 0 0; padding-left: 16px; }
  li { margin: 1px 0; break-inside: avoid; page-break-inside: avoid; }
  section > p, section > ul { break-inside: avoid; page-break-inside: avoid; }
  [dir="auto"] { unicode-bidi: plaintext; }
  @media screen {
    html { background: #525659; }
    body { padding: 16px 0; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 53px 57px; box-shadow: 0 6px 30px rgba(0,0,0,0.45); }
  }`;
}

export const renderResumeHTML = (resume, templateId, customStyles = {}, _isPrinting = false) => {
  const id = canonicalTemplate(templateId);
  const look = LOOKS[id];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=794">
<title>${esc([str(resume?.personalInfo?.firstName), str(resume?.personalInfo?.lastName)].filter(Boolean).join(' ') || 'Resume')} Resume</title>
<style>${css(look, customStyles || resume?.customStyles || {})}</style>
</head>
<body data-template="${id}"><main class="page">${body(resume)}</main></body>
</html>`;
};

export default function DummyTemplateServiceComponent() { return null; }
