// app/src/screens/Events/ticketData.js
// The student's ticket: load it from the server, keep the last copy on the phone so it
// opens offline, and turn it into the rows the ticket card shows (missing fields hidden).
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE, formatRs } from "./eventsV2";
import { plainError } from "../../utils/plainError";

const cacheKey = (userId, registrationId) => `tdc.ticket.v1.${userId || "me"}.${registrationId}`;

export async function readCachedTicket(userId, registrationId, storage = AsyncStorage) {
  try {
    const raw = await storage.getItem(cacheKey(userId, registrationId));
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.ticket ? saved : null;
  } catch {
    return null;
  }
}

async function writeCache(userId, registrationId, ticket, storage) {
  try {
    await storage.setItem(cacheKey(userId, registrationId), JSON.stringify({ ticket, savedAt: Date.now() }));
  } catch {}
}

async function dropCache(userId, registrationId, storage) {
  try {
    await storage.removeItem(cacheKey(userId, registrationId));
  } catch {}
}

/**
 * → { ticket, fromCache, savedAt }        the ticket (fresh, or the saved copy when offline)
 *   { ticket: null, noTicket, message }   the server says there is no ticket (pending, rejected...)
 *   { ticket: null, message }             nothing to show (offline and never opened, signed out...)
 */
export async function loadTicket({ registrationId, token, userId, get = axios.get, storage = AsyncStorage }) {
  try {
    const res = await get(`${API_BASE}/registrations/${registrationId}/ticket`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      params: { t: Date.now() },
      timeout: 15000,
    });
    const ticket = res?.data?.ticket;
    if (!ticket) return { ticket: null, message: "couldn't load your ticket. try again." };
    await writeCache(userId, registrationId, ticket, storage);
    return { ticket, fromCache: false };
  } catch (err) {
    const res = err?.response;
    // the server answered: trust it (a cancelled registration must not keep its old ticket)
    if (res && res.status < 500) {
      await dropCache(userId, registrationId, storage);
      const message = res.status === 404 && res.data?.noTicket
        ? String(res.data.error || res.data.message || "no ticket yet.").toLowerCase()
        : res.status === 401
          ? "sign in again to see your ticket."
          : "this ticket isn't available.";
      return { ticket: null, noTicket: res.status === 404 && !!res.data?.noTicket, message };
    }
    // offline or the server is down: the copy saved last time
    const saved = await readCachedTicket(userId, registrationId, storage);
    if (saved) return { ticket: saved.ticket, fromCache: true, savedAt: saved.savedAt };
    return { ticket: null, message: plainError(err, "couldn't load your ticket. try again.") };
  }
}

export const seatLabel = (t) => (t?.of > 1 ? `seat ${t.seat} of ${t.of}` : "admit one");
export const amountLabel = (ticket) => (ticket?.paymentStatus === "paid" ? `${formatRs(ticket.amountPaid)} · paid` : "free");
export const STATUS_LABEL = { valid: "valid", cancelled: "cancelled", used: "used" };

const has = (v) => v != null && String(v).trim() !== "";

// The detail rows of one seat. Only fields the server sent; nothing is made up.
export function ticketRows(ticket, seat) {
  const ev = ticket?.event || {};
  const tier = seat?.tier || ticket?.tier;
  const rows = [
    { key: "date", label: "date", value: ev.date },
    { key: "time", label: "time", value: ev.time },
    { key: "venue", label: has(ev.venue) ? "venue" : "city", value: [ev.venue, ev.city].filter(has).join(", ") },
    { key: "online", label: "online", value: ev.onlineLink, link: true },
    { key: "name", label: "name", value: ticket?.attendee },
    { key: "ticket", label: "ticket", value: [tier && String(tier).toLowerCase(), seat && seatLabel(seat)].filter(has).join(" · ") },
    { key: "paid", label: ticket?.paymentStatus === "paid" ? "paid" : "price", value: ticket ? amountLabel(ticket) : null },
  ];
  return rows.filter((r) => has(r.value));
}

// "saved 12 oct, 18:30" for the offline note
export function savedLabel(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return `${d.getDate()} ${MON[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
