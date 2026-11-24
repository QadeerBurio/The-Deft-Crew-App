// screens/home/CityCheckCard.js — P5b "is your city right?" (flag cityCheck, off by default).
// Accounts made before P3b got "Karachi" automatically, whether or not the student lives there. Once, on Home:
// "is your city right? karachi" with "yes, karachi" and "change". The answer goes to POST /api/me/city (the server
// records cityConfirmedAt), so the card never shows again. Shown only to a signed-in student whose city on the server
// is "Karachi" and not yet confirmed; nothing at all with the flag off.
import React, { useContext, useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import api from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import useFlag from "../../hooks/useFlag";
import { Card, Button } from "../../ui";
import CityDropdown from "../../components/CityDropdown";
import { CITIES } from "../pkCities";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { plainError } from "../../utils/plainError";

const OLD_DEFAULT = "Karachi";

/** whether the account (GET /auth/me) should be asked */
export const needsCityCheck = (me) => !!me && me.role === "student" && me.city === OLD_DEFAULT && !me.cityConfirmedAt;

export default function CityCheckCard() {
  const on = useFlag("cityCheck") === true;
  const { token, isGuest } = useContext(AuthContext) || {};
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!on || !token || isGuest) { setShow(false); return undefined; }
    let live = true;
    api.get("/auth/me").then((r) => { if (live) setShow(needsCityCheck(r?.data?.user || r?.data)); }).catch(() => { if (live) setShow(false); });
    return () => { live = false; };
  }, [on, token, isGuest]);

  const answer = async (body) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api.post("/me/city", body);
      setShow(false);
    } catch (e) {
      setError(plainError(e, "couldn't save that. try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;
  return (
    <Card style={s.card} accessibilityRole="summary">
      <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">is your city right?</Text>
      <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>we have karachi. deals and events near you use it.</Text>
      <View style={s.row}>
        <Button title="yes, karachi" size="small" full={false} loading={busy} onPress={() => answer({ confirm: true })} accessibilityLabel="yes, my city is karachi" />
        {/* "Karachi ▾": picking another city saves it (the dropdown only answers for a different city) */}
        <CityDropdown options={CITIES} selected={OLD_DEFAULT} title="your city" variant="chip" onSelect={(city) => answer({ city })} />
      </View>
      {!!error && <Text style={s.error} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite">{error}</Text>}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12 },
  title: { fontFamily: F.heading, fontSize: 16, color: T.ink },
  line: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" },
  error: { fontFamily: F.body, fontSize: 13, color: T.danger || T.ink, marginTop: 8 },
});
