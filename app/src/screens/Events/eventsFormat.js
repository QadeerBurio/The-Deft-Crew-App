// screens/Events/eventsFormat.js — the Events screen's pure helpers (categories, colours, images, dates), moved
// unchanged from Events.js (Q-a split-only, plan Q-3f).
import { imageUrl } from "../../utils/imageUrl";
import { color as T } from "../../theme/tokens";

// ─── Event source detection ─────────────────────────────────────────────
export const isImportedEvent = (event) => {
  if (!event) return false;
  if (event.isImported === true) return true;
  if (typeof event.source === "string" && event.source !== "manual") return true;
  const hasLink = !!(event.registrationUrl || event.externalUrl);
  const hasCreator = !!(event.creator || event.creatorEmail);
  if (hasLink && !hasCreator) return true;
  return false;
};
// CATEGORY_THEME is only a *visual theme* map, not the source of truth for
// which categories exist. The list of categories is derived from events
// (like cities) plus the backend /categories endpoint. Unknown categories
// get a deterministic fallback theme derived from their name.
export const CATEGORY_THEME = {
  Hackathons: { icon: "code-outline", color: T.ink, bg: T.yellowSoft },
  Workshops: { icon: "construct-outline", color: T.ink, bg: T.yellowSoft },
  Conferences: { icon: "people-outline", color: T.ink, bg: T.yellowSoft },
  Competitions: { icon: "trophy-outline", color: T.ink, bg: T.yellowSoft },
  "Career Fairs": { icon: "briefcase-outline", color: T.ink, bg: T.yellowSoft },
  Concerts: { icon: "musical-notes-outline", color: T.ink, bg: T.yellowSoft },
  Poetry: { icon: "book-outline", color: T.ink, bg: T.yellowSoft },
  Classes: { icon: "school-outline", color: T.ink, bg: T.yellowSoft },
  "Classes & Workshops": { icon: "school-outline", color: T.ink, bg: T.yellowSoft },
  Theatre: { icon: "film-outline", color: T.ink, bg: T.yellowSoft },
  "Theatre, Arts & Culture": { icon: "film-outline", color: T.ink, bg: T.yellowSoft },
  "Arts & Crafts": { icon: "color-palette-outline", color: T.ink, bg: T.yellowSoft },
  "Festivals & Markets": { icon: "balloon-outline", color: T.ink, bg: T.yellowSoft },
  "Fashion & Lifestyle": { icon: "shirt-outline", color: T.ink, bg: T.yellowSoft },
  "Food & Culinary": { icon: "restaurant-outline", color: T.ink, bg: T.yellowSoft },
  "Adventure & Tours": { icon: "trail-sign-outline", color: T.ink, bg: T.yellowSoft },
  "Education & Business": { icon: "business-outline", color: T.ink, bg: T.yellowSoft },
  "Health,Wellness & Beauty": { icon: "heart-outline", color: T.ink, bg: T.yellowSoft },
  "Sports & Screenings": { icon: "football-outline", color: T.ink, bg: T.yellowSoft },
  "Movie Night": { icon: "videocam-outline", color: T.ink, bg: T.yellowSoft },
  Comedy: { icon: "happy-outline", color: T.ink, bg: T.yellowSoft },
  Automotive: { icon: "car-sport-outline", color: T.ink, bg: T.yellowSoft },
  "Concerts & Live Music": { icon: "musical-notes-outline", color: T.ink, bg: T.yellowSoft },
};
// Deterministic fallback palette for categories we haven't themed yet
export const FALLBACK_PALETTE = [
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
];
export const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
export const getCategoryTheme = (cat) => {
  if (!cat) return { icon: "sparkles-outline", color: T.ink, bg: T.yellowSoft };
  if (CATEGORY_THEME[cat]) return CATEGORY_THEME[cat];

  const lower = String(cat).toLowerCase();
  const key = Object.keys(CATEGORY_THEME).find(
    (k) => k.toLowerCase() === lower
  );
  if (key) return CATEGORY_THEME[key];

  return FALLBACK_PALETTE[hashString(String(cat)) % FALLBACK_PALETTE.length];
};
export const COLORS = {
  page: T.paper,
  pageAlt: T.sand,
  ink: T.ink,
  body: T.ink,
  muted: T.textMuted,
  line: T.line,
  card: T.white,
  surface: T.sand,
  primary: T.ink,
  secondary: T.yellow,
  accent: T.yellow,
  danger: T.danger,
  goldSoft: T.yellowSoft,
  overlayDark: "rgba(17, 17, 17, 0.85)", // T.ink at 85%
  gradientStart: T.ink,
  gradientEnd: T.ink,
  success: T.success,
  warning: T.yellow,
};
export const formatCategoryLabel = (cat) => (cat === "All" ? "All" : cat);
// ─── Real data only ──────────────────────────────────────────────────────
// The Event model fills empty fields with placeholders (date "TBA", location
// "Online/Venue TBD", prize "TBD", deadline "Limited spots", teamSize "1-4 Members",
// type "General", a stock Unsplash image). Those are treated as "no value" and hidden.
export const PLACEHOLDER = {
  date: ["tba", "tbd"],
  location: ["online/venue tbd", "venue tbd", "tbd", "tba"],
  prize: ["tbd", "tba", "n/a", "none", "-"],
  deadline: ["limited spots", "open", "tbd", "tba"],
  teamSize: ["1-4 members", "any"],
  type: ["general"],
  organizer: ["organizer"],
};
export const STOCK_EVENT_IMAGE = "https://images.unsplash.com/photo-1523240715632-d984bb4b970e?w=800";
export const real = (item, field) => {
  const s = String(item?.[field] ?? "").trim();
  if (!s) return null;
  return (PLACEHOLDER[field] || []).includes(s.toLowerCase()) ? null : s;
};
export const eventImage = (item) => {
  const url = imageUrl(item?.image);
  return url && url !== STOCK_EVENT_IMAGE ? url : null;
};
export const parseEventDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};
// ── Dates ──
// Days come from the date text (so a day never shifts with the time zone):
//   "2027-04-01"                       → sat, apr 1 (year only when not this year)
//   "2027-04-01 to 2027-04-08 (20:00)" → apr 1 – apr 8, 2027 · 8 pm
//   "Dec 26, 2026 5:00 PM"             → sat, dec 26 · 5 pm
// A time is shown only when the text has one. parsedDate (stored as midnight UTC)
// is used for the day only when the text has no date; it never gives a time.
// A placeholder ("TBA") or text that isn't a date → nothing (the pill is hidden).
export const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const ISO_DAY = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/g;
export const MONTH_WORD = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
// 00:00 / 12:00 am (any format, seconds or not) means "no time set": day only.
// Real times such as 8 pm or 12:30 am are kept.
export const setTime = (t) => (t && (t.h !== 0 || t.min !== 0) ? t : null);
export const timeIn = (text) => {
  const m = String(text || "").match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
  if (!m) return null;
  let h = Number(m[1] != null ? m[1] : m[4]);
  const min = Number(m[1] != null ? m[2] : 0);
  const ap = String((m[1] != null ? m[3] : m[5]) || "").toLowerCase();
  if (ap) {
    if (h === 12) h = 0;
    if (ap === "pm") h += 12;
  }
  return h <= 23 && min <= 59 ? { h, min } : null;
};
export const sameDay = (x, y) =>
  x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
