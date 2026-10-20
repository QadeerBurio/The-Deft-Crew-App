// EventsScreen.js — Manual events (internal form) + Imported events (external link) — both award points
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  useWindowDimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useOpenFromParams } from "../../engagement/hooks/useOpenFromParams";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { useGuestGate } from "../../guest/GuestGate";
import { PressScale, EmptyState, SkeletonBlock } from "../../ui";
import { imageUrl } from "../../utils/imageUrl";
import useSavedEvents from "./useSavedEvents";
import io from "socket.io-client";
import { engagementBus, ENGAGEMENT_EVENTS } from "../../engagement/engagementBus";

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { plainError } from "../../utils/plainError";
import RegisterSheet, { ProofSheet } from "./RegisterSheet";
import {
  getTemplates,
  cachedTemplates,
  priceLabel,
  seatsLabel,
  closesLabel,
  registrationState,
  detailRows,
  formatRs,
  PAYMENT_LABEL,
  fetchEvent,
  LIST_FRESH_MS,
} from "./eventsV2";
const { height, width } = Dimensions.get("window");

const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";

// Last loaded events, so opening Events again shows them at once. `at` = when they were
// loaded: older than LIST_FRESH_MS (30 s) → refetched on focus; pull-to-refresh always.
const eventsCache = { events: null, at: 0 };
const SOCKET_URL = "https://the-deft-crew-production.up.railway.app";

