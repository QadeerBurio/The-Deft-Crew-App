// app/src/services/templates/fonts.js
// P3-6 fonts (owner #3): OFL fonts bundled as assets (app/assets/resume-fonts: Latin subsets made by
// tests/templates/build-fonts.py, each family's OFL.txt beside them; DM Sans and Outfit are the app's own font
// packages). Only the fonts the chosen template / pair uses are read and embedded (@font-face, base64) when a resume
// is previewed or printed, so the PDF looks the same on every phone. Noto Naskh Arabic only when the name is written
// in Urdu / Arabic script. The five older templates use system fonts: nothing is embedded for them.
//   fontCssFor(look, resume) → "@font-face …" ('' when the look uses no bundled font)

// family → { weight: asset }; one weight for a heading face covers 400–700 (no fake bold)
const FILES = {
  Inter: { 400: require('../../../assets/resume-fonts/Inter-400.ttf'), 700: require('../../../assets/resume-fonts/Inter-700.ttf') },
  Lora: { 700: require('../../../assets/resume-fonts/Lora-700.ttf') },
  'Source Sans 3': { 400: require('../../../assets/resume-fonts/SourceSans3-400.ttf'), 700: require('../../../assets/resume-fonts/SourceSans3-700.ttf') },
  Merriweather: { 700: require('../../../assets/resume-fonts/Merriweather-700.ttf') },
  Lato: { 400: require('../../../assets/resume-fonts/Lato-400.ttf'), 700: require('../../../assets/resume-fonts/Lato-700.ttf') },
  'DM Serif Display': { 400: require('../../../assets/resume-fonts/DMSerifDisplay-400.ttf') },
  'DM Sans': { 400: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'), 700: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf') },
  Outfit: { 600: require('@expo-google-fonts/outfit/600SemiBold/Outfit_600SemiBold.ttf'), 700: require('@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf') },
  Poppins: { 600: require('../../../assets/resume-fonts/Poppins-600.ttf') },
  'Open Sans': { 400: require('../../../assets/resume-fonts/OpenSans-400.ttf'), 700: require('../../../assets/resume-fonts/OpenSans-700.ttf') },
  'IBM Plex Serif': { 700: require('../../../assets/resume-fonts/IBMPlexSerif-700.ttf') },
  'IBM Plex Sans': { 400: require('../../../assets/resume-fonts/IBMPlexSans-400.ttf'), 700: require('../../../assets/resume-fonts/IBMPlexSans-700.ttf') },
  Bitter: { 700: require('../../../assets/resume-fonts/Bitter-700.ttf') },
  Roboto: { 400: require('../../../assets/resume-fonts/Roboto-400.ttf'), 700: require('../../../assets/resume-fonts/Roboto-700.ttf') },
  'Noto Sans': { 400: require('../../../assets/resume-fonts/NotoSans-400.ttf'), 700: require('../../../assets/resume-fonts/NotoSans-700.ttf') },
  'Noto Naskh Arabic': { 400: require('../../../assets/resume-fonts/NotoNaskhArabic-400.ttf'), 700: require('../../../assets/resume-fonts/NotoNaskhArabic-700.ttf') },
};
export const BUNDLED_FAMILIES = Object.freeze(Object.keys(FILES));

const firstFamily = (stack) => (/^\s*'([^']+)'/.exec(String(stack || '')) || [])[1] || null;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** the bundled families a look needs (+ Noto Naskh Arabic for an Urdu-script name) */
export function familiesFor(look = {}, resume = null) {
  const fam = [firstFamily(look.head), firstFamily(look.body)].filter((f) => f && FILES[f]);
  const pi = resume?.personalInfo || {};
  if (ARABIC_SCRIPT.test(`${pi.firstName || ''} ${pi.lastName || ''}`)) fam.push('Noto Naskh Arabic');
  return [...new Set(fam)];
}

// reading an asset as base64 (expo-asset + expo-file-system, loaded on first use); cached per file
const cache = new Map();
async function base64Of(mod) {
  if (cache.has(mod)) return cache.get(mod);
  const { Asset } = require('expo-asset');
  const FileSystem = require('expo-file-system/legacy'); // SDK 54: the old API lives here
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const data = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, { encoding: 'base64' });
  cache.set(mod, data);
  return data;
}

/** "@font-face …" for the look's bundled fonts ('' when it uses none, e.g. the five older templates) */
export async function fontCssFor(look, resume, read = base64Of) {
  const out = [];
  for (const family of familiesFor(look, resume)) {
    const weights = Object.keys(FILES[family]);
    for (const w of weights) {
      try {
        const data = await read(FILES[family][w]);
        const range = weights.length === 1 ? '400 700' : w;
        out.push(`@font-face { font-family: '${family}'; font-style: normal; font-weight: ${range}; src: url(data:font/ttf;base64,${data}) format('truetype'); }`);
      } catch {
        // a font that can't be read: the fallback stack takes over (never a failed PDF)
      }
    }
  }
  return out.join('\n');
}
