// app/src/utils/imageUrl.js
// One rule for turning a stored image path into a URL (Brands, Home, OfferScreen).
//
//   absolute (http/https)       → as is (Cloudinary etc.)
//   stored path ("uploads/…")   → SERVER/<path>
//   bare brand logo file name   → SERVER/uploads/brands/<file>  (old multer uploads)
//
// The old rule put every relative brand logo under /uploads/brands/, so logos
// stored as "uploads/logos/x.png" or "/uploads/x.png" became dead links.
// api/brandApi.js (getBrandsFast) still builds them that way; fixLegacyImageUrl
// repairs those URLs on the screen side.

export const IMAGE_SERVER_URL = "https://the-deft-crew-production.up.railway.app";

// generic placeholder some data sources put in when there is no image
export const FALLBACK_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export function imageUrl(path, { brandLogo = false } = {}) {
  if (!path) return null;
  const p = String(path);
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const clean = p.replace(/^\/+/, "");
  if (!clean) return null;
  if (brandLogo && !clean.includes("/")) return `${IMAGE_SERVER_URL}/uploads/brands/${clean}`;
  return `${IMAGE_SERVER_URL}/${clean}`;
}

export const brandLogoUrl = (path) => imageUrl(path, { brandLogo: true });

// URL built with the old rule → the URL the file really has. Anything else unchanged.
export function fixLegacyImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  return url.replace("/uploads/brands/uploads/", "/uploads/");
}

// Same brand object, with its logo / display image / offer images repaired
export function withFixedImages(brand) {
  if (!brand) return brand;
  return {
    ...brand,
    logo: fixLegacyImageUrl(brand.logo),
    displayImage: fixLegacyImageUrl(brand.displayImage),
    offers: Array.isArray(brand.offers)
      ? brand.offers.map((o) =>
          o ? { ...o, image: fixLegacyImageUrl(o.image), displayImage: fixLegacyImageUrl(o.displayImage) } : o
        )
      : brand.offers,
  };
}
