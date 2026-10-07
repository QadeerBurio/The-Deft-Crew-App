// app/src/utils/cityFilter.js
// One selected city shared by Brands, OfferScreen and My Discounts.
// Default is "All". Only cities that really have brands get a chip.
// Filtering is strict: Lahore shows only Lahore brands.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ALL_CITIES = "All";
export const DEFAULT_CITY = ALL_CITIES; // first open = All
const FALLBACK_BRAND_CITY = "Karachi";  // brand with no city saved (backend default)

const STORAGE_KEY = "@tdc_selected_city:v2";

let selectedCity = DEFAULT_CITY;
let hydrated = false;
let hydratePromise = null;
const listeners = new Set();

const emit = () => listeners.forEach((cb) => { try { cb(selectedCity); } catch {} });

export const hydrateSelectedCity = () => {
  if (hydrated) return Promise.resolve(selectedCity);
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) selectedCity = saved;
    } catch {}
    hydrated = true;
    emit();
    return selectedCity;
  })();
  return hydratePromise;
};

export const getSelectedCity = () => selectedCity;

export const setSelectedCity = (city) => {
  const next = city || DEFAULT_CITY;
  if (next === selectedCity) return;
  selectedCity = next;
  hydrated = true;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
};

// React hook: [city, setCity]
export function useSelectedCity() {
  const [city, setCity] = useState(selectedCity);
  useEffect(() => {
    const cb = (c) => setCity(c);
    listeners.add(cb);
    hydrateSelectedCity();
    setCity(selectedCity);
    return () => listeners.delete(cb);
  }, []);
  return [city, setSelectedCity];
}

// ─── Matching helpers ────────────────────────────────────

const norm = (c) => (c || "").toString().split(",")[0].trim().toLowerCase();

// Cities a brand is in. Old cached data without `cities` counts as Karachi.
export const getBrandCities = (brand) => {
  if (!brand) return [FALLBACK_BRAND_CITY];
  if (Array.isArray(brand.cities) && brand.cities.length) return brand.cities;
  if (brand.city) return [brand.city];
  return [FALLBACK_BRAND_CITY];
};

// Cities of a claimed offer (from /offers/claimed)
export const getOfferCities = (offer) =>
  Array.isArray(offer?.brandCities) && offer.brandCities.length
    ? offer.brandCities
    : getBrandCities(offer?.brand);

// Strict: brand shows only in the cities it is really in
export const brandMatchesCity = (brand, city) => {
  if (!city || city === ALL_CITIES) return true;
  const want = norm(city);
  return getBrandCities(brand).some((c) => norm(c) === want);
};

export const offerMatchesCity = (offer, city) => {
  if (!city || city === ALL_CITIES) return true;
  const want = norm(city);
  return getOfferCities(offer).some((c) => norm(c) === want);
};

export const branchMatchesCity = (branch, city) => {
  if (!city || city === ALL_CITIES) return true;
  if (branch?.isOnline && !branch?.isInStore) return true;
  const want = norm(city);
  if (norm(branch?.city) === want) return true;
  return (branch?.location || branch?.address || "").toLowerCase().includes(want);
};

// [{ city, count }] → "All" first, then only cities that have items
// (most items first). A city with 0 items gets no chip.
export const buildCityOptions = (items, getCities = getBrandCities) => {
  const counts = new Map(); // lower → { city, count }
  (items || []).forEach((it) => {
    const seen = new Set();
    getCities(it).forEach((c) => {
      const name = (c || "").toString().split(",")[0].trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      const entry = counts.get(key) || { city: name, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
  });
  const cities = [...counts.values()]
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  return [{ city: ALL_CITIES, count: (items || []).length }, ...cities];
};

// Saved city that has no chip anymore (no brands there) → "All"
export const resolveCity = (selected, options) =>
  selected && (options || []).some((o) => o.city === selected) ? selected : ALL_CITIES;
