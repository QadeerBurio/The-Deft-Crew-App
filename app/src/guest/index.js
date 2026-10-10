// app/src/guest/index.js — guest mode kit (one gate for the whole app)
export { GuestGateProvider, useGuestGate } from "./GuestGate";
export { default as GuestLocked } from "./GuestLocked";
export { default as accountOnly } from "./accountOnly";
export {
  LOGIN_ONLY_ROUTES,
  openTarget,
  openSignIn,
  openSignUp,
  enterAccount,
  setPendingTarget,
  clearPendingTarget,
} from "./accountRoutes";
export { hasSeenIntro, markIntroSeen, INTRO_KEY } from "./firstRun";
