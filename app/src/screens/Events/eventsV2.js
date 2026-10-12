// app/src/screens/Events/eventsV2.js
// Events v2 logic with no React: category templates, price / seats / closing text,
// category details, the registration form, validation (same rules as the server's
// services/events/eventValidation.js) and the exact POST /api/events/register body.
import axios from "axios";

export const API_BASE = "https://the-deft-crew-production.up.railway.app/api/events";
export const BASE_KEYS = ["studentName", "email", "whatsapp", "university", "studentId"];
// today's form: events without a registrationForm register exactly as before
export const LEGACY_FORM = [
  { key: "studentName", label: "Full name", type: "text", required: true, store: "base" },
  { key: "email", label: "University email", type: "email", required: true, store: "base" },
  { key: "whatsapp", label: "WhatsApp number", type: "phone", required: true, store: "base", helpText: "03XXXXXXXXX" },
  { key: "studentId", label: "Student ID / CNIC", type: "text", required: false, store: "base" },
];
const CLOUDINARY_CLOUDS = ["decaxpera"];

const str = (v) => (v == null ? "" : String(v)).trim();
const norm = (s) => str(s).toLowerCase().replace(/\s+/g, " ");

// ── category templates: fetched once, shared ────────────────────
let templatesCache = null;
let templatesPromise = null;
export function getTemplates(get = axios.get) {
  if (templatesCache) return Promise.resolve(templatesCache);
  if (!templatesPromise) {
    templatesPromise = get(`${API_BASE}/category-templates`)
      .then((r) => {
        const t = r?.data;
        if (!t || !Array.isArray(t.categories)) throw new Error("bad templates");
        templatesCache = t;
        return t;
      })
      .finally(() => {
        templatesPromise = null;
      });
  }
  return templatesPromise;
}
export const cachedTemplates = () => templatesCache;
export const _resetTemplatesForTest = () => {
  templatesCache = null;
  templatesPromise = null;
};

export function findTemplate(templates, type) {
  if (!templates) return null;
  const t = norm(type);
  return (
    (templates.categories || []).find((c) => norm(c.name) === t || norm(c.name).replace(/s$/, "") === t.replace(/s$/, "")) ||
    templates.generic ||
    null
  );
}

// ── money / seats / dates ───────────────────────────────────────
export const formatRs = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;
const tiersOf = (event) => (Array.isArray(event?.ticketTiers) ? event.ticketTiers : []);

export function isPaidEvent(event) {
  return (event?.fee?.amount || 0) > 0 || tiersOf(event).some((t) => (t.price || 0) > 0);
}

// "free", "Rs 1,500", "from Rs 1,000", "free · paid from Rs 2,000"
export function priceLabel(event) {
  const tiers = tiersOf(event);
  if (tiers.length) {
    const prices = tiers.map((t) => Number(t.price) || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max === 0) return "free";
    if (min === max) return formatRs(min);
    if (min === 0) return `free · paid from ${formatRs(Math.min(...prices.filter((p) => p > 0)))}`;
    return `from ${formatRs(min)}`;
  }
  const fee = event?.fee?.amount || 0;
  return fee > 0 ? formatRs(fee) : "free";
}

// seats: only when the event has a capacity or tickets
export function seatsLabel(event) {
  const tiers = tiersOf(event);
  if (tiers.length && tiers.every((t) => (t.remaining ?? 1) <= 0)) return "sold out";
  const left = event?.seatsLeft;
  if (left == null) return null;
  if (left <= 0) return "sold out";
  return left === 1 ? "1 seat left" : `${left.toLocaleString("en-US")} seats left`;
}

