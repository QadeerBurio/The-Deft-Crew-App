# Screen map: which design goes on which file

Designs live in `designs/`. They are canvas template files (`{{values}}`, `sc-for`, `dc-import`): read them as a spec. Every size, colour and gap is inline in px (1 px = 1 dp). `[bracketed]` text and sample numbers are placeholders, never ship them.

**Precedence:** where a screen design conflicts with Home (`designs/home-final/Balanced.dc.html`), Home wins. Home was approved last, so it sets the final style: light paper background, white cards, 1 px borders, lowercase voice, yellow only for actions and rewards, no glow, no loud colour blocks.

## A. Screens with a design (match the design)

| Design file | App file(s) | Notes |
|---|---|---|
| `home-final/BalancedDeal.dc.html` | `screens/OfferScreen.js` (claim flow) | hold-to-claim button, then the yellow "sorted." screen with the savings count-up. Keep the existing claim API call, sounds and haptics. The "38 students claimed today" fact: show only if the offer data has a real claim count; otherwise hide that fact tile. |
| `screens/Offer.dc.html` | `screens/OfferScreen.js` (details, how to redeem) | combine with BalancedDeal: details and steps from Offer, claim button and sorted moment from BalancedDeal. Keep branch selection, city filter, map button, saved state. |
| `screens/Brands.dc.html` | `screens/Brands.js`, `screens/BrandOffersScreen.js` | keep city filter, category chips, discount chips, online/in-store filter, paging, cache and claim sync. |
| `screens/MyDiscounts.dc.html` | `screens/MyDiscountScreen.js` | |
| `screens/Social.dc.html` | `screens/Social/FeedScreen.js`, `PostCard.js`, `StoriesSection.js`, `Social.js` (its internal tab bar) | keep every feed feature (likes, comments, share, report, block, stories, polling). |
| `screens/Confessions.dc.html` | `screens/Social/ConfessionScreen.js` | dark design: keep it dark only if it passes contrast; keep pinned post + highlight from Daily Drop. |
| `screens/CreatePost.dc.html` | `screens/Social/CreatePostScreen.js` | |
| `screens/Explore.dc.html` | `screens/Explore.js` | Explore also shows `DailyDropCard` (default variant). You may switch it to `variant="home"` here for consistency. |
| `screens/Campus.dc.html` | `screens/StudentDashboard.js` (the Campus tab) | same note on `DailyDropCard`. |
| `screens/Profile.dc.html` | `screens/ProfileScreen.js` | keep `SavingsCounter`, settings links, logout. |
| `screens/Career.dc.html` | `components/Career.js` | keep bookmarks, filters, map link, apply flow. |
| `screens/CareerHub.dc.html` | `components/CareerHub.js` | |
| `screens/Resume.dc.html` | `screens/Resume/ResumeDashboard.js` | other Resume screens: system only (part B). |
| `screens/Skills.dc.html` | `screens/skillshare/Dashboard.js` | other skillshare screens: system only. |
| `screens/Events.dc.html` | `screens/Events/Events.js` | |
| `screens/Travel.dc.html` | `components/TravellingScreen.js`, `components/TravelChatBot.js` | |
| `screens/Ai.dc.html` | `screens/ChatBotInterface.js` | keep the chat logic and history. |
| `screens/Badges.dc.html` | `engagement/screens/BadgesScreen.js` | |
| `screens/Rewards.dc.html` | `engagement/screens/RewardsScreen.js` | |
| `screens/Menu.dc.html` | `CustomDrawerContent` in `navigation/DrawerNavigator.js` | visuals only; keep every menu item and route. |
| `screens/SignIn.dc.html` | `screens/SignIn.js`; apply the same look to `SignupScreen.js`, `SignupVerifyScreen.js`, `ForgotPassword.js`, `ResetPasswordScreen.js`, `VerifyOTPScreen.js`, `VerificationScreen.js` | keep all auth logic, validation and error messages. |
| `home-final/Balanced.dc.html` (header part) | `components/CustomeHeader.js` (global header) | logo, points pill (white, 1 px border, yellow dot + real points), bell with yellow dot only when there are unread notifications, menu button. Keep all existing actions. |

Home, the tab bar and the slider are **already done** on `ui/home-redesign`. Don't redo them. Only change Home's "fresh deals" section to "near me" (see NEAR_ME_SPEC.md).

## B. Screens without a design (apply the system)
Every other screen in `app/src/screens/`, `app/src/components/` (the ones that render a screen, modal or sheet) and `app/src/engagement/` gets the design system from DESIGN_SYSTEM.md: colours, fonts, header, buttons, inputs, cards, chips, empty/loading states. **Layout and content stay as they are.** Examples: all Resume screens except the dashboard, all skillshare screens except the dashboard, Social settings/account/privacy screens, Messages, ChatDetails, PostDetail, UserProfile, Notifications, Settings, About, FAQ, Terms, Privacy, ContactUs, Booking, Payment, University, CityScreen, Points, WhyPoints, DigitalBadge, DeftPro, DeftGoat, FounderCircle, MainCharacter, Exchange (scholarships), TDCCareers, ApplicationForm, NotificationSettings, BrandDetailsModal, NotificationModal, PermissionScreen.

## C. Ask the owner before using (in `designs/ask-first/`)
These were explorations; the owner must say which ones are approved and where they go:
- `Hub.dc.html` (hub deals), `Wall.dc.html` (the wall), `Crew.dc.html` (the crew), `Discover.dc.html` (discover): no matching app screen. Probably not approved.
- `Onboard.dc.html` (first run): is it for `screens/SplashScren.js` (TDCFlow) / `PermissionScreen.js`?
- `Deal.dc.html`, `Claimed.dc.html`, `Sorted.dc.html`: older versions of the claim flow, replaced by `BalancedDeal.dc.html`. Default: don't use.

## D. Never use
`HomeFun`, `HomeV2`, `Main`, `Glow*`, `BrandsFun`, `Wow` were rejected directions and are not included.
`designs/reference/` holds shared parts (`Dot`, `Nav`, `Photo`), the brand kit and the behaviour playbook: read for rules, don't build them as screens.
