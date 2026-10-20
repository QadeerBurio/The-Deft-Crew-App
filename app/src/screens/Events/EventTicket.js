// app/src/screens/Events/EventTicket.js
// "my ticket": one card per seat with the event, the student, the price paid and a QR that
// holds the ticket code only. Opens from events → mine and from the "ticket is ready" push.
// The last copy is kept on the phone, so it still opens offline at the door.
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Linking, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { AuthContext } from "../../context/AuthContext";
import { Button, EmptyState, ScreenHeader } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { loadTicket, readCachedTicket, ticketRows, savedLabel, STATUS_LABEL } from "./ticketData";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// ── one seat ──────────────────────────────────────────────────
export function TicketCard({ ticket, seat, cardRef }) {
  const ev = ticket.event || {};
  const cancelled = seat.status === "cancelled";
  const used = seat.status === "used";
  const rows = ticketRows(ticket, seat);
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={styles.card}
      accessible
      accessibilityLabel={`ticket ${seat.code}${cancelled ? ", cancelled" : used ? ", used" : ""}`}
    >
      {/* top: brand, category, title */}
      <View style={styles.top}>
        <View style={styles.topRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              tdc<Text style={{ color: T.ink }}>.</Text>
            </Text>
          </View>
          {!!ev.category && (
            <Text style={styles.category} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {String(ev.category).toLowerCase()}
            </Text>
          )}
        </View>
        {!!ev.title && (
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {String(ev.title).toLowerCase()}
            <Text style={{ color: T.yellow }}>.</Text>
          </Text>
        )}
        <View style={styles.pills}>
          <View style={[styles.pill, ticket.paymentStatus === "paid" ? styles.pillPaid : styles.pillFree]}>
            <Text style={[styles.pillText, ticket.paymentStatus === "paid" && { color: T.success }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {ticket.paymentStatus === "paid" ? "paid" : "free"}
            </Text>
          </View>
          {(cancelled || used) && (
            <View style={[styles.pill, cancelled ? styles.pillCancelled : styles.pillUsed]}>
              <Text style={[styles.pillText, { color: cancelled ? T.danger : T.ink }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {STATUS_LABEL[seat.status]}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* perforation */}
      <View style={styles.perf}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dash} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* details */}
      <View style={styles.body}>
        {rows.map((r) => (
          <View key={r.key} style={styles.row}>
            <Text style={styles.rowLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{r.label}</Text>
            {r.link ? (
              <Text
                style={[styles.rowValue, styles.link]}
                onPress={() => Linking.openURL(r.value).catch(() => {})}
                accessibilityRole="link"
                numberOfLines={2}
              >
                {r.value}
              </Text>
            ) : (
              <Text style={styles.rowValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{r.value}</Text>
            )}
          </View>
        ))}

        <View style={styles.qrWrap}>
          <View style={[styles.qr, (cancelled || used) && styles.qrOff]}>
            <QRCode value={seat.code} size={176} color={T.ink} backgroundColor={T.white} ecl="M" />
          </View>
          {cancelled && (
            <View style={styles.stamp} pointerEvents="none">
              <Text style={styles.stampText} maxFontSizeMultiplier={MAX_FONT_SCALE}>cancelled</Text>
            </View>
          )}
        </View>
        <Text style={[styles.code, cancelled && styles.codeOff]} selectable maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {seat.code}
        </Text>
        {cancelled && (
          <Text style={styles.cancelNote} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {"this ticket was cancelled and won't get you in."}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── screen ───────────────────────────────────────────────────
export default function EventTicket({ route, navigation }) {
  const registrationId = route?.params?.registrationId;
  // opened from a "download ticket" button: the download action is the first thing shown
  const forDownload = !!route?.params?.download;
  const { token, user } = useContext(AuthContext) || {};
  const userId = user?._id || user?.id || null;
  const [state, setState] = useState({ loading: true, ticket: null, fromCache: false, savedAt: null, message: null });
  const [busy, setBusy] = useState(null); // "save:<code>" | "share:<code>"
  const [saved, setSaved] = useState({}); // code → true once saved to the gallery
  const refs = useRef({});

  const load = useCallback(async () => {
    if (!registrationId) {
      setState({ loading: false, ticket: null, message: "this ticket link is incomplete." });
      return;
    }
    if (!token) {
      setState({ loading: false, ticket: null, message: "sign in to see your ticket." });
      return;
    }
    const r = await loadTicket({ registrationId, token, userId });
    setState({ loading: false, ticket: r.ticket, fromCache: !!r.fromCache, savedAt: r.savedAt || null, message: r.message || null });
  }, [registrationId, token, userId]);

  useEffect(() => {
    let live = true;
    // the saved copy first (instant, and offline), then the server's
    (async () => {
      if (registrationId && token) {
        const saved = await readCachedTicket(userId, registrationId);
        if (live && saved) setState((s) => (s.ticket ? s : { ...s, loading: true, ticket: saved.ticket, fromCache: true, savedAt: saved.savedAt }));
      }
      if (live) await load();
    })();
    return () => {
      live = false;
    };
  }, [load, registrationId, token, userId]);

  const capture = async (code) => {
    const node = refs.current[code];
    if (!node) throw new Error("not ready");
    return captureRef(node, { format: "png", quality: 1, result: "tmpfile" });
  };

  const onSave = async (code) => {
    setBusy(`save:${code}`);
    try {
      // save-only access (no reading of the gallery)
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (perm?.status !== "granted") {
        Alert.alert(
          "allow saving photos",
          "tdc needs permission to save your ticket to the gallery. allow it in your phone settings, then tap download ticket again.",
          [
            { text: "not now", style: "cancel" },
            { text: "open settings", onPress: () => Linking.openSettings?.().catch(() => {}) },
          ]
        );
        return;
      }
      const uri = await capture(code);
      await MediaLibrary.saveToLibraryAsync(uri);
      setSaved((s) => ({ ...s, [code]: true }));
      Alert.alert("ticket saved", "your ticket is in your gallery.");
    } catch {
      Alert.alert("can't save", "couldn't save the ticket. please try again.");
    } finally {
      setBusy(null);
    }
  };

  const onShare = async (code) => {
    setBusy(`share:${code}`);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("can't share", "sharing isn't available on this phone.");
        return;
      }
      const uri = await capture(code);
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "share your ticket", UTI: "public.png" });
    } catch {
      Alert.alert("can't share", "couldn't share the ticket. please try again.");
    } finally {
      setBusy(null);
    }
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.("Events");
  };

  const { ticket, loading, fromCache, savedAt, message } = state;
  const seats = ticket?.tickets || [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScreenHeader title={seats.length > 1 ? "my tickets" : "my ticket"} onBack={goBack} />
      {!ticket && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.ink} />
        </View>
      ) : !ticket ? (
        <View style={styles.center}>
          <EmptyState
            mood="sleepy"
            title="no ticket yet."
            line={message || "your ticket shows here once it's ready."}
            actionLabel="try again"
            onAction={() => {
              setState((s) => ({ ...s, loading: true }));
              load();
            }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {fromCache && (
            <View style={styles.offline} accessibilityLiveRegion="polite">
              <Ionicons name="cloud-offline-outline" size={16} color={T.textMuted} />
              <Text style={styles.offlineText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {loading ? "checking for changes…" : `offline · saved copy${savedAt ? ` from ${savedLabel(savedAt)}` : ""}`}
              </Text>
            </View>
          )}
          {forDownload && seats.some((s) => s.status === "valid") && (
            <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {seats.filter((s) => s.status === "valid").length > 1
                ? "tap download ticket under each seat to save it to your gallery."
                : "tap download ticket to save it to your gallery."}
            </Text>
          )}
          {seats.map((seat) => {
            // only a valid ticket can be downloaded (not cancelled, not used)
            const canSave = seat.status === "valid";
            return (
              <View key={seat.code} style={styles.seat}>
                <TicketCard ticket={ticket} seat={seat} cardRef={(n) => (refs.current[seat.code] = n)} />
                {canSave && (
                  <>
                    <Button
                      title="download ticket"
                      variant="primary"
                      style={styles.download}
                      loading={busy === `save:${seat.code}`}
                      disabled={!!busy}
                      onPress={() => onSave(seat.code)}
                      icon={<Ionicons name="download-outline" size={18} color={T.white} />}
                      accessibilityLabel={`download ticket ${seat.code} to the gallery`}
                    />
                    <Button
                      title="share"
                      variant="secondary"
                      style={styles.share}
                      loading={busy === `share:${seat.code}`}
                      disabled={!!busy}
                      onPress={() => onShare(seat.code)}
                      icon={<Ionicons name="share-social-outline" size={18} color={T.ink} />}
                      accessibilityLabel={`share ticket ${seat.code} as an image`}
                    />
                    {saved[seat.code] && (
                      <View style={styles.savedRow} accessibilityLiveRegion="polite">
                        <Ionicons name="checkmark-circle" size={16} color={T.success} />
                        <Text style={styles.savedText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                          saved to your gallery
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
          <Text style={styles.foot} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            show the qr or the code at the door. each seat has its own code.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  offline: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.sand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  offlineText: { fontFamily: F.bodyMedium, fontSize: 12.5, color: T.textMuted },
  seat: { marginBottom: 22 },

  card: { backgroundColor: T.card, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: T.line },
  top: { backgroundColor: T.ink, padding: 20, paddingBottom: 18 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { backgroundColor: T.yellow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  logoText: { fontFamily: F.heading, fontSize: 16, color: T.ink },
  category: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.yellow, maxWidth: "60%" },
  title: { fontFamily: F.heading, fontSize: 24, lineHeight: 29, color: T.white, marginTop: 14 },
  pills: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillPaid: { backgroundColor: T.successBg },
  pillFree: { backgroundColor: T.yellowSoft },
  pillCancelled: { backgroundColor: T.dangerBg },
  pillUsed: { backgroundColor: T.sand },
  pillText: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },

  perf: { height: 22, flexDirection: "row", alignItems: "center", backgroundColor: T.card },
  notch: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.paper, borderWidth: 1, borderColor: T.line },
  notchLeft: { marginLeft: -12 },
  notchRight: { marginRight: -12 },
  dash: { flex: 1, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: T.line, marginHorizontal: 6 },

  body: { paddingHorizontal: 20, paddingBottom: 22, paddingTop: 6 },
  row: { flexDirection: "row", paddingVertical: 6, gap: 12 },
  rowLabel: { width: 64, fontFamily: F.body, fontSize: 13, color: T.textMuted },
  rowValue: { flex: 1, fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  link: { textDecorationLine: "underline" },

  qrWrap: { alignItems: "center", justifyContent: "center", marginTop: 16 },
  qr: { padding: 12, backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.line },
  qrOff: { opacity: 0.15 },
  stamp: { position: "absolute", borderWidth: 3, borderColor: T.danger, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, transform: [{ rotate: "-12deg" }], backgroundColor: "rgba(255,255,255,0.85)" },
  stampText: { fontFamily: F.heading, fontSize: 22, color: T.danger },
  code: { fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: T.ink, textAlign: "center", marginTop: 14, fontWeight: "700" },
  codeOff: { color: T.textFaint, textDecorationLine: "line-through" },
  cancelNote: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, textAlign: "center", marginTop: 6 },

  hint: { fontFamily: F.bodyMedium, fontSize: 13, color: T.ink, backgroundColor: T.yellowSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  download: { marginTop: 12 },
  share: { marginTop: 8 },
  savedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  savedText: { fontFamily: F.bodySemi, fontSize: 13, color: T.success },
  foot: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: "center", marginTop: 4 },
});