const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${h}:${m} ${ap}`;
}
export const closesLabel = (event) => (event?.registrationCloses ? `registration closes ${formatWhen(event.registrationCloses)}` : null);

// can a student register now? { open, reason }
export function registrationState(event, now = new Date()) {
  if (!event) return { open: false, reason: "" };
  if (event.registrationCloses && new Date(event.registrationCloses) <= now) return { open: false, reason: "registration closed" };
  if (seatsLabel(event) === "sold out") return { open: false, reason: "sold out" };
  return { open: true, reason: "" };
}

// ── category details for the details sheet ──────────────────────
const MONEY_KEYS = ["prizePool"];
export function detailRows(event, templates) {
  const details = event?.details;
  if (!details || typeof details !== "object") return [];
  const tpl = findTemplate(templates, event.type);
  const fields = (tpl?.createFields || []).filter((f) => f.store === "details");
  const rows = [];
  for (const f of fields) {
    const v = details[f.key];
    let text;
    if (Array.isArray(v)) text = v.map(str).filter(Boolean).join(", ");
    else if (typeof v === "number") text = MONEY_KEYS.includes(f.key) ? formatRs(v) : String(v);
    else text = str(v);
    if (!text) continue;
    rows.push({ key: f.key, label: str(f.label).replace(/\s*\(PKR\)\s*$/i, "").toLowerCase(), value: text });
  }
  return rows;
}

// ── the registration form ───────────────────────────────────────
// the event's form (base fields always "base"), or today's four fields
export function formFields(event) {
  const saved = Array.isArray(event?.registrationForm) && event.registrationForm.length ? event.registrationForm : null;
  return (saved || LEGACY_FORM).map((f) => (BASE_KEYS.includes(f.key) ? { ...f, store: "base" } : f));
}
// old events (no form, no fee, no tickets) register with today's payload
export const isLegacyRegistration = (event) =>
  !(Array.isArray(event?.registrationForm) && event.registrationForm.length) && !isPaidEvent(event) && !tiersOf(event).length;

export function normalizePkMobile(v) {
  let s = str(v).replace(/[\s-]/g, "");
  if (/^\+92/.test(s)) s = "0" + s.slice(3);
  else if (/^92\d{10}$/.test(s)) s = "0" + s.slice(2);
  return /^03\d{9}$/.test(s) ? s : null;
}
const isEmail = (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(str(v));
const isHttpUrl = (v) => {
  const s = str(v);
  if (s.length > 500) return false;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s);
};
export function isProjectCloudinaryUrl(v) {
  const m = /^https:\/\/res\.cloudinary\.com\/([^/]+)\//i.exec(str(v));
  return !!m && CLOUDINARY_CLOUDS.includes(m[1].toLowerCase()) && str(v).length <= 500;
}
const isObjectIdLike = (v) => /^[a-f0-9]{24}$/i.test(str(v));

// prefill from the profile: only values that exist and fit the field
export function prefillFromUser(user, fields) {
  const out = {};
  const keys = new Set(fields.map((f) => f.key));
  if (keys.has("studentName") && str(user?.name)) out.studentName = str(user.name);
  if (keys.has("email") && isEmail(user?.email)) out.email = str(user.email);
  if (keys.has("whatsapp")) {
    const p = normalizePkMobile(user?.whatsapp || user?.phone);
    if (p) out.whatsapp = p;
  }
  if (keys.has("university")) {
    const u = user?.university;
    const name = u && typeof u === "object" ? str(u.name) : str(u);
    if (name && !isObjectIdLike(name)) out.university = name;
  }
  if (keys.has("studentId") && str(user?.rollNo)) out.studentId = str(user.rollNo);
  return out;
}

const listValue = (raw) => (Array.isArray(raw) ? raw : str(raw).split(/\r?\n/)).map(str).filter(Boolean);

// one value against one field: same rules as the server's checkField. null = ok
export function checkValue(field, raw, ctx = {}) {
  const label = field.label || field.key;
  const isList = field.type === "list" || field.type === "multiselect";
  const empty = isList ? !listValue(raw).length : !str(raw);
  if (empty) return field.required ? `${label.toLowerCase()} is required` : null;
  switch (field.type) {
    case "text":
      return str(raw).length > 200 ? "too long (max 200 characters)" : null;
    case "textarea":
      return str(raw).length > 2000 ? "too long (max 2000 characters)" : null;
    case "number":
      return /^\d+$/.test(str(raw)) && Number(str(raw)) <= 10000000 ? null : "use a whole number";
    case "select": {
      const opts = (field.options || []).filter((o) => !String(o).startsWith("fromEvent:"));
      const list = opts.length ? opts : ctx.options || [];
      return list.includes(str(raw)) ? null : "choose one of the options";
    }
    case "multiselect":
      return listValue(raw).every((x) => (field.options || []).includes(x)) ? null : "choose from the options";
    case "list": {
      const items = listValue(raw);
      if (items.length > 30) return "max 30 items";
      return items.some((x) => x.length > 200) ? "an item is too long (max 200 characters)" : null;
    }
    case "date":
      return Number.isNaN(new Date(raw).getTime()) ? "pick a date" : null;
    case "time":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(str(raw)) ? null : "use a time like 18:30";
    case "url":
      return isHttpUrl(raw) ? null : "use a link starting with https://";
    case "phone":
      return normalizePkMobile(raw) ? null : "use a pakistani mobile number like 03XXXXXXXXX";
    case "email":
      return isEmail(raw) && str(raw).length <= 254 ? null : "use an email address";
    case "file":
      return isProjectCloudinaryUrl(raw) ? null : "upload the file again";
    default:
      return null;
  }
}

// ── tickets and total ───────────────────────────────────────────
// same limit as the server: details.maxTicketsPerStudent, else the tier's, else 1;
// never more than the tier has left
export function maxTickets(event, tier) {
  if (!tier) return 1;
  const max = Number(event?.details?.maxTicketsPerStudent) || tier.maxPerStudent || 1;
  const left = tier.remaining == null ? max : tier.remaining;
  return Math.max(0, Math.min(max, left));
}
export const findTier = (event, name) => tiersOf(event).find((t) => norm(t.name) === norm(name)) || null;

// display only: the server computes the amount it charges
export function totalFor(event, ticket) {
  const tiers = tiersOf(event);
  if (tiers.length) {
    const tier = findTier(event, ticket?.tier);
    return tier ? (Number(tier.price) || 0) * (Number(ticket?.quantity) || 1) : 0;
  }
  return event?.fee?.amount || 0;
}

// ── whole form → { key: message } ───────────────────────────────
export function validateRegistration(event, values, ticket) {
  const errors = {};
  const legacy = isLegacyRegistration(event);
  for (const f of formFields(event)) {
    if (f.store === "ticket") continue;
    // old events: today's checks (name, email, WhatsApp filled in)
    if (legacy) {
      if (f.required && !str(values[f.key])) errors[f.key] = `${String(f.label || f.key).toLowerCase()} is required`;
      continue;
    }
    const e = checkValue(f, values[f.key]);
    if (e) errors[f.key] = e;
  }
  if (tiersOf(event).length) {
    const tier = findTier(event, ticket?.tier);
    if (!tier) errors.ticketTier = "choose a ticket";
    else {
      const max = maxTickets(event, tier);
      const q = Number(ticket?.quantity);
      if (max < 1) errors.ticketTier = `${tier.name.toLowerCase()} is sold out`;
      else if (!Number.isInteger(q) || q < 1 || q > max) errors.quantity = `you can book 1 to ${max}`;
    }
  }
  return errors;
}

// transaction IDs as banks / wallets print them (the server checks the same)
export const normTxn = (v) => {
  const t = str(v).replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9-]{6,40}$/.test(t) ? t : null;
};
export function validatePayment(payment, accounts) {
  const errors = {};
  if (!payment?.method || !(accounts || []).some((a) => a.method === payment.method)) errors.method = "choose the account you paid to";
  if (!normTxn(payment?.transactionId)) errors.transactionId = "enter the transaction id (6 to 40 letters or numbers)";
  if (!payment?.receiptUri && !payment?.receiptUrl) errors.receipt = "attach the payment screenshot";
  return errors;
}

// ── the exact POST /api/events/register body ────────────────────
export function buildRegisterBody(event, values, ticket, payment) {
  // old events: exactly today's payload
  if (isLegacyRegistration(event)) {
    return {
      eventId: event._id,
      studentName: str(values.studentName),
      email: str(values.email),
      whatsapp: str(values.whatsapp),
      studentId: str(values.studentId) || "Not provided",
    };
  }
  const fields = formFields(event);
  const body = {
    eventId: event._id,
    formVersion: 2,
    studentName: str(values.studentName),
    email: str(values.email),
    whatsapp: normalizePkMobile(values.whatsapp) || str(values.whatsapp),
    studentId: str(values.studentId) || "Not provided",
  };
  if (fields.some((f) => f.key === "university")) body.university = str(values.university);
  const answers = {};
  for (const f of fields.filter((x) => x.store === "answers")) {
    const raw = values[f.key];
    if (f.type === "list" || f.type === "multiselect") {
      const items = listValue(raw);
      if (items.length) answers[f.key] = items;
    } else if (str(raw)) {
      answers[f.key] = f.type === "number" ? Number(str(raw)) : f.type === "phone" ? normalizePkMobile(raw) || str(raw) : str(raw);
    }
  }
  body.answers = answers;
  if (tiersOf(event).length) {
    const tier = findTier(event, ticket?.tier);
    body.ticket = { tier: tier ? tier.name : str(ticket?.tier), quantity: Number(ticket?.quantity) || 1 };
  }
  if (totalFor(event, ticket) > 0 && payment) {
    body.payment = { method: payment.method, transactionId: normTxn(payment.transactionId) || str(payment.transactionId), receiptUrl: payment.receiptUrl };
  }
  return body;
}

// payment status for "mine"
export const PAYMENT_LABEL = {
  pending: "payment pending verification",
  verified: "payment confirmed",
  rejected: "payment not accepted",
  not_required: "",
};
export const METHOD_LABEL = { easypaisa: "Easypaisa", jazzcash: "JazzCash", bank: "Bank transfer" };
