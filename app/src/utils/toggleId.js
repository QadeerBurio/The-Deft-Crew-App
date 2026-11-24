// app/src/utils/toggleId.js — Q-3d: add or remove an id in a list of ids (string-compared, the list may hold ObjectId-
// like values), for showing a save / bookmark at once before the server confirms.
export function toggleId(list, id) {
  const arr = Array.isArray(list) ? list : [];
  const key = id == null ? "" : String(id);
  if (!key) return arr;
  return arr.some((x) => x?.toString() === key) ? arr.filter((x) => x?.toString() !== key) : [...arr, id];
}
