// app/src/screens/home/HomeNearMe.js
// The "near me" slot on Home (tdc-full-redesign/NEAR_ME_SPEC.md §3).
//   granted + /brands/nearby has brands with a distance → "near me.", "1.2 km · food"
//   every other case → "top discounts." (up to 5 brands, highest real % first,
//     ties newest first, "up to 60% off · food"); with a city selected
//     "top discounts in [city]." and, if that city has none, the all-city list.
//     Hidden when no brand has a real discount.
//     · guest              → top discounts only (public data, no location card)
//     · not asked yet      → permission card, top discounts below it (only the button asks)
//     · denied             → "turn on location… settings" line above the top discounts
//     · none near / endpoint failing / no position → top discounts
// "near me" is the title only while showing a real nearby list, so the section
// switches to it by itself once /brands/nearby returns brands.
// Position: the cached one only if under 10 min old and within 1 km, else a fresh one;
// anything less accurate than 2 km is not used. Rounded to 3 decimals, sent per query.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Dot from "../../engagement/components/Dot";
import Button from "../../ui/Button";
import HomeDeals from "./HomeDeals";
import { NEARBY_KEY, MAX_DEALS, fetchNearby, devLogOnce, rankTopDiscounts } from "./homeData";
import { ALL_CITIES, useSelectedCity, brandMatchesCity } from "../../utils/cityFilter";
import { formatDistance } from "../../utils/distance";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";
import { holdTour, releaseTour } from "../../engagement/tour/tourGate";

const LOCATION_TTL_MS = 10 * 60 * 1000; // refresh the position at most every 10 minutes
const POSITION_TIMEOUT_MS = 6000;
const CACHED_MAX_AGE_MS = 10 * 60 * 1000; // use the phone's cached position only if it is this fresh…
const CACHED_MIN_ACCURACY_M = 1000;       // …and at least this accurate
const QUERY_MIN_ACCURACY_M = 2000;        // never ask for nearby deals with a position worse than this
const round3 = (n) => Math.round(n * 1000) / 1000;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

const nearMeta = (brand) =>
  [formatDistance(brand?.distanceKm), String(brand?.category || "").toLowerCase()].filter(Boolean).join(" · ");

// "up to 60% off · food" (real values only)
const topMeta = (brand) =>
  [brand?.topDiscount ? `up to ${brand.topDiscount}% off` : null, String(brand?.category || "").toLowerCase()]
    .filter(Boolean)
    .join(" · ");

