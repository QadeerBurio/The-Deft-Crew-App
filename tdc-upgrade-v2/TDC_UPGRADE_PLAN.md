# tdc upgrade v2: audit + full upgrade plan

**For:** the developer (or Claude Code) working on `The-Deft-Crew-App`, `tdc_admin_portal` and the tdc server.
**Written:** 21 Nov 2026, from the code in `The-Deft-Crew-App-main` (Expo 54 / RN 0.81, app v1.1.13), `tdc_admin_portal-main` (CRA admin) and the competitor screenshots (Kickresume, Posheeda).
**Goal:** one big, smooth upgrade, not a daily revamp. No bugs, no half-research, nothing that breaks the live app.

> **Status: final, with the owner's decisions in section 12.**
>
> Read sections 1 to 3 before writing any code. Sections 4 to 9 are the work, in order. Section 10 is the release plan. Section 12 lists the questions the owner answers first.

---

## 0. What was read, and what was not

| Source | Status |
|---|---|
| Mobile app (`app/src`, 571 files) | read: navigation, crew (`components/Points.js`), ambassador (`components/AmbassadorForm.js`), confessions (`screens/Social/ConfessionScreen.js`), resume (`screens/Resume/*`, `context/ResumeContext.js`, `api/resumeApi.js`, `api/resumeStudioApi.js`, `services/templateService.js`, `utils/resumeRules.js`), referrals (`engagement/*`), deep links (`App.js`), tokens, existing handoff docs (`tdc-full-redesign/*`, `tdc-ui-handoff/*`), tests |
| Admin portal (`src/screens`, `src/services`) | read: crew pages (Inbox, Partners, Campaigns, Credentials), `Ambassador.js`, `AdminFeatures.js` (feature flags), `DropsSchedule.js` |
| **Server repo** | read: `QadeerBurio/the-deft-crew` (`main` @ e3382bd, 20 Nov 2026), the repo Railway production deploys from (service `the-deft-crew`, project `endearing-bravery`). Models `Confession`, `Report`, `PartnerApplication`, `ReferralClick`, `Resume`, `User`; routes `social.routes.js` (confessions), `adminCrew.routes.js`, `engagement.routes.js` (referrals, popups), `auth.routes.js` (signup referral), `resume.routes.js`; `utils/profanity.js`, `utils/userRateLimit.js`, `utils/resumeRules.js`. Railway was only read (service config, variable *names*); nothing was changed and no secret values were opened. |
| `Social-Dashboard-main` | a small generic React + Express posts demo (2 models: Post, User). Nothing in the app or admin calls it. **Treat it as unrelated and don't build on it** (confirmed: not deployed on Railway). |

The app already has a strong base: design tokens, a `ui/` kit, guest mode, engagement (streaks, missions, badges, daily drops, celebrations, sounds, haptics), feature flags (`/app/flags/me` + admin `AdminFeatures`), OTA updates, and a test suite. **This upgrade builds on all of it. Nothing gets rewritten from scratch.**

---

## 1. Hard rules (same spirit as `tdc-full-redesign/CLAUDE_TASK_FULL.md`)

1. **Additive only.** New fields, new routes and new screens are fine. Never rename or remove an existing route, field, response shape, navigation route name/param, deep link, push target, analytics event, sound, haptic or tour target.
2. **Every new feature sits behind a flag** in the existing flags system (`api/appFlags.js` ↔ server `GET /api/app/flags/me` ↔ admin `AdminFeatures`). Default **off** in production, on for test accounts. Turning a flag off returns the exact old behaviour.
3. **Old app versions keep working.** Students on v1.1.13 keep calling today's endpoints. New server fields are optional, with defaults. Old clients that don't send them still pass validation.
4. **Shared rules stay identical.** `utils/resumeRules.js` is shared byte-for-byte with the server, and a test checks this. Change both in the same PR.
5. **No fake data.** Show a real number or hide the element (this rule already runs through `PROGRESS.md`).
6. **Never open, print or commit** `.env*`, `google-services.json`, `credentials.json`, `eas.json`, `*.jks`, `*.keystore`. **Note:** the zips contain `google-services.json` and `Social-Dashboard/backend/.env`. Don't share those zips further. If that `.env` holds real keys, rotate them.
7. **Staging first.** Point the app and admin at staging with `EXPO_PUBLIC_API_URL` / `REACT_APP_API_URL` (already supported) and test there before production.
8. **Git:** one branch per phase (`upgrade/p0-safety`, `upgrade/p1-growth`, …), small commits per screen, server changes in their own commits. Don't push to main, deploy or `eas update` without owner sign-off.
9. **OTA vs store build.** JS-only changes can ship by `eas update` (runtimeVersion = appVersion). Anything that adds a native module (e.g. the install referrer library, P1-3) needs a **new store build** and a version bump. Group native changes into one build.
10. **Lowercase voice, tokens, `ui/` components, real data**, as in `DESIGN_SYSTEM.md`. No new design language.
11. **Packages:** most of what's needed is already installed (`react-native-view-shot`, `expo-sharing`, `expo-print`, `react-native-qrcode-svg`, `lottie-react-native`, `expo-haptics`, `@tanstack/react-query`). Approved new packages: `react-native-google-play-install-referrer`, `@sentry/react-native`, `expo-store-review`. Ask before adding anything else.

---

## 2. Audit of the live system

Severity: 🔴 hurts users or growth now · 🟠 risk / weak spot · 🟡 polish.

### 2.0 Security (fix this week, before any feature work)
| # | Finding | Evidence | Fix |
|---|---|---|---|
| S1 🔴 | **The server repo is public on GitHub.** Anyone can read the whole backend: auth, admin routes, rate limits, business logic. No `.env` is committed (checked: only `.env.example`; the only connection string found is a fake one in a test), but public code makes every weak spot easy to find. | `github.com/QadeerBurio/the-deft-crew` is readable without login | owner: make it **private** today, then check the GitHub "secret scanning" tab and git history for any key ever committed; rotate if found |
| S2 🟠 | Confession routes have **no rate limit**. The per-user limiter exists (`utils/userRateLimit.js`) but is only used on analytics and resume PDF. | `routes/social.routes.js` | P4-1 |
| S3 🟠 | `GET /confessions/likes/:id` returns the **names and photos of everyone who liked** an anonymous confession. The app doesn't call it today, but anyone with a token can. | `social.routes.js` ~L1532 | P4-1: limit to the author's own posts or return a count only |
| S4 🟡 | Two confession routes are **defined twice** (`/confessions/my-confessions` at ~L1413 and ~L1509, `/confessions/likes/:id` at ~L1426 and ~L1532). Express runs the first and ignores the second, so a fix made in the second copy silently does nothing. | `social.routes.js` | P4-6: delete the dead copies (separate commit) |

### 2.1 Growth and referrals
| # | Finding | Evidence | Fix (phase) |
|---|---|---|---|
| A1 🔴 | **Referral links lose the code.** "share my code" sends a store link with `utm_campaign=<code>`, but the app never reads the Play install referrer, and `ExternalDeepLink` has no `invite`/`ref` route. Signup only gets `route.params.ref`, and nothing navigates there with it. The new student has to type the code by hand, so most referrals go uncounted. | `components/Points.js` ~L796–819, `App.js` `ExternalDeepLink` (~L287), `screens/SignupScreen.js` L313 | P1-1 to P1-3 |
| A2 🟠 | iOS has no install referrer, so the code can't survive the App Store. | platform limit | P1-2 (landing page + "paste code" button) |
| A2b 🟡 | A `ReferralClick` model already exists on the server (code, referrer, channel `ig/wa/tt/copy/direct`) but **nothing writes to it**, so there's no data on which channel works. | server `models/ReferralClick.js` (only referenced by account deletion) | P1-2 logs every `/i/:code` open into it |
| A3 🟠 | The referral leaderboard API exists (server `GET /engagement/referrals/leaderboard`) but no screen uses it. | `engagement/api/engagementApi.js` L122 `getReferralLeaderboard` | P1-4 |
| A4 🟡 | The share text is plain. There's no visual share card, even though `react-native-view-shot` is installed. | Points.js share | P1-5 |

### 2.2 Crew / ambassador
| # | Finding | Evidence | Fix |
|---|---|---|---|
| B1 🔴 | **Ambassador applications go to a Google Form.** The server has a `PartnerApplication` model (user, university, why, handle, status, reviewNote) and an admin review route, but **no route lets a student create one**. Crew Inbox's applications list is therefore always empty. | app `components/Points.js` L58; server `models/PartnerApplication.js`, `routes/adminCrew.routes.js` L267 (review only) | P2-3 |
| B2 🟠 | "Applied" is stored only on the phone (`@tdc_ambassador_applied:<id>`). A new phone or reinstall shows "join" again. Approved or rejected is never shown. | Points.js L62, L693–717 | P2-3 |
| B3 🟠 | A third ambassador path exists: the web `/ambassador` page opens a mailto to `hr@gettdc.pk`. That makes three intake paths and no single source of truth. | admin `screens/Ambassador.js` header | P2-3 |
| B4 🟠 | The program is buried: "the crew" is a drawer item (route `Points`), and the ambassador button sits low on that screen. Nothing ever *invites* a student. | `navigation/DrawerNavigator.js` L282 | P2-1, P2-2 |
| B5 🟡 | Level data is copied in the app ("mirrors config/badges.config.js"). If the server changes perks, the app drifts. | Points.js L65 | P2-4 (read perks from server if available, else the current constant) |
| B6 🟡 | Level ids differ between server and app (`rookie/starter…` vs display names), so the level label was hidden. | `PROGRESS.md` "Hidden for missing data" | P2-4 |

### 2.3 Confessions
| # | Finding | Evidence | Fix |
|---|---|---|---|
| C1 🔴 | **No report or block on confessions.** The server's `Report` model already allows `contentType: 'Confession'`, but there is no confession report route and no button in the app. This is the #1 risk for an anonymous feature (Yik Yak shut down over bullying; campus bans followed). | app `ConfessionScreen.js`; server `models/Report.js` | P4-1 |
| C1b 🔴 | **Reports go nowhere, for the whole social area.** Post, comment and user reports are saved (`social.routes.js` L55, L114, L171), but no admin route or page ever reads the `Report` collection. Nobody sees a single report. | server: `Report` is only used in `social.routes.js` (create/dedupe) and account deletion | P4-7 (one queue for posts, comments, users and confessions) |
| C2 🔴 | **No check before posting, confirmed.** `POST /confessions/create` saves text and image as they are. The server already has the building blocks: `utils/profanity.js` (English + Roman Urdu, used for career ratings) and an OpenAI key. OpenAI's moderation endpoint (text + images) is free. | `social.routes.js` ~L1867 | P4-1 |
| C3 🟠 | A student can't delete their own confession. The **server route already exists** (`DELETE /confessions/:id`, author only); only the app button is missing. The author list exists too (`GET /confessions/my-confessions`, used by Social `ProfileScreen`). | app `ConfessionScreen.js`; server ~L1482 | P4-1 (app-only) |
| C4 🟠 | No admin moderation queue for confessions. Admin only reads `/social/confessions/feed` for daily drops. | admin `DropsSchedule.js` | P4-7 |
| C5 🟠 | Everyone is "anon.", so there's no identity, no streak and no reason to come back as "someone". Tags and moods were designed but hidden because the model has no field for them. | ConfessionScreen.js L1000, PROGRESS.md | P4-2, P4-3 |
| C6 🟡 | No sort (hot/new/top), no save, no follow-thread, no share card, no polls, no composer prompts. 1,742 lines in one file. | ConfessionScreen.js | P4-3 to P4-6 |

