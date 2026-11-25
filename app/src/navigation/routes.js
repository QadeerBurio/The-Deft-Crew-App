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
export const HOME_STACK = ["HomeTabs", "University", "ContactUs", "Home", "BrandOffers", "Points", "WhyPoints", "How It Works", "About", "Terms & Conditions", "Privacy Policy", "Disclaimer", "FAQ", "Career", "JobDetails", "JobApplicationForm", "ResumeStudio", "TDCCareers", "MyApplications", "Booking", "Exchange", "ApplicationForm", "Payment", "Card", "DigitalBadge", "MainCharacter", "DeftPro", "FounderCircle", "SocialStack", "Social", "Messages", "MessagesScreen", "ChatDetailScreen", "UserProfile", "PostDetailScreen", "CreatePostScreen", "FeedScreen", "Notifications", "SocialNotifications", "SettingsScreen", "YourAccount", "SecurityAndAccess", "PrivacyAndSafety", "HelpCenter", "EditProfileScreen", "ChangePassword", "BlockedUsers", "Terrms", "Guideline", "Events", "EventTicket", "ProfileScreen", "ProfileDetails", "MyDiscountScreen", "Explore", "Brands", "SurpriseBoxes", "Badges", "Travelling", "Rewards", "NotificationSettings", "OfferScreen", "AmbassadorIntro", "AmbassadorApply", "AmbassadorHub"];
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

/**
 * Q-a (plan Q-2 rule 2): where "back" leads from every screen when there is nothing behind it (opened from a push,
 * a link or a banner). Data only: nothing reads it yet (Q-2 wires it into the back handling), so today's behaviour is
 * unchanged. One entry per navigator, as registered (tests/app/back-navigation.test.js checks every registered screen
 * has one, and that every chain ends at a start screen or a tab without loops):
 *   start   the navigator's first screens (nothing to go back to inside it)
 *   tabs    a tab bar / drawer: Android back on a non-Home tab goes Home, on Home it leaves the app (standard)
 *   parent  screen → its parent: a screen of the same navigator, or any name pathTo() can open
 * The home stack and the profile stack share some names (ProfileDetails, MyDiscountScreen, Card, Badges, Rewards,
 * NotificationSettings); pathTo opens the home-stack one, so its entry is the one that counts for pushes.
 */
