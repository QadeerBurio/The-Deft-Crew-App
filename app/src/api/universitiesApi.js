// app/src/api/universitiesApi.js — the shared university list (server: routes/university.routes.js).
// Students pick from it; only admins add to it (the admin portal). The app always has a list:
//   loadUniversities()   the server's full list (A–Z) when it answers with one, else the list bundled in the app
//                        (data/universities-pk.json, the same HEC seed the server starts from). An admin's addition
//                        shows up on the next open (the server list is cached for a minute).
//   bundledUniversities  the bundled list, for the first paint and offline
//   filterUniversities(list, q)  name, short name, other names (aliases) or city; case / spaces / dots don't matter
//   setMine(universityId)        a signed-in student's university (profile edit)
//   universityLabel(u)           "Institute of Business Management (IoBM) · Karachi"
import api from "./api";
import bundled from "../data/universities-pk.json";

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const sortAZ = (list) => list.slice().sort((a, b) => a.name.localeCompare(b.name));

// the bundled ones have no server id: signing up with one sends its name, which the server matches to the same entry
export const bundledUniversities = sortAZ((bundled.universities || []).map((u) => ({ id: null, ...u, status: "approved", source: "bundled" })));

let memo = null; // { list, at }
const FRESH_MS = 60 * 1000;

export async function loadUniversities({ force = false } = {}) {
  if (!force && memo && Date.now() - memo.at < FRESH_MS) return memo.list;
  try {
    const r = await api.get("/universities", { timeout: 10000 });
    const list = r?.data?.data;
    if (Array.isArray(list) && list.length) {
      memo = { list: sortAZ(list.map((u) => ({ ...u, aliases: u.aliases || [], source: "server" }))), at: Date.now() };
      return memo.list;
    }
  } catch {
    // offline / server trouble: the bundled list (below)
  }
  return memo?.list || bundledUniversities;
}

export function filterUniversities(list, q) {
  const words = norm(q).split(" ").filter(Boolean);
  if (!words.length) return list;
  const compact = words.join("");
  const out = [];
  for (const u of list) {
    const fields = [u.name, u.shortName, ...(u.aliases || []), u.city].map(norm);
    const squashed = fields.map((f) => f.replace(/ /g, ""));
    const all = fields.join(" ").split(" ");
    // best first: the exact name / short name / alias ("iobm", "karachi university"), then one that starts with it,
    // then the rest, A–Z
    const rank = squashed.some((f) => f === compact) ? 0 : squashed.some((f) => f.startsWith(compact)) ? 1
      : squashed.some((f) => f.includes(compact)) || words.every((w) => all.some((x) => x.startsWith(w))) ? 2 : -1;
    if (rank >= 0) out.push({ u, rank });
  }
  return out.sort((x, y) => x.rank - y.rank || x.u.name.localeCompare(y.u.name)).map((x) => x.u);
}

const errorOf = (e) => {
  const body = e?.response?.data || {};
  const err = new Error(body.error?.message || (e?.response ? "something went wrong, try again" : "you seem to be offline"));
  err.code = body.error?.code;
  err.offline = !e?.response;
  return err;
};

export const universitiesApi = {
  list: loadUniversities,
  setMine: (universityId) => api.put("/universities/mine", { universityId }, { timeout: 10000 }).then((r) => r?.data?.data).catch((e) => { throw errorOf(e); }),
};

/** how a university reads in a field: "Institute of Business Management (IoBM) · Karachi" */
export const universityLabel = (u) => {
  if (!u?.name) return "";
  const short = u.shortName && !u.name.includes(u.shortName) ? ` (${u.shortName})` : "";
  return `${u.name}${short}${u.city ? ` · ${u.city}` : ""}`;
};

export const _resetForTests = () => { memo = null; };
export default universitiesApi;
