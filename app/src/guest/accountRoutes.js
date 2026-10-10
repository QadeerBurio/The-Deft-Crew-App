// app/src/guest/accountRoutes.js
// Where a guest may go, and how a guest becomes a student without losing their place.
//
//   LOGIN_ONLY_ROUTES  routes that show nothing useful without an account (locked for guests)
//   openTarget()       deep links / push taps: a guest going to a login-only route signs in
//                      first, then continues to it
//   enterAccount()     used by SignIn / Signup / SignupVerify instead of setToken + setUser:
//                      leaves guest mode in the same render, so the Drawer stays mounted and
//                      the student lands back on the screen they were on
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackActions } from "@react-navigation/native";
import { navigationRef } from "../navigation/navigationRef";
import { setGuestMode as setApiGuestMode } from "../api/api";
import { setGuestMode as setBrandGuestMode } from "../api/brandApi";

export const LOGIN_ONLY_ROUTES = new Set([
  // discounts / profile / rewards
  "Profile",
  "ProfileScreen",
  "ProfileMain",
  "ProfileDetails",
  "UpdateProfile",
  "MyDiscountScreen",
  "Card",
  "DigitalBadge",
  "Rewards",
  "Badges",
  "NotificationSettings",
  // social
  "UserProfile",
  "CreatePostScreen",
  "MessagesScreen",
  "ChatDetailScreen",
  "Notifications",
  "EditProfileScreen",
  "ChangePassword",
  "YourAccount",
  "SecurityAndAccess",
  "BlockedUsers",
  // ai / resume / careers / travel forms
  "ChatHistory",
  "ResumeBuilder",
  "ResumeView",
  "ResumeShare",
  "ResumeAnalytics",
  "ResumeSettings",
  "ApplicationForm",
  "Payment",
  // skillshare (own data, forms, chats)
  "SkillProfile",
  "SkillProfileEdit",
  "ProfileWelcome",
  "ProfileSetup",
  "ProfileSuccess",
  "CreateListing",
  "CreateOffer",
  "ManageOffers",
  "MyOffers",
  "MyListings",
  "MyInquiries",
  "MyMatches",
  "MyPostsByType",
  "Activity",
  "NotificationSkillshare",
  "MatchChat",
  "InquiryChat",
]);

// ── auth snapshot (kept current by GuestGateProvider) ──────────────
let auth = { signedIn: false, isGuest: false };
export function setAuthSnapshot(next) {
  auth = next;
}

// ── stored target (deep link / push that has to wait) ──────────────
let pending = null;
export function setPendingTarget(route, params) {
  pending = route ? { route, params } : null;
}
export function clearPendingTarget() {
  pending = null;
}
export function takePendingTarget() {
  const t = pending;
  pending = null;
  return t;
}

function navigateSoon(route, params, attempt = 0) {
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate(route, params);
    } catch (e) {
      console.warn(`[guest] navigate("${route}") failed:`, e?.message);
    }
  } else if (attempt < 50) {
    setTimeout(() => navigateSoon(route, params, attempt + 1), 100);
  }
}

export function openSignIn() {
  navigateSoon("Login");
}
export function openSignUp() {
  navigateSoon("Signup");
}

// Deep link / push tap. Signed in: go. Guest: go, unless the route needs an account,
// then sign in first. Still on the splash: hold it until Home is up.
export function openTarget(route, params) {
  if (!route) return;
  if (!auth.signedIn && !auth.isGuest) {
    setPendingTarget(route, params);
    return;
  }
  if (auth.isGuest && LOGIN_ONLY_ROUTES.has(route)) {
    setPendingTarget(route, params);
    openSignIn();
    return;
  }
  navigateSoon(route, params);
}

// Called by GuestGateProvider once the app has switched state.
export function afterEnteredAsGuest() {
  const t = pending;
  if (!t) return;
  if (LOGIN_ONLY_ROUTES.has(t.route)) {
    openSignIn(); // keep the target; it opens after sign in
  } else {
    pending = null;
    navigateSoon(t.route, t.params);
  }
}

// Screens that read the token from storage once, on mount. After sign in they are
// mounted again (same route, same params) so they pick up the student's token.
export const REMOUNT_AFTER_SIGN_IN = new Set(["Career", "TDCCareers"]);

function focusedLeaf(state) {
  let s = state;
  while (s && Array.isArray(s.routes)) {
    const r = s.routes[s.index ?? 0];
    if (r?.state) s = r.state;
    else return { route: r, nav: s };
  }
  return null;
}

function remountIfStale() {
  if (!navigationRef.isReady()) return;
  const leaf = focusedLeaf(navigationRef.getRootState());
  if (!leaf?.route || !REMOUNT_AFTER_SIGN_IN.has(leaf.route.name) || leaf.nav?.type !== "stack") return;
  navigationRef.dispatch({ ...StackActions.replace(leaf.route.name, leaf.route.params), target: leaf.nav.key });
}

export function afterSignedIn() {
  if (navigationRef.isReady()) {
    const root = navigationRef.getRootState();
    if (root?.routes?.some((r) => r.name === "Drawer") && root.routes[root.index]?.name !== "Drawer") {
      navigationRef.dispatch(StackActions.popTo("Drawer"));
    }
  }
  setTimeout(remountIfStale, 60);
  const t = takePendingTarget();
  if (t) setTimeout(() => navigateSoon(t.route, t.params), 350);
}

export function afterSignedOut() {
  clearPendingTarget();
  // fresh Home, nothing from the old account behind it for hardware back
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: "Drawer" }] });
  }
}

// Same steps AuthContext takes after a login, done before the token is set so the
// guest flag is gone in the same render (Drawer stays mounted, no request goes out
// as a guest with the student's screen showing).
export async function enterAccount(authCtx, token, user) {
  try {
    setApiGuestMode(false);
    setBrandGuestMode(false);
  } catch {}
  try {
    await AsyncStorage.removeItem("isGuest");
  } catch {}
  authCtx.setIsGuest(false);
  authCtx.setToken(token);
  authCtx.setUser(user);
}