### 2.4 Resume
| # | Finding | Evidence | Fix |
|---|---|---|---|
| D1 🔴 | **Penalises students with no experience.** Experience is worth 20/100 in `resumeStrength`, so a fresher with perfect education, projects and skills tops out around 80 and is told to "add an internship". That is the exact user tdc serves. | `utils/resumeRules.js` L52–59 | P3-2 |
| D2 🟠 | **No sections for what freshers do have:** leadership/societies, volunteering, awards, coursework, languages (the model has `languages` but the builder has no UI for it), top-level achievements (the model has them, no UI). | ResumeBuilder steps L359–366 | P3-3 |
| D3 🟠 | **Weak autofill.** A new resume only fills first/last name from `user.name`. It ignores the email, phone, university, city and skills tdc already knows (account + professional profile). | `context/ResumeContext.js` L223 | P3-1 |
| D4 🟠 | Blank text boxes ("describe your responsibilities…") are where Gen-Z drops off. AI "enhance" only polishes text that's already written. | ResumeBuilder L1283–1292 | P3-4 |
| D5 🟡 | 5 templates, no colour or heading options in the picker (Kickresume shows 40+, colours, caps). | `services/templateService.js` TEMPLATES, `ResumeTemplate.js` | P3-6 |
| D6 🟡 | 2,583-line `ResumeBuilder.js`. Adding steps in the same file raises regression risk. | — | P3 (new steps as separate components) |
| ✅ | **Already strong, keep it:** upload + parse + import review, AI Resume Studio (truthful tailoring with "this is true" confirmations, versions), check-fit, analytics, share, ATS-safe single-column renderer, Urdu font handling, offline drafts. | — | — |

### 2.5a Notifications (push + in-app)
What works well, so keep it:
- Expo push across two EAS projects with dead-token cleanup and receipts (`utils/pushNotification.js`).
- Per-sound Android channels and mood icons matching the in-app banner.
- The engagement push gateway caps marketing at one push a day plus a weekly cap, with Karachi quiet hours (`services/engagement/pushGateway.js`).
- Confession pushes carry no text, author or university.
- 9 per-category switches in Notification Settings (`notifPrefs`: streaks, daily drop, deals, jobs & scholarships, social, posts, confessions, skillshare, loyalty).

| # | Finding | Evidence | Fix |
|---|---|---|---|
| N1 🔴 | **Social pushes fire for every new post, confession and listing, to every student** (confessions: every student at that university). They come on top of the engagement cap: a separate budget of up to **10 social pushes a day** (default), and with `SOCIAL_PUSH_GROUP_MINUTES` at its default 0, each item pushes immediately. As the app grows, this becomes the fastest route to "turn off notifications" or an uninstall. | server `services/socialPush.js` header + L159–207 | N-1 |
| N2 🔴 | **No overall cap across senders.** About 20 server files send pushes (engagement gateway, social push, career, chat, loyalty, events, surplus…), each with its own rules or none. On a busy day one student can get engagement 1 + social 10 + jobs + chat + deals with no shared limit. | `grep sendPush/pushGateway/sendAllSafe` → 20 files | N-2 |
| N3 🟠 | **Permission prompt on login with no explanation.** `App.js` (~L206) calls the OS prompt as soon as a signed-in token exists. On iOS, a "Don't allow" is close to permanent. A short "why" screen before it (at a good moment) gets many more yeses. | `App.js` L190–215, `utils/pushNotifications.js` L117 | N-3 |
| N4 🟠 | **Two inboxes.** The bell (`NotificationModal` / `Notification` model) and Social notifications (`SocialNotification` model, `/social/notifications`) are separate lists with separate unread counts. | app `components/NotificationModal.js`, `screens/Social/NotificationScreen.js`; server two models | N-4 |
| N5 🟠 | **Too many switches, no "how often".** 9 switches are all-or-nothing per category. There's no "only important", no daily digest and no per-thread mute. | `NotificationSettingsScreen.js` | N-5 |
| N6 🟡 | No measurement of push quality: open rate per type and opt-outs after a push aren't reported in admin (`PushLog` exists). | server `models/PushLog.js` | N-6 |
| N7 🟡 | Owner to check the **current Railway values** of `SOCIAL_PUSH_POSTS`, `SOCIAL_PUSH_CONFESSIONS`, `SOCIAL_PUSH_SKILLSHARE`, `SOCIAL_PUSH_DAILY_MAX`, `SOCIAL_PUSH_GROUP_MINUTES`, `SOCIAL_PUSH_QUIET_HOURS`. Only their names were read, not the values. If posts and confessions are "true" with max 10 and group 0, N1 is live today. | Railway service `the-deft-crew` | owner, today |

### 2.5 Platform and code health
| # | Finding | Fix |
|---|---|---|
| E1 🟠 | Production `/api/brands/nearby` returned `[]` until geo backfill is run (from `PROGRESS.md`, "Run (by owner)" unticked). | owner runs the backfill (outside this plan) |
| E2 🟠 | The project's eslint config is broken (noted in the redesign task). Lint is run with a temp config. | P0-4 fix config |
| E3 🟡 | `package.json` name is `"testting"`. Harmless, but rename carefully (EAS uses the slug, not this). | P0-4 |
| E4 🟡 | Known leftovers from `PROGRESS.md`: Scholarships "copy link" shows copied without copying; Privacy shows `info@gettdc.pk` but mails `info@thedeftcrew.com`; PrivacyAndSafety toggles are local only; header search has no button. | P5-6 |
| E5 🟡 | `google-services.json` is in the zip/repo. That's normal for Android, but keep the repo private. | owner |

---

## 3. Product principles for the upgrade (the "wow" brief)

1. **One job per screen, done in under 60 seconds.** Gen-Z attention: one question per card, big tap targets, progress always visible, autosave always on.
2. **Ask once, never nag.** Invitations (ambassador, notifications, rate us) appear after a *good moment*, at most once, with "not now" and "don't ask again".
3. **Every win is shareable.** A resume finished, a level reached, a confession that blew up, a deal saved: each gets a clean branded card with the student's referral link baked in. This is the word-of-mouth engine.
4. **Truth over hype.** AI only rewrites what the student said (the Studio already works this way). No fake counts.
5. **Safe anonymity.** Handles, not names, plus pre-post checks, two-tap report, and fast takedown. Safety is what keeps the confession feature allowed on campuses.
6. **Super-app, simple surface.** No new tabs. Features are found through Home cards, the tour and contextual prompts, not more menu items.

### 3b. End-to-end map: every feature touches every layer

No feature counts as done until every column in its row is done and tested together on staging.

| Feature | App UI/UX | Server | Admin portal | Data (additive) | Flag | Tests |
|---|---|---|---|---|---|---|
| Invite links + referral fix | invite deep link, paste code, prefilled signup, share cards | `/i/:code` page, ReferralClick logging, leaderboard filter | channel report on Crew Partners | ReferralClick rows (model exists) | `growthV2` | invite-link.test (app), referral click (server) |
| Ambassador | ask-once sheet, 4 intro cards, 30 s form, status, hub, daily card | `/api/crew/applications`, `/me`, campaigns/credentials `me`, popup eligibility job, push on review | Crew Inbox shows real applications, note to student, partner filters, campaign pickers | PartnerApplication `groups`, `source` | `ambassadorV2` | ambassador.test (app + server) |
| Resume v2 | smart start, fresher track, new steps, story prompts, resume coach (chat/tap/speak, memory joggers, done-for-you writing, live checks, fix everything, ready-to-send check), skills chips, fit meter, 30-template studio + customisation, feedback, finish moment | resume fields, `resumeRules` fresher track, `/ai/bullets`, `/feedback`, renderer sections | resume metrics page | Resume `settings.track`, activities, volunteering, awards, coursework, interests | `resumeV2` | resume-rules-tracks (shared), resume-v2.test, renderer snapshot per template |
| Confessions v2 | report/delete/mute, handles, tags, moods, me-too, polls, sort, composer prompts, follow, share card | pre-check service, report routes, rate limits, like-list fix, handle generator, feed sort/tag, follow pushes | Safety queue (all reports), settings (threshold, words, prompts, tags) | Confession `status`, `tag`, `mood`, `poll`, `handleMode`, `reportCount`, `meTooCount`; User `anonHandle`; Report reasons | `confessionsV2` (+ `confessionsVoting`) | confession-precheck, confession-report, old-client compatibility |
| Notifications | ask with a reason, one inbox, 3 modes + digest, thread mute | push budget, unified inbox route, digest job, copy pass | push report (sent/opened/opt-out) | `notifPrefs` new keys | `pushBudgetV1`, `pushAskV2` | push-budget (server), notifications.test extended (app) |
| Whole-app polish | first 60 s goals, next-best-action card, celebrations, empty states, a11y, leftovers fixed | `goals[]` on engagement home | — | EngagementProfile `goals` | per item | bundle check + manual checklist |
| Team access (RBAC) | — (admin only) | `adminAccess` field, permission middleware on every admin route (shadow then enforce), PII masking, invite + 2nd login step | team & access page, menu/buttons by permission, templates, activity | User `adminAccess`, role templates | `adminRbacEnforce` | permission-map test (server ↔ portal), route coverage test (every admin route has a permission) |
| Smooth on every phone | native stack, FlatList lists, instant reopen, optimistic actions, prefetch, back rules, keyboard, iPad layout, offline banner | — | — | — | per change | back-navigation (all routes), perf budgets, Maestro E2E flows on Android + iOS |
| Security | — | private repo, rate limits, duplicate routes removed | role-gated identity reveal + audit log | — | — | safety-foundations suite (exists) |

---

## 4. Phase 0: safety rails (do first, ~3–4 days)

| Step | What | Where |
|---|---|---|
| P0-1 | Add flags: `growthV2`, `ambassadorV2`, `resumeV2`, `confessionsV2`, `shareCards`. Read them with the existing `useFlag` hook. Default off in production. | server flags config, `app/src/api/appFlags.js`, `hooks/useFlag.js`, admin `AdminFeatures.js` (gets a tab per flag automatically if it lists server flags; verify) |
| P0-2 | Staging server + staging admin running the latest code. Seed: 3 universities, 20 students, 10 confessions, 5 resumes (one empty, one fresher, one experienced). | server `docs/STAGING.md` |
| P0-3 | Analytics events for every new funnel step (names in §11). Use the existing `analytics/metaEvents.js` pattern plus a server-side event if one exists (`/engagement/events`). | app + server |
| P0-4 | Fix the eslint config so `npm run lint` works. Make `node tests/run-all.js` green on main **before** any change; it's the baseline. | app repo |
| P0-5 | Error tracking: if Sentry or similar isn't installed, ask the owner (it's a new package). At minimum, log new-feature errors through the existing `console.warn` + server log route. | — |

**Exit check:** all tests green, flags visible in admin, staging app installs and signs in.

---

## 5. Phase 1: growth loop fixes (flag `growthV2`, ~1 week)

The referral system exists (codes, levels, `/engagement/referrals/*`). The pipe from "share" to "friend signs up with the code" is broken. Fix the pipe before adding anything new.

