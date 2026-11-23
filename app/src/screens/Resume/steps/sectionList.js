// app/src/screens/Resume/steps/sectionList.js
// P3-3 (flag resumeV2): saving the new sections' lists (activities, volunteering, awards, achievements, languages,
// coursework). Each change is applied to the latest saved list (an entry added meanwhile is kept), and a new resume
// is created first if it was never saved. Entries are matched by their key, never by position.
import { keyOf } from "./builderShared";

/** io: { ensureResume, updateResume }; mutate(list) → the new list */
export async function saveList(io, field, mutate) {
  const resume = await io.ensureResume();
  if (!resume?._id) return null;
  return io.updateResume(resume._id, (latest) => ({ [field]: mutate(Array.isArray(latest?.[field]) ? latest[field] : []) }));
}

export const addOrReplace = (item, editingKey) => (list) => {
  if (editingKey == null) return [...list, item];
  const i = list.findIndex((x) => keyOf(x) === editingKey);
  if (i < 0) return [...list, item];
  const next = list.slice();
  next[i] = { ...(list[i]?._id ? { _id: list[i]._id } : {}), ...item };
  return next;
};
export const removeKey = (key) => (list) => list.filter((x) => keyOf(x) !== key);

const clean = (v, max = 300) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
export const cleanLines = (lines, n = 3) => (Array.isArray(lines) ? lines : []).map((l) => clean(l, 240)).filter(Boolean).slice(0, n);
export { clean, keyOf };
