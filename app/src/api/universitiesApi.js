// app/src/api/universitiesApi.js — the shared university list (server: routes/university.routes.js).
//   search(q)               approved universities matching name / short name / aliases: [{ id, name, shortName, city, status }]
//   request({ name, city }) "my university isn't listed": { match } (did you mean …?) or { university } (pending review)
//   setMine(universityId)   a signed-in student's university (profile edit)
import api from "./api";

const data = (r) => r?.data?.data;
const errorOf = (e) => {
  const body = e?.response?.data || {};
  const err = new Error(body.error?.message || (e?.response ? "something went wrong, try again" : "you seem to be offline"));
  err.code = body.error?.code;
  err.offline = !e?.response;
  return err;
};

export const universitiesApi = {
  search: (q, { signal } = {}) => api.get("/universities", { params: { search: q || "", limit: 30 }, timeout: 10000, signal }).then(data).catch((e) => { throw errorOf(e); }),
  request: (body) => api.post("/universities/request", body, { timeout: 10000 }).then(data).catch((e) => { throw errorOf(e); }),
  setMine: (universityId) => api.put("/universities/mine", { universityId }, { timeout: 10000 }).then(data).catch((e) => { throw errorOf(e); }),
};

/** how a university reads in a field: "Institute of Business Management (IoBM) · Karachi", "… · pending review" */
export const universityLabel = (u) => {
  if (!u?.name) return "";
  const short = u.shortName && !u.name.includes(u.shortName) ? ` (${u.shortName})` : "";
  return `${u.name}${short}${u.city ? ` · ${u.city}` : ""}${u.status === "pending" ? " · pending review" : ""}`;
};

export default universitiesApi;