### P1-1 Invite deep link (JS only, OTA-able)
- Share URL becomes `https://<public-domain>/i/<CODE>` (a domain the owner controls; today's verified host is `the-deft-crew-production.up.railway.app` in `app.json` intentFilters, so keep that or add a nicer one in a store build).
- In `App.js` `ExternalDeepLink`, add `parts[0] === "i" && parts[1]`, which saves the code to AsyncStorage `@tdc_pending_ref`. If a guest or signed out, open `Signup` with `{ ref }`. If signed in, ignore it (already a user).
- `SignupScreen` already reads `route.params.ref`. Also read `@tdc_pending_ref` on mount, validate it with the existing `GET /engagement/referrals/validate/:code`, and show "invited by a friend ✓ code ABC123" (a chip, editable).

### P1-2 Invite landing page (server, ~1 day)
`GET /i/:code` (server-rendered HTML, no login):
- Logs the open into the existing **`ReferralClick`** model (`code`, `referrer`, `channel` from `?c=wa|ig|tt|copy`, user agent; store IP truncated or hashed, not raw). The share sheet adds `?c=` per channel, so the crew screen can later show "most of your friends came from WhatsApp".
- Shows "your friend invited you to tdc" (on `gettdc.pk/i/<CODE>`, owner decision; + the inviter's first name only if the server already exposes it publicly; otherwise no name), 3 real reasons (deals, careers, confessions), store buttons.
- Android: the store button carries `&referrer=ref%3D<CODE>`.
- iOS: a **"copy code & get the app"** button copies the code. In the app, Signup shows a **"paste invite code"** button (the user taps, so there's no clipboard prompt on load).
- If the app is installed, the universal link/app link opens the app directly (P1-1).

### P1-3 Play install referrer (native, needs a store build)
- Add `react-native-google-play-install-referrer` (approved). On the first launch only, read `referrer`. If it contains `ref=<CODE>`, store `@tdc_pending_ref`. Never call it again (Google: call once after install).
- Behind `growthV2`. If the module is missing (old binary), do nothing.

### P1-4 Referral leaderboard + campus race
- New section in the crew screen (`components/Points.js`): "top inviters this month" using the existing `getReferralLeaderboard`. Shows handle/first name + count, **your rank**, and "invite 2 more to pass @x".
- Campus filter if the API supports `?university=` (server: optional query param, additive).

### P1-5 Share cards (flag `shareCards`)
One shared component `app/src/ui/ShareCard.js` that renders a 1080×1350 view and captures it with `react-native-view-shot`, then `expo-sharing`. Variants:
`levelUp`, `resumeReady` (no personal data, just "my resume is ready, built in 6 min on tdc"), `savings` ("saved rs X this month", real number from `/offers/my-total-savings`), `confession` (P4-5), `invite`.
Every card shows the tdc logo, a QR (`react-native-qrcode-svg`) and the `/i/<code>` link. WhatsApp first in the share sheet copy (most used in Pakistan).

**Exit check:** on staging, a friend installs from a shared link on Android and the code is pre-filled; on iOS the paste flow works; the referral appears in the inviter's members list.

---

## 6. Phase 2: crew ambassador program, visible and easy (flag `ambassadorV2`, ~1.5 weeks)

### P2-1 "Ask once" invitation (the only push)
Use the **existing popup system** (engagement popups with `/engagement/popups/:id/ack`), so frequency is controlled on the server.

**Eligible** (server decides; all must be true): verified student, account ≥ 7 days, not already a partner/applicant, and at least one "good moment" in the last 48 h:
- invited ≥ 1 friend who joined, **or**
- claimed ≥ 3 deals, **or**
- reached level `starter`, **or**
- posted a confession with ≥ 10 likes.

**Shown:** at most once. Options: `tell me more` · `not now` (may ask once more after 30 days) · `don't ask again` (never again). Never during onboarding, the tour, a claim or a celebration (the tour gate in `engagement/tour/tourGate.js` already knows these states; reuse it).

Copy (lowercase voice):
> **you're kind of a big deal here.**
> students like you run tdc on their campus: free perks, a real certificate, and a line on your cv that recruiters notice. want to see what it involves?
> [tell me more] [not now]

### P2-2 Walkthrough: 4 swipe cards, then apply (new screen `AmbassadorIntro`, registered in `HOME_STACK` + `routes.js`)
1. **what you get.** Only the perks the owner confirmed (21 Nov): **ambassador certificate**, **recommendation letter**, **Instagram feature**, **internship referral**, and the **discount card tiers** (silver 10% → gold 15% → platinum 20% → founder 25%, from the existing levels). **Money is for founder circle only**, and the copy must say so plainly ("founder circle members also earn"), never imply that every ambassador gets paid.
2. **what you do.** 3 bullets: share tdc in your campus groups, bring 2 friends a week, post one campus moment a month. ~2 hours a week.
3. **how it works in the app.** Your code, your dashboard, your campus rank, all inside tdc. A tiny animated mock of the dashboard (Lottie or simple Reanimated).
4. **who's already in.** The real count of approved ambassadors at the student's university, if > 0; otherwise "be the first at <uni>". Hidden if the API can't give it.

The last card's button is `apply in 30 seconds`.

### P2-3 In-app application (replaces the Google Form behind the flag)
- Form prefilled from the account: name, university, year (if known), email, phone. Asks only 3 things: *why you* (one line, chips + optional text), *your campus groups/societies* (chips), *Instagram handle* (optional).
- Server (additive): new student router `routes/crew.routes.js` mounted at `/api/crew` (next to the existing `app.use('/api/admin/crew', …)` in `server.js` ~L308).
  - `POST /api/crew/applications` (auth, students only, rate-limited with `userRateLimit.perUser('crew_apply')`) writes a **`PartnerApplication`** (the existing model: `user`, `university`, `why`, `handle`). Add optional fields `groups: [String]`, `source: 'app'|'web'|'form'`.
  - `user` is `unique: true`, so a student re-applying after a rejection **updates** their document back to `pending` (allow after 30 days), never inserts a second one.
  - `GET /api/crew/applications/me` returns `{ status: 'none'|'pending'|'approved'|'rejected', reviewedAt, reviewNote }`.
  - The existing admin review (`adminCrew.routes.js` L267) also sends a push to the student on approve/reject.
- After applying, the student sees "we reply within 7 working days" (owner: 5–7 working days). Pending shows the date they applied.
- App: the status comes from the server, not AsyncStorage. Keep writing the old AsyncStorage key too, so turning the flag off keeps the old "applied" look.
- Admin: Crew Inbox already lists applications. Add a push to the student on approve/reject (existing push pipeline), and "reply with note" (optional text).
- Web `/ambassador` page (admin `Ambassador.js`): replace the mailto form with "apply in the tdc app" + store buttons + the invite deep link (owner decision). There's no second intake path.
- Google Form stays as the fallback when the flag is off.

### P2-4 Crew screen restructure (`components/Points.js`)
Top to bottom: **your level** (progress to next, real) → **your code + share** (P1-5 card) → **leaderboard** (P1-4) → **ambassador card** (state-aware: invite / pending / approved → "open dashboard") → levels list → download card.
Move the 6-tier `LEVELS` constant behind a server read if `/engagement/me` returns tiers; else keep the constant (no behaviour change). Map server level ids to display names in one helper so the header/menu level label can come back (fixes B6).

### P2-5 Ambassador dashboard (approved only)
New screen `AmbassadorHub`: campus invites this week/month, rank among ambassadors, active **campaigns** assigned to them (admin `CrewCampaigns`: brand, follower discount %, cap, dates; server `GET /api/crew/campaigns/me`), **credentials** issued to them (`GET /api/crew/credentials/me`, download PDF), and a "campus moment" submit (photo + caption), which lands in the admin Crew Inbox as a `post` (the review endpoint exists).

### P2-6 Never in the way, always one tap back
- Every invitation, intro card and form has a visible close (×) and Android back. Closing at any step drops the student exactly where they were, with nothing locked or lost.
- A half-filled application is kept as a draft ("continue your application" on the crew screen), never as a popup.
- After "don't ask again", the only entry points left are the ones the student goes looking for: the crew screen card, and the drawer item "the crew" (label becomes "the crew · ambassador").
- No guilt copy, no countdowns, no fake "spots left".

### P2-7 The daily and friend loop (why they come back, and why they bring friends)
- **For every student (not only ambassadors):** each referral that joins triggers a celebration for *both* people ("@ali joined with your code: +50 for you both"; owner decision: **+50 for each**. Server: credit the invitee +50 at signup in `auth.routes.js` where `referralCodeInput` is handled, via the existing points ledger, once per account). It shows on the inviter's crew screen with a progress line to the next level ("2 more friends to deft insider").
- **"bring your squad" mission** in the existing missions system: invite 3 friends this week → a reward from the existing rewards catalogue. Weekly reset, so there's a reason to open the app.
- **For ambassadors:** a small daily card on Home ("today: share the new deal at Café X with your batch group"), with one-tap share (P1-5 card + their code). It comes from active campaigns, and is skipped on days with nothing real to share.
- **Make the friend's first minute great:** an invited student lands on signup with the code already in, then sees "you and @ali both got +50" and one deal near them. Their first win is the inviter's best advert.

**Exit check:** an eligible test student sees the invitation once, applies in under a minute, the application appears in admin Crew Inbox, approve → push → dashboard opens.

---

## 7. Phase 3: resume builder v2, "zero experience, still interview-ready" (flag `resumeV2`, ~3 weeks)

**Promise to the student:** *"no experience? fine. answer a few quick questions and get a one-page resume an employer will actually read, in about 5 minutes."*

What recruiters screen interns for (research): relevant skills, evidence of initiative and fast learning, and soft skills shown through **clubs, leadership, volunteering, hackathons and projects**. Internship screeners check the programme, the graduation date and the availability term first. tdc's builder must collect exactly these.

### P3-1 Smart start (new entry screen `ResumeStart`, before `ResumeBuilder`)
Three big cards:
1. **upload my cv**: the existing upload → `ResumeImportReview` (unchanged).
2. **build from my tdc profile** (new): one tap creates a resume prefilled from data tdc already has: name, email, phone, city, university + programme + grad year (`user.university`), skills + headline from the professional profile (`/professional-profile/me`), completed tdc events/certificates if available. Then it opens the review screen ("we filled 5 sections, check them"), reusing the `ResumeImportReview` layout with a local report.
3. **start fresh**: then one question: **"have you done an internship or job yet?"** `yes` → experienced track · `not yet` → **fresher track**. Stored as `resume.settings.track = 'fresher' | 'experienced'` (new optional field; default `experienced`, so old resumes don't change).

### P3-2 Fair strength score (shared rules, server + app together)
`resumeStrength(resume)` keeps today's result when `track` is missing or `'experienced'` (zero behaviour change). When `track === 'fresher'`, the 20 experience points move to the sections a fresher can fill:

| Part | Experienced (today) | Fresher (new) |
|---|---|---|
| contact | 20 | 20 |
| title + summary | 15 | 15 |
| experience | 20 | 0 (bonus up to +5 if added, capped at 100) |
| education | 15 | 20 (+5 for grad date/expected) |
| projects | 10 | 15 |
| activities / leadership / volunteering | 0 | 10 (new) |
| skills (incl. soft skills) | 15 | 15 |
| extras (certs, languages, awards) | 5 | 5 |

Missing-item sentences change to fit ("add a society, club or volunteer role" instead of "add an internship"). Update the shared test that checks the two files are identical. Add tests for both tracks and for "track missing = old score".

### P3-3 New sections (fresher-first order)
Each section is a **separate component file** under `screens/Resume/steps/` (don't grow `ResumeBuilder.js`). The builder's `steps` array is built from the track:

- **Fresher order:** personal → education (+ relevant coursework, GPA optional, final-year project) → projects → **activities & leadership** (society, role, dates, 1–2 lines) → **volunteering** → skills (hard + soft) → **awards & achievements** → certificates → **languages** (+ level) → summary & goal → experience (optional, last).
- **Experienced order:** today's 7 steps + languages/awards/activities as optional extras at the end.

Model (additive, all optional): `activities[] {organisation, role, start, end, current, bullets[]}`, `volunteering[]` (same shape), `awards[] {title, issuer, date, note}`, `coursework[] (strings)`, `languages[] {name, level}` (field exists, add UI), `achievements[]` (field exists, add UI), `interests[]` (optional, off by default). The renderer (`templateService.js`) prints each section only when it has content, in track order, with "Leadership & Activities" as the heading recruiters expect.

### P3-4 "Answer, don't write" (the Gen-Z unlock)
Replace blank boxes with **story prompts**: 2–3 tap-or-type questions per entry, then AI turns the answers into bullets.

Example (society role):
> what did you do there? [organised events] [managed social media] [handled money] [led a team] [other…]
> roughly how many people / how big? [type a number, optional]
> one thing you're proud of? [optional, one line]
> → **make my bullets** → shows 2–3 bullets, each with ✓ keep / ✎ edit / ✕ remove

- Server: `POST /api/resume/ai/bullets` `{ section, role, organisation, answers[] }` → `{ bullets[], usedFacts[] }`. Same guardrails as the Studio: no invented numbers, employers, tools or results. If the student gave no number, no number appears. Reject outputs containing facts not in `answers`, server-side.
- **Skills picker:** chips, not typing. Suggested from the programme + target role via the existing `/resume/suggest-skills`, plus a **soft-skills** row (communication, teamwork, leadership, problem solving, time management…). Each soft skill asks "where did you show it?" and links it to an activity or project, so it's evidenced rather than just claimed.
- **Summary writer:** "what job do you want?" (chips from career categories) → 3 summary options using only entered facts (extends the existing summary enhance at ResumeBuilder ~L1605).
- **AI writer from job title** (Kickresume's "AI Writer"): offered **only on the experienced track** and only as *suggested wording for duties the student confirms*. Never pre-fills facts.

### P3-4b Resume coach: "we write it, you confirm it"
**Principle:** a first-timer should never face an empty box and wonder what to write. On every step **tdc drafts and the student approves** (✓ keep · ✎ edit · ✕ remove). The student supplies facts, often by tapping chips; tdc does the writing, formatting and best practice. Nothing is ever invented.

**1. Three ways to give the facts (student picks, can switch anytime)**
- **Tap mode** (default): one question per card with answer chips (P3-4 story prompts).
- **Chat mode:** "build my resume by chatting". A friendly interview in the existing AI chat style (`ChatBotInterface` patterns): "what are you studying?", "any society or club?", "anything you organised, taught or sold?". Every answer is saved into the structured resume fields as they go, and the student sees the resume fill up live.
- **Speak mode** (optional, behind its own flag): hold to talk on any question. The answer is transcribed on the server (OpenAI speech-to-text with the existing key; recording uses the installed `expo-av`), then treated exactly like typed text. Useful for students who find typing long answers a chore.

**2. Memory joggers: what first-timers forget they have**
At the activities and experience steps, show "students often forget these. tap any you've done": **tuition / teaching**, **family business help**, **freelancing (Fiverr, Upwork)**, **social media page you run**, **event volunteering**, **sports team / captain**, **society role**, **hackathon / competition**, **final-year or semester project**, **online course certificate**, **NGO / charity drive**, **part-time job**, **content creation**, **class representative (CR)**. Each tap opens a 2-question card and becomes a properly written entry. Chips adapt to the programme (CS sees hackathon/GitHub; BBA sees business plan competition/case study). This one screen turns "I have nothing" into half a page.

**3. Done-for-you writing (all fact-locked, server-checked)**
| Button | What it does |
|---|---|
| **make my bullets** | answers → 2–3 bullets in action-verb form, results only if the student gave numbers |
| **write my summary** | 3 options, 2–3 lines each, from their programme, target role and strongest facts |
| **suggest my skills** | hard skills from programme + projects, soft skills linked to where they showed them (existing `/resume/suggest-skills`, extended) |
| **make it stronger** | rewrites a weak bullet ("helped in event" → "co-organised a 200-person inter-university event…" **only** with facts already given; otherwise it asks "roughly how many people came?") |
| **fit on one page** | trims the longest, weakest bullets and tightens spacing, shows a before/after, and lets the student accept |
| **fix everything** | one tap applies all auto-fixes (§5) |

**4. Coaching that teaches while they build (never a lecture)**
- **One-line tip per step**, shown once and dismissible: e.g. "recruiters read this in seconds, so start each line with a verb like *organised*, *built*, *led*."
- **"see a good example"** link on every section: a sample entry written for **their programme** (a CS student sees a CS project example). Clearly labelled as an example, and never copied into their resume automatically.
- **Live checks as they type**, shown as a small coloured underline with a one-tap fix:
  - starts with "I"/"my"
  - no action verb
  - bullet longer than 2 lines
  - vague words ("hardworking", "team player" with no example)
  - spelling/grammar
  - mixed tenses (past for finished roles, present for current)
  - missing dates
  - an informal email (e.g. `cutiepie99@…` → "use a firstname.lastname email for job applications")
  - a missing LinkedIn
  - a phone number not in +92 format
- **Strength score explained in plain words** (existing `ResumeStrength` + fresher track): "82, strong. add one more project to reach 90." Each missing item has a **"do it for me"** button that opens exactly that card.

**5. Auto-fixes (applied with "fix everything", always previewed)**
- consistent date format everywhere
- reverse-chronological order in every section
- capitalisation of headings, job titles, universities, skills (`Javascript` → `JavaScript`, using the existing `skillNormalizer`)
- bullet punctuation consistent
- removes "references available upon request", "CV"/"Resume" as a title, and full home address (city is enough)
- trims extra spaces and empty sections
- professional file name (existing `pdfFileName()`)

**6. "Ready to send" checklist before download**
A 6-item check, green ticks only when true: contact details complete · one page (or 2 with good reason) · every entry dated · no spelling issues left · ATS-safe template for online portals (or a design template for printing) · summary matches the target role. The student can still download with items open; the check advises, it never blocks.

**7. Truth guardrail (same as Resume Studio)**
- AI may rephrase, structure and polish. It may **never** add an employer, title, tool, number, award or result the student didn't give.
- The server rejects outputs containing facts not found in the student's answers, and logs them so the prompts can be improved.
- Anything the student hasn't confirmed is shown as a suggestion, never saved silently.

**8. Server (additive)**
- `POST /api/resume/ai/coach`: `{ action: bullets|summary|stronger|skills|fit, section, facts }` → `{ suggestions[], usedFacts[], questions[] }`. It returns a follow-up question instead of guessing when facts are missing.
- `POST /api/resume/ai/check`: grammar/tense/vague-word checks for one field, debounced, cached by text hash.
- `POST /api/resume/ai/transcribe` (speak mode): audio → text, 60 s maximum, not stored after transcription.
- All are rate-limited per user (`userRateLimit.perUser('resume_ai')`), English only, and use the existing `OPENAI_MODEL`.

**Exit check:** a first-time student who says "I have no experience" taps through memory joggers and chat or tap mode, presses "fix everything", and gets a one-page resume with a strength score of 80+ in under 8 minutes. They type fewer than 100 characters themselves (excluding contact details), and every fact on the page is one they gave.

### P3-5 Speed and comfort
- One entry per card, a "next" button pinned above the keyboard (KeyboardProvider exists), a progress bar with minutes left ("~3 min left").
- **Autosave** every change (debounced 800 ms) + "saved ✓" tick. Builder already keeps drafts; make it visible.
- **Live preview chip:** tap to see the real PDF page (same `renderResumeHTML`) at any step.
- **One-page fit meter:** "fits on 1 page ✓" / "spills by 4 lines: try Compact or shorten 2 bullets". The renderer already avoids split entries; add a page estimate.
- Date pickers: month + year only, with a "present" toggle.
- Guest mode keeps today's behaviour (option b in `PROGRESS.md`).

### P3-6 Template studio: a paid-builder-quality library, free for students
**Goal:** a fresher's resume looks as good as one from a paid builder (Kickresume, Enhancv, Resume.io), and it still gets through employers' screening software. tdc wins on two things paid builders can't offer: it's free for students, and it's built to get *freshers* hired.

#### 1. How templates are built (one engine, many designs)
Today `services/templateService.js` has one renderer and 5 looks that differ only in type, size and colour. It becomes a **layout + theme engine**:
- **Layouts** (the structure, 7): `single-classic`, `single-header-band`, `single-compact`, `sidebar-left`, `sidebar-right`, `top-hero` (big name + photo block), `timeline` (dates on a vertical line).
- **Themes** (the look): font pairing, colour palette, heading style, divider style, icon set, photo shape, density.
- **A template** = layout + default theme + section order + name. New templates are config objects, not new code. A designer (or the developer with Claude) can add one in an hour.
- **Old ids keep working:** `canonicalTemplate()` still maps every old id, and the 5 current looks keep their ids and exact output.

**Two-column and screening software:** sidebar layouts are built so the **reading order in the PDF stays linear** (main column first in the HTML, sidebar positioned with CSS). Every template passes an automated text-extraction test (§4) before it gets the **"ATS-safe" badge**. Templates that can't pass it (heavy design, photo hero) get a **"design" badge** with the note: "best for sharing, printing and walk-in applications. use an ATS-safe one for online portals." Inside tdc Jobs this doesn't matter: employers see the structured profile plus the PDF.

#### 2. The library at launch: 30 templates in 6 collections
| Collection | Count | For | Examples (working names) |
|---|---|---|---|
| **ATS Pro** | 8 | online portals, multinationals, banks | the current 5 (Modern, Classic, Compact, Minimal, Executive) + *Harvard*, *Clean Line*, *Two-tone* |
| **Fresher & Student** | 7 | zero to little experience: education, projects and activities lead | *Campus*, *First Step*, *Fresh Start*, *Society Leader*, *Project First*, *Internship Ready*, *Scholar* (academic, for MS applications) |
| **Tech** | 4 | CS, IT, engineering | *Dev Sidebar* (skills sidebar + GitHub/portfolio), *Terminal-lite*, *Stack*, *Engineer* |
| **Business & Finance** | 4 | BBA, accounting, marketing, HR | *Consultant*, *Analyst*, *Marketer*, *Corporate* |
| **Creative** | 4 | media, design, content, fashion | *Studio* (accent sidebar), *Portfolio Hero* (photo + links), *Bold Name*, *Soft Pastel* |
| **Pakistan Local** | 3 | local companies, walk-ins, govt/semi-govt | *Pakistan Standard*, *Local Pro* (photo top-right), *Bilingual Header* (name also in Urdu script, body English) |

Target mix: **at least 20 of 30 ATS-safe**. Every Fresher template is ATS-safe.

#### 3. Customisation (what paid builders charge for)
In a bottom sheet on the template screen, with changes previewed live on the student's own resume:
- **Colour:** 12 curated palettes + custom colour (contrast-checked; text never below 4.5:1).
- **Font pairing:** 8 pairs (e.g. Inter/Inter, Lora/Source Sans, Merriweather/Lato, DM Sans/DM Serif, Poppins/Open Sans, IBM Plex, Roboto Slab/Roboto, Noto Sans + Noto Naskh for an Urdu-script name). Fonts are **embedded in the PDF** (`@font-face` with base64 in the HTML that `expo-print` renders), so the PDF looks identical on every phone. Font files ship with the app (Google Fonts, open licence); check the licence per font.
- **Size and spacing:** font size S/M/L, density compact/normal/airy, margins.
- **Sections:** drag to reorder, hide or show, rename heading ("Leadership & Activities" ↔ "Extracurriculars").
- **Heading style:** caps Aa/AA, underline/bar/none, icon on/off.
- **Photo:** on/off (off by default), circle/rounded/square; from the profile image with crop.
- **Details:** date format (Jan 2026 / 01/2026), page size A4 (default) / Letter, link style (full URL / short label).
- Stored in the existing `customStyles` field plus new optional keys (`layout`, `fontPair`, `palette`, `density`, `sectionOrder[]`, `hiddenSections[]`, `photo{on,shape}`). Missing keys = template defaults.

#### 4. Quality bar (what makes it "world class" rather than just many templates)
Every template must pass, in an automated test (`tests/app/resume-templates.test.js`) plus a visual snapshot:
1. **Five test resumes:** empty fresher, typical fresher (education + 2 projects + 1 society), full experienced, very long (2 pages), and edge cases (long names, Urdu-script name, 15 skills, no dates).
2. **One-page fit:** the typical fresher fits on one A4 page with default settings.
3. **No broken pages:** no entry split across pages, no orphan heading at a page bottom (the current renderer's rule, kept).
4. **ATS-safe test** (for the badge): extract the PDF text (`pdftotext` in CI) and check the name, email, phone, every section heading and every job/education entry come out **in reading order**. A template fails if two columns' text interleaves.
5. **Print test:** looks right in black and white (no information carried by colour alone).
6. **Design review:** every new template is signed off as a picture by the owner before it ships, so no "programmer-made" designs reach students.

#### 5. Picking a template should take 10 seconds
- **"Recommended for you" row first:** 3 templates chosen from the track (fresher/experienced), target role or programme (CS → Tech, BBA → Business), and where they'll apply (online portals → ATS Pro). Shows the reason: "recommended: Project First, because your projects are your strongest section."
- **Gallery with the student's real content** in every thumbnail (rendered small from the same HTML, cached), swipe between collections, filter chips (*ATS-safe · with photo · one page · two column*).
- **Switch anytime, nothing lost:** content and design are separate, so changing template never changes text.
- **Compare:** long-press two templates to see them side by side.

#### 6. Same design everywhere (the "brand kit" for each student)
- **Matching cover letter** in the same template design (P3-9 cover letters use the resume's theme).
- **Web resume page:** the existing `ResumeShare` link page uses the same layout and theme, so the shared link looks like the PDF.
- **Optional QR** in the resume footer linking to that web page (portfolio, projects, verified badges).

#### 7. Value tdc adds that paid builders can't (employment impact)
- **"verified by tdc" line** (optional, shown only when true): verified student at <university>, and tdc event certificates or ambassador certificate (from the existing `Credential` model). Employers trust verified facts over self-claims, and it helps freshers who have little else.
- **One-tap apply** to tdc jobs with the chosen version (the Studio already attaches approved versions to applications).
- **Outcome loop:** the existing career outcomes (`/career/outcomes/me`) record interviews and offers per resume version. The app shows "students using Project First got 2× more interview invites for tech internships" **only when tdc's own data supports it** (minimum sample size; real numbers only).

#### 8. Data and rollout
- Templates live in code (`services/templates/*.js`, one file per collection) behind the `resumeV2` flag. With the flag off, only today's 5 appear, unchanged.
- Server-side PDFs (Resume Studio uses an ATS Classic PDF from the server) stay as they are in this phase. Moving the server PDF onto the same engine is a later task.
- Analytics: `template_previewed`, `template_selected`, `template_customised_{field}`, `resume_downloaded_{templateId}`, `resume_ats_badge_{safe|design}`, and outcomes per template (§7).
- Build order: engine + the 5 existing templates moved onto it with **byte-identical output** (snapshot test) → 7 Fresher → 8 ATS Pro → the rest. Launch once the first 20 pass the quality bar; add the remaining 10 by OTA updates (templates are JS only).

### P3-7 Recruiter-style feedback (Kickresume's "Resume Feedback")
Screen `ResumeFeedback` (from the dashboard): **strong points / weak points / improvements**, built from `resumeStrength().missing` (deterministic, instant) plus one AI pass (`POST /api/resume/:id/feedback`, English only, cached per resume revision). Each improvement has a "fix it" button that jumps to the step (the `step` already exists in `missing[]`).

### P3-8 Finish moment (wow + growth)
At 100% of required fields: celebration (existing `CelebrationHost`, sound `tdc_success`), then three buttons: **download pdf** · **share link** (existing `ResumeShare`) · **apply to matching jobs** (existing `/career/matching/recommended`). Then the `resumeReady` share card (P1-5). Offer a cover letter (P3-9) only after this.

### P3-9 Later (behind its own flag, after P3 is stable)
Cover letter from resume + job (reuse the Studio pipeline), LinkedIn headline/about generator. **No translation: resumes are English only** (owner decision). All AI resume output is English.

**Exit check:** a student with zero experience goes from "start fresh" to a one-page PDF in ≤ 6 minutes on a mid-range Android. Score ≥ 80 is possible without experience. Old resumes look and score exactly as before.

---

## 8. Phase 4: confessions v2, safe, alive, shareable (flag `confessionsV2`, ~2.5 weeks)

Inspiration from Posheeda, taken selectively: **handles not names, server check before posting, report in two taps, composer prompts, campus-first visibility, profile identity without a name.** Not taken: petitions/status timelines, campus league and scorecards. Those make it a complaints product and add confusion. Revisit later if the owner wants a separate "campus voice" feature.

### P4-1 Safety (ship first, even if the rest waits)
- **Pre-post check (server):** new `services/confessionCheck.js`, called in `POST /confessions/create` (~L1867) and `POST /confessions/comment/:id` (~L1593). It runs three checks:
  - (a) the existing `utils/profanity.js` (English + Roman Urdu);
  - (b) a rules filter for phone numbers, emails, CNIC-like `\d{5}-\d{7}-\d`, links, and full names matched against students of the same university;
  - (c) OpenAI `omni-moderation-latest` on the text **and the image** (free; the `OPENAI_API_KEY` is already on Railway). 3 s timeout. If the moderation call fails, the post is **held**, never silently allowed.
  - (d) **Topic check (owner rule: no religion, politics, racism, sect or ethnicity content).** The moderation model doesn't classify these topics, so add one short classification call with the existing `OPENAI_MODEL` (gpt-4o-mini): strict JSON `{ religion, politics, ethnic_or_sectarian, sexual_or_vulgar, threat }`, with true/false and a quote. It runs in English and Roman Urdu. Any true → blocked with a clear reason ("tdc confessions don't allow religious or political topics").

  Results:
  - `ok` → post.
  - `edit` → `422 { code: 'NEEDS_EDIT', reasons: [...] }`. The app shows "this names or identifies a person. edit it to post" with the flagged span highlighted.
  - `hold` → saved as `pending`, visible only to the author with "under review".
  - `self-harm` signals → the post is held (no ban, no strike). The author sees a gentle support sheet with Pakistani helplines, and the safety email (P4-1b) goes to admins. Helplines to show: national mental health helpline **1166**, **Umang Pakistan 0311-7786264** (24/7), **Rozan 0800-22-444**, emergency **1122 / 15**. The developer **calls each number before launch** to confirm it works, and the list is editable in admin.

  Old app versions that don't understand `422` get a plain error message, which is acceptable.
- **Report in two taps** on every confession and comment: `POST /confessions/:id/report` and `POST /confessions/comment/:postId/:commentId/report`, writing the existing `Report` model (`contentType: 'Confession'` already allowed; `reportedUserId` = the hidden `authorId`, never returned to the client). Copy the dedupe pattern from the post report (`social.routes.js` L44).
  - The `Report.reason` enum gains `'Identifies A Person'`, `'Personal Info'` and `'Self Harm Risk'` (additive; existing values stay).
  - In the app, reuse `ReportModal.js` with those reasons. Self-harm risk is sorted first in the admin queue.
- **Auto-hide:** hidden at 3 unique reports (setting in admin), or immediately on one report with evidence that the re-check confirms (P4-1b). Downvotes stay off (owner decision).
- **Block author (anonymously):** "don't show me posts from this person" without revealing who. `POST /confessions/:id/mute-author`.
- **Delete own confession:** the server route `DELETE /confessions/:id` already exists (author only). Add the button in the app (card ⋯ menu) and a "my confessions" list using the existing `GET /confessions/my-confessions`.
- **Rate limits:** `userRateLimit.perUser('confession_post')` 5/hour and `perUser('confession_comment')` 30/hour.
- **Close the like-list leak (S3):** `GET /confessions/likes/:id` returns names only to the confession's author, and a count to everyone else.
- **Guidelines gate:** the first post shows the rules once (existing `Guidelines` screens), and "I agree" is stored on the server. The rules: no names or details that identify anyone · no sexual or vulgar content · no threats or bullying · **no religious, political, racist, sectarian or ethnic content** · reports need evidence, and false reports have consequences.

### P4-1b Automatic enforcement (owner decision: no human moderation team)
There's no daily moderation job. The system enforces the rules itself and emails admins only when something is alarming.

**Strike ladder** (per account, over 90 days; stored on User as `confessionStrikes[]`, additive):
| Event | Action, immediately and automatically |
|---|---|
| Blocked at pre-check (never published) | warning only, no strike (they were stopped in time) |
| Repeated attempts: 3 blocked posts in 24 h | 24 h confession ban + 1 strike |
| Published content later confirmed as breaking the rules (by report re-check) | content removed + 1 strike |
| Strike 1 | 24 h ban from confessions and comments |
| Strike 2 | 7-day ban from confessions and comments |
| Strike 3 | **whole account suspended** + safety email to admins |
| Threat of violence, sexual content involving anyone named or underage, doxxing (phone/address/CNIC) confirmed | **whole account suspended at once** + safety email, regardless of strikes |

**Reports with evidence → instant action:**
1. The reporter picks a reason and must give **evidence**: they highlight the exact words in the post or comment (stored as the quote). For a profile report, the evidence is a screenshot.
2. The post is **hidden for everyone at once** while the server re-checks the quoted content (pre-check c + d) within seconds.
3. Re-check confirms → removed, author gets a strike (or an instant suspension for the severe cases above), and the reporter sees "action taken".
4. Re-check doesn't confirm → the post stays hidden only if 2 more independent verified students report it. Otherwise it comes back, and the reporter is told "no rule broken".

**Why one report doesn't suspend a whole account by itself:** on a campus, instant suspension from a single report becomes a weapon. Rivals, pranks or group grudges could silence anyone in seconds, and the app has no moderators to undo it. Suspension therefore needs the evidence to be **confirmed by the automatic re-check**, or 3 independent reports. If the owner still wants the stricter rule, it's one admin setting: `suspendOnSingleEvidenceReport` (default **off**).

**False reports:** if a report is rejected by the re-check and by other students, the reporter gets a "false report" mark. 3 marks in 30 days → reporting disabled for 30 days.

**Safety email to admins** (existing `utils/mailer.js`; recipients in a new Railway variable `SAFETY_ALERT_EMAILS`), sent for every suspension, threat, self-harm signal or doxxing attempt. It contains the content, the reason, the evidence and the author's handle (never the real name in the email body), plus two buttons:
- **blacklist**: ban the account and block its email and phone from signing up again (new `Blocklist` collection);
- **restore**: undo the suspension and strike.

Both buttons are signed one-time links that expire in 7 days, and every click is written to the existing `AdminAuditLog`. With no click, the automatic action stays as it is.

**Appeals:** a suspended student sees "your account is paused because …" with an **appeal** button. The appeal goes to the same email inbox, so admins are only involved when someone appeals.

### P4-2 Identity without a name
- Each student gets a stable **anonymous handle** (`adjective-noun-123`, e.g. `ziddi-project-343`, generated on the server with an Urdu-slang + English word list) and an **avatar** built from existing assets (the `Dot` mood faces + colour) or simple parts. Never the real name, never the email.
- In the composer the student picks **post as: @handle · fully anon**. Fully anon stays "anon." like today.
- Show the university chip as today (campus tab only) and a verified-student tick (only real verification).
- Profile → "my confessions" (author-only list) with likes/replies count.

### P4-3 Richer posts, same simple screen
- **Tag** (one per post, chips in the composer): start with *crush, rant, academics, hostel, food, career, wholesome, question, funny*. Admins can **add, rename or hide tags** from the Safety settings (no app update needed). Filter chips at the top of the feed. Field `tag` (optional).
- **Mood** (one of the existing `Dot` moods: sus, shook, panic, broke, sleepy, cheeky, sorted…). Field `mood` (optional). The design already wanted this (hidden in `PROGRESS.md`).
- **Reactions:** keep like (it powers engagement and drops). Add **"me too"** (relatable count) as the second reaction. Upvote/downvote: optional, behind a sub-flag (`confessionsVoting`). Recommended *off* at launch, used only for auto-hide.
- **Polls in confessions:** 2–4 options, anonymous votes ("your answer is not attached to your handle"). Field `poll {options[], votes{}}`.
- **Sort:** hot (default) · new · top this week. Server `GET /confessions/feed?scope=&sort=&tag=` (new optional params).

### P4-4 Composer that gets people posting
- Title-less, 280–500 chars, **prompt chips** when empty ("not sure where to start?": "a hostel story nobody believes", "the class you'd drop if you could", "something you'll never say out loud"). Rotated weekly from admin.
- Visibility switch as today (everyone / my campus) with a one-line explanation.
- The live pre-check hint shows before posting where possible (P4-1 rules filter runs client-side for names/numbers too).

### P4-5 Bring people back
- **Follow a confession** (bell) → push on new replies (existing push + `tdc_push_confession.wav`).
- **Save** (existing `/engagement/saved/:kind/:id`, kind `confession`).
- **Share as image** (P1-5 `confession` card): the text on a branded card with a QR to the app, **never the handle**, plus "sent from tdc confessions". This is the viral loop.
- **Deep link** `tdcapp://confession/<id>` + `/c/<id>` web preview (text only, no comments) in `ExternalDeepLink` (route exists via `focusPostId`).
- **Weekly recap** push: "your campus this week: 32 confessions, the top one…" (real numbers only).

### P4-6 Code structure
Split `ConfessionScreen.js` (1,742 lines) without behaviour change first (separate commit): `ConfessionFeed.js`, `ConfessionCard.js`, `ConfessionComposer.js`, `ConfessionComments.js`, `confessionApi.js`. Keep the dark design, `feedCache`, polling-only-on-screen, pinned/highlight from daily drop, mentions.

### P4-7 Admin: safety log (looked at only when an email arrives)
New admin page **Safety** (menu "oversight"). There's no daily reviewing; it's the record behind the emails, and the place to change a decision. It reads the `Report` collection for **all** content (posts, comments, users and confessions), which fixes C1b, plus held confessions. Tabs: *held · reported · resolved*. New server routes go in `routes/admin.routes.js` (admin auth): `GET /api/admin/safety/queue`, `POST /api/admin/safety/:reportId/resolve`. For each: text, image, reasons, report count, author handle (and real account only for admins with a "safety" role, with every reveal logged), actions *approve · remove · warn · suspend 24h/7d · ban*. Settings: report threshold, banned words list, prompt chips, tags list.

**Exit check:** a post naming a classmate is blocked with a clear reason; a religious or political post is blocked; a report with evidence hides the post instantly and the re-check gives a strike; strike 3 suspends the account and the admin email arrives with working blacklist/restore buttons; a false reporter gets marked; the share card contains no handle; an old app version can still read and post.

---

## 9. Phase 5: whole-app UX polish and wow (~1.5 weeks, mostly OTA)

| Step | What |
|---|---|
| P5-1 | **First 60 seconds:** after signup, a 3-card "what tdc does for you" (deals near you · get hired · your campus), then **pick 2 goals** (save money / find internship / meet people / build resume). Home and missions order their cards by goal (`engagement/home` already personalises; pass `goals[]`). |
| P5-2 | **Home "next best action" card** at the top: one card at a time, picked from: finish resume (if < 80) · claim a deal near you · answer today's drop · invite a friend (if 0 referrals) · ambassador invite (P2-1 rules). Reuses `MissionCard` styles. |
| P5-3 | **Celebrations everywhere it's earned:** resume done, first claim, first confession with 10 likes, level up, all with a share card button. Keep sounds and haptics. |
| P5-4 | **Empty states that sell:** each list (confessions, resumes, events, deals) gets a `Dot` face + one line + one action, never a blank screen. |
| P5-5 | **Speed:** skeletons on all new screens (`ui/Skeleton`), React Query caching for new APIs (pattern from `useReferrals`), images via `RemoteImage` + Cloudinary sizes. |
| P5-6 | **Fix known leftovers (E4):** scholarships copy link, privacy contact email mismatch, local-only privacy toggles (save to server or remove), header search button (approved: add it). |
| P5-7 | **Accessibility:** every new tappable 44 px+, labels, `maxFontSizeMultiplier` 1.3, reduce-motion respected (as in `DESIGN_SYSTEM.md`). |
| P5-8 | **Rate-us ask** (once) after a celebration moment, via native in-app review (`expo-store-review`, approved). |

---

## 9b. Phase N: notifications people keep switched on (~1 week; N-1 is a Railway setting, same day)

Rule: **every push must be worth opening.** A student should get 1–3 pushes on a normal day, each about *them* (their reply, their claim, their friend joined, a job that matches), not about everyone else's activity.

| Step | What | Where |
|---|---|---|
| N-1 | **Today, no code:** on Railway set `SOCIAL_PUSH_GROUP_MINUTES=180` and `SOCIAL_PUSH_DAILY_MAX=2`, and keep quiet hours on. New posts then become "6 new confessions at your campus" at most every 3 hours, max 2 social pushes a day. Reversible in seconds. **Changing a variable restarts the service** (noted in `socialPush.js`), so do it at a quiet hour. | Railway variables |
| N-2 | **One budget for all marketing-type pushes.** Add `services/pushBudget.js`: classes `personal` (a reply to you, a mention, your claim, your ticket, your application, a friend joined with your code, chat; no cap, quiet hours respected except chat), `relevant` (a job that matches, a deal near you, a followed confession; shares a cap of 3/day) and `broadcast` (new posts/confessions/listings, daily drop, streak nudges; shares a cap of 1–2/day). Every sender calls `pushBudget.allow(userId, class)` before sending. Roll out sender by sender, each behind the flag `pushBudgetV1`. | server: `pushGateway.js`, `socialPush.js`, then career/chat/loyalty/events senders |
| N-3 | **Ask at the right moment, with a reason.** Remove the auto-prompt on login (flag `pushAskV2`). Instead show a small sheet after the first good moment: first deal claimed ("we'll tell you when a deal near you drops"), first confession posted ("know when someone replies"), first job applied ("hear back from employers first"). Buttons: `turn on` → OS prompt · `not now` (ask once more after 7 days, then only from Settings). If already denied, show a "turn on in settings" row that opens the OS settings. | app `App.js` (~L206), `utils/pushNotifications.js`; tour gate already holds the tour during a prompt |
| N-4 | **One inbox.** Merge the bell and Social notifications into one screen with tabs *for you · campus · system* and one unread count. Server: `GET /api/notifications/unified` that reads both models (no data migration). The old endpoints stay for old app versions. | app `NotificationModal`, `Social/NotificationScreen`, `hooks/useNotifications.js`, `hooks/useMessageUnread.js`; server new read-only route |
| N-5 | **Simpler settings.** At the top, three modes: *everything* · *only important* (personal + relevant) · *quiet* (personal only). Below that, the existing 9 switches, collapsed under "fine-tune". Add a **daily digest** option for campus activity (one push at 6 pm Karachi: "today at your campus: 12 confessions, 2 events"). Mute per confession thread (P4-5 follow/unfollow). All new prefs are additive keys in `notifPrefs`. | app `NotificationSettingsScreen.js`; server `NOTIF_PREF_DEFAULTS` (engagement.routes.js L948) |
| N-6 | **Push report in admin:** sent / delivered / opened per type per day, and opt-outs within 24 h of a push type, from `PushLog` + receipt data. Any type with an open rate under 3% or high opt-outs gets reviewed. | admin Engagement Metrics; server `PushLog` |
| N-7 | **Copy pass:** every push names the specific thing ("@ziddi-project-343 replied to your confession", "Café X 30% off is 1.2 km from you"), never a generic "check out what's new". Uses the existing copy bank (`services/engagement/copy.js`). | server |

**Exit check:** on staging, a test student who posts and claims gets their personal pushes instantly, at most 2 broadcast pushes a day, nothing between 23:00 and 09:00, and one inbox with the right unread count.

---

## 9c. Phase A: team access for the admin portal (roles and permissions)

**Goal:** as tdc grows, the super admin can give each team member exactly the access their job needs, for example employer onboarding staff see employers, brand partnerships staff see brands, and the core team sees everything. Nobody gets more than they need, every change is logged, and access can be removed in one click.

### A-0 What exists today (audit)
| # | Finding | Evidence | Severity |
|---|---|---|---|
| R1 | **One admin level: all or nothing.** `User.role` is `student / brand / admin / traveler / employee`. Any admin can do everything: delete accounts, change feature flags, see every student's data, award points. | server `models/User.js` L28–30 | 🔴 before hiring more staff |
| R2 | **Admin checks are scattered across ~20 route files with at least 4 different implementations:** `middleware/adminMiddleware.js` (`isAdmin`), three separate local `requireAdmin` functions (`adminFeatures`, `adminUniversities`, `adminActions`), and inline `role === 'admin'` checks. One missed check later means a hole. | `grep` of `routes/` | 🟠 |
| R3 | The portal menu (`portal/PortalNav.js` `ADMIN_MENU`: general, users, student app, brands, employers, engagement, crew, settings) shows every page to every admin. | admin `AppNavigator.js` L121 (`user.role === "admin"`) | 🟠 |
| R4 | **Good base to build on:** the auth middleware reads the user from the database on every request (`auth.middleware.js` ~L63), so access changes and removals take effect on the **next request**, with no logout or token change needed. `AdminActionLog` (actor, action, target, before/after, reason) and the "admin actions" page already exist. `OtpCode` (hashed one-time codes) exists for a second login step. | server | ✅ |

### A-1 The model (additive, nothing removed)
- `User.role` stays `"admin"` for every team member (old checks keep working).
- New optional field `User.adminAccess`:
```js
adminAccess: {
  level: 'super' | 'member',          // super = everything incl. managing the team
  roleTemplate: String,               // e.g. 'brand_partnerships' (for display / bulk edits)
  permissions: [String],              // e.g. ['brands.view','offers.manage']
  scopes: { universities: [ObjectId], cities: [String] }, // optional limits (A-5)
  status: 'active' | 'suspended',
  invitedBy: ObjectId, invitedAt: Date, lastActiveAt: Date,
  note: String                         // job title / department
}
```
- **Migration that can't lock anyone out:** every existing admin without `adminAccess` is treated as `level: 'super'`. The super admin then moves people to narrower roles. The system **refuses to remove or downgrade the last super admin**.

### A-2 Permissions (one list, used by both server and portal)
A permission is `area.action`. `view` = read, `manage` = create/edit, extra keys for risky actions. One shared file: server `config/adminPermissions.js`, copied to the portal `portal/permissions.js`, with a test checking they match (same pattern as `resumeRules.js`).

| Area (portal menu group) | Permissions |
|---|---|
| general | `dashboard.view`, `analytics.view`, `audit.view` |
| users: students | `students.view`, `students.edit`, `students.verify`, `students.suspend`, `students.delete` |
| users: universities, cards | `universities.manage`, `cards.manage` |
| student app | `jobs.manage`, `scholarships.manage`, `events.manage`, `travel.manage`, `rewards.manage` |
| brands | `brands.view`, `brands.approve`, `offers.manage`, `loyalty.manage`, `surplus.manage`, `revenue.view` |
| employers | `employers.view`, `employers.verify`, `hiring.manage`, `disputes.manage`, `ratings.moderate`, `plans.manage` |
| engagement | `drops.manage`, `push.send` (to everyone: risky), `points.award` |
| crew | `crew.view`, `crew.manage`, `credentials.issue` |
| safety (P4-7) | `safety.view`, `safety.act`, `identity.reveal` (see who wrote an anonymous post: most sensitive) |
| data | `pii.view` (full phone/email/documents; without it they're masked like `03••••••12`), `data.export` (CSV downloads) |
| settings | `features.manage` (feature flags), `team.manage` (**super only**) |

### A-3 Ready-made role templates (super admin can edit, copy or create new)
| Template | For | Gets |
|---|---|---|
| **Super admin** | founders | everything, incl. `team.manage` |
| **Core team** | senior staff | everything except `team.manage`, `identity.reveal`, `students.delete` |
| **Employer success** | employer onboarding, training, hiring support | `employers.*`, `jobs.manage`, `hiring.manage`, `disputes.manage`, `ratings.moderate`, `students.view` (masked), `dashboard.view` |
| **Brand partnerships** | brand discounts, offers, loyalty | `brands.*`, `offers.manage`, `loyalty.manage`, `surplus.manage`, `revenue.view`, `dashboard.view` |
| **Campus & students** | student verification, universities, ambassadors | `students.view/edit/verify`, `universities.manage`, `cards.manage`, `crew.*`, `events.manage`, `scholarships.manage` |
| **Community & safety** | safety log, reports, appeals | `safety.view`, `safety.act`, `students.suspend`, `drops.manage` |
| **Growth & marketing** | drops, push, campaigns, rewards | `analytics.view`, `drops.manage`, `push.send`, `rewards.manage`, `crew.view`, `crew.manage` |
| **Finance** | revenue, plans, card payments | `revenue.view`, `plans.manage`, `cards.manage`, `data.export` |
| **Viewer** | interns, investors' demo, analysts | every `*.view`, no PII, no actions |

Per person, the super admin can **add or remove single permissions** on top of a template (shown as "Brand partnerships + push.send").

### A-4 Server enforcement (safe rollout, no breakage)
1. New `middleware/adminAccess.js`:
   - `requirePermission('offers.manage')`: super → allowed; member → allowed if the permission is in their list; suspended → 403.
   - `isAdmin` keeps working, meaning "any active admin".
2. Replace the 4 different admin checks **route by route**, each in its own commit, with the permission that matches what the route does. Read routes get `*.view`; write routes get `*.manage` or the specific risky key.
3. **Shadow mode first** (flag `adminRbacEnforce` = off): the middleware **logs** "would deny X for user Y" but still allows. Run it for a week with real staff use, fix any wrong mapping, then switch enforcement on. This is what keeps the live admin from breaking.
4. **Masking:** API responses for students, employers and brands mask phone, email and documents unless the caller has `pii.view`. `identity.reveal` is checked, and **every reveal is logged with a required reason**.
5. Add `adminAccess` to `REQ_USER_FIELDS` in `auth.middleware.js` so it's read on every request (changes are instant).
6. **Every write by a member** goes into `AdminActionLog` (the existing model) with the permission used.

### A-5 Scopes (optional, for later growth)
Limit a person to **certain universities or cities**. Example: a Lahore campus manager sees and verifies only students from Lahore universities, and a Karachi brand manager sees only Karachi brands. Server: list and detail routes add a filter when the caller has scopes. Empty scopes = everything.

### A-6 Admin portal: "team & access" page (settings, super admin only)
- **Members list:** name, email, role template, extra/removed permissions, scopes, status, last active, invited by.
- **Invite member:** email + name + job title + template (+ tweaks) → an email invite (existing `utils/mailer.js`) with a link valid for 72 h to set a password. The account is created as `role: 'admin'` with `adminAccess` set.
- **Edit access:** checkboxes grouped exactly like the menu, with a plain-language summary ("can approve brands and edit offers; can't see student phone numbers").
- **Suspend / remove:** instant (next request), with a reason. Their sessions stop working at once.
- **Activity:** per member, from `AdminActionLog`.
- **Templates tab:** edit, copy or create role templates.
- **Safety rules:** the last super admin can't be removed; nobody can give themselves more access; changing a super admin needs another super admin's confirmation if more than one exists; all changes are logged with before/after.

### A-7 Portal behaviour for limited members
- **Menu shows only what they can open** (`PortalNav` filters `ADMIN_MENU` by permission). Pages they can't open aren't shown. If opened by link, a friendly "you don't have access to this. ask a super admin" page appears.
- **Buttons follow actions:** e.g. a Viewer sees the offers list but no "new offer" / "delete" buttons.
- **The dashboard shows only cards for their areas.**
- The portal reads permissions from a new `GET /api/admin/me/access` on login and on window focus.

### A-8 Login security for all admins
- **Second step at login:** a 6-digit email code (the existing `OtpCode` model) for every admin login from a new device, plus every 30 days.
- Auto-logout after 12 h idle.
- Login history (time, device, city from IP) visible to the person and to super admins.
- Rate-limited login.

**Exit check:** on staging, a "Brand partnerships" member sees only general + brands, can edit an offer, gets 403 on any employer API even with a hand-made request, sees masked student phones, and their offer edits appear in admin actions. Suspending them blocks the next click. The last super admin can't be removed. In shadow mode, the "would deny" log was empty for a week before enforcement went on.

---

## 9d. Phase Q: smooth and fast on every Android and iPhone (runs alongside every phase)

**Goal:** the app feels native and instant on a low-cost Android on a weak network and on a new iPhone alike. Back always works, nothing hangs, nothing breaks after an update.

### Q-0 Audit (what the code shows today)
| # | Finding | Evidence | Severity |
|---|---|---|---|
| Q1 | **Navigation uses the JavaScript stack** (`@react-navigation/stack`), not the native stack. Screen transitions run partly on the JS thread, so when the JS thread is busy (big screens loading) the slide animation stutters, mostly on low-end Android. | `package.json`, `navigation/*.js` | 🟠 |
| Q2 | **36 screens render lists with `.map()` inside a `ScrollView`.** Every row renders at once, which is slow for long lists (deals, events, posts, jobs). 40 files already use `FlatList`. | grep `screens/` | 🟠 |
| Q3 | **7 screens are over 1,800 lines** (Events 2,680 · ResumeBuilder 2,583 · MyDiscount 2,496 · UserProfile 2,175 · Offer 1,919 · Brands 1,886 · ResumeDashboard 1,821). Big screens re-render more and are where most bugs hide. | `wc -l` | 🟠 |
| Q4 | **129 `console.log` calls** ship in release builds. Each one costs time on the JS thread in hot paths (feeds, chat). | grep | 🟡 |
| Q5 | **Android release builds aren't minified** (`enableProguardInReleaseBuilds: false`), so the app is bigger and slower to download on mobile data. | `app.json` L131 | 🟡 |
| Q6 | **`supportsTablet: true` on iOS:** the app is offered on iPads and App Store review often tests on iPad. Phone layouts stretched to iPad width look broken. | `app.json` ios | 🟠 |
| Q7 | **25 screens use `KeyboardAvoidingView`** while `react-native-keyboard-controller` (better, the same on both platforms) is already installed and used at the root. iOS and Android keyboard behaviour differs screen to screen. | grep | 🟡 |
| Q8 | **Good base, keep it:** Android back on every modal (release commit `fe66b21`), back-navigation test, perf marks + perf test, responsiveness test (memo rows, lazy/frozen tabs), `RemoteImage` on `expo-image` with Cloudinary sizes, React Query, font scaling fixed, timeouts config, NetInfo installed. | `tests/app/*`, `PROGRESS.md` | ✅ |

### Q-1 Performance budgets (every phase's exit check must meet them)
Measured on the **reference low-end phone**: an Android with 3–4 GB RAM (e.g. a Redmi or Samsung A-series), release build, 4G throttled to "slow 3G" for network tests.
| Metric | Budget |
|---|---|
| Cold start → Home usable | ≤ 2.5 s (≤ 1.5 s on iPhone 12+) |
| Warm start (from background) | ≤ 0.5 s, no splash |
| Tap → visible response | ≤ 100 ms (press feedback is immediate; data can follow) |
| Screen transition | 60 fps, no dropped frames visible |
| A screen visited before | opens with **cached content instantly**, refreshes quietly |
| A new screen | skeleton within 100 ms, content ≤ 1.5 s on 4G |
| Scrolling long lists | no blank rows, no stutter |
| Crash-free users | ≥ 99.5% (Sentry, approved) |
| ANR / app-not-responding (Android vitals) | below Google Play's bad-behaviour threshold |
| Android download size | must not grow with this upgrade; aim smaller after Q-3 |

### Q-2 Back navigation: never stuck, never thrown out
Rules for every screen, old and new:
1. **Every pushed screen has a back:** the header back button, iOS swipe-from-edge (`gestureEnabled` on every stack screen), and the Android back button/gesture.
2. **Opened from a push or link with nothing behind it** → back goes to the sensible parent (e.g. confession → Confessions → Home), **never closes the app**. Use `navigation.canGoBack()`, else reset to the parent. Extend `routes.js` `pathTo` with a parent per screen.
3. **Sheets and modals:** Android back closes the sheet first; iOS swipe down closes it. Forms with unsaved changes ask "discard changes?" (drafts are kept where they exist, e.g. resume and ambassador application).
4. **Tabs:** tapping the active tab scrolls to top, a second tap goes to the tab's first screen. Android back on a non-Home tab goes to Home; on Home it exits (standard Android).
5. **Android 15/16 predictive back:** the app targets SDK 36. Test the back gesture on an Android 15 and Android 16 device, check every `BackHandler` (12 files) still fires as expected with the system back animation, and fix any screen where it doesn't.
6. **Test:** extend `tests/app/back-navigation.test.js` so **every registered route** (from `routes.js`) is checked for a back target. Add an automated end-to-end run (Q-7) that opens each screen and presses back.

### Q-3 Speed work (safe, one change at a time, each measured before/after)
| Step | What | Risk control |
|---|---|---|
| Q-3a | **Native stack** (`@react-navigation/native-stack`, the same library family; new package, approved here as part of navigation) for the home stack first, then the others. Transitions run on the native side, so they stay smooth even when JS is busy. | one stack per release; same route names and params (the `routes.js` test catches mismatches); custom header stays |
| Q-3b | **Long lists → `FlatList`** (or FlashList if approved later) for the 36 `ScrollView + map` screens, starting with deals, brands, events, feed, jobs and confessions. `keyExtractor`, memoised rows (pattern exists), `getItemLayout` where rows are fixed height. | per screen, with a snapshot of the same content |
| Q-3c | **Instant reopen:** persist the React Query cache to storage (`@tanstack/query-async-storage-persister`, small package) for read-only screens (Home, brands, events, profile, crew), so they open with yesterday's data and refresh quietly. | only non-sensitive data; cleared on logout (the existing `clearClaimedData` pattern) |
| Q-3d | **Optimistic actions:** like, me-too, save, follow and claim-start update the screen instantly, then confirm with the server, with an undo on failure. | already done for some likes; same pattern everywhere |
| Q-3e | **Prefetch on press-in:** start the detail request when the finger touches a card (deal, event, job, confession), so the screen is usually ready when it opens. | React Query `prefetchQuery` |
| Q-3f | **Split the 7 giant screens** into components + hooks, without behaviour change, before adding features to them (Resume, Events, Offer, Brands). | split-only commits, tests before and after |
| Q-3g | **Remove `console.log` from release builds** (babel `transform-remove-console`, keep `warn`/`error`). | dev-only change |
| Q-3h | **Android minify + shrink resources** (`enableProguardInReleaseBuilds: true`, `enableShrinkResourcesInReleaseBuilds: true`). | **high attention:** it can break libraries that use reflection (Stripe, WebRTC, Facebook SDK). Ship in an internal test track first and test payments, calls, login and Meta events before release |
| Q-3i | **Images:** move the last 5 `react-native` `Image` uses to `RemoteImage`; lower image quality automatically on slow networks (NetInfo). | — |
| Q-3j | **Animations on the UI thread:** new animations use Reanimated (installed), not the old `Animated` JS driver, and respect reduce-motion. | — |

### Q-4 Same app, native feel on each platform
| Area | Android | iOS |
|---|---|---|
| Back | hardware/gesture back, predictive back tested (Q-2) | edge swipe on every pushed screen, swipe down on sheets |
| Screen edges | edge-to-edge (Expo 54): the tab bar and buttons stay above the gesture bar; test 3-button and gesture navigation | notch, Dynamic Island, home indicator safe areas |
| Keyboard | migrate the 25 `KeyboardAvoidingView` screens to `react-native-keyboard-controller` (`KeyboardAwareScrollView`), already installed and at the root | same component, so behaviour matches |
| Pickers and dates | Material pickers | iOS spinners/sheets (the existing `ios-pickers` test) |
| Permissions | notifications (Android 13+ prompt), photos, location | notifications, photos, location, App Tracking Transparency (installed); ask with a reason first (N-3) |
| Feedback | `PressScale` + haptics where supported | `PressScale` + haptics |
| Share | Android share sheet, WhatsApp first in copy | iOS share sheet |
| iPad | — | **centred layout with max content width (~600 pt)** on every screen, or remove iPad support (`supportsTablet: false`, owner decision) |
| Fonts | font scaling up to 1.3 on titles (done) | Dynamic Type same |

### Q-5 Weak network and offline (common on Pakistani mobile data)
- **An offline banner**, not a blank screen: cached content stays visible with "you're offline · showing saved info" (NetInfo is installed).
- **Every request has a timeout and one automatic retry** (the existing `config/timeouts.js`); errors show a plain message and a "try again" button (`plainError` exists).
- **Writes queue when offline** where safe (likes, saves, resume edits; the Studio already does this) and send when back online. Payments and claims **never** queue: they say "you're offline" instead.
- **Low-data mode:** smaller images and no autoplay video on slow connections.

### Q-6 Release safety (both stores and over-the-air)
- **Device test matrix per release** (manual checklist + Q-7 automation): low-end Android (Android 10–11), mid Android (Android 14), Android 16 (predictive back), iPhone SE (small screen), recent iPhone, iPad (or remove tablet support). Big font size and dark-mode system setting (the app stays light) on at least one of each.
- **Staged rollouts:** Google Play staged rollout (e.g. 10% → 50% → 100%), App Store phased release, and over-the-air updates shipped to a test channel first. Halt and roll back if crash-free users drop below 99.5% or a new error type appears in Sentry.
- **Over-the-air rule:** JS-only changes ship over the air (runtime = app version). Anything native waits for a store build (§1 rule 9). Never ship an update that needs a native module the installed app doesn't have; guard every new native call (`if (Module) …`).
- **Store review readiness:** account deletion works (done), privacy texts match real permissions (done), the iPad check above, and demo login details for reviewers.

### Q-7 Automated end-to-end tests (developer tool, not in the app)
Use a mobile E2E runner such as **Maestro** (runs flows written in YAML on an Android emulator and iOS simulator, no app code change). Core flows run before every release:
1. sign up with an invite link and land with the code filled in;
2. open every tab and 20 key screens, pressing back each time (never exits, never stuck);
3. claim a deal end to end;
4. fresher builds a resume and downloads the PDF;
5. post a confession, get blocked for a phone number, edit, post, report;
6. ambassador invite → apply;
7. turn notifications on from the reason sheet;
8. airplane mode: cached screens still open, offline banner shows.

**Exit check for Phase Q:** the budgets in Q-1 are met on the reference phone; all Q-7 flows pass on both platforms; back works from every registered route; crash-free users ≥ 99.5% for 7 days after release.

---

## 10. Admin portal changes (summary)

| Page | Change |
|---|---|
| Crew Inbox | applications from the app (P2-3) with university, why, groups; approve/reject sends a push; note to student |
| Crew Partners | filter by university, invites per ambassador (from referrals), active/inactive |
| Crew Campaigns | pick partner/brand from search instead of raw ids (today: free-text `brandId`/`partnerId`) |
| **Confessions (new)** | moderation queue + settings (P4-7) |
| Resume (new, small) | template usage, fresher vs experienced split, average time to finish, AI bullet usage (read-only metrics) |
| Features | the 5 new flags (P0-1) |
| Drops Schedule | allow linking a drop to a confession tag/poll |

---

## 11. Server changes (all additive) and analytics

### 11.1 Routes
| Route | Phase | Notes |
|---|---|---|
| `GET /i/:code` (HTML) | P1-2 | public, cache 5 min |
| `GET /engagement/referrals/leaderboard?university=` | P1-4 | optional param on existing route |
| `POST /api/crew/applications`, `GET /api/crew/applications/me` | P2-3 | reuse the admin's application model |
| `GET /api/crew/campaigns/me`, `GET /api/crew/credentials/me` | P2-5 | read-only for the partner |
| popup type `ambassador_invite` + eligibility job | P2-1 | existing popups system |
| `POST /api/resume/ai/bullets`, `POST /api/resume/:id/feedback` | P3-4, P3-7 | rate-limited, cached, fact-checked output |
| resume model: `settings.track`, `activities[]`, `volunteering[]`, `awards[]`, `coursework[]`, `interests[]` | P3 | optional, default empty |
| `utils/resumeRules.js` fresher track | P3-2 | identical in app + server |
| confessions: pre-check on create/comment, `POST /:id/report`, `POST /:id/mute-author`, `DELETE /:id`, `POST /:id/follow`, poll vote, feed `sort`/`tag` | P4 | old clients unaffected |
| confession model: `handleMode`, `tag`, `mood`, `poll`, `status (live/pending/hidden/removed)`, `reportCount`, `meTooCount` | P4 | defaults keep today's posts live |
| user model: `anonHandle`, `anonAvatar`, `confessionRulesAcceptedAt` | P4-2 | generated lazily on first use |
| admin confession moderation routes + audit log | P4-7 | admin auth + role check |

### 11.2 Funnel events (P0-3)
`invite_link_opened`, `invite_code_prefilled`, `signup_with_ref` · `amb_invite_shown/accepted/not_now/never`, `amb_intro_card_{1-4}`, `amb_apply_submitted`, `amb_approved` · `resume_start_{upload|profile|fresh}`, `resume_track_{fresher|experienced}`, `resume_step_done_{n}`, `resume_ai_bullets_used`, `resume_finished`, `resume_minutes_to_finish` · `confession_precheck_{ok|edit|hold}`, `confession_reported`, `confession_shared_card`, `confession_followed` · `share_card_{variant}`.

### 11.3 Success targets (first 30 days after full rollout)
- Referral attribution: ≥ 70% of referred Android signups arrive with the code pre-filled.
- Ambassador: ≥ 15% of shown invites → "tell me more", ≥ 5% → application.
- Resume: median time to first PDF ≤ 6 min; ≥ 50% of starters finish; fresher-track average score ≥ 75.
- Confessions: report-to-action median ≤ 2 h; posts/DAU up ≥ 20%; zero identifying posts surviving > 24 h.
- Share cards: ≥ 10% of celebrations shared.

---

## 12. Owner decisions (21 Nov 2026), final

| # | Topic | Decision |
|---|---|---|
| 1 | Server repo | **Still public** (checked 21 Nov: `github.com/QadeerBurio/the-deft-crew` opens without login). **Owner action today:** GitHub → repo → Settings → Danger zone → *Change visibility → Private*. Then the developer checks the git history for any key ever committed (e.g. `gitleaks` or GitHub secret scanning) and rotates any found on Railway. The other Railway server, `QadeerBurio/server`, is already private. |
| 2 | Push settings | **Owner action today:** Railway → project *endearing-bravery* → service *the-deft-crew* → *Variables*, and read the six `SOCIAL_PUSH_*` values. Then set `SOCIAL_PUSH_GROUP_MINUTES=180` and `SOCIAL_PUSH_DAILY_MAX=2`, and keep `SOCIAL_PUSH_QUIET_HOURS` unset or on. This restarts the server (~1 min), so do it late at night. |
| 3 | Other Railway services | `Social-Dashboard` is **not deployed** on Railway. Railway runs: `the-deft-crew` (production API, used by the app), `syncDeft_Server`, `shopify_tdc`, and an older `server` (`QadeerBurio/server`, US region, last deploy 28 Oct, 8 variables incl. `ADMIN_PASSWORD`). **Owner to confirm whether that old `server` is still used. If not, remove it** (cost, and an extra attack surface). |
| 4 | Invite domain | `gettdc.pk/i/<CODE>` (app-link verification in the v1.2.0 store build) |
| 5 | Play install referrer | yes (v1.2.0 store build) |
| 6 | Invitee reward | +50 points each (inviter and invitee) |
| 7 | Sentry + in-app review | yes to both |
| 8 | Ambassador perks | ambassador certificate, recommendation letter, Instagram feature, internship referral, discount card tiers; **money only for founder circle** |
| 9 | Ask-once triggers | as proposed |
| 10 | Web `/ambassador` | sends people to the app |
| 11 | Application review time | 5–7 working days (app says "within 7 working days") |
| 12 | Photo template | optional, off by default; no CNIC, date of birth or marital status |
| 13 | Resume language | English only, no translation |
| 14 | Handles | yes: student chooses `@handle` or fully anon per post |
| 15 | Downvotes | off |
| 16 | Auto-hide | 3 reports, or 1 report with evidence confirmed by the re-check |
| 17 | Moderation | **automatic, no team** (P4-1b): banned topics incl. religion, politics, racism, sect/ethnicity, sexual/vulgar, threats; strikes and suspensions; safety emails to admins with blacklist/restore; reports need evidence. Single-report suspension available as a setting, default off. |
| 18 | Helplines | Pakistani: 1166, Umang 0311-7786264, Rozan 0800-22-444, emergency 1122/15 (call-test before launch) |
| 19 | Tags | starting list as proposed, admins can add more |
| 20 | Push permission | ask after a good moment, with a reason |
| 21 | Daily digest | yes, 6 pm Karachi |
| 22 | Header search button | yes |
| 23 | Phase sign-off | owner, on a real phone |
| 24 | Developer pace | the developer builds with Claude, so coding is fast. **The release gates (staging test, staff → 10% → 50% → 100% with 48 h watching each) stay as written.** Speed of building is not the risk; untested changes reaching live students are. |

---

## 13. Release plan, QA and rollback

**Phase Q runs alongside every phase:** its budgets and back-navigation rules are part of every phase's exit check, and its speed work (Q-3) goes first in each area before new features are added there.

**Order:** S1 (make repo private) and N-1 (Railway push settings) **today** → P0 → P4-1 confession safety + the admin safety queue (urgent) → P1 (JS part OTA; P1-3 waits for the store build) → Phase N → **Phase A (team access, before hiring more staff)** → P2 → P3 → rest of P4 → P5. Native items (install referrer, store review, new app-link domain) go in **one** store build, v1.2.0.

**Per phase:**
1. Build on staging and run `node tests/run-all.js` + new suites (`tests/app/resume-v2.test.js`, `confessions-v2.test.js`, `ambassador.test.js`, `invite-link.test.js`, server `resume-rules-tracks.test.js`, `confession-precheck.test.js`).
2. Android bundle check `npx expo export --platform android` (as in the redesign task).
3. Manual checklist on one low-end Android + one iPhone: guest, new student, existing student with old data, offline, large font, slow network.
4. **Backward check:** install the current store build (v1.1.13) against the new server and run signup, confession post/like/comment, resume open/edit/PDF, crew screen. Everything must work unchanged.
5. Flag on for staff → 10% of students → 50% → 100%, watching errors and §11.3 metrics for 48 h at each step.

**Rollback:** turn the flag off in admin (instant, no build). For server changes, every new field is optional, so the old code can be redeployed without migrations. Never run destructive migrations in this upgrade.

**Definition of done (whole upgrade):** all phases flagged on at 100% for 7 days, no new crash or error spike, the owner has signed off each phase on a real phone, `PROGRESS.md`-style log kept (`tdc-upgrade-v2/PROGRESS.md`) with commit hashes per step.

---

## Appendix A: what was taken from competitors and why

| Competitor feature | Decision | Reason |
|---|---|---|
| Kickresume AI Writer (job title → experience section) | **adapted**, experienced track only, facts confirmed | inventing duties would hurt students in interviews |
| Kickresume Resume Feedback | **taken** (P3-7) | cheap, high perceived value; uses our deterministic rules first |
| Kickresume Tailoring | **already built** (Resume Studio), better (truthful review) | keep, surface it at "finish" |
| Kickresume Translation | **not taken** | owner: resumes are English only |
| Kickresume 40+ templates, colours, caps | **taken and extended** (P3-6): 30 templates in 6 collections, layout + theme engine, 12 palettes, 8 embedded font pairs, section reorder, photo options, ATS-safe badge tested on every template | quality bar + verified-by-tdc + outcome data are what paid builders can't offer |
| Kickresume PDF / Word / link share | PDF + link **exist**; Word export later if asked | — |
| Posheeda handles, avatars, "a profile not a name" | **taken** (P4-2) | identity drives return visits |
| Posheeda server check + report in 2 taps | **taken, priority** (P4-1) | safety keeps the feature alive on campus |
| Posheeda composer prompts, categories | **taken** (P4-3, P4-4) | gets first-time posters over the blank box |
| Posheeda daily poll | **already exists** (daily drops) | link drops to confessions |
| Posheeda petitions, status timeline, campus league, scorecards | **not taken now** | different product (grievances); would confuse a super-app |
| Posheeda semester recap share | **adapted** as share cards + weekly recap | growth loop |
