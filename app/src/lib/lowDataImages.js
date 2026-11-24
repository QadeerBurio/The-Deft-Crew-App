// app/src/lib/lowDataImages.js — Q-3i, flag lowDataImages (off by default).
// While the flag is on, watches the connection (NetInfo, installed) and turns "low data" pictures on for a slow
// mobile connection (2G / 3G): utils/imageUrl.sizedImageUrl then asks Cloudinary for narrower, "eco" quality
// pictures. Wi-Fi, 4G / 5G, unknown, or the flag off: normal pictures, exactly as before.
import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import useFlag from "../hooks/useFlag";
import { setLowDataImages } from "../utils/imageUrl";

const SLOW = ["2g", "3g"];

/** a NetInfo state that counts as a slow connection */
export const isSlowConnection = (state) => !!state && state.type === "cellular" && SLOW.includes(String(state.details?.cellularGeneration || "").toLowerCase());

/** watches the connection while `enabled`; turns low-data pictures off again when it stops */
export function useLowDataImages(enabled) {
  useEffect(() => {
    if (!enabled) { setLowDataImages(false); return undefined; }
    let off = null;
    try { off = NetInfo.addEventListener((state) => setLowDataImages(isSlowConnection(state))); } catch { off = null; }
    return () => { try { off && off(); } catch {} setLowDataImages(false); };
  }, [enabled]);
}

/** mounted once at the root (App.js): renders nothing */
export default function LowDataImagesHost() {
  useLowDataImages(useFlag("lowDataImages") === true);
  return null;
}
