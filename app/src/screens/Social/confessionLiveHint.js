// app/src/screens/Social/confessionLiveHint.js
// P4-4: the live pre-check hint while typing (plan: "the P4-1 rules filter runs client-side for names/numbers too").
// The same patterns and sentences as the server's rules (server services/confessionCheck.js, "b) rules"): phone
// number, e-mail, CNIC and links. The server still checks every post; this only shows the reason before "post".
// Names are checked on the server only: the list of students' names never comes to the phone.
const PHONE = /(?:\+?92[\s-]?|\b0)3\d{2}[\s-]?\d{7}\b|\b\d{4}[\s-]\d{7}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const CNIC = /\b\d{5}-?\d{7}-?\d\b/;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|pk|net|org|io|me|co|ly|gg|app|link|xyz)(?:\/\S*)?\b/i;

export const MESSAGES = Object.freeze({
  personal_info: 'this has a phone number, e-mail or id number. remove it to post.',
  link: "links aren't allowed in confessions.",
});
const reason = (code, span) => ({ code, message: MESSAGES[code], live: true, ...(span ? { span: String(span).slice(0, 120) } : {}) });

/** text → [{ code, message, span, live }] (empty when nothing to say) */
export function liveHint(text) {
  const t = String(text || '');
  if (t.trim().length < 6) return [];
  const m = (re) => t.match(re)?.[0];
  const out = [];
  if (m(CNIC)) out.push(reason('personal_info', m(CNIC)));
  else if (m(PHONE)) out.push(reason('personal_info', m(PHONE)));
  if (m(EMAIL)) out.push(reason('personal_info', m(EMAIL)));
  else if (m(LINK)) out.push(reason('link', m(LINK)));
  return out;
}
