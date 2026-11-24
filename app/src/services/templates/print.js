// app/src/services/templates/print.js
// P3-6: the resume HTML with its fonts embedded, for every preview and PDF (the same HTML everywhere). Library
// templates and a chosen font pair use bundled fonts (fonts.js); the five older templates use system fonts, so their
// HTML is exactly renderResumeHTML's, as before (nothing embedded, even for an Urdu-script name).
//   resumeHtmlWithFonts(resume, templateId?, customStyles?) → Promise<html>
import { renderResumeHTML, templateOf, customise } from '../templateService';
import { LIBRARY } from './library';
import { fontCssFor, familiesFor } from './fonts';

const cssCache = new Map(); // look fonts + script → the @font-face text (the files are cached by fonts.js too)

export async function resumeHtmlWithFonts(resume, templateId = resume?.template, customStyles = resume?.customStyles || {}, deps = {}) {
  const base = templateOf(templateId);
  const library = LIBRARY.some((t) => t.id === base.id);
  const { look } = customise(base.look, customStyles || {}, { library, resume });
  const families = familiesFor(look, resume);
  const usesBundled = families.some((f) => f !== 'Noto Naskh Arabic');
  if (!usesBundled) return renderResumeHTML(resume, templateId, customStyles || {});
  const key = families.join('|');
  let fontCss = cssCache.get(key);
  if (fontCss == null) {
    fontCss = await fontCssFor(look, resume, deps.read);
    if (fontCss) cssCache.set(key, fontCss);
  }
  return renderResumeHTML(resume, templateId, customStyles || {}, false, { fontCss });
}

export const _clearFontCache = () => cssCache.clear();
