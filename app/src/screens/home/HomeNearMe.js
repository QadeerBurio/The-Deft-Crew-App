// app/src/screens/home/HomeNearMe.js
// "near me." on Home (tdc-full-redesign/NEAR_ME_SPEC.md §3).
//   guest              → hidden
//   not asked yet      → permission card; only its button asks (never on app open)
//   granted            → nearest brands from GET /brands/nearby, "1.2 km · food"
//   granted, none near → "no partner deals near you yet." + selected-city deals
//   denied             → selected-city deals + "turn on location… settings"
//   endpoint missing / failing / no position → selected-city deals, titled
//                      "in [city]" or "deals" (never "near me"), max 6
// "near me" is the title only while showing a real nearby list.
// Location is read only on this phone; it's rounded and sent once per query, never stored.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Dot from "../../engagement/components/Dot";
import Button from "../../ui/Button";
import HomeDeals from "./HomeDeals";
import { NEARBY_KEY, MAX_DEALS, fetchNearby, devLogOnce } from "./homeData";
import { ALL_CITIES, useSelectedCity, brandMatchesCity } from "../../utils/cityFilter";
import { formatDistance } from "../../utils/distance";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";

const LOCATION_TTL_MS = 10 * 60 * 1000; // refresh the position at most every 10 minutes
const POSITION_TIMEOUT_MS = 6000;
const round3 = (n) => Math.round(n * 1000) / 1000;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

const nearMeta = (brand) =>
  [formatDistance(brand?.distanceKm), String(brand?.category || "").toLowerCase()].filter(Boolean).join(" · ");

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

  // Last known position first (instant), then a fresh one (6 s max)
  const readPosition = useCallback(async () => {
    lastLocAtRef.current = Date.now();
    const apply = (pos) => {
      if (!pos?.coords || !mountedRef.current) return false;
      setCoords({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) });
      setPositionFailed(false);
      return true;
    };
    let got = false;
    try {
      got = apply(await Location.getLastKnownPositionAsync());
    } catch (e) {
      devLogOnce("last known position", e);
    }
    try {
      const fresh = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS
      );
      got = apply(fresh) || got;
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

  // Selected city's deals (state 5): "All" → newest
  const cityDeals = useMemo(() => {
    const list = Array.isArray(allDeals) ? allDeals : [];
    return list.filter((b) => brandMatchesCity(b, city)).slice(0, MAX_DEALS);
  }, [allDeals, city]);
  const cityLabel = city === ALL_CITIES ? null : city;

  const allowLocation = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (mountedRef.current) setPerm(res?.status || "denied");
    } catch (e) {
      devLogOnce("location request", e);
      if (mountedRef.current) setPerm("denied");
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  if (!signedIn) return null;

  // "near me" only for a list that really came from /brands/nearby with distances;
  // every fallback is titled by what it is: the selected city, or plain "deals"
  const fallbackTitle = cityLabel ? `in ${String(cityLabel).toLowerCase()}` : "deals";
  const common = { savedLabel, onSeeAll, onOpenDeal, title: fallbackTitle };
  const nearbyList = Array.isArray(nearby.data) ? nearby.data : null;
  const nearbyHasDistances =
    !!nearbyList && nearbyList.length > 0 && nearbyList.every((b) => Number.isFinite(Number(b?.distanceKm)));

  // Still checking the permission → placeholders
  if (perm === null) return <HomeDeals {...common} deals={[]} loading />;

  // 2. Not asked yet → permission card (only this button asks)
  if (perm === "undetermined") {
    return (
      <HomeDeals
        {...common}
        deals={[]}
        loading={false}
        body={
          <View style={styles.permCard}>
            <View style={styles.permRow}>
              <Dot mood="excited" size={40} animated={false} />
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  deals closest to you
                </Text>
                <Text style={styles.permLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {"allow location and we'll show the nearest brands. we never store where you are."}
                </Text>
              </View>
            </View>
            <Button title="allow location" size="small" full={false} onPress={allowLocation} style={styles.permBtn} />
          </View>
        }
      />
    );
  }

  // 3. Granted and the endpoint answered with brands → nearest first
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
    // 4. Granted, the endpoint answered but nothing within range → note + city deals
    if (!nearby.isError && nearbyList && nearbyList.length === 0) {
      return (
        <HomeDeals
          {...common}
          deals={cityDeals}
          loading={dealsLoading}
          hideWhenEmpty={false}
          notice={
            <Text style={styles.notice} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              no partner deals near you yet.{cityDeals.length ? (cityLabel ? ` here's what's in ${cityLabel}.` : " here are the newest.") : ""}
            </Text>
          }
        />
      );
    }
    // 6. Endpoint missing / failing / no distances → city deals under their own
    //    title, no "turn on location" row (location is already on)
  }

  // 5. Denied (with a settings link) or 6. silent fallback
  const denied = perm === "denied";
  return (
    <HomeDeals
      {...common}
      deals={cityDeals}
      loading={dealsLoading}
      notice={
        denied ? (
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
        ) : null
      }
    />
  );
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
