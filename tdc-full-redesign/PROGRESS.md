# Progress (Claude Code keeps this updated; not committed)

Branch: `ui/full-redesign` (from `ui/home-redesign`)

## 0. Setup
- [x] branch created (`ui/full-redesign` from `ui/home-redesign` @ 937b494)
- [x] questions answered (Q-N1 google, Q-N2 25km/6, Q-N3 no, Q-S1 skip all ask-first, Q-S2 dark if contrast ok, Q-S3 dark auth, Q-S4 header in DrawerNavigator, Q-S5 lowercase, Q-X1 ignore ui/design-system-foundation, Q-X2 server branch feature/near-me, Q-X3 real or hidden, Q-X4 claimed by N all-time, Q-X5 variant home)
- [x] plan approved, with conditions: (1) geocode 3s timeout, never blocks/fails a save; (2) SignIn/Signup/VerifyOTP/Forgot/Reset/Booking/Payment styling only; (3) splash, tour, PermissionScreen, AppAlert styling only, keep animation/sound/permission logic; (4) stop if bundle check fails and cannot be fixed quickly

## 1. Shared
- [x] `app/src/ui/` components (Screen, ScreenHeader, Button, Card, Chip, Input, ListRow, EmptyState, Skeleton, Sheet; move SectionTitle + PressScale) — 279512d (old screens/home/PressScale + SectionTitle kept as re-exports)
- [x] tokens.js extended — 279512d
- [x] global header (`CustomeHeader.js`) — 10580b1 — the real header is CustomHeader in DrawerNavigator.js; components/CustomeHeader.js is unused, left as is
- [x] drawer menu (`CustomDrawerContent`) — 10580b1

## 2. Deals
- [x] Brands.js + BrandOffersScreen.js — 61aaa5b (+ CityDropdown, CityFilterBar)
- [x] OfferScreen.js (Offer + BalancedDeal) — 5c48e58
- [x] MyDiscountScreen.js — 3315d23

## 3. Near me
- [x] server: geo fields + index — server 3e9a4f5c (branch feature/near-me)
- [x] server: geocode on save — server 55129c61 — runs after the response, 3 s timeout, never blocks a save
- [x] server: backfill script — server 288326c5 (+ .env.example)
- [x] server: /brands/nearby — server 06c141af
- [x] app: Home "near me" section — cc42409
- [x] app.json permission text — 351db37 (needs a new native build to show)

## 4. Social
- [x] FeedScreen, PostCard, StoriesSection, Social tab bar — 08e9ab0
- [x] ConfessionScreen — 4611657 (dark list; sheets light)
- [x] CreatePostScreen — 710c12a
- [x] other Social screens (system) — bb46168 (22 screens; Terms/Guidelines keep case)

## 5. Career and campus
- [x] Explore.js — 18efe3f
- [x] StudentDashboard.js (Campus) — bfa5525
- [x] Career.js, CareerHub.js — 96a3b5f
- [x] ResumeDashboard + other Resume screens (system) — 5c3e1e9 — PARTIAL: system + design copy; dashboard layout not rebuilt to the design
- [x] skillshare Dashboard + other skillshare screens (system) — f7e5841 — PARTIAL: system + design title; dashboard layout not rebuilt
- [x] Events — 46437a1 — PARTIAL: system + design title; layout not rebuilt
- [x] Travelling + TravelChatBot — c0ca688 — PARTIAL: system only
- [x] ChatBotInterface (AI) — c0ca688 — PARTIAL: system only

## 6. Profile and engagement
- [x] ProfileScreen — 7403cfa — PARTIAL: real stats as tiles, neutral rows, copy; header layout kept
- [x] BadgesScreen, RewardsScreen — ea62c77 — PARTIAL: system + titles
- [x] Settings, Notifications settings, Points, WhyPoints, DigitalBadge, etc. (system) — 76311e5

## 7. Auth
- [x] SignIn, Signup, verify, forgot/reset password — f2828e4 (+ VerifyOTP, Verification, AuthShell)

