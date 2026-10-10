# Task for Claude Code: rebuild Home + tab bar in the new tdc design

You are working in the tdc student app (Expo SDK 54, React Native, React Navigation, @tanstack/react-query). The owner wants the **Home screen and the bottom tab bar** restyled to the approved design. **This is a frontend UI/UX job only.** The owner has asked that nothing be assumed or changed beyond what is written here.

Read these first, in this order: `HOME_SPEC.md`, `TAB_BAR_SPEC.md`, `FONTS.md`, `reference/home-design.html` (the approved design as HTML with exact pixel values; any `[bracketed]` text or numbers in it are placeholders, never ship them). Images in `reference/` are screenshots of the same design, if present.

---

## 1. Hard rules (never break these)

1. **Frontend UI only.** Do not change backend code, the admin panel, any server, any endpoint, request or response shape.
2. **Do not edit** (except the one exception in rule 4) anything in `app/src/api/` (`api.js`, `brandApi.js`, `engagementApi.js`, ...), `app/src/context/` (AuthContext etc.), `app/src/engagement/hooks/`, `app/src/engagement/engagementApi*`, `app/src/utils/pushNotifications.js`, `app/src/navigation/HomeStack.js`, `DrawerNavigator.js`, `navigationRef.js`, or any other screen. Read them as much as you like; call their existing exports as they are.
3. **Never open, print, change, move or commit** `credentials.json`, `google-services.json`, `eas.json`, `credentials/`, any `*.jks`, `*.keystore`, `.env*`. Do not change `app.json` except if FONTS.md requires it (it doesn't).
4. **Only these files may change** without asking:
   - `app/src/screens/Home.js`
   - `app/src/navigation/TabNavigator.js` (the `CustomTabBar` visuals only)
   - `App.js` (only to load fonts, exactly as in FONTS.md)
   - `package.json` / `package-lock.json` (only via `npx expo install` of the two font packages)
   - `app/src/engagement/components/DailyDropCard.js`: **only** to add an opt-in `variant` prop (`<DailyDropCard variant="home" />`) that switches to the new styles. With no prop it must render exactly as today, because `Explore.js` and `StudentDashboard.js` also use it. No changes to its data, voting, celebration or navigation logic.
   - new files you create under `app/src/screens/home/` (sub-components for Home) and `app/src/theme/tokens.js` (colours/type constants)
   - Do **not** edit `FeatureDot.js` (Explore uses it too). Position it from Home instead.
   - If you believe any other file must change, **stop and ask**, saying which file, which lines and why.
5. **No fake data.** Every number shown must come from existing data. If the data isn't there, hide that element. Never hard-code counts, percentages, names, "online now" numbers or savings.
6. **No new API calls to endpoints that don't already exist in the app.** Reuse the exact functions listed in HOME_SPEC.md section 3.
7. **Keep all existing behaviour:** pull to refresh, the guest mode checks, the tour targets (`registerTarget` refs for `tab_home`, `tab_explore`, `tab_campus`, `tab_social`), `HIDE_TAB_BAR_SCREENS`, `TAB_HEIGHT`, the tab bar hiding on Social, deep links, `handleFeaturePress` routes, the ChatBot modal, `StreakSheet`, the celebration/points flows triggered by `DailyDropCard`.
8. **Git:** first `git status` must be clean and on `main`. Create branch `ui/home-redesign`. **Do not commit, push, open PRs, or run `eas build` / `eas submit` / `eas update`** unless the owner explicitly says so in the chat.
9. Don't delete components such as `MissionStack`; just stop rendering them on Home (others may use them). Don't delete assets.
10. When unsure, **ask**. Do not guess.

---

## 2. Scope

In scope:
- Home screen body (`app/src/screens/Home.js`): new section order, styles, copy, fonts.
- Bottom tab bar look (`CustomTabBar` in `TabNavigator.js`).
- Loading Outfit + DM Sans fonts in `App.js`.

Out of scope (do not touch):
- The global top header (tdc logo, coins, bell, menu). It lives in the Drawer navigator and is shared by other screens. **Unless the owner says otherwise in answer to question Q1 below.**
- Every other screen (Brands, OfferScreen, Social, Explore, Campus, Profile, etc.), the deal/claim screen, the drawer, onboarding, notifications.
- Backend, admin, API, push notification schedule.

---

## 3. Steps

1. Run `git status` and `git branch --show-current`. If not clean or not on `main`, stop and tell the owner.
2. Read the spec files and the current code: `app/src/screens/Home.js`, `app/src/navigation/TabNavigator.js`, `App.js`, `app/src/engagement/components/DailyDropCard.js`, `FeatureDot.js`, `app/src/engagement/hooks/useDailyDrop.js`, `useMissions.js`, `useStreak.js`, `useEngagement.js`, `app/src/engagement/utils/mood.js`, `app/src/api/brandApi.js` (`optimizedAPI.getBrandsFast`), `app/src/screens/Social/ConfessionScreen.js` (how it fetches `/confessions/feed`), `app/src/screens/Social/FeedScreen.js` (the `postId` / `tab` params), `app/src/screens/Social/Social.js` (`fetchUnreadCount` from `/inbox`).
3. **Ask the owner the open questions in section 4** in one message. Wait for answers.
4. **Write a plan** and send it to the owner: the list of files you'll change or create, what changes in each, which existing data feeds each section, and anything in the spec you could not map to existing data. **Wait for "approved".**
5. Create the branch `ui/home-redesign`.
6. Install fonts as in FONTS.md (`npx expo install ...`). If the install fails (network), stop and tell the owner; don't hand-copy font files from the internet.
7. Build Home in small sub-components under `app/src/screens/home/` (e.g. `HomeHello.js`, `HomeDrop.js`, `HomeCampus.js`, `HomeTools.js`, `HomeDeals.js`, `AiFab.js`) plus `app/src/theme/tokens.js`. Keep `Home.js` as the screen that wires data and order.
8. Restyle the tab bar per TAB_BAR_SPEC.md.
9. Check your work:
   - `npx expo start` must bundle without red screens or new warnings you introduced.
   - Run the project's linter if present (`npx eslint app/src/screens/Home.js app/src/screens/home app/src/navigation/TabNavigator.js`) and fix only what you introduced.
   - Walk through the states in HOME_SPEC.md section 5 (loading, guest, no drop, voted, no confessions, no deals, all sorted, small phone, large font size).
   - `git diff --stat` must list only allowed files. Paste it to the owner.
10. Report to the owner: what changed, the `git diff --stat`, anything you hid because the data doesn't exist, and how to test. **Do not commit** until the owner says so; when they do, commit on `ui/home-redesign` only.

---

## 4. Open questions to ask the owner BEFORE planning

Ask these in one message, numbered, with the default in brackets. Do not proceed on a default without an answer.

- **Q1. Top header.** The design shows a header with the tdc logo, a points pill and a bell. The app already has a global header (logo, coins, bell, menu) from the drawer, shared by other screens. Keep the existing global header unchanged and start Home's content below it? [default: yes, keep it unchanged]
- **Q2. Social tab badge.** The design shows a yellow count badge on the centre social button. The only real number available is unread messages, from the same `/inbox` call `Social.js` already makes. Show that count on the badge (hidden when 0), or no badge at all? [default: no badge, to avoid adding an extra request on every screen]
- **Q3. Streak line.** The design says "week 4 streak". The existing streak (`useStreak` → `count`) may be counted in days, not weeks. After reading `useStreak.js`/`/engagement/me`, tell the owner which unit it is and confirm the text, e.g. "[count]-day streak", hidden when the count is 0 or the streak flag is off. [default: use the real unit, hide at 0]
- **Q4. Confession on Home.** The design shows "confession of the day" with same/lol/nope reactions. The backend has no "of the day" pick and only supports like. Plan: show the **latest** confession from the existing `/confessions/feed` (label "latest confession · anonymous"), with the existing like count and comment count as read-only stats, and the whole card opens it in the feed. No same/lol/nope buttons. OK? [default: yes]
- **Q5. Deals for guests.** For signed-out guests, hide the "deals near you" rail, or show it using whatever the Brands screen already uses for guests? [default: hide for guests]
- **Q6. Deals order.** Show the first 6 brands that have an offer, in the order the API returns them (newest first), or sorted by biggest discount? [default: API order]
- **Q7. Savings line.** "rs [X] saved" next to "see all" uses `me.stats.totalSaved` (same source as `SavingsCounter`), hidden when 0. OK? [default: yes]
- **Q8. Headline by time of day.** The headline and greeting change with the time of day (morning / afternoon / night, see HOME_SPEC 2.2). This is frontend-only copy. OK? [default: yes]

Also ask anything else you find unclear while reading the code.
