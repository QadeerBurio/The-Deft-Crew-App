// app/src/analytics/funnel.js
// Funnel events of the upgrade v2 plan (§11.2), e.g. funnel("invite_code_prefilled") or
// funnel("resume_step_done_3", { refId: resumeId }). Sent to our own server (POST /api/engagement/events), which
// keeps only the names it knows (server config/funnelEvents.js). Never sent to Meta.
//   - fire and forget: never throws, never awaited by a screen, a failure is only a console.warn
//   - guests and signed-out: nothing is sent
//   - meta: small plain values only (the server keeps up to 10 keys); refId makes every occurrence count
//     (otherwise the server keeps one per name per day)
import AsyncStorage from "@react-native-async-storage/async-storage";
// the api client is loaded on first use (keeps this module light to import)
const api = () => { const m = require("../api/api"); return m.default || m; };

const NAME = /^[a-z0-9_-]{1,64}$/;

async function signedIn() {
  try {
    const [token, guest] = await Promise.all([AsyncStorage.getItem("token"), AsyncStorage.getItem("isGuest")]);
    return !!token && guest !== "true";
  } catch {
    return false;
  }
}

/** Send one funnel event. Resolves to true when the server took it, false otherwise (never rejects). */
export async function funnel(name, meta = {}) {
  try {
    if (typeof name !== "string" || !NAME.test(name)) return false;
    if (!(await signedIn())) return false;
    await api().post("/engagement/events", { name, meta: meta && typeof meta === "object" ? meta : {} });
    return true;
  } catch (e) {
    console.warn("[funnel] event not sent:", name, e?.message);
    return false;
  }
}

export default funnel;
