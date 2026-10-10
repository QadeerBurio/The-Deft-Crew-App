// app/src/guest/clearClaimedData.js
// Removes every stored copy of claimed-offer state from the device.
// Called when the app has no signed-in student (logout, guest mode), so a guest
// never sees a previous account's claims. A student's claims come back from the
// server on the next sign in.
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAIMED_PREFIXES = [
  "@tdc_claimed_offer_ids", // OfferScreen claim registry (per user + legacy shared key)
  "@brands_cache:v2:", // Brands list, offers carry isClaimed (per user)
  "@brands_stats_cache:v2:", // Brands stats (claimed counts)
  "@offer_stats_cache:", // OfferScreen stats per brand (claimed counts), was not per user
];

export async function clearStoredClaimedData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const drop = keys.filter((k) => CLAIMED_PREFIXES.some((p) => k.startsWith(p)));
    if (drop.length) await AsyncStorage.multiRemove(drop);
  } catch {}
}