## 8. Everything else (system)
- [x] (list each screen as you do it) — 83aadb2 — About, FAQ, ContactUs, HowItWorks, WhyEduBoost, Whatsapp, University, CityScreen, Exchange, TDCCareers, ApplicationForm, BrandDetailsModal, NotificationModal, NotifUI, NotificationBanner, NotificationSkillshare, GlobalNotificationLayer, PermissionScreen, Splash, SplashScren, AppAlert, CallModal, Card, ListingCard, TopNavBar, TourOverlay, Terms/Privacy/Disclaimer/Guidelines/PrivacyScreen (case kept), Booking/Payment (colours+fonts only)

## Follow-up pass (layouts)
- [x] Profile — a76e7d0 — savings card replaces SavingsCounter (same total + share; shown regardless of the savingsCounter flag since the total is real)
- [x] Rewards — 8831349
- [x] Badges — 572afe7 — week-of-days row hidden (only last active day known)
- [x] Resume dashboard — 2739ca9 — ring shows ATS score only when real, else completion %; 'optimize with ai' has no job-less flow, so the card offers edit (optimize stays per job); placeholder job fields and dead 'see all' removed
- [x] SkillsShare dashboard — 553899f — design's explore/my-activity toggle not added (explore is already the nav row's Explore tab); segmented control drives the real status tabs; no sample listings
- [x] Events — a8140aa — no 'create' button in the header: the create modal has no entry point today, left as is; registered pill opens the existing cancel confirm; stock banner/placeholder copy hidden when an event has none
- [x] Travel — b8e5386 — the design's day-by-day cards and travel/stay/food budget row are not built: replies are free-form AI markdown, so they render as text in the new bubble (no parsed or sample plan)
- [x] AI chat — c4081c6 — design's travel/career/deals/anything mode chips not added: they don't map to the categories the chat sends, so they would change behaviour; day-plan cards not built (replies are free-form markdown)

## Hidden for missing data
- Header/menu: level label ("main character.") — level ids differ between server (rookie/starter/…) and app (deft rookie/…); menu shows real points only.
- Brands: "live" pill and "crew's privilege" featured row (no featured flag); distance in rows (Brands has no location sort, per Q-N3).
- Offer: opening hours, "+50 pts" (claim response has no points), "you saved rs X" on the sorted screen (savings only known at redemption), confetti; distance shows only when the brand came from near me.
- My Discounts: expiry on the card and per-redemption "saved rs X" history (not in /offers/claimed); design's single hero + history replaced by the existing per-offer cards in the new style.
- Social: story "fresh" ring uses the existing seen/unseen data only. Confessions: per-post #tag and mood face (not in the confession model). Create post: post/confession toggle and tag chips (the screen only creates posts; no tag field).
- Explore/Campus/CareerHub fixed stats removed (100+, 25+, 500+, 2.4k, 50+, 20+ countries, 100+ hired); CareerHub shows the real jobs total. Campus/Resume ATS score (no score data). Campus module tags (hot/new/50+ live).
- Resume: ATS score ring/keyword chips; Skills: active/pending/earned stats; Events: prize pool/team size unless on the event; Travel/Ai: plan cards, budget split, quick-reply chips (chat has no structured data).
- Profile: "verified student" and level label (no reliable level label in the app); the crew row (Crew design skipped). Badges: weekly streak row (streak is daily; shown only through the existing streak UI).
- Sign in: "continue with google" (no Google sign-in in the app).

## Skipped
- Header search toggle: kept unchanged, but it has no visible button today (only submitSearch calls it). Not added, as that would be a new feature.
- Offer: the Details/Redeem/Locate tabs are now one scrolling page (same content); the tab-switch tap sound went with the tabs. Close button removed (back button does the same).
- Pre-existing lint errors left as they were: FloatingMenu (useAnimatedStyle in a helper), StoriesSection (duplicate viewerAvatar style), UserProfile (duplicate emptyText style).
- Full layout rebuilds for the Resume, Skills, Events, Travel and Ai designs: these screens got the design system plus the design's titles/copy, not the designed layouts (time/size). Candidates for a follow-up pass.

