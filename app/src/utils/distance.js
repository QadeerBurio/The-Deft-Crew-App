// app/src/utils/distance.js
// "1.2 km", or metres rounded to 50 under 1 km ("350 m"). null/invalid → "".
export function formatDistance(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1) {
    const m = Math.max(50, Math.round((n * 1000) / 50) * 50);
    return m >= 1000 ? "1 km" : `${m} m`;
  }
  return `${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)} km`;
}

export default formatDistance;