// { start, end (range only), time } from a date text, or null
export const datesFromText = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const isos = [...raw.matchAll(ISO_DAY)];
  if (isos.length) {
    const day = (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const start = day(isos[0]);
    if (isNaN(start.getTime())) return null;
    const endRaw = isos[1] ? day(isos[1]) : null;
    const end = endRaw && !isNaN(endRaw.getTime()) && !sameDay(endRaw, start) ? endRaw : null;
    // time: on either date ("…-03 10:30"), or written after them ("(20:00)")
    const isoTime = isos.map((m) => (m[4] != null ? { h: Number(m[4]), min: Number(m[5]) } : null)).find(Boolean);
    const time = setTime(isoTime || timeIn(raw.replace(ISO_DAY, " ")));
    return { start, end, time };
  }
  if (!MONTH_WORD.test(raw)) return null; // free text, not a date
  // "Dec 26, 2026" / "26 Dec 2026" read directly (Hermes' Date parser is strict and
  // rejects text with a time like "8 pm"); the time is read separately
  const mon = (w) => MON.indexOf(String(w).slice(0, 3).toLowerCase());
  const md = raw.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  const dm = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/i);
  let start = null;
  if (md) start = new Date(Number(md[3]), mon(md[1]), Number(md[2]));
  else if (dm) start = new Date(Number(dm[3]), mon(dm[2]), Number(dm[1]));
  else {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (!start || isNaN(start.getTime())) return null;
  const rest = md ? raw.replace(md[0], " ") : dm ? raw.replace(dm[0], " ") : raw;
  return { start, end: null, time: setTime(timeIn(rest)) };
};
export const eventDates = (item) => {
  const text = String(item?.date ?? "").trim();
  if (text) {
    if (!real(item, "date")) return null; // placeholder
    const fromText = datesFromText(text);
    if (fromText) return fromText;
  }
  const p = parseEventDate(item?.parsedDate);
  if (!p) return null;
  return { start: new Date(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()), end: null, time: null };
};
export const fmtTime = ({ h, min }) => {
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
};
export const formatDates = (d) => {
  if (!d) return "";
  const thisYear = new Date().getFullYear();
  const t = d.time ? ` · ${fmtTime(d.time)}` : "";
  const { start, end } = d;
  if (!end) {
    const y = start.getFullYear() !== thisYear ? `, ${start.getFullYear()}` : "";
    return `${DOW[start.getDay()]}, ${MON[start.getMonth()]} ${start.getDate()}${y}${t}`;
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const startY = sameYear ? "" : `, ${start.getFullYear()}`;
  const endY = !sameYear || end.getFullYear() !== thisYear ? `, ${end.getFullYear()}` : "";
  return `${MON[start.getMonth()]} ${start.getDate()}${startY} – ${MON[end.getMonth()]} ${end.getDate()}${endY}${t}`;
};
export const eventWhen = (item) => formatDates(eventDates(item));
// a date-like text field (deadline): formatted like the event date, else the real text
export const dateText = (item, field) => {
  const v = real(item, field);
  if (!v) return null;
  const d = datesFromText(v);
  return d ? formatDates(d) : v;
};
export const teamLabel = (item) => {
  const t = real(item, "teamSize");
  if (!t) return null;
  return /member|people|person|solo|team|individual/i.test(t) ? t.toLowerCase() : `teams of ${t}`;
};
export const eventMeta = (item) =>
  [real(item, "location") || real(item, "university"), real(item, "city"), teamLabel(item)]
    .filter(Boolean)
    .join(" · ");
// an event that has already happened (its last day is before today)
export const isPastEvent = (item) => {
  const d = eventDates(item);
  if (!d) return false;
  const last = d.end || d.start;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return last.getTime() < startOfToday.getTime();
};