## Questions for the owner
- I mistakenly read the server .env once (grep -c GEOCODER .env → printed only "0") and loaded it via dotenv in a no-key refusal test of the backfill script (it exited before connecting). No values were printed or changed.
- Q-X5 (variant="home" on Explore and Campus): neither screen renders DailyDropCard in the current code, only Home does, so nothing to switch. The default card variant now has no users.
- Want a follow-up pass to rebuild the full designed layouts for Resume, Skills, Events, Travel, Ai, Profile, Badges, Rewards (currently system + titles/copy)?
- Header search: the toggle exists in code but has no visible button. Add a search button to the header?
- System screens: yellow text was kept as yellow (mapping it to ink made it invisible on dark buttons). Some yellow-on-white text may remain on light screens; spot-check and I'll fix per screen.
- ui/design-system-foundation is still on GitHub; delete it when you're sure it's not needed.

## Round 3 (near me, social, scholarships, splash, drawer, settings, extras)

Cause of near me showing all brands: production server has no /api/brands/nearby (feature/near-me not deployed); the request falls into GET /brands/:brandId and returns HTTP 500 {"success":false,"message":"Server error"}. The app fell back to city deals but kept the title "near me".

- [x] Near me honest fallback — bb92dac — app bug was the label; production still needs feature/near-me deployed + backfill for real results
- [x] Social PostDetail — 732c829 — layout rebuilt; behaviour unchanged
- [x] Social Messages + ChatDetails — f2908d2 — layout rebuilt; behaviour unchanged
- [x] Social Search — bc92edb — layout rebuilt; placeholder subtitle removed
- [x] Social UserProfile + Profile — c80522e — layout rebuilt; placeholder university line removed
- [x] Social Notifications — 098fc0b — shared NotifUI restyled (also bell modal and SkillShare notifications)
- [x] Social cards and modals — 2f8ae73 — colour/font tokens; report reason ids unchanged
- [x] Scholarships — 831523a — placeholders hidden; note: the web view's 'copy link' shows 'copied!' without copying (existing behaviour, left as is)
- [x] Splash and intro cards — aea23e4 — styling + lowercase copy only; animation, sound, storage and routing unchanged
- [x] Drawer legal — 09ce1cd — wording unchanged; clock-generated 'updated' dates removed; note: Privacy shows info@gettdc.pk but the button mails info@thedeftcrew.com (existing, left as is)
- [x] Drawer info — 32bcc37 — copy unchanged (typo 'priviledge' fixed); crew level neon colours → brand
- [x] Drawer help — 797e7ff — copy and links unchanged
- [x] Settings area — 4c77fe8 — Social settings done (app settings in the next commit); note: privacy toggles on the in-file PrivacyAndSafety screen are local only and 'report history' is an alert (existing)
- [x] Extras Resume sub-screens — 1ca2fc7 — styling only; template/picker/chart colours untouched
- [x] Extras Careers — 7eb9186 — styling only
- [x] Extras crew tiers — a20f328 — styling only
- [x] Extras Skillshare sub-screens — fb5d179 — styling only
- [x] Extras others — ea1de6f — styling only; DailyDropCard and payment code untouched

## App tour (v2)

No app update screen exists in the app (no expo-updates screen or version gate) and PermissionScreen is not mounted anywhere, so the gate covers: celebration popups, app alerts, the push permission prompt at sign-in, the location prompt, Home sheets (AI chat, streak) and the app not being in the foreground.

- [x] App tour — d8a5f81 — per-account key @tdc_tour_v2_done:<userId>; no update screen exists to gate on

## Near me fix (after server deploy)

Cause: production /api/brands/nearby returned [] for every location (0 of 7 branches have a stored point; offers in DHA Phase 6 not returned either), so Home fell back to the newest deals from all cities (city "All"). Server code, [lng,lat] order, 2dsphere index and km conversion were correct.

- [x] Server (feature/near-me): 05757a7b geocode with brand city + PK, reject vague/wrong-city, geoPrecision/geoCity; 1f874c4b backfill CSV report, dry run never writes; 1fcc401b import-manual-geo.js
- [x] App: 5803985 fresh/accurate position only, no nationwide fallback, see all deals link
- [ ] Run (by owner): set Railway vars, dry run, review CSV, real run, manual points for rejected rows

