// SurpriseBoxes.js: Surprise Boxes (FLAG_SURPLUS_BOXES): brands' surplus food, pickup only, pay at pickup.
//   list     boxes on sale: pickup time, price vs usual price, boxes left, distance (only if location is
//            already allowed, or the student taps "show distance")
//   detail   every disclosure before confirming: contents may vary, allergens, best-before, pickup window,
//            the cancellation rule, pay at pickup; choose 1 or 2 boxes
//   hold     the boxes are held for 10 minutes (timer); confirming needs "I've read the food and pickup terms"
//   orders   my orders; an order shows its status timeline, the pickup code + QR while it's awaiting pickup,
//            cancel (until 30 minutes before pickup), and a support case within 24 hours of pickup
// Route params: { orderId } opens that order (also when a notification is tapped while this screen is open);
// { view: "orders" } opens my orders. Notifications carry screen "SurpriseBoxes" + params { orderId }.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, Alert, RefreshControl, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { surplusEnabled, surplusApi, newKey, STATE, CASE_REASONS, pkTime } from "../api/surplusApi";

const M = MAX_FONT_SCALE;
const money = (n, c = "PKR") => `${c} ${Number(n || 0).toLocaleString("en-PK")}`;
const span = (a, b) => `${pkTime(a)} – ${pkTime(b, { hour: "2-digit", minute: "2-digit" })}`;
const left = (iso, now) => Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// a box's optional photo (https only); no photo = the box looks as before
export const photoUri = (u) => (/^https:\/\//i.test(String(u || "")) ? u : null);

export default function SurpriseBoxes({ route, navigation }) {
  const params = route?.params || {};
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(null);
  const [view, setView] = useState(params.orderId ? "order" : params.view === "orders" ? "orders" : "list");
  const [listings, setListings] = useState(null);
  // boxes in the student's own city (from their profile) unless they ask for every city; city: what the server used
  const [allCities, setAllCities] = useState(false);
  const [city, setCity] = useState(null);
  const [here, setHere] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listing, setListing] = useState(null);
  const [qty, setQty] = useState(1);
  const [hold, setHold] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [orders, setOrders] = useState(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [caseForm, setCaseForm] = useState(null); // { reason, description }
  const holdKey = useRef(newKey());
  const orderKey = useRef(newKey());

  const locate = useCallback(async (ask = false) => {
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted" && ask) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return null;
      const pos = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const p = pos?.coords ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
      setHere(p);
      return p;
    } catch { return null; }
  }, []);
  const loadList = useCallback(async (at = here, all = allCities) => {
    try {
      const d = await surplusApi.listings({ ...(at ? { lat: at.lat, lng: at.lng } : {}), ...(all ? {} : { scope: "city" }) });
      setListings(d?.listings || []);
      if (!all) setCity(d?.city || null);
    } catch (e) { setListings([]); Alert.alert("couldn't load", e.message); }
  }, [here, allCities]);
  const switchCities = (all) => { setAllCities(all); setListings(null); loadList(here, all); };
  const loadOrders = useCallback(() => surplusApi.myOrders().then(setOrders).catch((e) => { setOrders([]); Alert.alert("couldn't load", e.message); }), []);
  const openOrder = useCallback(async (id) => {
    setView("order"); setOrder(null);
    try { setOrder(await surplusApi.order(id)); } catch (e) { Alert.alert("couldn't load", e.message); setView("orders"); }
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const on = await surplusEnabled();
      if (!live) return;
      setEnabled(on);
      if (!on) return;
      if (params.orderId) return openOrder(params.orderId);
      if (params.view === "orders") return loadOrders();
      // "a new Surprise Box near you" tapped: that box (the list loads behind it, for "back")
      if (params.listingId) { loadList(await locate(false)); return openListing(params.listingId); }
      loadList(await locate(false));
    })();
    return () => { live = false; };
  }, []);

  // a notification tapped while this screen is already open: open that order (or the new box)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (enabled && params.orderId) openOrder(params.orderId);
    else if (enabled && params.listingId) openListing(params.listingId);
  }, [params.orderId, params.listingId]);

  // the hold timer
  useEffect(() => {
    if (view !== "hold" || !hold) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view, hold]);
  const secondsLeft = hold ? left(hold.hold.expiresAt, now) : 0;
  useEffect(() => {
    if (view === "hold" && hold && secondsLeft === 0) {
      setHold(null); setView("detail");
      Alert.alert("time ran out", "your 10 minutes ended and the boxes were released. you can try again if they're still available.");
    }
  }, [secondsLeft, view, hold]);

  const openListing = async (id) => {
    setView("detail"); setListing(null); setQty(1);
    try { setListing(await surplusApi.listing(id)); } catch (e) { Alert.alert("not available", e.message); setView("list"); }
  };
  const doHold = async () => {
    setBusy(true);
    try {
      const h = await surplusApi.hold(listing.id, qty, holdKey.current);
      holdKey.current = newKey(); orderKey.current = newKey();
      setHold(h); setAccepted(false); setNow(Date.now()); setView("hold");
    } catch (e) {
      if (!e.offline) holdKey.current = newKey();
      if (e.code === "ACTIVE_ORDER_WITH_BRAND" && e.orderId) {
        Alert.alert("you already have an order here", e.message, [{ text: "ok" }, { text: "see it", onPress: () => openOrder(e.orderId) }]);
      } else Alert.alert(e.code === "SOLD_OUT" ? "sold out" : "not held", e.message);
    } finally { setBusy(false); }
  };
  const release = async () => {
    const h = hold;
    setHold(null); setView("detail");
    if (h) surplusApi.releaseHold(h.hold.id).catch(() => {});
  };
  const confirm = async () => {
    setBusy(true);
    try {
      const o = await surplusApi.placeOrder(hold.hold.id, orderKey.current);
      setHold(null); setOrder(o); setView("order");
    } catch (e) {
      if (e.code === "HOLD_EXPIRED") { setHold(null); setView("detail"); }
      Alert.alert("not ordered", e.message);
    } finally { setBusy(false); }
  };
  const cancel = () => Alert.alert("cancel this order?", "the boxes go back on sale.", [
    { text: "no" },
    { text: "yes", onPress: async () => { setBusy(true); try { setOrder(await surplusApi.cancel(order.id, order.version)); } catch (e) { Alert.alert("not cancelled", e.message); } finally { setBusy(false); } } },
  ]);
  const sendCase = async () => {
    setBusy(true);
    try {
      await surplusApi.openCase({ orderId: order.id, reason: caseForm.reason, description: caseForm.description });
      setCaseForm(null);
      setOrder(await surplusApi.order(order.id));
      Alert.alert("sent", "tdc will look at it and reply here.");
    } catch (e) { Alert.alert("not sent", e.message); } finally { setBusy(false); }
  };

  const frame = (children, title = "surprise boxes", onBack = () => navigation?.goBack?.()) => (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} showBack onBack={onBack} />
      {children}
    </View>
  );
  if (enabled === null) return frame(<View style={styles.center}><ActivityIndicator color={T.ink} accessibilityLabel="loading" /></View>);
  if (!enabled) return frame(<View style={styles.center}><Text style={styles.muted} maxFontSizeMultiplier={M}>surprise boxes aren't available for your account yet.</Text></View>);

  const tabs = (
    <View style={styles.tabs} accessibilityRole="tablist">
      <Tab label="boxes" on={view === "list" || view === "detail" || view === "hold"} onPress={() => { setView("list"); if (!listings) loadList(); }} />
      <Tab label="my orders" on={view === "orders" || view === "order"} onPress={() => { setView("orders"); loadOrders(); }} />
    </View>
  );
  const scroll = (children, onRefresh) => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} /> : undefined}>
      {tabs}{children}
    </ScrollView>
  );

  // ---------- list ----------
  if (view === "list") return frame(scroll(
    <View>
      <Text style={styles.lead} maxFontSizeMultiplier={M}>brands' surplus food at a lower price. contents may vary; you pick up and pay at the brand.</Text>
      {!!city && (
        <View style={styles.row}>
          <Text style={styles.muted} maxFontSizeMultiplier={M} accessibilityRole="header">{allCities ? "boxes in every city" : `boxes in ${city}`}</Text>
          <TouchableOpacity onPress={() => switchCities(!allCities)} accessibilityRole="button" accessibilityLabel={allCities ? `show only boxes in ${city}` : "show boxes in every city"} style={{ minHeight: 44, justifyContent: "center" }} hitSlop={{ top: 4, bottom: 4, left: 10, right: 10 }}>
            <Text style={[styles.muted, { textDecorationLine: "underline", color: T.ink }]} maxFontSizeMultiplier={M}>{allCities ? `only ${city}` : "all cities"}</Text>
          </TouchableOpacity>
        </View>
      )}
      {!here && <Button label="show distance" onPress={async () => loadList(await locate(true))} />}
      {listings === null && <ActivityIndicator color={T.ink} style={{ marginTop: 24 }} accessibilityLabel="loading" />}
      {listings?.length === 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>{city && !allCities ? `no surprise boxes in ${city} right now. brands list them later in the day, or see all cities.` : "no surprise boxes right now. brands list them later in the day."}</Text>}
      {listings?.map((l) => (
        <TouchableOpacity key={l.id} style={[styles.card, !l.available && { opacity: 0.6 }]} onPress={() => openListing(l.id)} accessibilityRole="button"
          accessibilityLabel={`${l.title} from ${l.brand.name}. ${money(l.price, l.currency)}, usually ${money(l.listPrice, l.currency)}. pickup ${span(l.pickupStart, l.pickupEnd)}. ${l.available ? `${l.quantityLeft} left` : "sold out"}${l.distanceKm != null ? `. ${l.distanceKm} km away` : ""}`}>
          {photoUri(l.image) && <Image source={{ uri: photoUri(l.image) }} style={styles.thumb} resizeMode="cover" accessible={false} />}
          <View style={styles.row}>
            <Text style={styles.title} maxFontSizeMultiplier={M}>{l.title}</Text>
            <Text style={styles.price} maxFontSizeMultiplier={M}>{money(l.price, l.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted} maxFontSizeMultiplier={M}>{l.brand.name} · {l.branch.name}{l.distanceKm != null ? ` · ${l.distanceKm} km` : ""}</Text>
            <Text style={styles.strike} maxFontSizeMultiplier={M}>{money(l.listPrice, l.currency)}</Text>
          </View>
          <Text style={styles.body} maxFontSizeMultiplier={M}>pickup {span(l.pickupStart, l.pickupEnd)}</Text>
          <Text style={[styles.pillText, { color: l.available ? T.success : T.danger }]} maxFontSizeMultiplier={M}>{l.available ? `${l.quantityLeft} left` : "sold out"}</Text>
        </TouchableOpacity>
      ))}
    </View>, () => loadList()));

  // ---------- detail ----------
  if (view === "detail") return frame(scroll(
    !listing ? <ActivityIndicator color={T.ink} accessibilityLabel="loading" /> : (
      <View>
        {photoUri(listing.image) && <Image source={{ uri: photoUri(listing.image) }} style={styles.hero} resizeMode="cover" accessibilityLabel={`photo of ${listing.title}`} />}
        <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>{listing.title}</Text>
        <Text style={styles.muted} maxFontSizeMultiplier={M}>{listing.brand.name} · {listing.branch.name}{listing.branch.address ? `, ${listing.branch.address}` : ""}</Text>
        <View style={styles.row}><Text style={styles.priceBig} maxFontSizeMultiplier={M}>{money(listing.price, listing.currency)}</Text><Text style={styles.strike} maxFontSizeMultiplier={M}>usually {money(listing.listPrice, listing.currency)}</Text></View>
        <Disclosures d={listing.disclosures} />
        {listing.available ? (
          <View style={styles.box}>
            <Text style={styles.label} maxFontSizeMultiplier={M}>how many</Text>
            <View style={styles.qtyRow} accessibilityRole="adjustable" accessibilityLabel={`${qty} boxes`}>
              {[1, 2].filter((n) => n <= Math.min(listing.maxPerOrder, listing.quantityLeft)).map((n) => (
                <TouchableOpacity key={n} onPress={() => setQty(n)} style={[styles.qty, qty === n && styles.qtyOn]} accessibilityRole="radio" accessibilityState={{ checked: qty === n }} accessibilityLabel={`${n} box${n > 1 ? "es" : ""}`}>
                  <Text style={[styles.qtyText, qty === n && { color: T.white }]} maxFontSizeMultiplier={M}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.body} maxFontSizeMultiplier={M}>total {money(listing.price * qty, listing.currency)}, paid at pickup. {listing.quantityLeft} left.</Text>
            <Button primary label="hold for 10 minutes" disabled={busy} onPress={doHold} />
          </View>
        ) : <Text style={styles.warn} maxFontSizeMultiplier={M}>sold out</Text>}
      </View>
    )), "surprise box", () => setView("list"));

  // ---------- hold ----------
  if (view === "hold" && hold) return frame(scroll(
    <View>
      <View style={styles.timer} accessibilityLiveRegion="polite" accessibilityLabel={`held for ${Math.ceil(secondsLeft / 60)} more minutes`}>
        <Ionicons name="time-outline" size={20} color={T.ink} />
        <Text style={styles.timerText} maxFontSizeMultiplier={M}>held for you: {mmss(secondsLeft)}</Text>
      </View>
      <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>{hold.hold.qty} × {listing?.title}</Text>
      <Text style={styles.priceBig} maxFontSizeMultiplier={M}>pay {money(hold.total, listing?.currency)} at pickup</Text>
      <Disclosures d={hold.disclosures} />
      <View style={styles.switchRow}>
        <Switch value={accepted} onValueChange={setAccepted} accessibilityLabel="I've read the food and pickup terms" accessibilityRole="switch" trackColor={{ true: T.yellow, false: T.line }} />
        <Text style={styles.body} maxFontSizeMultiplier={M}>I've read the food and pickup terms above</Text>
      </View>
      <View style={styles.actions}>
        <Button primary label="confirm order" disabled={busy || !accepted} onPress={confirm} />
        <Button label="release the boxes" disabled={busy} onPress={release} />
      </View>
    </View>), "confirm", release);

  // ---------- my orders ----------
  if (view === "orders") return frame(scroll(
    <View>
      {orders === null && <ActivityIndicator color={T.ink} accessibilityLabel="loading" />}
      {orders?.length === 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>no orders yet.</Text>}
      {orders?.map((o) => (
        <TouchableOpacity key={o.id} style={styles.card} onPress={() => openOrder(o.id)} accessibilityRole="button" accessibilityLabel={`${o.title}, ${o.brand?.name || ""}, ${STATE[o.state]?.label || o.state}, pickup ${span(o.pickupStart, o.pickupEnd)}`}>
          <View style={styles.row}><Text style={styles.title} maxFontSizeMultiplier={M}>{o.qty} × {o.title}</Text><Text style={styles.pillText} maxFontSizeMultiplier={M}>{STATE[o.state]?.label || o.state}</Text></View>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>{o.brand?.name} · {o.ref} · pickup {span(o.pickupStart, o.pickupEnd)}</Text>
        </TouchableOpacity>
      ))}
    </View>, loadOrders));

  // ---------- one order ----------
  if (view === "order") return frame(scroll(
    !order ? <ActivityIndicator color={T.ink} accessibilityLabel="loading" /> : (
      <View>
        <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>{order.qty} × {order.title}</Text>
        <Text style={styles.muted} maxFontSizeMultiplier={M}>{order.brand?.name} · {order.branch.name}{order.branch.address ? `, ${order.branch.address}` : ""} · order {order.ref}</Text>
        <Text style={styles.priceBig} maxFontSizeMultiplier={M}>{order.payment.state === "paid_at_pickup" ? `paid ${money(order.price.total, order.price.currency)} at pickup` : order.payment.note}</Text>
        <Text style={styles.body} maxFontSizeMultiplier={M}>pickup {span(order.pickupStart, order.pickupEnd)}</Text>
        {order.pickup?.unavailable && (
          <Text style={styles.warn} maxFontSizeMultiplier={M}>your pickup code can't be shown right now. try again in a little while; your order is safe.</Text>
        )}
        {order.pickup && !order.pickup.unavailable && (
          <View style={styles.codeBox} accessible accessibilityLabel={`pickup code ${order.pickup.code.split("").join(" ")}. show it at the brand.`}>
            <Text style={styles.label} maxFontSizeMultiplier={M}>show this at pickup</Text>
            <View style={{ alignItems: "center", marginVertical: 10 }}><QRCode value={order.pickup.qr} size={176} color={T.ink} backgroundColor={T.white} ecl="M" /></View>
            <Text style={styles.code} maxFontSizeMultiplier={1.4}>{order.pickup.code}</Text>
            <Text style={styles.muted} maxFontSizeMultiplier={M}>works once, at {order.branch.name}, until {pkTime(order.pickup.validUntil, { hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        )}
        {order.state === "MERCHANT_CANCELLED" && <Text style={styles.warn} maxFontSizeMultiplier={M}>the brand cancelled{order.cancelReason ? `: ${order.cancelReason}` : ""}. you don't owe anything.</Text>}
        {order.state === "NO_SHOW" && <Text style={styles.warn} maxFontSizeMultiplier={M}>not collected in time, so it's recorded as a no-show.</Text>}
        <Timeline order={order} />
        {order.canCancel && <Button label="cancel order" disabled={busy} onPress={cancel} />}
        {!order.canCancel && ["ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.state) && (
          <Text style={styles.muted} maxFontSizeMultiplier={M}>cancelling closed {pkTime(order.cancelUntil, { hour: "2-digit", minute: "2-digit" })} (30 minutes before pickup). if you can't collect it, it counts as a no-show.</Text>
        )}
        {order.supportCase && (
          <View style={styles.box}>
            <Text style={styles.title} maxFontSizeMultiplier={M}>support case: {order.supportCase.status === "open" ? "tdc is looking at it" : `decided (${String(order.supportCase.decision).replace("_", " ")})`}</Text>
            {!!order.supportCase.note && <Text style={styles.body} maxFontSizeMultiplier={M}>{order.supportCase.note}</Text>}
          </View>
        )}
        {order.canDispute && !order.supportCase && !caseForm && <Button label="something went wrong" onPress={() => setCaseForm({ reason: "", description: "" })} />}
        {caseForm && (
          <View style={styles.box}>
            <Text style={styles.title} maxFontSizeMultiplier={M}>what went wrong?</Text>
            <Text style={styles.muted} maxFontSizeMultiplier={M}>you can open a case until {pkTime(order.disputeUntil)}. tdc decides; no money passed through tdc, so there's nothing to refund here.</Text>
            {CASE_REASONS.map(([v, label]) => (
              <TouchableOpacity key={v} style={[styles.option, caseForm.reason === v && styles.optionOn]} onPress={() => setCaseForm({ ...caseForm, reason: v })} accessibilityRole="radio" accessibilityState={{ checked: caseForm.reason === v }} accessibilityLabel={label}>
                <Ionicons name={caseForm.reason === v ? "radio-button-on" : "radio-button-off"} size={18} color={T.ink} />
                <Text style={styles.body} maxFontSizeMultiplier={M}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput style={styles.input} multiline value={caseForm.description} onChangeText={(description) => setCaseForm({ ...caseForm, description })} placeholder="tell us what happened" placeholderTextColor={T.textFaint} accessibilityLabel="what happened" maxFontSizeMultiplier={M} />
            <View style={styles.actions}>
              <Button primary label="send to tdc" disabled={busy || !caseForm.reason} onPress={sendCase} />
              <Button label="cancel" onPress={() => setCaseForm(null)} />
            </View>
          </View>
        )}
      </View>
    ), order ? () => openOrder(order.id) : null), "my order", () => { setView("orders"); loadOrders(); });

  return frame(scroll(<ActivityIndicator color={T.ink} />));
}

function Disclosures({ d }) {
  if (!d) return null;
  return (
    <View style={styles.box} accessible accessibilityLabel={`food and pickup terms. ${d.contentsNote} allergens: ${d.allergenNotes}. pickup ${span(d.pickupStart, d.pickupEnd)}. ${d.cancellationRule} ${d.payment}`}>
      <Text style={styles.label} maxFontSizeMultiplier={M}>before you order</Text>
      <Line icon="shuffle-outline" text={d.contentsNote} />
      {!!d.description && <Line icon="basket-outline" text={`usually: ${d.description}`} />}
      <Line icon="warning-outline" text={`allergens: ${d.allergenNotes}${d.allergens?.length ? ` (${d.allergens.join(", ")})` : ""}`} strong />
      <Line icon="medkit-outline" text={d.allergenWarning} />
      {!!d.dietary?.length && <Line icon="leaf-outline" text={d.dietary.join(", ")} />}
      {!!d.bestBefore && <Line icon="hourglass-outline" text={`best before ${pkTime(d.bestBefore)}`} />}
      <Line icon="time-outline" text={`pickup ${span(d.pickupStart, d.pickupEnd)}${d.branchName ? ` at ${d.branchName}` : ""}`} strong />
      <Line icon="close-circle-outline" text={`${d.cancellationRule} cancel until ${pkTime(d.cancelUntil, { hour: "2-digit", minute: "2-digit" })}.`} />
      <Line icon="cash-outline" text={d.payment} strong />
    </View>
  );
}
function Line({ icon, text, strong }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={16} color={T.ink} style={{ marginTop: 2 }} />
      <Text style={[styles.body, strong && { fontFamily: F.bodySemi }]} maxFontSizeMultiplier={M}>{text}</Text>
    </View>
  );
}
function Timeline({ order }) {
  const steps = [["ordered", 1], ["confirmed", 2], ["ready for pickup", 3], ["picked up", 4]];
  const at = STATE[order.state]?.step ?? 0;
  const stopped = at < 0;
  return (
    <View style={styles.box}>
      <Text style={styles.label} maxFontSizeMultiplier={M}>status: {STATE[order.state]?.label || order.state}</Text>
      {!stopped && steps.map(([label, n]) => (
        <View key={label} style={styles.line} accessible accessibilityLabel={`${label}${n <= at ? ", done" : ""}`}>
          <Ionicons name={n <= at ? "checkmark-circle" : "ellipse-outline"} size={18} color={n <= at ? T.success : T.textMuted} />
          <Text style={[styles.body, n <= at && { fontFamily: F.bodySemi }]} maxFontSizeMultiplier={M}>{label}</Text>
        </View>
      ))}
      {order.history?.map((h, i) => (
        <Text key={i} style={styles.muted} maxFontSizeMultiplier={M}>{pkTime(h.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: {STATE[h.to]?.label || h.to}{h.note ? ` (${h.note})` : ""}</Text>
      ))}
    </View>
  );
}
function Tab({ label, on, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, on && styles.tabOn]} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      <Text style={[styles.tabText, on && { color: T.white }]} maxFontSizeMultiplier={M}>{label}</Text>
    </TouchableOpacity>
  );
}
function Button({ label, onPress, primary, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, primary && styles.btnPrimary, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <Text style={[styles.btnText, primary && { color: T.white }]} maxFontSizeMultiplier={M}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  thumb: { width: "100%", height: 120, borderRadius: 14, marginBottom: 8, backgroundColor: T.sand },
  hero: { width: "100%", height: 200, borderRadius: 18, marginBottom: 12, backgroundColor: T.sand },
  screen: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: T.sand, minHeight: 36, justifyContent: "center" },
  tabOn: { backgroundColor: T.ink },
  tabText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  lead: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, marginBottom: 10 },
  h1: { fontFamily: F.heading, fontSize: 20, color: T.ink, marginTop: 4 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, flex: 1 },
  body: { fontFamily: F.body, fontSize: 14, color: T.ink, flexShrink: 1 },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4, flexShrink: 1 },
  warn: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.danger, marginTop: 10 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, textTransform: "uppercase", marginBottom: 6 },
  price: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  priceBig: { fontFamily: F.heading, fontSize: 18, color: T.ink, marginTop: 8 },
  strike: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textDecorationLine: "line-through" },
  pillText: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 10 },
  box: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 12 },
  line: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "flex-start" },
  qtyRow: { flexDirection: "row", gap: 10, marginVertical: 8 },
  qty: { width: 52, height: 48, borderRadius: 14, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center", backgroundColor: T.card },
  qtyOn: { backgroundColor: T.ink, borderColor: T.ink },
  qtyText: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink },
  timer: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: T.yellowSoft },
  timerText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, minHeight: 44 },
  codeBox: { padding: 16, borderRadius: 18, backgroundColor: T.white, borderWidth: 2, borderColor: T.ink, marginTop: 12, alignItems: "center" },
  code: { fontFamily: F.heading, fontSize: 30, letterSpacing: 6, color: T.ink },
  option: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, minHeight: 44 },
  optionOn: {},
  input: { minHeight: 80, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 10, fontFamily: F.body, fontSize: 14, color: T.ink, textAlignVertical: "top", marginTop: 6, backgroundColor: T.card },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: 10 },
  btnPrimary: { backgroundColor: T.ink, borderColor: T.ink },
  btnText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
});
