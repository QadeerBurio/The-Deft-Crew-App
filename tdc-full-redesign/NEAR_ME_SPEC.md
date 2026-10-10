# "near me" deals on Home

The Home "fresh deals." section becomes **"near me."** It asks for location permission and shows the brands nearest to the student.

## 1. What exists today (checked in the code)
- Brands/offers store a **text address** (`location`, plus branches with `branchName`). `OfferScreen.openMap()` opens that address as a **search** in Apple/Google Maps. **There are no latitude/longitude values stored**, so distance can't be calculated yet.
- `expo-location` is installed and configured in `app.json` (when-in-use permission on iOS, coarse + fine on Android).
- `app/src/hooks/usePermission.js` has `useLocationPermission`, but its denial alert talks about chat. Don't reuse its alert text.
- `app/src/utils/cityFilter.js` holds the student's selected city (shared by Brands, OfferScreen, My Discounts).

So "near me" needs a small backend change: give every branch coordinates, and add one endpoint that returns the nearest brands.

## 2. Backend (the only backend work allowed in this task)
Find the server code in the workspace (the Express/MongoDB API deployed on Railway). Change **only** what's listed here.

1. **Coordinates per branch/location.** Add a GeoJSON point to wherever the brand/offer address lives (brand, offer and/or branch subdocument; follow the existing model), e.g. `geo: { type: 'Point', coordinates: [lng, lat] }`, plus `geoSource` (`'geocoded' | 'manual'`) and `geoUpdatedAt`. Add a `2dsphere` index. Optional fields only, so nothing existing breaks.
2. **Fill coordinates automatically.** When a brand/offer/branch is created or its address changes (the existing admin save routes), geocode the address server-side and store the point. If geocoding fails, save anyway without `geo` and log it. **No admin UI change.**
3. **Backfill script.** `server/scripts/backfill-brand-geo.js`: geocodes every existing address that has no `geo`, with rate limiting, a `--dry-run` flag, and a summary (done / failed with the address). It must never overwrite `geoSource: 'manual'`. Don't run it against production yourself; give the owner the command.
4. **Endpoint.** `GET /brands/nearby?lat=&lng=&limit=6&maxKm=25` (follow the existing route style and auth middleware). Returns brands that have a live offer and a branch with `geo`, sorted by the distance to their nearest branch, each with `distanceKm` (1 decimal) and `nearestBranch` (name + address). Same brand fields as `/brands` so the app can reuse its mapping (logo, offers, discount, category, isOnline, isInStore). Validate lat/lng; cap `limit` at 20 and `maxKm` at 50.
5. **Privacy.** Don't store or log the student's coordinates. Round them to 3 decimals before querying.
6. **Geocoding provider: ask the owner** (see CLAUDE_TASK_FULL Q-N1). Keep the provider and key in environment variables (`GEOCODER`, `GEOCODER_API_KEY`), never in code. Add `.env.example` entries.

## 3. App: Home section
Title: `near me` + yellow `.`. Right link: `see all` → Brands.

States:
1. **Guest:** section hidden (unchanged rule).
2. **Permission not asked yet:** a card (white, radius 22, 1 px `line`, padding 16): `Dot` face (excited, 40) + title `deals closest to you` (Outfit 700 17) + line `allow location and we'll show the nearest brands. we never store where you are.` (DM Sans 14 `textMuted`) + small primary button `allow location`. Only the button triggers the OS prompt (`Location.requestForegroundPermissionsAsync`). **Never prompt automatically on app open.**
3. **Granted:** get the position with `Location.getLastKnownPositionAsync()` first, then `getCurrentPositionAsync({ accuracy: Balanced })`, with a 6 s timeout. Call `/brands/nearby`. Show the same deal cards as today, with the meta line `[distance] km · [category]` (e.g. `1.2 km · food`; under 1 km show metres rounded to 50: `350 m`). Refresh the location when Home is focused, at most every 10 minutes. Query key `['home','nearby', userId, roundedLat, roundedLng]`.
4. **Granted but nothing within range:** small line `no partner deals near you yet.` + show the city deals (state 5's list) under the title `in [city]`.
5. **Denied:** show deals in the student's selected city (`useSelectedCity()`; "All" → newest, as today) with the existing meta line, and a small row under the title: `turn on location to see the nearest` + `settings` link (`Linking.openSettings()`).
6. **Endpoint missing or failing** (backend not deployed yet): silently use state 5's list. The app release must not depend on the backend being deployed first.
7. **Loading:** 2 `sand` placeholder cards.

Also update the `NSLocationWhenInUseUsageDescription` and `locationWhenInUsePermission` text in `app.json` to: `tdc uses your location to show deals near you and to share your location in chats. we never store where you are.` (This is the one allowed `app.json` change; it needs a new native build to show.)

## 4. Brands screen (optional, ask first)
Q-N3 in the task: should Brands also get a "nearest" sort chip using the same endpoint? Default: no, Home only.