export default function HomeNearMe({ signedIn, userId, allDeals, dealsLoading, savedLabel, onSeeAll, onOpenDeal }) {
  const [city] = useSelectedCity();
  const [perm, setPerm] = useState(null); // null (checking) | "undetermined" | "granted" | "denied"
  const [coords, setCoords] = useState(null); // { lat, lng } rounded to 3 decimals
  const [positionFailed, setPositionFailed] = useState(false);
  const lastLocAtRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Read the permission without asking
  const checkPermission = useCallback(async () => {
    try {
      const res = await Location.getForegroundPermissionsAsync();
      if (mountedRef.current) setPerm(res?.status || "undetermined");
    } catch (e) {
      devLogOnce("location permission", e);
      if (mountedRef.current) setPerm("denied");
    }
  }, []);

  useEffect(() => {
    if (signedIn) checkPermission();
  }, [signedIn, checkPermission]);

  // Back from Settings → permission may have changed
  useEffect(() => {
    if (!signedIn) return undefined;
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (prev.match(/inactive|background/) && next === "active") checkPermission();
      prev = next;
    });
    return () => sub.remove();
  }, [signedIn, checkPermission]);

  // Cached position first (only if under 10 minutes old and within 1 km), then a
  // fresh one (6 s max). A position less accurate than 2 km is never used.
  const readPosition = useCallback(async () => {
    lastLocAtRef.current = Date.now();
    const apply = (pos, { maxAgeMs, minAccuracyM }) => {
      if (!pos?.coords || !mountedRef.current) return false;
      const acc = pos.coords.accuracy;
      if (typeof acc === "number" && acc > minAccuracyM) return false;
      if (maxAgeMs && typeof pos.timestamp === "number" && Date.now() - pos.timestamp > maxAgeMs) return false;
      setCoords({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) });
      setPositionFailed(false);
      return true;
    };
    let got = false;
    try {
      const cached = await Location.getLastKnownPositionAsync({
        maxAge: CACHED_MAX_AGE_MS,
        requiredAccuracy: CACHED_MIN_ACCURACY_M,
      });
      got = apply(cached, { maxAgeMs: CACHED_MAX_AGE_MS, minAccuracyM: CACHED_MIN_ACCURACY_M });
    } catch (e) {
      devLogOnce("last known position", e);
    }
    try {
      const fresh = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS
      );
      got = apply(fresh, { minAccuracyM: QUERY_MIN_ACCURACY_M }) || got;
    } catch (e) {
      devLogOnce("current position", e);
    }
    if (!got && mountedRef.current) setPositionFailed(true);
  }, []);

  useEffect(() => {
    if (signedIn && perm === "granted" && !coords) readPosition();
  }, [signedIn, perm, coords, readPosition]);

  // Home focused again → refresh the position, at most every 10 minutes
  useFocusEffect(
    useCallback(() => {
      if (!signedIn || perm !== "granted") return;
      if (Date.now() - lastLocAtRef.current >= LOCATION_TTL_MS) readPosition();
    }, [signedIn, perm, readPosition])
  );

  const nearby = useQuery({
    queryKey: NEARBY_KEY(userId, coords?.lat, coords?.lng),
    queryFn: ({ signal }) => fetchNearby(coords.lat, coords.lng, userId, signal),
    enabled: !!signedIn && perm === "granted" && !!coords,
    staleTime: LOCATION_TTL_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (nearby.error) devLogOnce("nearby", nearby.error);
  }, [nearby.error]);

  // Fallback: top discounts. A selected city first; if it has none with a real
  // discount, the all-city list.
  const top = useMemo(() => {
    const list = Array.isArray(allDeals) ? allDeals : [];
    if (city !== ALL_CITIES) {
      const inCity = rankTopDiscounts(list.filter((b) => brandMatchesCity(b, city)));
      if (inCity.length) return { title: `top discounts in ${String(city).toLowerCase()}`, deals: inCity };
    }
    return { title: "top discounts", deals: rankTopDiscounts(list) };
  }, [allDeals, city]);

  const allowLocation = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    holdTour("location-permission");
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (mountedRef.current) setPerm(res?.status || "denied");
    } catch (e) {
      devLogOnce("location request", e);
      if (mountedRef.current) setPerm("denied");
    } finally {
      releaseTour("location-permission");
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  // Top discounts section. `above` (permission card) keeps the section from being
  // empty; `notice` is the location-off line.
  const renderTop = ({ above = null, notice = null } = {}) => {
    const hasTop = top.deals.length > 0;
    if (!hasTop && dealsLoading) {
      return <HomeDeals title={top.title} savedLabel={savedLabel} onSeeAll={onSeeAll} onOpenDeal={onOpenDeal} deals={[]} loading aboveRail={above} notice={notice} />;
    }
    if (!hasTop) {
      if (!above) return null; // nothing with a real discount: hide the section
      return <HomeDeals title="deals" savedLabel={savedLabel} onSeeAll={onSeeAll} onOpenDeal={onOpenDeal} deals={[]} loading={false} body={above} notice={notice} />;
    }
    return (
      <HomeDeals
        title={top.title}
        savedLabel={savedLabel}
        onSeeAll={onSeeAll}
        onOpenDeal={onOpenDeal}
        deals={top.deals}
        loading={false}
        getMeta={topMeta}
        aboveRail={above}
        notice={notice}
      />
    );
  };

  // Guests: top discounts only (no location card, public data)
  if (!signedIn) return renderTop();

  const common = { savedLabel, onSeeAll, onOpenDeal, title: top.title };
  const nearbyList = Array.isArray(nearby.data) ? nearby.data : null;
  const nearbyHasDistances =
    !!nearbyList && nearbyList.length > 0 && nearbyList.every((b) => Number.isFinite(Number(b?.distanceKm)));

  // Still checking the permission → placeholders
  if (perm === null) return <HomeDeals {...common} deals={[]} loading />;

  // Not asked yet → permission card (only this button asks), top discounts below it
  if (perm === "undetermined") {
    return renderTop({
      above: (
        <View style={styles.permCard}>
          <View style={styles.permRow}>
            <Dot mood="excited" size={40} animated={false} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                deals closest to you
              </Text>
              <Text style={styles.permLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {"allow location and we'll show the nearest brands."}
              </Text>
            </View>
          </View>
          <Button title="allow location" size="small" full={false} onPress={allowLocation} style={styles.permBtn} />
        </View>
      ),
    });
  }

  // Granted and the endpoint answered with brands that have a distance → nearest first
  if (perm === "granted" && !positionFailed) {
    const waiting = !coords || nearby.isLoading;
    if (waiting) return <HomeDeals {...common} deals={[]} loading />;
    if (!nearby.isError && nearbyHasDistances) {
      return (
        <HomeDeals
          {...common}
          title="near me"
          deals={nearbyList.slice(0, MAX_DEALS)}
          loading={false}
          getMeta={nearMeta}
        />
      );
    }
    // none near / endpoint failing / no distances → top discounts
  }

  // Denied: the settings line above the top discounts. Everything else: top discounts.
  if (perm === "denied") {
    return renderTop({
      notice: (
        <View style={styles.noticeRow}>
          <Text style={styles.notice} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            turn on location to see the nearest
          </Text>
          <Pressable
            onPress={openSettings}
            accessibilityRole="link"
            accessibilityLabel="open settings to turn on location"
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
          >
            <Text style={styles.noticeLink} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              settings
            </Text>
          </Pressable>
        </View>
      ),
    });
  }
  return renderTop();
}

const styles = StyleSheet.create({
  permCard: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: 16,
  },
  permRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  permTitle: { fontFamily: font.headingBold, fontSize: 17, color: color.ink },
  permLine: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.textMuted, marginTop: 4 },
  permBtn: { marginTop: 14, alignSelf: "flex-start" },
  noticeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  notice: { fontFamily: font.body, fontSize: 13, color: color.textMuted },
  noticeLink: { fontFamily: font.bodyBold, fontSize: 13, color: color.ink, textDecorationLine: "underline" },
});
