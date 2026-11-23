// app/src/services/templates/styles.js
// P3-6 customisation, as data the renderer (templateService) and the customisation sheet share:
//   PALETTES (12, each checked for text contrast ≥ 4.5:1 on white), FONT_PAIRS (8, OFL fonts bundled as assets:
//   services/templates/fonts.js), and the choice lists. Pure data, no imports.

export const PALETTES = Object.freeze([
  { id: 'navy', name: 'Navy', accent: '#1E3A8A', heading: '#0F172A', text: '#334155' },
  { id: 'ink', name: 'Ink', accent: '#111111', heading: '#111111', text: '#222222' },
  { id: 'teal', name: 'Teal', accent: '#0F766E', heading: '#0F172A', text: '#1F2937' },
  { id: 'forest', name: 'Forest', accent: '#15803D', heading: '#0F172A', text: '#1F2937' },
  { id: 'ocean', name: 'Ocean', accent: '#0369A1', heading: '#0C1A2B', text: '#1E293B' },
  { id: 'royal', name: 'Royal', accent: '#2563EB', heading: '#0F172A', text: '#1E293B' },
  { id: 'plum', name: 'Plum', accent: '#6D28D9', heading: '#111827', text: '#1F2937' },
  { id: 'berry', name: 'Berry', accent: '#BE185D', heading: '#111827', text: '#1F2937' },
  { id: 'burgundy', name: 'Burgundy', accent: '#7F1D1D', heading: '#111111', text: '#222222' },
  { id: 'rust', name: 'Rust', accent: '#C2410C', heading: '#111827', text: '#1F2937' },
  { id: 'olive', name: 'Olive', accent: '#4D7C0F', heading: '#1A2E05', text: '#1F2937' },
  { id: 'slate', name: 'Slate', accent: '#475569', heading: '#0F172A', text: '#334155' },
]);

const FALLBACK_SANS = "'Helvetica Neue', Helvetica, Arial, 'Noto Sans', 'Noto Naskh Arabic', sans-serif";
const FALLBACK_SERIF = "Georgia, 'Times New Roman', 'Noto Serif', 'Noto Naskh Arabic', serif";
const stack = (family, serif) => `'${family}', ${serif ? FALLBACK_SERIF : FALLBACK_SANS}`;

// head = name and section headings, body = everything else; the families are the @font-face names in fonts.js
export const FONT_PAIRS = Object.freeze([
  { id: 'inter', name: 'Inter', head: stack('Inter'), body: stack('Inter') },
  { id: 'lora_source', name: 'Lora + Source Sans', head: stack('Lora', true), body: stack('Source Sans 3') },
  { id: 'merriweather_lato', name: 'Merriweather + Lato', head: stack('Merriweather', true), body: stack('Lato') },
  { id: 'dmserif_dmsans', name: 'DM Serif + DM Sans', head: stack('DM Serif Display', true), body: stack('DM Sans') },
  { id: 'poppins_opensans', name: 'Poppins + Open Sans', head: stack('Poppins'), body: stack('Open Sans') },
  { id: 'plex', name: 'IBM Plex Serif + Sans', head: stack('IBM Plex Serif', true), body: stack('IBM Plex Sans') },
  { id: 'bitter_roboto', name: 'Bitter + Roboto', head: stack('Bitter', true), body: stack('Roboto') },
  { id: 'noto', name: 'Noto Sans (+ Urdu script)', head: stack('Noto Sans'), body: stack('Noto Sans') },
]);

export const SIZES = Object.freeze({ S: -0.5, M: 0, L: 0.5 });
export const DENSITY = Object.freeze({ compact: { gap: 0.75, line: 0.95 }, normal: { gap: 1, line: 1 }, airy: { gap: 1.3, line: 1.06 } });
export const MARGINS = Object.freeze({ narrow: '10mm 11mm', wide: '18mm 19mm' });
export const HEADING_STYLES = Object.freeze({ rule: 'thin-rule', bar: 'bar-left', underline: 'underline-accent', none: 'none' });
export const SECTION_KEYS = Object.freeze(['summary', 'experience', 'education', 'projects', 'activities', 'volunteering', 'skills', 'awards', 'certifications', 'languages', 'achievements']);
// the colours every resume carries from the model's defaults: on a library template they mean "not chosen"
export const MODEL_DEFAULT_COLOURS = Object.freeze({ accentColor: '#1E3A8A', headingColor: '#0F172A', textColor: '#334155' });