// ─── Event source detection ─────────────────────────────────────────────
const isImportedEvent = (event) => {
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
const CATEGORY_THEME = {
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
const FALLBACK_PALETTE = [
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
  { color: T.ink, bg: T.yellowSoft, icon: "sparkles-outline" },
];

const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getCategoryTheme = (cat) => {
  if (!cat) return { icon: "sparkles-outline", color: T.ink, bg: T.yellowSoft };
  if (CATEGORY_THEME[cat]) return CATEGORY_THEME[cat];

  const lower = String(cat).toLowerCase();
  const key = Object.keys(CATEGORY_THEME).find(
    (k) => k.toLowerCase() === lower
  );
  if (key) return CATEGORY_THEME[key];

  return FALLBACK_PALETTE[hashString(String(cat)) % FALLBACK_PALETTE.length];
};


const COLORS = {
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

const formatCategoryLabel = (cat) => (cat === "All" ? "All" : cat);

// ─── Skeleton: one featured card + list cards, same shapes as the real ones
const SkeletonList = () => (
  <View style={styles.listContent} accessible accessibilityLabel="loading events">
    <View style={[EV.featured, { backgroundColor: T.sand }]}>
      <View style={[EV.media, { backgroundColor: T.lineSoft }]} />
      <View style={EV.featuredBody}>
        <SkeletonBlock width="75%" height={20} />
        <SkeletonBlock width="50%" height={12} style={{ marginTop: 10 }} />
        <SkeletonBlock height={46} radius={23} style={{ marginTop: 16 }} />
      </View>
    </View>
    {[1, 2].map((k) => (
      <View key={k} style={EV.card}>
        <View style={EV.media} />
        <View style={EV.cardBody}>
          <SkeletonBlock width="80%" height={16} />
          <SkeletonBlock width="55%" height={12} style={{ marginTop: 10 }} />
          <SkeletonBlock height={40} radius={20} style={{ marginTop: 14 }} />
        </View>
      </View>
    ))}
  </View>
);

// ─── Real data only ──────────────────────────────────────────────────────
// The Event model fills empty fields with placeholders (date "TBA", location
// "Online/Venue TBD", prize "TBD", deadline "Limited spots", teamSize "1-4 Members",
// type "General", a stock Unsplash image). Those are treated as "no value" and hidden.
const PLACEHOLDER = {
  date: ["tba", "tbd"],
  location: ["online/venue tbd", "venue tbd", "tbd", "tba"],
  prize: ["tbd", "tba", "n/a", "none", "-"],
  deadline: ["limited spots", "open", "tbd", "tba"],
  teamSize: ["1-4 members", "any"],
  type: ["general"],
  organizer: ["organizer"],
};
const STOCK_EVENT_IMAGE = "https://images.unsplash.com/photo-1523240715632-d984bb4b970e?w=800";
const real = (item, field) => {
  const s = String(item?.[field] ?? "").trim();
  if (!s) return null;
  return (PLACEHOLDER[field] || []).includes(s.toLowerCase()) ? null : s;
};
const eventImage = (item) => {
  const url = imageUrl(item?.image);
  return url && url !== STOCK_EVENT_IMAGE ? url : null;
};
const parseEventDate = (raw) => {
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
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ISO_DAY = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/g;
const MONTH_WORD = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
// 00:00 / 12:00 am (any format, seconds or not) means "no time set": day only.
// Real times such as 8 pm or 12:30 am are kept.
const setTime = (t) => (t && (t.h !== 0 || t.min !== 0) ? t : null);
const timeIn = (text) => {
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
const sameDay = (x, y) =>
  x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();

// { start, end (range only), time } from a date text, or null
const datesFromText = (text) => {
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

const eventDates = (item) => {
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

const fmtTime = ({ h, min }) => {
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
};
const formatDates = (d) => {
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

const eventWhen = (item) => formatDates(eventDates(item));
// a date-like text field (deadline): formatted like the event date, else the real text
const dateText = (item, field) => {
  const v = real(item, field);
  if (!v) return null;
  const d = datesFromText(v);
  return d ? formatDates(d) : v;
};
const teamLabel = (item) => {
  const t = real(item, "teamSize");
  if (!t) return null;
  return /member|people|person|solo|team|individual/i.test(t) ? t.toLowerCase() : `teams of ${t}`;
};
const eventMeta = (item) =>
  [real(item, "location") || real(item, "university"), real(item, "city"), teamLabel(item)]
    .filter(Boolean)
    .join(" · ");
// an event that has already happened (its last day is before today)
const isPastEvent = (item) => {
  const d = eventDates(item);
  if (!d) return false;
  const last = d.end || d.start;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return last.getTime() < startOfToday.getTime();
};


// Save / unsave: bookmark, filled when saved, 44 px, PressScale + light haptic
const SaveButton = ({ saved, onPress, dark = false }) => (
  <PressScale
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }}
    scaleTo={0.9}
    style={[EV.saveBtn, dark && EV.saveBtnDark, saved && (dark ? EV.saveBtnOnDark : EV.saveBtnOn)]}
    accessibilityRole="button"
    accessibilityState={{ selected: saved }}
    accessibilityLabel={saved ? "remove from saved" : "save event"}
  >
    <Ionicons
      name={saved ? "bookmark" : "bookmark-outline"}
      size={18}
      color={saved ? T.ink : dark ? T.white : T.ink}
    />
  </PressScale>
);

// ─── Event card: featured (top event, dark, design) or list size (white) ──────
// Same parts in both: banner (event image or sand) with the date and prize pills,
// title, place line, tags, register / registered button and the slot on its right.
const EventCard = ({ item, onOpen, onRegister, isRegistered, onCancel, featured, side, registration, onProof, onTicket }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imported = isImportedEvent(item);
  // events v2: price, seats, open / closed (not for external events)
  const price = imported ? null : priceLabel(item);
  const seats = imported ? null : seatsLabel(item);
  const closedReason = imported ? "" : registrationState(item).reason;
  const when = eventWhen(item);
  const meta = eventMeta(item);
  const prize = real(item, "prize");
  const type = real(item, "type");
  const img = eventImage(item);
  const showImg = !!img && !imgFailed;

  const action = isRegistered ? (
    <TouchableOpacity
      style={[EV.regBtn, EV.regBtnDone, !featured && EV.regBtnList]}
      onPress={() => onCancel && onCancel(item)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`registered for ${item.title}, tap to cancel`}
    >
      <Ionicons name="checkmark-circle" size={featured ? 17 : 15} color={T.success} />
      <Text style={[EV.regText, !featured && EV.regTextList]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        registered · tap to cancel
      </Text>
    </TouchableOpacity>
  ) : closedReason ? (
    <View
      style={[EV.regBtn, EV.regBtnOff, !featured && EV.regBtnList]}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`${item.title}: ${closedReason}`}
    >
      <Ionicons name="lock-closed-outline" size={featured ? 16 : 14} color={T.textMuted} />
      <Text style={[EV.regText, EV.regTextOff, !featured && EV.regTextList]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {closedReason}
      </Text>
    </View>
  ) : (
    <TouchableOpacity
      style={[EV.regBtn, !featured && EV.regBtnList]}
      onPress={() => onRegister(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={imported ? `open link for ${item.title}` : `register for ${item.title}`}
    >
      {imported && <Ionicons name="open-outline" size={featured ? 16 : 14} color={T.ink} />}
      <Text style={[EV.regText, !featured && EV.regTextList]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {imported ? "open link" : "register"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <PressScale
      onPress={() => onOpen(item)}
      scaleTo={0.98}
      style={featured ? EV.featured : EV.card}
      accessibilityLabel={[item.title, when, meta].filter(Boolean).join(", ")}
    >
      {/* poster: whole image (posters carry text), never cropped */}
      <View style={EV.media}>
        {showImg ? (
          <Image
            source={{ uri: img }}
            style={EV.mediaImg}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <MaterialCommunityIcons name="calendar-star" size={featured ? 36 : 28} color={T.textFaint} />
        )}
        {!!prize && (
          <View style={[EV.prizePill, EV.pillTopRight]}>
            <Text style={EV.prizePillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>prize pool {prize}</Text>
          </View>
        )}
        {/* bottom-left so it covers the poster's headline as little as possible; wraps, never cut */}
        {!!when && (
          <View style={[EV.datePill, EV.pillBottomLeft]}>
            <Text style={EV.datePillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{when}</Text>
          </View>
        )}
      </View>

      <View style={featured ? EV.featuredBody : EV.cardBody}>
        <Text
          style={featured ? EV.featuredTitle : EV.cardTitle}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {item.title}
        </Text>
        {!!meta && (
          <Text style={featured ? EV.featuredMeta : EV.cardMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {meta}
          </Text>
        )}
        {!!(type || imported || price || seats) && (
          <View style={EV.tagRow}>
            {!!price && (
              <View style={[EV.tag, featured ? EV.tagOnInk : EV.tagPrice]}>
                <Text style={[EV.tagText, featured && { color: T.yellow }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{price}</Text>
              </View>
            )}
            {!!seats && (
              <View style={[EV.tag, featured && EV.tagOnInk, seats === "sold out" && EV.tagSoldOut]}>
                <Text style={[EV.tagText, featured && { color: T.white }, seats === "sold out" && { color: T.danger }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{seats}</Text>
              </View>
            )}
            {!!type && (
              <View style={[EV.tag, featured && EV.tagOnInk]}>
                <Text style={[EV.tagText, featured && { color: T.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {type.toLowerCase()}
                </Text>
              </View>
            )}
            {imported && (
              <View style={[EV.tag, featured ? EV.tagOnInk : EV.tagDark]}>
                <Text style={[EV.tagText, { color: featured ? T.white : T.yellow }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>external</Text>
              </View>
            )}
          </View>
        )}
        <View style={EV.actions}>
          <View style={{ flex: 1 }}>{action}</View>
          {side}
        </View>
        {registration && <RegistrationStatus registration={registration} onProof={onProof} onTicket={onTicket} dark={featured} />}
      </View>
    </PressScale>
  );
};

// ─── Mine: tickets + payment status (events v2) ───────────────────────────
// pending / rejected: "send payment proof again"; verified: a clear confirmed state
const RegistrationStatus = ({ registration, onProof, onTicket }) => {
  const pay = registration?.payment || {};
  const status = pay.status || "not_required";
  const ticket = registration?.ticket;
  // the ticket exists once the payment is verified (or straight away for a free event)
  const seats = Array.isArray(registration?.tickets) ? registration.tickets.length : 0;
  const hasTicket = seats > 0 && (status === "verified" || status === "not_required");
  if (status === "not_required" && !ticket?.tier && !hasTicket) return null;
  const tone = status === "verified" ? EV.statusVerified : status === "rejected" ? EV.statusRejected : EV.statusPending;
  const icon = status === "verified" ? "checkmark-circle" : status === "rejected" ? "close-circle" : "time-outline";
  const iconColor = status === "verified" ? T.success : status === "rejected" ? T.danger : T.ink;
  return (
    <View style={[EV.status, status === "not_required" ? { backgroundColor: T.sand } : tone]}>
      {!!ticket?.tier && (
        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {String(ticket.tier).toLowerCase()} × {ticket.quantity || 1}
          {pay.amount ? ` · ${formatRs(pay.amount)}` : ""}
        </Text>
      )}
      {status !== "not_required" && (
        <View style={EV.statusRow}>
          <Ionicons name={icon} size={16} color={iconColor} />
          <Text style={EV.statusText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {PAYMENT_LABEL[status]}
          </Text>
        </View>
      )}
      {status === "rejected" && !!pay.rejectReason && (
        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          reason: {pay.rejectReason}
        </Text>
      )}
      {(status === "pending" || status === "rejected") && onProof && (
        <TouchableOpacity
          style={EV.statusBtn}
          onPress={() => onProof(registration)}
          accessibilityRole="button"
          accessibilityLabel="send payment proof again"
        >
          <Text style={EV.statusBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            send payment proof again
          </Text>
        </TouchableOpacity>
      )}
      {hasTicket && onTicket && (
        <TouchableOpacity
          style={[EV.statusBtn, EV.ticketBtn]}
          onPress={() => onTicket(registration)}
          accessibilityRole="button"
          accessibilityLabel={seats > 1 ? `open my ${seats} tickets` : "open my ticket"}
        >
          <Ionicons name="qr-code-outline" size={16} color={T.ink} />
          <Text style={EV.statusBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {seats > 1 ? "my tickets" : "my ticket"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Header (Events design) ───────────────────────────────────────────────
const ModernHeader = ({ onBack, onMenuPress, showApplied, appliedCount }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[EV.header, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={onBack} style={EV.headerBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="back">
        <Ionicons name="chevron-back" size={22} color={T.ink} />
      </TouchableOpacity>
      <Text style={EV.headerTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {showApplied ? "my events" : "events"}<Text style={{ color: T.yellow }}>.</Text>
      </Text>
      <TouchableOpacity
        onPress={onMenuPress}
        style={[EV.myBtn, showApplied && EV.myBtnOn]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: showApplied }}
        accessibilityLabel={showApplied ? "show all events" : `my events, ${appliedCount} registered or saved`}
      >
        <Ionicons name={showApplied ? "close" : "checkmark-circle-outline"} size={16} color={showApplied ? T.white : T.ink} />
        <Text style={[EV.myBtnText, showApplied && { color: T.white }]}>
          {showApplied ? "all" : "mine"}
        </Text>
        {appliedCount > 0 && !showApplied && (
          <View style={EV.myCount}>
            <Text style={EV.myCountText}>{appliedCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { token, user, isGuest } = useContext(AuthContext);
  const { requireAccount } = useGuestGate();
  // saved events: this student's own device list (none for guests)
  const savedUserId = token && !isGuest ? user?._id || user?.id || null : null;
  const { savedIds, isSaved, toggle: toggleSaved, prune: pruneSaved } = useSavedEvents(savedUserId);
  const [feedComplete, setFeedComplete] = useState(false); // the feed returned every event
  const [feedLoaded, setFeedLoaded] = useState(false);
  const onSave = useCallback(
    (ev) => {
      if (!requireAccount()) return; // guests: the sign up sheet
      if (ev?._id) toggleSaved(ev._id);
    },
    [requireAccount, toggleSaved]
  );
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions(); // details sheet = 85% (follows rotation)

  const [events, setEvents] = useState(eventsCache.events || []);
  const [loading, setLoading] = useState(!eventsCache.events);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [activeCity, setActiveCity] = useState("All");
  const [registerEvent, setRegisterEvent] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showApplied, setShowApplied] = useState(false);
  const [appliedEventsData, setAppliedEventsData] = useState([]);
  const [userEventsCount, setUserEventsCount] = useState(0);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Dynamic categories fetched from backend
  const [categories, setCategories] = useState([]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const filterTranslate = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    title: "",
    university: "",
    city: "",
    type: "Hackathons",
    prize: "",
    deadline: "",
    description: "",
    location: "",
    contact: "",
    date: "",
    teamSize: "",
    registrationUrl: "",
  });

  // events v2: category templates (labels for event details) and "send proof again"
  const [templates, setTemplates] = useState(cachedTemplates());
  const [proofFor, setProofFor] = useState(null); // { registration, event }
  const [detailStatus, setDetailStatus] = useState("fresh"); // loading | fresh | offline
  const openIdRef = useRef(null);
  const feedRequest = useRef(null); // one /feed request at a time
  useEffect(() => {
    let alive = true;
    getTemplates()
      .then((t) => alive && setTemplates(t))
      .catch(() => {}); // labels fall back to the detail keys
    return () => {
      alive = false;
    };
  }, []);

  const availableCities = useMemo(() => {
    if (!events || events.length === 0) return [];
    const set = new Set();
    events.forEach((ev) => {
      const c = (ev.city || "").toString().trim();
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  // Derive categories from the loaded events (like cities), merging with the
  // backend-provided list so nothing gets lost during a partial fetch.
  const availableCategories = useMemo(() => {
    const set = new Set();

    events.forEach((ev) => {
      const push = (v) => {
        if (!v) return;
        const s = String(v).trim();
        if (!s) return;
        if (s.toLowerCase() === "general") return;
        set.add(s);
      };
      push(ev.type);
      if (Array.isArray(ev.categories)) ev.categories.forEach(push);
      if (Array.isArray(ev.tags)) ev.tags.forEach(push);
    });

    (categories || []).forEach((c) => {
      const s = String(c || "").trim();
      if (!s) return;
      if (s.toLowerCase() === "general") return;
      set.add(s);
    });

    return ["All", ...Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )];
  }, [events, categories]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePostEvent = async () => {
    if (!requireAccount()) return;
    if (!form.title || !form.university || !form.date) {
      Alert.alert("Validation Error", "Please fill required fields (Title, University, Date).");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/create`,
        { ...form, image: selectedImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Event created successfully.");
      setModalVisible(false);
      setForm({
        title: "",
        university: "",
        city: "",
        type: "Hackathons",
        prize: "",
        deadline: "",
        description: "",
        location: "",
        contact: "",
        date: "",
        teamSize: "",
        registrationUrl: "",
      });
      setSelectedImage(null);
      fetchEvents();
      fetchCategories();
    } catch (error) {
      Alert.alert("Error", plainError(error, "Failed to post event."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = (eventItem) => {
    if (!eventItem) return;
    if (!requireAccount()) return;

    if (isEventRegistered(eventItem._id)) {
      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        Alert.alert("Already Registered", "You're already registered for this event.");
      }
      return;
    }

    if (isImportedEvent(eventItem)) {
      (async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/track-external/${eventItem._id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res?.data?.engagement?.popups?.length) {
            engagementBus.emit(
              ENGAGEMENT_EVENTS.POPUPS_QUEUED,
              res.data.engagement.popups
            );
          }

          engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
          await fetchRegisteredEvents();
        } catch (e) {
          console.log("[track-external] failed:", e?.response?.data || e?.message);
        }
      })();

      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          (eventItem.title || "") + " " + (eventItem.organizer || "") + " event registration"
        )}`;
        Linking.openURL(searchUrl).catch(() => {
          Alert.alert("Notice", "No registration link available for this event.");
        });
      }
      return;
    }

    const state = registrationState(eventItem);
    if (!state.open) {
      Alert.alert(state.reason, state.reason === "sold out" ? "this event is full." : "registration for this event has closed.");
      return;
    }
    setRegisterEvent(eventItem);
  };

  // after POST /register (RegisterSheet): points popups, profile, lists
  const onRegistered = (data) => {
    if (data?.engagement?.popups?.length) {
      engagementBus.emit(ENGAGEMENT_EVENTS.POPUPS_QUEUED, data.engagement.popups);
    }
    engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
    fetchRegisteredEvents();
    fetchEvents(); // seats left / tickets left
  };

  useEffect(() => {
    bootstrap();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.emit("subscribe_events");

    socket.on("events:new_imported", (data) => {
      if (data?.events && Array.isArray(data.events)) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e._id));
          const newUnique = data.events.filter((e) => !existingIds.has(e._id));
          return [...newUnique, ...prev];
        });
      } else {
        fetchEvents();
      }
      fetchCategories();
    });

    socket.on("events:expired", () => {
      fetchEvents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchRegisteredEvents();
      }
    });
    return () => sub.remove();
  }, [token]);

  // Events list decides when the screen shows; categories and "registered"
  // load alongside without holding the screen.
  const bootstrap = async () => {
    const hadCache = !!eventsCache.events;
    if (hadCache) runEntranceAnimations();
    else setLoading(true);
    fetchCategories();
    fetchRegisteredEvents();
    try {
      await fetchEvents(true);
    } finally {
      setLoading(false);
      if (!hadCache) runEntranceAnimations();
    }
  };

  const runEntranceAnimations = () => {
    headerOpacity.setValue(0);
    headerTranslate.setValue(-20);
    filterOpacity.setValue(0);
    filterTranslate.setValue(20);
    listOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(filterOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(filterTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 60);

    setTimeout(() => {
      Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, 100);
  };

  const fetchEvents = async (isInitial = false) => {
    if (feedRequest.current) return feedRequest.current; // already loading
    const run = (async () => {
    try {
      if (!isInitial) setRefreshing(true);
      const res = await axios.get(`${API_BASE}/feed`, { params: { _: Date.now() }, headers: { "Cache-Control": "no-cache" } });
      const fetchedEvents = Array.isArray(res.data) ? res.data : res.data?.events || [];
      setEvents(fetchedEvents);
      eventsCache.events = fetchedEvents;
      eventsCache.at = Date.now();
      setLoadError(false);
      const total = Array.isArray(res.data) ? fetchedEvents.length : Number(res.data?.total);
      setFeedComplete(!Number.isFinite(total) || fetchedEvents.length >= total);
      setFeedLoaded(true);
    } catch (error) {
      // nothing cached to show → the error state (ui kit) instead of an alert
      if (!eventsCache.events) setLoadError(true);
    } finally {
      setRefreshing(false);
      feedRequest.current = null;
    }
    })();
    feedRequest.current = run;
    return run;
  };

  // Back on this screen: refetch when the list is older than LIST_FRESH_MS (30 s)
  useFocusEffect(
    useCallback(() => {
      if (eventsCache.at && Date.now() - eventsCache.at > LIST_FRESH_MS) {
        fetchEvents(true);
        fetchRegisteredEvents();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Fetch the distinct category list from the backend.
  // Fails silently — the derived `availableCategories` still covers the UI.
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.categories)
        ? res.data.categories
        : [];
      setCategories(list);
    } catch (error) {
      console.log("fetchCategories failed:", error?.message);
    }
  };

  const fetchRegisteredEvents = async () => {
    if (!token) {
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawList = Array.isArray(res.data) ? res.data : [];

      const ids = rawList
        .map((r) => {
          if (!r) return null;
          if (typeof r === "string") return r;
          if (r.eventId && typeof r.eventId === "object") {
            return r.eventId._id || r.eventId.id || null;
          }
          return r.eventId || null;
        })
        .filter(Boolean)
        .map(String);

      setRegisteredEventIds(ids);

      const appliedList = rawList
        .filter((r) => r && r.eventId && typeof r.eventId === "object")
        .map((r) => ({ event: r.eventId, registration: r }));
      setAppliedEventsData(appliedList);
    } catch (error) {
      console.log("Error fetching registrations:", error);
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchCategories(), fetchRegisteredEvents()]);
  };

  const handleCancelRegistration = async (event) => {
    if (!token) {
      requireAccount();
      return;
    }

    Alert.alert(
      "Cancel Registration",
      `Are you sure you want to cancel your registration for "${event.title}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/register/${event._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Registration cancelled successfully.");
              await fetchRegisteredEvents();
            } catch (error) {
              Alert.alert(
                "Error",
                plainError(error, "Failed to cancel registration.")
              );
            }
          },
        },
      ]
    );
  };

  const normalizeCategoryStr = (str) => {
    if (!str) return "";
    let s = str.toString().trim().toLowerCase();
    if (s.length > 3 && s.endsWith("s")) s = s.slice(0, -1);
    return s;
  };

  const isCategoryMatch = (event, category) => {
    if (!category || category === "All") return true;
    const normTab = normalizeCategoryStr(category);

    if (event.type) {
      const normType = normalizeCategoryStr(event.type);
      if (normType === normTab || normType.includes(normTab) || normTab.includes(normType)) {
        return true;
      }
    }
    if (Array.isArray(event.categories)) {
      if (event.categories.some((cat) => {
        const n = normalizeCategoryStr(cat);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    if (Array.isArray(event.tags)) {
      if (event.tags.some((tag) => {
        const n = normalizeCategoryStr(tag);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    return false;
  };

  const isCityMatch = (event, city) => {
    if (!city || city === "All") return true;
    return (event.city || "").toString().trim().toLowerCase() ===
           city.toString().trim().toLowerCase();
  };

  const filteredEvents = useMemo(() => {
    if (showApplied) {
      return appliedEventsData
        .map((item) => ({ ...item.event, registration: item.registration }))
        .filter((ev) => isCityMatch(ev, activeCity));
    }

    let list = events;
    if (activeTab && activeTab !== "All") list = list.filter((e) => isCategoryMatch(e, activeTab));
    if (activeCity && activeCity !== "All") list = list.filter((e) => isCityMatch(e, activeCity));
    return list;
  }, [activeTab, activeCity, events, showApplied, appliedEventsData]);

  const isEventRegistered = (eventId) => registeredEventIds.includes(eventId);

  // Saved events that are gone or past are dropped quietly (only after a fresh feed;
  // with a partial feed an id that isn't in it is kept, just not shown)
  useEffect(() => {
    if (!feedLoaded || !savedIds.length) return;
    const byId = new Map(events.map((e) => [String(e._id), e]));
    const keep = savedIds.filter((id) => {
      const ev = byId.get(id);
      if (ev) return !isPastEvent(ev);
      return !feedComplete;
    });
    if (keep.length !== savedIds.length) pruneSaved(keep);
  }, [feedLoaded, feedComplete, events, savedIds, pruneSaved]);

  // live saved events (same city filter as "registered")
  const savedEvents = useMemo(() => {
    if (!savedIds.length) return [];
    const byId = new Map(events.map((e) => [String(e._id), e]));
    return savedIds
      .map((id) => byId.get(id))
      .filter((e) => e && !isPastEvent(e))
      .filter((e) => isCityMatch(e, activeCity));
  }, [savedIds, events, activeCity]);

  const appliedCount = registeredEventIds.length + savedEvents.length;

  // List rows. All events: featured + "coming up.". Mine: "registered." then "saved.",
  // each with its own empty line.
  const listRows = useMemo(() => {
    if (!showApplied) return filteredEvents.map((e) => ({ kind: "event", key: String(e._id), event: e }));
    const rows = [{ kind: "header", key: "h-registered", title: "registered" }];
    if (filteredEvents.length) filteredEvents.forEach((e) => rows.push({ kind: "event", key: `r-${e._id}`, event: e }));
    else rows.push({ kind: "empty", key: "e-registered", which: "registered" });
    rows.push({ kind: "header", key: "h-saved", title: "saved" });
    if (savedEvents.length) savedEvents.forEach((e) => rows.push({ kind: "event", key: `s-${e._id}`, event: e }));
    else rows.push({ kind: "empty", key: "e-saved", which: "saved" });
    return rows;
  }, [showApplied, filteredEvents, savedEvents]);

  // Category chips (Events design: white pills, ink when active)
  const CategoryScroll = () => (
    <Animated.View style={{ opacity: filterOpacity, transform: [{ translateY: filterTranslate }] }}>
      {!showApplied && availableCategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={EV.chips}>
          {availableCategories.map((cat) => {
            const active = activeTab === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[EV.chip, active && EV.chipOn]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(cat);
                  setShowApplied(false);
                }}
              >
                <Text style={[EV.chipText, active && EV.chipTextOn]} numberOfLines={1}>
                  {formatCategoryLabel(cat).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );

  const CityFilterScroll = () => {
    if (availableCities.length <= 1) return null;

    return (
      <Animated.View style={{ opacity: filterOpacity }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[EV.chips, { paddingTop: 0 }]}>
          {availableCities.map((city) => {
            const active = activeCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[EV.cityChip, active && EV.cityChipOn]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCity(city);
                }}
              >
                <Ionicons name="location-outline" size={13} color={T.ink} />
                <Text style={[EV.cityChipText, active && { fontFamily: F.bodyBold }]}>
                  {city === "All" ? "all cities" : String(city).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  };


  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowApplied(!showApplied);
    if (!showApplied) {
      setActiveTab("All");
      setActiveCity("All");
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const closeDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openIdRef.current = null;
    setSelectedEvent(null);
  };

  // Details: show the list's copy at once, then the latest event (GET /api/events/:id).
  // The list's copy stays only while loading or when offline.
  const openEvent = (ev) => {
    if (!ev?._id) return;
    const id = String(ev._id);
    openIdRef.current = id;
    setSelectedEvent(ev);
    setDetailStatus("loading");
    fetchEvent(id)
      .then((fresh) => {
        if (openIdRef.current !== id) return; // closed or another event opened
        setSelectedEvent((cur) => (cur && String(cur._id) === id ? { ...fresh, registration: cur.registration } : cur));
        setDetailStatus("fresh");
        // the list shows the same version from now on
        setEvents((list) => {
          const next = list.map((e) => (String(e._id) === id ? fresh : e));
          eventsCache.events = next;
          return next;
        });
      })
      .catch(() => {
        if (openIdRef.current === id) setDetailStatus("offline");
      });
  };

  // Daily Drop / push → navigate('Events', { openEventId }) opens that event
  useOpenFromParams("openEventId", async (id) => {
    let ev = events.find((e) => String(e._id) === String(id));
    if (!ev) {
      const res = await axios.get(`${API_BASE}/${id}`);
      ev = res.data;
    }
    if (ev?._id) openEvent(ev);
    return true;
  }, !loading);

  // "your ticket is ready" (push, in-app list) → navigate('Events', { ticketRegistrationId })
  useOpenFromParams("ticketRegistrationId", (id) => {
    navigation.navigate("EventTicket", { registrationId: String(id) });
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <ModernHeader
          onBack={handleBackPress}
          onMenuPress={handleMenuPress}
          showApplied={showApplied}
          appliedCount={appliedCount}
        />
        <SkeletonList />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />

      <ModernHeader
        onBack={handleBackPress}
        onMenuPress={handleMenuPress}
        showApplied={showApplied}
        appliedCount={appliedCount}
      />

      <CategoryScroll />
      <CityFilterScroll />

      <Animated.View style={[styles.feedContainer, { opacity: listOpacity }]}>
        <FlatList
          data={listRows}
          keyExtractor={(row) => row.key}
          extraData={[savedIds, registeredEventIds]}
          renderItem={({ item: row, index }) => {
            if (row.kind === "header") {
              return (
                <Text style={EV.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {row.title}<Text style={{ color: T.yellow }}>.</Text>
                </Text>
              );
            }
            if (row.kind === "empty") {
              return row.which === "saved" ? (
                <EmptyState mood="sleepy" title="nothing saved yet." line="save an event and it shows up here." style={EV.sectionEmpty} />
              ) : (
                <EmptyState mood="sleepy" title="no registrations yet." line="register for an event and it shows up here." style={EV.sectionEmpty} />
              );
            }
            const ev = row.event;
            const featured = index === 0 && !showApplied;
            return (
              <>
                {index === 1 && !showApplied && (
                  <Text style={EV.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    coming up<Text style={{ color: T.yellow }}>.</Text>
                  </Text>
                )}
                <EventCard
                  item={ev}
                  featured={featured}
                  onOpen={openEvent}
                  onRegister={handleRegister}
                  isRegistered={isEventRegistered(ev._id)}
                  onCancel={handleCancelRegistration}
                  registration={showApplied ? ev.registration : null}
                  onProof={(reg) => setProofFor({ registration: reg, event: ev })}
                  onTicket={(reg) => navigation.navigate("EventTicket", { registrationId: String(reg._id) })}
                  side={<SaveButton saved={isSaved(ev._id)} dark={featured} onPress={() => onSave(ev)} />}
                />
              </>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !refreshing ? (
              loadError && !showApplied ? (
                <EmptyState
                  mood="panic"
                  title="couldn't load events."
                  line="check your connection and try again."
                  actionLabel="try again"
                  onAction={() => fetchEvents()}
                />
              ) : showApplied ? (
                <EmptyState
                  mood="sleepy"
                  title="no registered events."
                  line="register for an event and it shows up here."
                  actionLabel="explore events"
                  onAction={() => setShowApplied(false)}
                />
              ) : activeCity !== "All" ? (
                <EmptyState
                  mood="sleepy"
                  title={`no events in ${String(activeCity).toLowerCase()}.`}
                  line="try another city."
                  actionLabel="all cities"
                  onAction={() => setActiveCity("All")}
                />
              ) : (
                <EmptyState mood="sleepy" title="no events yet." line="new events show up here. check back soon." />
              )
            ) : null
          }
        />
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EVENT DETAIL — BOTTOM SHEET */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetail}
        statusBarTranslucent={true}
      >
        {/* The sheet is a plain View: it used to be a Pressable (to stop taps reaching the
            backdrop), which took the touch responder at touch start and stopped the
            ScrollView inside from scrolling on Android. The backdrop is now its own
            Pressable behind the sheet. */}
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetail}
            accessibilityRole="button"
            accessibilityLabel="close event details"
          />
          <View style={[styles.sheetContainer, { height: Math.round(windowHeight * 0.85) }]}>
            {selectedEvent && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetGrabber} />
                  <View style={styles.sheetHeaderRow}>
                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="back to events"
                    >
                      <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
                        event details
                      </Text>
                      {detailStatus === "loading" && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLiveRegion="polite">
                          <ActivityIndicator size="small" color={T.textMuted} />
                          <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>updating…</Text>
                        </View>
                      )}
                      {detailStatus === "offline" && (
                        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>offline · showing saved details</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="close event details"
                    >
                      <Ionicons name="close" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  bounces={true}
                  nestedScrollEnabled={true}
                  overScrollMode="always"
                >
                  <View style={styles.sheetImageWrapper}>
                    {/* the event's own image only; no stock banner when it has none */}
                    {eventImage(selectedEvent) ? (
                      <Image
                        source={{ uri: eventImage(selectedEvent) }}
                        style={styles.sheetBanner}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.sheetBanner, { backgroundColor: T.sand, alignItems: "center", justifyContent: "center" }]}>
                        <MaterialCommunityIcons name="calendar-star" size={44} color={T.textFaint} />
                      </View>
                    )}
                    <LinearGradient
                      colors={["rgba(17,17,17,0.05)", "rgba(17,17,17,0.55)"]}
                      style={styles.sheetBannerOverlay}
                    />
                    {isEventRegistered(selectedEvent._id) && (
                      <View style={styles.sheetRegisteredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.sheetRegisteredText}>registered</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sheetBody}>
                    <View style={styles.detailTopRow}>
                      {!!real(selectedEvent, "type") && (
                      <View
                        style={[
                          styles.detailTag,
                          { backgroundColor: getCategoryTheme(selectedEvent.type).bg },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryTheme(selectedEvent.type).icon}
                          size={12}
                          color={getCategoryTheme(selectedEvent.type).color}
                        />
                        <Text
                          style={[
                            styles.detailTagText,
                            { color: getCategoryTheme(selectedEvent.type).color },
                          ]}
                          numberOfLines={1}
                        >
                          {String(real(selectedEvent, "type")).toLowerCase()}
                        </Text>
                      </View>
                      )}
                      {isEventRegistered(selectedEvent._id) && (
                        <View style={[styles.detailTag, { backgroundColor: T.successBg }]}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={[styles.detailTagText, { color: COLORS.success }]}>
                            registered
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.detailTitle}>{selectedEvent.title}</Text>

                    {!!real(selectedEvent, "city") && (
                    <View style={styles.detailOrgRow}>
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.detailAvatarSmall}
                      >
                        <Ionicons name="location" size={16} color={T.white} />
                      </LinearGradient>
                      <Text style={styles.detailOrgLocationLarge}>
                        {real(selectedEvent, "city")}
                      </Text>
                    </View>
                    )}

                    {!!(eventWhen(selectedEvent) || real(selectedEvent, "deadline") || real(selectedEvent, "teamSize")) && (
                    <View style={styles.specRow}>
                      {!!eventWhen(selectedEvent) && (
                        <View style={styles.specCard}>
                          <View style={styles.specIcon}>
                            <Ionicons name="calendar" size={18} color={T.ink} />
                          </View>
                          <Text style={styles.specTitle}>date</Text>
                          <Text style={styles.specText}>{eventWhen(selectedEvent)}</Text>
                        </View>
                      )}

                      {!!real(selectedEvent, "deadline") && (
                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="hourglass" size={18} color={T.ink} />
                        </View>
                        <Text style={styles.specTitle}>deadline</Text>
                        <Text style={styles.specText}>{dateText(selectedEvent, "deadline")}</Text>
                      </View>
                      )}

                      {!!real(selectedEvent, "teamSize") && (
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="people" size={18} color={T.ink} />
                        </View>
                        <Text style={styles.specTitle}>team</Text>
                        <Text style={styles.specText}>{real(selectedEvent, "teamSize")}</Text>
                      </View>
                      )}
                    </View>
                    )}

                    {/* events v2: price, seats, closing date (not for external events) */}
                    {!isImportedEvent(selectedEvent) && (
                      <View style={EV.infoRow}>
                        <View style={[EV.infoPill, { backgroundColor: T.yellowSoft }]}>
                          <Text style={EV.infoPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{priceLabel(selectedEvent)}</Text>
                        </View>
                        {!!seatsLabel(selectedEvent) && (
                          <View style={[EV.infoPill, seatsLabel(selectedEvent) === "sold out" && { backgroundColor: T.dangerBg }]}>
                            <Text style={[EV.infoPillText, seatsLabel(selectedEvent) === "sold out" && { color: T.danger }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                              {seatsLabel(selectedEvent)}
                            </Text>
                          </View>
                        )}
                        {!!closesLabel(selectedEvent) && (
                          <View style={EV.infoPill}>
                            <Text style={EV.infoPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{closesLabel(selectedEvent)}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {detailRows(selectedEvent, templates).length > 0 && (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>details</Text>
                        {detailRows(selectedEvent, templates).map((row) => (
                          <View key={row.key} style={EV.detailRow}>
                            <Text style={EV.detailLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{row.label}</Text>
                            <Text style={EV.detailValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {!!String(selectedEvent.description || "").trim() && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>description</Text>
                      <Text style={styles.sectionCardBody}>{selectedEvent.description}</Text>
                    </View>
                    )}

                    {!!real(selectedEvent, "location") && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>location</Text>
                      <Text style={styles.sectionCardBody}>
                        <Ionicons name="location" size={14} color={T.ink} />{" "}
                        {real(selectedEvent, "location")}
                      </Text>
                    </View>
                    )}

                    {selectedEvent.university ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>university</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="school" size={14} color={T.ink} />{" "}
                          {selectedEvent.university}
                        </Text>
                      </View>
                    ) : null}

                    {real(selectedEvent, "prize") && !selectedEvent.details?.prizePool ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>prize pool</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="trophy" size={14} color={T.ink} />{" "}
                          {real(selectedEvent, "prize")}
                        </Text>
                      </View>
                    ) : null}

                    {selectedEvent.contact ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>contact</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="call" size={14} color={T.ink} />{" "}
                          {selectedEvent.contact}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ height: 24 }} />
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.sheetStickyFooter,
                    { paddingBottom: (insets.bottom || 0) + 12 },
                  ]}
                >
                  <View style={styles.sheetStickyContent}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      {isImportedEvent(selectedEvent) ? (
                        <Text style={styles.stickyLabel}>external event</Text>
                      ) : !isImportedEvent(selectedEvent) && registrationState(selectedEvent).reason ? (
                        <Text style={styles.stickyLabel}>{registrationState(selectedEvent).reason}</Text>
                      ) : selectedEvent.registrationCloses ? (
                        <>
                          <Text style={styles.stickyLabel}>register before</Text>
                          <Text style={styles.stickyValue} numberOfLines={1}>
                            {(closesLabel(selectedEvent) || "").replace(/^registration closes /, "")}
                          </Text>
                        </>
                      ) : real(selectedEvent, "deadline") ? (
                        <>
                          <Text style={styles.stickyLabel}>register before</Text>
                          <Text style={styles.stickyValue} numberOfLines={1}>
                            {dateText(selectedEvent, "deadline")}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    <View style={{ marginRight: 8 }}>
                      <SaveButton saved={isSaved(selectedEvent._id)} onPress={() => onSave(selectedEvent)} />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      disabled={!isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open}
                      style={!isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open ? { opacity: 0.45 } : null}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open }}
                      onPress={() => {
                        const e = selectedEvent;
                        setSelectedEvent(null);
                        handleRegister(e);
                      }}
                    >
                      <LinearGradient
                        colors={
                          isImportedEvent(selectedEvent)
                            ? [T.ink, T.ink]
                            : [COLORS.primary, COLORS.gradientEnd]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.stickyButton}
                      >
                        <Text style={styles.stickyButtonText}>
                          {isImportedEvent(selectedEvent) ? "open link" : "register now"}
                        </Text>
                        <Ionicons
                          name={isImportedEvent(selectedEvent) ? "open-outline" : "arrow-forward"}
                          size={16}
                          color={COLORS.accent}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE EVENT MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalScreen}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={[styles.modalHero, { paddingTop: (insets.top || 0) + 12 }]}
              >
                <View style={styles.modalHeroTop}>
                  <View style={styles.modalHeroTitleRow}>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                    <Text style={styles.modalHeroTitle}>create event</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityLabel="close create event"
                  >
                    <Ionicons name="close" size={25} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalHeroSubtitle}>
                  Publish an event and connect with your campus community
                </Text>
              </LinearGradient>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
              >
                <ScrollView
                  style={styles.formScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.formScrollContent,
                    { paddingBottom: (insets.bottom || 12) + 24 },
                  ]}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Event Title *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter event title"
                      placeholderTextColor={T.textFaint}
                      value={form.title}
                      onChangeText={(text) => setForm({ ...form, title: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>University *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="University name"
                          placeholderTextColor={T.textFaint}
                          value={form.university}
                          onChangeText={(text) => setForm({ ...form, university: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>City *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="City"
                          placeholderTextColor={T.textFaint}
                          value={form.city}
                          onChangeText={(text) => setForm({ ...form, city: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category *</Text>
                    {/* ✅ FIX: long labels shrink and stay on one line inside the pill */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {availableCategories
                        .filter((item) => item !== "All")
                        .map((cat) => {
                          const selected = form.type === cat;
                          const theme = getCategoryTheme(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              activeOpacity={0.86}
                              onPress={() => setForm({ ...form, type: cat })}
                              style={[
                                styles.optionPill,
                                selected && styles.optionPillActive,
                                { borderColor: selected ? theme.color : COLORS.line },
                              ]}
                            >
                              {selected && (
                                <LinearGradient
                                  colors={[theme.color, theme.color + "80"]}
                                  style={StyleSheet.absoluteFillObject}
                                />
                              )}
                              <Ionicons
                                name={theme.icon}
                                size={14}
                                color={selected ? T.white : theme.color}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextActive,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                maxFontSizeMultiplier={MAX_FONT_SCALE}
                              >
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>description</Text>
                    <TextInput
                      style={[styles.textInput, styles.multiLineInput]}
                      placeholder="Describe your event..."
                      placeholderTextColor={T.textFaint}
                      multiline
                      value={form.description}
                      onChangeText={(text) => setForm({ ...form, description: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>event date</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="15 May 2026"
                          placeholderTextColor={T.textFaint}
                          value={form.date}
                          onChangeText={(text) => setForm({ ...form, date: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>team size</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2-4 Members"
                          placeholderTextColor={T.textFaint}
                          value={form.teamSize}
                          onChangeText={(text) => setForm({ ...form, teamSize: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location / Venue</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Auditorium, online, lab..."
                      placeholderTextColor={T.textFaint}
                      value={form.location}
                      onChangeText={(text) => setForm({ ...form, location: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>prize pool</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="PKR 100,000"
                          placeholderTextColor={T.textFaint}
                          value={form.prize}
                          onChangeText={(text) => setForm({ ...form, prize: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>deadline</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="30 April 2026"
                          placeholderTextColor={T.textFaint}
                          value={form.deadline}
                          onChangeText={(text) => setForm({ ...form, deadline: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>contact info</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email or phone"
                      placeholderTextColor={T.textFaint}
                      value={form.contact}
                      onChangeText={(text) => setForm({ ...form, contact: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Original Event / Registration Link</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="https://forms.google.com/... or https://luma.com/..."
                      placeholderTextColor={T.textFaint}
                      value={form.registrationUrl}
                      onChangeText={(text) => setForm({ ...form, registrationUrl: text })}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>event banner</Text>
                    <TouchableOpacity
                      style={styles.uploadCard}
                      activeOpacity={0.88}
                      onPress={pickImage}
                    >
                      {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.uploadPreview} />
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <View style={styles.uploadIconCircle}>
                            <Ionicons name="image-outline" size={30} color={COLORS.primary} />
                          </View>
                          <Text style={styles.uploadTitle}>upload banner</Text>
                          <Text style={styles.uploadSubtitle}>Recommended 16:9 ratio</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryFormButton}
                    activeOpacity={0.88}
                    disabled={submitting}
                    onPress={handlePostEvent}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryFormGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color={COLORS.accent} />
                      ) : (
                        <>
                          <Text style={styles.primaryFormText}>publish event</Text>
                          <Ionicons name="rocket-outline" size={22} color={COLORS.accent} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.formBottomSpacer} />
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* REGISTRATION (events v2): the event's own form, tickets, payment */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {registerEvent && (
        <RegisterSheet
          event={registerEvent}
          token={token}
          user={user}
          onClose={() => setRegisterEvent(null)}
          onRegistered={onRegistered}
          onAlreadyRegistered={() => {
            Alert.alert("Notice", "You're already registered for this event.");
            setRegisterEvent(null);
            fetchRegisteredEvents();
          }}
        />
      )}
      {proofFor && (
        <ProofSheet
          registration={proofFor.registration}
          event={proofFor.event}
          token={token}
          onClose={() => setProofFor(null)}
          onSent={() => {
            setProofFor(null);
            fetchRegisteredEvents();
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },

  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", position: "relative",
  },
  headerBtnActive: {
    backgroundColor: T.successBg, borderWidth: 1, borderColor: COLORS.success,
  },
  headerBadge: {
    position: "absolute", top: -3, right: -3, minWidth: 16, height: 16,
    paddingHorizontal: 3, borderRadius: 8, backgroundColor: COLORS.danger,
    justifyContent: "center", alignItems: "center",
  },
  headerBadgeText: { color: T.white, fontSize: 9, fontFamily: F.bodyBold },
  logoContainer: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  logoBadge: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  headerTitle: {
    fontSize: 16, fontFamily: F.bodyBold, color: COLORS.primary,
    letterSpacing: 0.3, marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 9, color: COLORS.muted, fontFamily: F.bodySemi,
    marginLeft: 8, letterSpacing: 0.5,
  },

  // ─── Category chips (FIXED: uniform width, 2-line label, auto-shrink) ─
  categoryScrollContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryScrollItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 6,
    width: 86,
    minHeight: 68,
    position: "relative",
    overflow: "hidden",
  },
  categoryScrollItemActive: {
    borderColor: "transparent",
  },
  categoryScrollIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryScrollLabel: {
    fontSize: 8.5,
    lineHeight: 10.5,
    fontFamily: F.bodyBold,
    color: COLORS.body,
    textAlign: "center",
    marginTop: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  cityScrollContainer: {
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line,
    backgroundColor: COLORS.page,
  },
  cityScrollHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 6,
  },
  cityScrollHeaderText: {
    fontSize: 10, fontFamily: F.bodyBold, color: COLORS.muted,
    letterSpacing: 0.4, marginLeft: 4, textTransform: 'none',
  },
  cityScrollContent: { paddingHorizontal: 14, paddingVertical: 2 },
  cityChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    backgroundColor: COLORS.card, marginRight: 8,
  },
  cityChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cityChipText: { fontSize: 12, fontFamily: F.bodySemi, color: COLORS.body },
  cityChipTextActive: { color: T.ink, fontFamily: F.bodyBold },

  feedContainer: { flex: 1 },

  skeletonCard: {
    backgroundColor: T.card, borderRadius: 14, overflow: "hidden",
    marginBottom: 12, shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: COLORS.line,
  },
  skeletonImage: { width: "100%", height: 140, backgroundColor: T.sand, overflow: "hidden" },
  shimmerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: T.paper,
  },
  skeletonContent: { padding: 12 },
  skeletonTitle: {
    height: 18, width: "75%", backgroundColor: T.sand,
    borderRadius: 6, marginBottom: 6,
  },
  skeletonText: {
    height: 11, width: "90%", backgroundColor: T.sand,
    borderRadius: 4, marginBottom: 4,
  },
  skeletonTextShort: {
    height: 11, width: "55%", backgroundColor: T.sand,
    borderRadius: 4, marginBottom: 8, marginTop: 4,
  },
  skeletonButton: {
    width: 80, height: 32, backgroundColor: T.sand, borderRadius: 10,
  },
  skeletonFooter: { flexDirection: "row" },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 },
  card: {
    borderRadius: 16, overflow: "hidden", marginBottom: 12,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: T.line,
  },
  cardGradient: { position: "relative", overflow: "hidden" },
  glowEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.accent, borderRadius: 16,
  },
  imageWrapper: { position: "relative", width: "100%", height: 170 },
  cardImage: { width: "100%", height: "100%" },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  categoryBadge: {
    position: "absolute", bottom: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    maxWidth: "65%",
  },
  categoryBadgeText: { fontSize: 9, fontFamily: F.bodyBold, marginLeft: 3, flexShrink: 1 },
  importedPill: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: T.ink,
  },
  importedPillText: {
    fontSize: 9, fontFamily: F.bodyBold, color: T.white, marginLeft: 3,
  },
  registeredBadge: {
    position: "absolute", top: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  registeredBadgeGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4,
  },
  registeredBadgeText: {
    fontSize: 9, fontFamily: F.bodyBold, color: T.white, marginLeft: 2,
  },
  dateBadge: {
    position: "absolute", bottom: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  dateBadgeGradient: { paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 9, fontFamily: F.bodyBold, color: T.white },
  contentWrapper: { padding: 14 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  orgContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  orgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  locationText: { fontSize: 14, fontFamily: F.bodySemi, color: COLORS.primary },
  title: {
    fontSize: 16, fontFamily: F.bodyBold, color: COLORS.primary,
    marginBottom: 4, lineHeight: 20,
  },
  description: {
    fontSize: 12, fontFamily: F.body, color: COLORS.body, lineHeight: 16, marginBottom: 8,
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  statText: { fontSize: 10, color: COLORS.muted, marginLeft: 3, fontFamily: F.bodyMedium },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  registerActionButton: { borderRadius: 10, overflow: "hidden" },
  registerGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6,
  },
  registerActionText: {
    fontSize: 12, fontFamily: F.bodyBold, color: T.white, marginLeft: 3,
  },
  cancelActionButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: T.dangerBg,
  },
  cancelActionText: {
    fontSize: 12, fontFamily: F.bodyBold, color: T.danger, marginLeft: 3,
  },
  detailsActionButton: { flexDirection: "row", alignItems: "center" },
  detailsActionText: {
    fontSize: 11, color: T.ink, fontFamily: F.bodySemi, marginRight: 2,
  },

  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 40, paddingBottom: 20 },
  emptyIconContainer: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.line,
  },
  emptyTitle: { color: COLORS.primary, fontSize: 18, fontFamily: F.heading },
  emptyText: {
    marginTop: 4, color: COLORS.body, fontSize: 12, fontFamily: F.body,
    lineHeight: 17, textAlign: "center", maxWidth: 240,
  },
  exploreButton: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  exploreGradient: { paddingHorizontal: 20, paddingVertical: 8 },
  exploreButtonText: { color: T.white, fontSize: 13, fontFamily: F.bodyBold },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: T.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: "column",
  },
  sheetHeader: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexShrink: 0,
  },
  sheetGrabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.handle, alignSelf: "center", marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 14,
  },
  sheetHeaderBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center",
  },
  sheetHeaderTitle: {
    flex: 1, textAlign: "center", fontSize: 15,
    fontFamily: F.bodyBold, color: COLORS.primary, marginHorizontal: 8,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    paddingBottom: 24, // the footer is outside the ScrollView
  },
  sheetImageWrapper: {
    position: "relative", width: "100%", height: 200,
  },
  sheetBanner: { width: "100%", height: "100%" },
  sheetBannerOverlay: { ...StyleSheet.absoluteFillObject },
  sheetRegisteredBadge: {
    position: "absolute", bottom: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.card,
  },
  sheetRegisteredText: {
    color: COLORS.success, fontSize: 11, fontFamily: F.bodyBold, marginLeft: 3,
  },
  sheetBody: { padding: 16, paddingBottom: 8 },

  sheetStickyFooter: {
    borderTopWidth: 1, borderTopColor: COLORS.line,
    backgroundColor: T.card, paddingTop: 10,
    flexShrink: 0,
  },
  sheetStickyContent: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
  },

  detailTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  detailTag: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    maxWidth: "70%",
  },
  detailTagText: { fontSize: 11, fontFamily: F.bodyBold, marginLeft: 3, flexShrink: 1 },
  detailTitle: {
    color: COLORS.primary, fontSize: 20, fontFamily: F.heading,
    lineHeight: 26, marginBottom: 8,
  },
  detailOrgRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  detailAvatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  detailOrgLocationLarge: {
    fontSize: 14, fontFamily: F.bodyBold, color: COLORS.primary,
  },
  specRow: { flexDirection: "row", marginBottom: 12 },
  specCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: "center", marginRight: 6,
  },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 4 },
  specTitle: {
    color: COLORS.muted, fontSize: 10, fontFamily: F.bodyBold, marginBottom: 2,
  },
  specText: {
    color: COLORS.primary, fontSize: 12, fontFamily: F.bodyBold, textAlign: "center",
  },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.line,
  },
  sectionCardTitle: {
    color: COLORS.primary, fontSize: 13, fontFamily: F.bodyBold, marginBottom: 4,
  },
  sectionCardBody: {
    color: COLORS.body, fontSize: 12, fontFamily: F.body, lineHeight: 18,
  },
  stickyLabel: { color: COLORS.danger, fontSize: 9, fontFamily: F.bodyBold, marginBottom: 0 },
  stickyValue: { color: COLORS.primary, fontSize: 13, fontFamily: F.bodyBold },
  stickyButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
  },
  stickyButtonText: {
    color: T.white, fontSize: 12, fontFamily: F.bodyBold, marginRight: 3,
  },

  modalScreen: { flex: 1, backgroundColor: COLORS.page },
  modalContainer: { flex: 1 },
  keyboardAvoidView: { flex: 1 },
  modalHero: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  modalHeroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  modalHeroTitleRow: { flexDirection: "row", alignItems: "center" },
  modalHeroTitle: {
    color: T.white, fontSize: 18, fontFamily: F.heading, marginLeft: 6,
  },
  modalClose: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    backgroundColor: T.inkSoft,
  },
  modalHeroSubtitle: {
    marginTop: 4, color: T.onInkMuted,
    fontSize: 12, fontFamily: F.bodySemi,
  },
  formScrollView: { flex: 1, paddingHorizontal: 14 },
  formScrollContent: { paddingTop: 10 },
  inputGroup: { marginBottom: 0 },
  inputLabel: {
    color: COLORS.primary, fontSize: 11, fontFamily: F.bodyBold, marginBottom: 3,
  },
  textInput: {
    backgroundColor: T.card, borderWidth: 1.5, borderColor: COLORS.line,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10,
    marginBottom: 10, color: COLORS.primary, fontSize: 12, fontFamily: F.body,
  },
  row: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 4 },
  colRight: { flex: 1, marginLeft: 4 },
  multiLineInput: { minHeight: 80, textAlignVertical: "top" },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 6,
    backgroundColor: T.card,
    overflow: "hidden",
    maxWidth: 220,
  },
  optionPillActive: { borderWidth: 1.5 },
  optionPillText: {
    fontSize: 12,
    fontFamily: F.bodySemi,
    color: COLORS.body,
    flexShrink: 1,
  },
  optionPillTextActive: { color: T.white },
  uploadCard: {
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1.5, borderColor: COLORS.line, borderStyle: "dashed",
    backgroundColor: T.card, minHeight: 110,
    justifyContent: "center", alignItems: "center",
  },
  uploadPlaceholder: { alignItems: "center", paddingVertical: 20 },
  uploadIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  uploadTitle: { fontSize: 13, fontFamily: F.bodyBold, color: COLORS.primary },
  uploadSubtitle: { fontSize: 11, fontFamily: F.body, color: COLORS.muted, marginTop: 2 },
  uploadPreview: { width: "100%", height: 160, resizeMode: "cover" },
  primaryFormButton: {
    borderRadius: 12, overflow: "hidden",
    shadowColor: T.ink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginTop: 14,
  },
  primaryFormGradient: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  primaryFormText: {
    color: T.white, fontSize: 14, fontFamily: F.bodyBold, marginRight: 4,
  },
  formBottomSpacer: { height: Platform.OS === "ios" ? 30 : 20 },
});

// ─── Events design layout ───────────────────────────────────────────
const EV = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, backgroundColor: T.paper },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: F.heading, fontSize: 24, color: T.ink },
  myBtn: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: T.yellow, flexDirection: "row", alignItems: "center", gap: 6 },
  myBtnOn: { backgroundColor: T.ink },
  myBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  myCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" },
  myCountText: { fontFamily: F.bodyBold, fontSize: 11, color: T.yellow },

  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, justifyContent: "center", maxWidth: 200 },
  chipOn: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  chipTextOn: { color: T.white, fontFamily: F.bodyBold },
  cityChip: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.sand, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: T.sand },
  cityChipOn: { backgroundColor: T.card, borderColor: T.ink },
  cityChipText: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink },

  h2: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginTop: 6, marginBottom: 10, paddingHorizontal: 2 },

  // featured (top event): dark card from the Events design
  featured: { borderRadius: 28, backgroundColor: T.ink, overflow: "hidden", marginBottom: 12 },
  featuredBody: { padding: 16, paddingTop: 14 },
  featuredTitle: { fontFamily: F.heading, fontSize: 22, lineHeight: 27, color: T.white },
  featuredMeta: { fontFamily: F.body, fontSize: 13.5, lineHeight: 18, color: T.onInkMuted, marginTop: 4 },

  // list size: same parts, white with a 1 px line border
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: "hidden", marginBottom: 12 },
  cardBody: { padding: 14, paddingTop: 12 },
  cardTitle: { fontFamily: F.headingBold, fontSize: 17, lineHeight: 22, color: T.ink },
  cardMeta: { fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: T.textMuted, marginTop: 4 },

  // poster area (both sizes): fixed 16:9, sand, radius 18, whole image (contain)
  media: { aspectRatio: 16 / 9, margin: 8, marginBottom: 0, borderRadius: 18, backgroundColor: T.sand, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  mediaImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },

  // pills wrap instead of cutting the value; small so the poster stays readable
  datePill: { minHeight: 24, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: T.yellow, justifyContent: "center", maxWidth: "62%" },
  datePillText: { fontFamily: F.bodyBold, fontSize: 11.5, lineHeight: 15, color: T.ink },
  prizePill: { minHeight: 24, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: T.card, justifyContent: "center", maxWidth: "45%" },
  prizePillText: { fontFamily: F.bodyBold, fontSize: 11.5, lineHeight: 15, color: T.ink },
  pillBottomLeft: { position: "absolute", left: 8, bottom: 8 },
  pillTopRight: { position: "absolute", right: 8, top: 8 },

  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  regBtn: { height: 46, borderRadius: 23, backgroundColor: T.yellow, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16 },
  regBtnDone: { backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  regBtnList: { height: 44, borderRadius: 22, paddingHorizontal: 12 },
  regText: { fontFamily: F.bodyBold, fontSize: 14.5, color: T.ink },
  regTextList: { fontSize: 13.5, flexShrink: 1 },
  regBtnOff: { backgroundColor: T.sand },
  regTextOff: { color: T.textMuted },
  tagPrice: { backgroundColor: T.yellowSoft },
  tagSoldOut: { backgroundColor: T.dangerBg },
  status: { marginTop: 12, borderRadius: 14, padding: 12, gap: 6 },
  statusPending: { backgroundColor: T.yellowSoft },
  statusVerified: { backgroundColor: T.successBg },
  statusRejected: { backgroundColor: T.dangerBg },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, flexShrink: 1 },
  statusMeta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted },
  statusBtn: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: T.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 4, alignSelf: "flex-start" },
  statusBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  ticketBtn: { flexDirection: "row", gap: 6, backgroundColor: T.yellow, borderColor: T.yellow },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  infoPill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: "center", backgroundColor: T.sand },
  infoPillText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.lineSoft },
  detailLabel: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.textMuted, flexShrink: 0, maxWidth: "45%" },
  detailValue: { fontFamily: F.body, fontSize: 14, color: T.ink, flex: 1, textAlign: "right" },

  // tags (always reserve the row so cards keep the same height)
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { minHeight: 22, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 11, backgroundColor: T.sand, justifyContent: "center" },
  tagOnInk: { backgroundColor: T.inkSoft },
  tagDark: { backgroundColor: T.ink },

  // save (bookmark): 44 px circle; light on white cards, outlined on the dark card
  saveBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, alignItems: "center", justifyContent: "center" },
  saveBtnDark: { backgroundColor: "transparent", borderColor: T.inkLine },
  saveBtnOn: { backgroundColor: T.yellow, borderColor: T.yellow },
  saveBtnOnDark: { backgroundColor: T.yellow, borderColor: T.yellow },
  sectionEmpty: { paddingVertical: 16 },
  tagText: { fontFamily: F.bodyBold, fontSize: 11, color: T.ink },
});