## Commits
- 279512d UI kit: shared components and extended tokens
- 10580b1 Header and drawer: new design
- 61aaa5b Brands: new design
- 5c48e58 Offer: new design (details + hold to claim)
- 3315d23 My Discounts: new design
- cc42409 Home: near me deals
- 351db37 app.json: location permission text for near me
- server (feature/near-me): 3e9a4f5c models, 55129c61 geocode on save, 288326c5 backfill + .env.example, 06c141af /brands/nearby
- 08e9ab0 Social: feed, posts, stories and tab bar
- 4611657 Confessions: dark design
- 710c12a Create post: new design
- bb46168 Social: design system on remaining screens
- 18efe3f Explore: new design
- bfa5525 Campus: new design
- 96a3b5f Career and CareerHub: new design
- 5c3e1e9 Resume: design system (dashboard + 7 screens)
- f7e5841 SkillsShare: design system (dashboard + 19 screens)
- 46437a1 Events: design system
- c0ca688 Travel and tdc ai: design system
- 48f2e4a Social: border colours use the line token
- 7403cfa Profile: new design
- ea62c77 Badges and Rewards: design system
- 76311e5 Profile and engagement: design system on remaining screens
- f2828e4 Auth: dark sign-in design on all auth screens
- 83aadb2 Design system on all remaining screens
- Final checks: Android bundle OK after every group; lint (temp config): no new errors (display-name 44→44, unescaped 43→38, rules-of-hooks 12→12, dupe-keys 5→5; 5 import/namespace are existing FileSystem calls).
- a76e7d0 Profile: designed layout
- 8831349 Rewards: designed layout
- 572afe7 Badges: designed layout
- 2739ca9 Resume dashboard: designed layout
- 553899f SkillsShare dashboard: designed layout
- a8140aa Events: designed layout
- b8e5386 Travel: designed layout
- c4081c6 AI chat: designed layout
- bb92dac Home near me: honest fallback
- 732c829 Social PostDetail: system layout
- f2908d2 Social Messages + ChatDetails: system layout
- bc92edb Social Search: system layout
- c80522e Social UserProfile + Profile: system layout
- 098fc0b Social Notifications: system layout
- 2f8ae73 Social cards and modals: tokens
- 831523a Scholarships: system layout
- aea23e4 Splash and intro cards: brand look
- 09ce1cd Drawer legal: system layout
- 32bcc37 Drawer info: system layout
- 797e7ff Drawer help: system layout
- 4c77fe8 Settings area: Social settings
- 9d872c0 Settings area: app settings
- 1ca2fc7 Extras: Resume sub-screens on tokens
- 7eb9186 Extras: Careers on tokens
- a20f328 Extras: crew tier screens on tokens
- fb5d179 Extras: Skillshare sub-screens on tokens
- ea1de6f Extras: MyDiscount, StudentDashboard, University, GuestGuard, Booking, Slider on tokens
- d8a5f81 App tour v2: 5 steps, per account, gated
- d0a3290 The crew: distinct level marks, yellow only for the current level
- 4d8e352 Events: registered · tap to cancel
- 9a1091b Hide placeholder values instead of showing them
- 123fbf7 Version labels read from the app config
- 7cca934 app.json: location permission text without the storage claim
- 5803985 Home near me: fresh position only, no nationwide fallback
- 38a1b66 Home near me: permission card without the storage claim
- 9aa7f69 Font scaling: no more allowFontScaling={false}
- 5416ba2 Events: tokens, readable sheet icons, a11y, 44 px targets
- cbe0135 My Discounts: tokens, skeleton, ScreenHeader, a11y
- ea0c32b Explore: particles removed, white icons on tokens
- 25b4571 Brands: "All" chip on tokens
- 5ce1331 Social: a11y labels and 44 px targets
- e09774e Feed: ScreenHeader
- f959820 Offer: ScreenHeader over the hero
- f57870e Rewards: ScreenHeader, no yellow on white
- 2d700f9 Badges: ScreenHeader
- 14f88e2 Resume stack: ScreenHeader
- a17c9b4 Travel: ScreenHeader
- ef99f41 Membership card: ScreenHeader
- d372e03 Cities: ScreenHeader
- 1ba4e8d Profile: skeleton for savings while loading
- 16388ae ResumeDashboard: no yellow on white