export const BACK = {
  ROOT: {
    start: ["Splash", "Drawer", "Login"],
    parent: { CommunityGuidelines: "SettingsScreen", Signup: "Login", SignupVerify: "Signup", ForgotPassword: "Login", VerifyOTP: "ForgotPassword", ResetPassword: "Login", LegalTerms: "Signup", LegalPrivacy: "Signup", Resume: "Campus" },
  },
  DRAWER: { tabs: true },
  TABS: { tabs: true },
  HOME_STACK: {
    start: ["HomeTabs"],
    parent: {
      Home: "HomeTabs", Explore: "HomeTabs", Social: "HomeTabs",
      University: "Home", ContactUs: "Home", Points: "Home", WhyPoints: "Points", "How It Works": "Home", About: "Home",
      "Terms & Conditions": "About", "Privacy Policy": "About", Disclaimer: "About", FAQ: "Home", Notifications: "Home",
      MainCharacter: "Home", DeftPro: "Home", FounderCircle: "Home",
      Career: "Campus", JobDetails: "Career", JobApplicationForm: "JobDetails", TDCCareers: "Career", MyApplications: "Career",
      ResumeStudio: "Resume", Exchange: "Campus", ApplicationForm: "Exchange",
      Brands: "Explore", OfferScreen: "Brands", BrandOffers: "Brands", SurpriseBoxes: "Home",
      Events: "Explore", EventTicket: "Events", Travelling: "Explore", Booking: "Travelling", Payment: "Booking",
      AmbassadorIntro: "Points", AmbassadorApply: "AmbassadorIntro", AmbassadorHub: "Profile",
      SocialStack: "Social", Messages: "Social", MessagesScreen: "Social", ChatDetailScreen: "MessagesScreen", UserProfile: "Social",
      FeedScreen: "Social", PostDetailScreen: "FeedScreen", CreatePostScreen: "FeedScreen", SocialNotifications: "Social",
      SettingsScreen: "Profile", YourAccount: "SettingsScreen", SecurityAndAccess: "SettingsScreen", PrivacyAndSafety: "SettingsScreen",
      HelpCenter: "SettingsScreen", EditProfileScreen: "Profile", ChangePassword: "SecurityAndAccess", BlockedUsers: "PrivacyAndSafety",
      Terrms: "SettingsScreen", Guideline: "SettingsScreen", NotificationSettings: "SettingsScreen",
      ProfileScreen: "Profile", ProfileDetails: "Profile", MyDiscountScreen: "Profile", Card: "Profile", DigitalBadge: "Card",
      Badges: "Profile", Rewards: "Profile",
    },
  },
  PROFILE: {
    start: ["ProfileMain"],
    parent: { ProfileDetails: "ProfileMain", MyDiscountScreen: "ProfileMain", Card: "ProfileMain", SettingScreen: "ProfileMain", NotificationModal: "ProfileMain", NotificationSettings: "SettingScreen", Badges: "ProfileMain", Rewards: "ProfileMain" },
  },
  SKILLSHARE: {
    start: ["SkillShareGate"],
    parent: {
      DashboardMain: "Campus", ProfileWelcome: "SkillShareGate", ProfileSetup: "ProfileWelcome", ProfileSuccess: "DashboardMain", ProfessionalProfile: "DashboardMain",
      BrowseListings: "DashboardMain", ListingDetail: "BrowseListings", SelectListingTypeScreen: "DashboardMain", CreateListing: "SelectListingTypeScreen",
      CreateOffer: "ListingDetail", MyListings: "DashboardMain", ManageOffers: "MyListings", MyPostsByType: "MyListings", MyOffers: "DashboardMain",
      MyInquiries: "DashboardMain", InquiryChat: "MyInquiries", MyMatches: "DashboardMain", MatchChat: "MyMatches", ChatMatch: "MyMatches",
      SkillProfile: "DashboardMain", SkillProfileEdit: "SkillProfile", NotificationSkillshare: "DashboardMain", Activity: "DashboardMain",
    },
  },
  // the Home tab's own stack (navigation/HomeStack.js)
  HOME_TAB: {
    start: ["HomeStackMain"],
    parent: { Brands: "HomeStackMain", BrandOffers: "Brands", OfferScreen: "Brands", SurpriseBoxes: "HomeStackMain", ContactUs: "HomeStackMain", Resume: "HomeStackMain", University: "HomeStackMain", Slider: "HomeStackMain", Card: "HomeStackMain", Booking: "HomeStackMain", Payment: "Booking", EditProfileScreen: "HomeStackMain", ChatHistory: "HomeStackMain", Social: "HomeStackMain" },
  },
  // the resume section (navigation/ResumeNavigator.js)
  RESUME: {
    start: ["ResumeDashboard"],
    parent: { ResumeStart: "ResumeDashboard", ResumeImportReview: "ResumeStart", ResumeBuilder: "ResumeDashboard", ResumeCoachChat: "ResumeBuilder", ResumeView: "ResumeDashboard", ResumeFinish: "ResumeDashboard", ResumeFeedback: "ResumeFinish", ResumeWriter: "ResumeDashboard", ResumeTemplate: "ResumeDashboard", ResumeShare: "ResumeDashboard", ResumeAnalytics: "ResumeDashboard", ResumeSettings: "ResumeDashboard", ResumeStudio: "ResumeDashboard" },
  },
  // the social section's stack (DrawerNavigator SocialStackNavigator) and its tabs (screens/Social/Social.js)
  SOCIAL_STACK: {
    start: ["Social"],
    parent: { Messages: "Social", MessagesScreen: "Social", ChatDetailScreen: "MessagesScreen", UserProfile: "Social", FeedScreen: "Social", PostDetailScreen: "FeedScreen", CreatePostScreen: "FeedScreen", Notifications: "Social", SocialNotifications: "Social", SettingsScreen: "Social", YourAccount: "SettingsScreen", SecurityAndAccess: "SettingsScreen", PrivacyAndSafety: "SettingsScreen", HelpCenter: "SettingsScreen", EditProfileScreen: "SettingsScreen", ChangePassword: "SecurityAndAccess", BlockedUsers: "PrivacyAndSafety", Terrms: "SettingsScreen", Guideline: "SettingsScreen" },
  },
  SOCIAL_TABS: { tabs: true },
};

/** the screen "back" leads to from `name` in navigator `nav` (a BACK key) when nothing is behind it; null = start / tab */
export function backParent(nav, name) {
  const entry = BACK[nav];
  if (!entry || entry.tabs) return null;
  return entry.parent?.[name] ?? null;
}
