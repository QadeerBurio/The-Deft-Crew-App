// app/src/crew/AmbassadorInviteHost.js
// Plan P2-1 (flag ambassadorV2): "want to be a tdc ambassador?" after a good moment. The server decides when (a
// friend joined and verified, a 3rd deal, a new level, a liked post) and asks at most twice; this only checks every
// 6 hours per account, never while the app tour runs or something else is on screen (tour gate), and holds the tour
// while the sheet shows. Mounted once in App.js (inside TourProvider). Flag off, guest or signed out: nothing.
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, View, Text } from "react-native";
import Sheet from "../ui/Sheet";
import Button from "../ui/Button";
import { AuthContext } from "../context/AuthContext";
import { TourContext } from "../engagement/tour/TourProvider";
import { holdTour, releaseTour, isTourHeld } from "../engagement/tour/tourGate";
import useFlag from "../hooks/useFlag";
import { FLAGS } from "../api/upgradeFlags";
import { navigationRef } from "../navigation/navigationRef";
import { navigateAnywhere } from "../navigation/routes";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getInvitation, answerInvitation, inviteDue, inviteLine } from "./crew";

const HOLD = "ambassador-invite";

export default function AmbassadorInviteHost() {
  const { token, user, isGuest } = useContext(AuthContext) || {};
  const tour = useContext(TourContext);
  const on = useFlag(FLAGS.ambassadorV2) === true;
  const userId = !isGuest && token ? user?._id || user?.id || null : null;
  const [invite, setInvite] = useState(null); // { moment }
  const [busy, setBusy] = useState(false);
  const checking = useRef(false);
  const tourRunning = !!tour?.running;

  const check = useCallback(async () => {
    if (!on || !userId || checking.current || invite) return;
    if (tourRunning || isTourHeld()) return; // the tour, a celebration, an alert or a prompt is on screen
    checking.current = true;
    try {
      if (!(await inviteDue(userId))) return;
      const r = await getInvitation();
      if (r?.show && !isTourHeld()) {
        holdTour(HOLD);
        setInvite({ moment: r.moment });
      }
    } catch {
      /* offline or the server said no: try again later */
    } finally {
      checking.current = false;
    }
  }, [on, userId, invite, tourRunning]);

  useEffect(() => {
    const t = setTimeout(check, 4000); // let Home's own popups arrive first
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => { clearTimeout(t); sub?.remove?.(); };
  }, [check]);

  useEffect(() => () => releaseTour(HOLD), []);

  const close = async (answer) => {
    if (busy) return;
    setBusy(true);
    try { await answerInvitation(answer); } catch { /* the server asks again later at most */ }
    setBusy(false);
    setInvite(null);
    releaseTour(HOLD);
    if (answer === "more") navigateAnywhere(navigationRef, "AmbassadorIntro", { from: "invite" });
  };

  if (!invite) return null;
  return (
    <Sheet visible onClose={() => close("not_now")} title="be a tdc ambassador?" scroll={false}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontFamily: F.body, fontSize: 15, color: T.ink, lineHeight: 21, marginBottom: 6 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {inviteLine(invite.moment)}
        </Text>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: T.textFaint, lineHeight: 20, marginBottom: 16 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          bring tdc to your campus, get perks and a certificate for your cv.
        </Text>
        <Button title="tell me more" onPress={() => close("more")} loading={busy} accessibilityLabel="tell me more about the ambassador programme" />
        <Button title="not now" variant="ghost" onPress={() => close("not_now")} disabled={busy} style={{ marginTop: 8 }} />
        <Button title="don't ask again" variant="ghost" size="small" onPress={() => close("never")} disabled={busy} style={{ marginTop: 4 }} />
      </View>
    </Sheet>
  );
}
