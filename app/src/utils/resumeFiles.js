// app/src/utils/resumeFiles.js — make the resume PDF once, then save it on the phone or share it.
//   makeResumePdf(resume)        -> { uri, name, pages }   same HTML as the preview (templateService)
//   saveResumePdf(pdf)           -> { status: 'saved' | 'cancelled' | 'denied' | 'shared', where, uri, message }
//   shareResumePdf(pdf)          -> the share sheet (its own button, never instead of saving on Android)
//   openSavedPdf(uri)            -> opens a saved file in the phone's PDF viewer (Android)
//   nativePdfView()              -> react-native-pdf when this build has it (1.2.1+), else null
//   canSaveToFilesDialog()       -> true when the iPhone "Save to Files" dialog module is in this build
// Android: the Storage Access Framework. The student picks a folder once (Downloads is offered first) and
// every later save goes there as "<Full name> Resume.pdf". No storage permission is needed.
// iPhone: the system save dialog (Files) via @react-native-documents/picker; on a build without it, the
// share sheet (which has "Save to Files").
// Nothing here throws for a refused permission or a cancel: the caller shows `message`.
import { Platform, TurboModuleRegistry } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderResumeHTML, canonicalTemplate } from '../services/templateService';
import { resumeHtmlWithFonts } from '../services/templates/print'; // P3-6: fonts embedded (library templates / chosen pair)
import { pdfFileName } from './resumeRules';
import { TIMEOUT } from '../config/timeouts';

const DIR_KEY = 'resumeSaveDirUri';
const MIME = 'application/pdf';

const has = (name) => { try { return !!TurboModuleRegistry.get(name); } catch { return false; } };

/** iPhone "Save to Files" dialog: only when the native module is in this build */
export function canSaveToFilesDialog() {
  return Platform.OS === 'ios' && has('RNDocumentPicker');
}

/** react-native-pdf (pinch zoom, page count) needs react-native-blob-util's native module (1.2.1+) */
export function nativePdfView() {
  if (!has('ReactNativeBlobUtil')) return null;
  try { return require('react-native-pdf').default; } catch { return null; }
}

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(Object.assign(new Error('taking too long, try again'), { code: 'TIMEOUT' })), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

// the resume's own template id (a P3-6 library template renders as itself; older ids map inside the renderer, as
// before); the sync version uses system fonts (the first paint of the preview), the async one embeds the fonts
export function resumeHtml(resume) {
  return renderResumeHTML(resume, resume?.template, resume?.customStyles || {});
}
export function resumeHtmlAsync(resume) {
  return resumeHtmlWithFonts(resume, resume?.template, resume?.customStyles || {});
}

/** The PDF in the app's cache, named "<Full name> Resume.pdf" */
// iOS ignores CSS @page margins when printing, so the same 14/15 mm margins are passed to expo-print there
export async function makeResumePdf(resume) {
  const html = await resumeHtmlAsync(resume);
  const out = await withTimeout(Print.printToFileAsync({ html, width: 595, height: 842, ...(Platform.OS === 'ios' ? { margins: { left: 42, right: 42, top: 40, bottom: 40 } } : {}) }), TIMEOUT.PDF);
  const name = pdfFileName(resume);
  const uri = `${FileSystem.cacheDirectory}${encodeURIComponent(name)}`;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  await FileSystem.copyAsync({ from: out.uri, to: uri });
  return { uri, name, pages: out.numberOfPages || null };
}

async function androidDir(SAF, askAgain) {
  if (!askAgain) {
    const saved = await AsyncStorage.getItem(DIR_KEY).catch(() => null);
    if (saved) {
      // still allowed? (the student may have revoked it in settings)
      try { await SAF.readDirectoryAsync(saved); return saved; } catch { await AsyncStorage.removeItem(DIR_KEY).catch(() => {}); }
    }
  }
  const start = SAF.getUriForDirectoryInRoot ? SAF.getUriForDirectoryInRoot('Download') : undefined;
  const res = await SAF.requestDirectoryPermissionsAsync(start);
  if (!res?.granted || !res.directoryUri) return null;
  await AsyncStorage.setItem(DIR_KEY, res.directoryUri).catch(() => {});
  return res.directoryUri;
}

const folderName = (dirUri) => {
  const tail = decodeURIComponent(String(dirUri || '')).split(/[:/]/).filter(Boolean).pop() || '';
  return /^download/i.test(tail) ? 'Downloads' : tail || 'the folder you picked';
};

/** Save the PDF on the phone. Android: the picked folder (Downloads first). iPhone: the Files save dialog. */
export async function saveResumePdf(pdf, { askAgain = false } = {}) {
  if (Platform.OS === 'android') {
    const SAF = FileSystem.StorageAccessFramework;
    let dir;
    try {
      dir = await androidDir(SAF, askAgain);
    } catch (e) {
      return { status: 'denied', message: "we couldn't open the folder picker. you can still use share to send or keep your pdf." };
    }
    if (!dir) return { status: 'denied', message: 'not saved: pick a folder (like Downloads) and allow access to save your resume there. you can also use share.' };
    try {
      const base64 = await FileSystem.readAsStringAsync(pdf.uri, { encoding: FileSystem.EncodingType.Base64 });
      const target = await SAF.createFileAsync(dir, pdf.name.replace(/\.pdf$/i, ''), MIME);
      await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
      const where = folderName(dir);
      return { status: 'saved', where, uri: target, message: `Saved to ${where}` };
    } catch (e) {
      // the saved folder stopped working: forget it so the next tap asks again
      await AsyncStorage.removeItem(DIR_KEY).catch(() => {});
      return { status: 'denied', message: "couldn't save in that folder. tap save again and pick a folder (like Downloads)." };
    }
  }

  if (canSaveToFilesDialog()) {
    try {
      const { saveDocuments } = require('@react-native-documents/picker');
      const [res] = await saveDocuments({ sourceUris: [pdf.uri], fileName: pdf.name, mimeType: MIME, copy: true });
      if (res?.error) return { status: 'denied', message: "couldn't save the file there. try another folder, or use share." };
      return { status: 'saved', where: 'Files', uri: res?.uri, message: 'Saved to Files' };
    } catch (e) {
      if (e?.code === 'OPERATION_CANCELED') return { status: 'cancelled', message: '' };
      return { status: 'denied', message: "couldn't open Files. you can use share and pick \"Save to Files\"." };
    }
  }
  // a build without the Files dialog: the share sheet has "Save to Files"
  const shared = await shareResumePdf(pdf);
  return shared.status === 'shared' ? { status: 'shared', message: 'pick "Save to Files" in the list to keep it on your iPhone.' } : shared;
}

export async function shareResumePdf(pdf) {
  try {
    if (!(await Sharing.isAvailableAsync())) return { status: 'denied', message: 'sharing is not available on this phone.' };
    await Sharing.shareAsync(pdf.uri, { mimeType: MIME, UTI: 'com.adobe.pdf', dialogTitle: pdf.name });
    return { status: 'shared', message: '' };
  } catch (e) {
    return { status: 'denied', message: "couldn't open sharing. please try again." };
  }
}

/** Android: open the saved file in a PDF viewer */
export async function openSavedPdf(uri) {
  if (Platform.OS !== 'android' || !uri) return false;
  try {
    const IntentLauncher = require('expo-intent-launcher');
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: MIME });
    return true;
  } catch {
    return false;
  }
}

export const _DIR_KEY = DIR_KEY;
