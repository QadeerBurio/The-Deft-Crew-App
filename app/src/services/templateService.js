// app/src/services/templateService.js — the resume as HTML, for the preview, the PDF (expo-print) and sharing.
// One renderer, five ATS-friendly looks: single column, real text (no tables, no columns, no images), the same
// fonts and spacing rules, A4 with page margins on every page, and an entry never split across two pages.
// The preview and the PDF use the same HTML; `isPrinting` is kept for old callers and changes nothing.
//   renderResumeHTML(resume, templateId, customStyles?) -> full HTML document
//   TEMPLATES                                            -> [{ id, name, description }] for the picker
//   canonicalTemplate(id)                                -> one of the five ids (old ids map to their closest)
// P3-3: the fresher sections (activities, volunteering, awards, coursework) print only when they have content, in
// the track's order (resume.settings.track "fresher": education and projects first, experience last). A resume
// without them renders exactly as before (tests/app/resume-v2.test.js compares against the frozen output).
// P3c: a layout + theme engine. A template = a layout (single column, ATS-safe) + a theme (the look's keys below);
// the five looks are themes, and every new theme key is optional: a theme without it renders exactly as before
// (tests/app/resume-templates.test.js compares 395 frozen outputs). New templates are config in ./templates/library.js.
//   theme keys (all optional): accent / heading / text (default colours), second (headings in a second colour),
//   band (the header on a colour band), nameAccent, h2x ("bar-left" | "caps-spaced" | "thin-rule" | "smallcaps-rule"
//   | "underline-accent" | "short-rule"), dateAccent, subPlain, margin ("12mm 13mm"), order (section order), headings ({ key: title }),
//   skillSep (" · ")

// P3d: the renderer itself now lives in ../utils/resumeRender.js, shared byte for byte with the server (the public resume
// page renders with it). This file keeps every name the app imports.
export {
  TEMPLATES, canonicalTemplate, templateOf, getDisplayLocation, formatDate, formatDateRange, customise, renderResumeHTML,
  renderCoverLetterHTML, // r7 (P3-9, resumeWriter): the cover letter in the resume's design
} from '../utils/resumeRender';

export default function DummyTemplateServiceComponent() { return null; }
