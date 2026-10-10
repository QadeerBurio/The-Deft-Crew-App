// app/src/utils/claimedBrands.js
// Brands of the student's claimed offers (from GET /offers/claimed), one per brand,
// in claimed order. Real names only: an offer without a brand name adds nothing.
import { brandLogoUrl } from "./imageUrl";

export function claimedBrands(offers) {
  const seen = new Set();
  const out = [];
  for (const o of Array.isArray(offers) ? offers : []) {
    const b = o?.brand;
    const name = String(b?.brandName || b?.name || "").trim();
    if (!name) continue;
    const id = String(b?._id || name.toLowerCase());
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, logo: brandLogoUrl(b?.logo) });
  }
  return out;
}

// "4 claimed · zinora, testing app, cafe x +1 more" / "no discounts claimed yet."
export function claimedLine(offers, maxNames = 3) {
  const count = Array.isArray(offers) ? offers.length : 0;
  if (!count) return "no discounts claimed yet.";
  const names = claimedBrands(offers).map((b) => b.name.toLowerCase());
  if (!names.length) return `${count} claimed`;
  const shown = names.slice(0, maxNames).join(", ");
  const more = names.length > maxNames ? ` +${names.length - maxNames} more` : "";
  return `${count} claimed · ${shown}${more}`;
}
