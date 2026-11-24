// app/src/services/templates/print.js
// P3-6: the resume HTML with its fonts embedded, for every preview and PDF (the same HTML everywhere). Library
// templates and a chosen font pair use bundled fonts (fonts.js); the five older templates use system fonts, so their
// HTML is exactly renderResumeHTML's, as before (nothing embedded, even for an Urdu-script name).
// P3d: the "verified by tdc" line, only on a resume the student added it to (settings.verifiedLine). The facts come
// from the server, which answers only with resumeV2 + resumeVerified on: a flag off (or no connection) = no line.
//   resumeHtmlWithFonts(resume, templateId?, customStyles?, deps?) → Promise<html>
import { renderResumeHTML, templateOf, customise } from '../templateService';
import { LIBRARY } from './library';
import { fontCssFor, familiesFor } from './fonts';

const cssCache = new Map(); // look fonts + script → the @font-face text (the files are cached by fonts.js too)
const FACTS_TTL = 10 * 60 * 1000;
let factsCache = { at: 0, facts: null };

async function verifiedFor(resume, deps = {}) {
  if (resume?.settings?.verifiedLine !== true) return undefined;
  if (!deps.verifiedFacts && factsCache.facts && Date.now() - factsCache.at < FACTS_TTL) return factsCache.facts.length ? factsCache.facts : undefined;
  try {
    const facts = deps.verifiedFacts ? await deps.verifiedFacts() : ((await require('../../resume/finishApi').verifiedFacts()) || {}).facts;
    const list = Array.isArray(facts) ? facts : [];
    if (!deps.verifiedFacts) factsCache = { at: Date.now(), facts: list };
    return list.length ? list : undefined;
  } catch {
    return undefined; // never a failed PDF
  }
}

export async function resumeHtmlWithFonts(resume, templateId = resume?.template, customStyles = resume?.customStyles || {}, deps = {}) {
  const base = templateOf(templateId);
  const library = LIBRARY.some((t) => t.id === base.id);
  const { look } = customise(base.look, customStyles || {}, { library, resume });
  const families = familiesFor(look, resume);
  const usesBundled = families.some((f) => f !== 'Noto Naskh Arabic');
  const verified = await verifiedFor(resume, deps);
  if (!usesBundled) return verified ? renderResumeHTML(resume, templateId, customStyles || {}, false, { verified }) : renderResumeHTML(resume, templateId, customStyles || {});
  const key = families.join('|');
  let fontCss = cssCache.get(key);
  if (fontCss == null) {
    fontCss = await fontCssFor(look, resume, deps.read);
    if (fontCss) cssCache.set(key, fontCss);
  }
  return renderResumeHTML(resume, templateId, customStyles || {}, false, verified ? { fontCss, verified } : { fontCss });
}

export const _clearFontCache = () => cssCache.clear();
export const _clearFactsCache = () => { factsCache = { at: 0, facts: null }; };
