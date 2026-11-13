// app/src/navigation/routes.js
// Where every screen lives, so a push / banner / popup can open it from ANY screen.
// React Navigation 7 doesn't look inside other navigators for a name, so a name is turned into the
// full nested path from the root. The lists are checked against the navigators' registrations by
// tests/app/back-navigation.test.js.
//
//   root (AuthNavigator)            ROOT
//   └─ Drawer                       DRAWER (HomeTabs, Profile, Dashboard)
//      ├─ HomeTabs  (home stack)    HOME_STACK
//      │  └─ HomeTabs (tabs)        TABS
//      ├─ Profile   (ProfileStack)  PROFILE
//      └─ Dashboard (SkillShare)    SKILLSHARE

export const ROOT = ["Splash", "Drawer", "CommunityGuidelines", "Signup", "SignupVerify", "Login", "ForgotPassword", "VerifyOTP", "ResetPassword", "LegalTerms", "LegalPrivacy", "Resume"];
export const DRAWER = ["HomeTabs", "Profile", "Dashboard"];
export const HOME_STACK = ["HomeTabs", "University", "ContactUs", "Home", "BrandOffers", "Points", "WhyPoints", "How It Works", "About", "Terms & Conditions", "Privacy Policy", "Disclaimer", "FAQ", "Career", "JobDetails", "JobApplicationForm", "ResumeStudio", "TDCCareers", "MyApplications", "Booking", "Exchange", "ApplicationForm", "Payment", "Card", "DigitalBadge", "MainCharacter", "DeftPro", "FounderCircle", "SocialStack", "Social", "Messages", "MessagesScreen", "ChatDetailScreen", "UserProfile", "PostDetailScreen", "CreatePostScreen", "FeedScreen", "Notifications", "SettingsScreen", "YourAccount", "SecurityAndAccess", "PrivacyAndSafety", "HelpCenter", "EditProfileScreen", "ChangePassword", "BlockedUsers", "Terrms", "Guideline", "Events", "EventTicket", "ProfileScreen", "ProfileDetails", "MyDiscountScreen", "Explore", "Brands", "SurpriseBoxes", "Badges", "Travelling", "Rewards", "NotificationSettings", "OfferScreen"];
export const TABS = ["Home", "Explore", "Social", "Campus", "Profile"];
export const PROFILE = ["ProfileMain", "ProfileDetails", "MyDiscountScreen", "Card", "SettingScreen", "NotificationModal", "NotificationSettings", "Badges", "Rewards"];
export const SKILLSHARE = ["SkillShareGate", "ProfileWelcome", "ProfileSetup", "ProfileSuccess", "ProfessionalProfile", "DashboardMain", "BrowseListings", "CreateListing", "ListingDetail", "NotificationSkillshare", "SelectListingTypeScreen", "CreateOffer", "ManageOffers", "MyOffers", "MyListings", "MatchChat", "InquiryChat", "ChatMatch", "SkillProfile", "MyPostsByType", "MyInquiries", "MyMatches", "Activity", "SkillProfileEdit"];

const has = (list, name) => list.includes(name);

/**
 * [routeName, params] to pass to navigationRef.navigate from the root, or null if the name isn't
 * registered anywhere. A name registered in more than one place goes to the first match in this
 * order: root, drawer, tab, home stack, skillshare, profile.
 */
export function pathTo(name, params) {
  if (!name) return null;
  if (has(ROOT, name)) return [name, params];
  if (has(DRAWER, name)) return ['Drawer', { screen: name, params }];
  if (has(TABS, name)) return ['Drawer', { screen: 'HomeTabs', params: { screen: 'HomeTabs', params: { screen: name, params } } }];
  if (has(HOME_STACK, name)) return ['Drawer', { screen: 'HomeTabs', params: { screen: name, params } }];
  if (has(SKILLSHARE, name)) return ['Drawer', { screen: 'Dashboard', params: { screen: name, params } }];
  if (has(PROFILE, name)) return ['Drawer', { screen: 'Profile', params: { screen: name, params } }];
  return null;
}

/** the signed-in app (Drawer) is on screen: paths through it may be followed */
export function appIsOpen(navigationRef) {
  try {
    if (typeof navigationRef?.getRootState !== 'function') return true; // cannot tell: allow
    const root = navigationRef?.getRootState?.();
    return !!root?.routes?.some((r) => r.name === 'Drawer');
  } catch {
    return false;
  }
}

/**
 * Open a screen by name from anywhere. Paths through the signed-in app are only followed when it
 * is open (never past Splash / login). Returns true when it navigated.
 */
export function navigateAnywhere(navigationRef, name, params) {
  if (!navigationRef?.isReady?.()) return false;
  const path = pathTo(name, params);
  if (!path) {
    console.warn(`[nav] "${name}" is not a registered screen`);
    return false;
  }
  if (path[0] === 'Drawer' && !appIsOpen(navigationRef)) return false;
  navigationRef.navigate(path[0], path[1]);
  return true;
}

// ── drawer swipe ──

/** the deepest focused route of a route's nested state */
export function deepestRoute(route) {
  let r = route;
  while (r?.state?.routes?.length) {
    const s = r.state;
    r = s.routes[s.index ?? s.routes.length - 1];
  }
  return r || null;
}

/** some stack inside this route shows more than one screen (a "back" exists) */
export function stackIsDeep(route) {
  let s = route?.state;
  while (s?.routes?.length) {
    const index = s.index ?? s.routes.length - 1;
    if (s.type !== 'tab' && s.type !== 'drawer' && index > 0) return true;
    s = s.routes[index]?.state;
  }
  return false;
}

/**
 * The drawer's edge swipe is off when it would fight a back swipe: a stack with somewhere to go
 * back to, a full-screen section, or the travel chat being open.
 */
export function drawerSwipeOff(route, fullscreen = []) {
  const deepest = deepestRoute(route);
  if (deepest && fullscreen.includes(deepest.name)) return true;
  if (deepest?.params?.chatOpen) return true;
  return stackIsDeep(route);
}
