# tdc upgrade v2: progress log

Plan: [TDC_UPGRADE_PLAN.md](TDC_UPGRADE_PLAN.md) (copied unchanged from the owner's copy, md5 `58616ee8…`).
Repos (sibling folders): APP `Testting` (The-Deft-Crew-App), SERVER `server` (the-deft-crew), ADMIN `edu-boost` (tdc_admin_portal).
Branch per phase in every repo: `upgrade/p0-safety`, …. Nothing is pushed, deployed or published without the owner's written OK.

## Release facts (owner, 21 Nov 2026)

- `app.json` on main: version **1.2.2**, build 89, `runtimeVersion.policy = appVersion`. (`package.json` still says 1.1.13; EAS ignores it.)
- Live store versions: Play = **pending (owner)**, App Store = **pending (owner)**.
- The next native (store) build is **1.3.0**. Every native change in this plan (install referrer, Sentry, in-app review, `gettdc.pk` app links) waits for it. Where the plan says "v1.2.0 store build", read 1.3.0.
- **OTA rule:** an `eas update` only reaches phones whose binary has the same runtime version (= app version). A JS-only change must be published once **per live runtime version we still support** (e.g. 1.2.2 and, later, 1.3.0). Phones on an older binary get nothing until they update from the store.
- Railway has **only a production environment**. No staging exists yet. Until the owner creates it (steps in server `docs/STAGING.md`), all testing is local.

## Baseline on main (21 Nov 2026, before any change)

| Repo | Command | Result |
|---|---|---|
| APP | `node tests/run-all.js` | 53 suites: 51 ok, 1 skipped (`admin/tickets-admin-ui` needs `ADMIN_BUILD`), **1 FAIL**: `app/meta-attribution` "ships as 1.2.1" (app.json is 1.2.2 since `cdf72e6`) |
| SERVER | each `tests/*/run.js` (run from a folder without `.env`) | 67 suites: 66 ok, all checks pass; `shopify-review-149610` not runnable here (needs a disposable local MongoDB via `TDC_TEST_MONGO_PORT`) |
| ADMIN | `npm run check:portal` · `CI=true npx react-scripts test --watchAll=false` | 38/38 portal checks · 20/20 suites, 106 tests |

All server suites use in-memory fakes; they delete `MONGO_URI` and stub `dotenv`, so no database is touched.

## Plan corrections (where the code differs from the plan, and what was done instead)

| Plan says | Code shows | Decision |
|---|---|---|
| App is v1.1.13, next store build v1.2.0 | `app.json` is 1.2.2 (build 89) | next store build = 1.3.0 (owner) |
| Plan lives in `tdc-upgrade-v2/` in the APP repo | it wasn't in any repo | copied here (owner) |
| P0-1: flags get admin tabs "if it lists server flags; verify" | admin tabs list only flags with a `grant` entry in `config/featureFlags.js`; flags in `ROLE_DEFAULTS` are ON for every account of that role | new flags get `grant` (student), `default: false`, and are **never** in `ROLE_DEFAULTS` |
| P0-2: staging server + admin running latest code | no Railway staging environment exists; `docs/STAGING.md` exists (written for one) | owner creates it from `docs/STAGING.md` with its own MongoDB; local testing until then |
| P0-2: STAGING.md warns some screens call production directly | app (`app/src/config/server.js`) and admin (`src/config/api.js`) now read the server address from one place | warning marked as resolved in `docs/STAGING.md` |
| P0-3: use the `analytics/metaEvents.js` pattern | that module is Meta App Events (consent-gated, Meta kill switch) | funnel events **never go to Meta**; they go to `POST /api/engagement/events`, whose allowlist gains the §11.2 names |
| P0-3: server event "if one exists" | `/engagement/events` accepts only 5 names; `track()` dedupes per user + name + day unless `meta.refId` is sent | allowlist extended (additive) |
| P0-5: "log through the existing server log route" | no such route exists | option A (owner): Sentry in the 1.3.0 build; until then `reportError()` → `console.warn` |
| P4-1b: log clicks to `AdminAuditLog` | `AdminAuditLog` accepts only account-deletion actions | `AdminActionLog` everywhere (owner) |
| C1b: "no admin route ever reads the Report collection" | `/api/social/admin/reports*` routes exist (`social.routes.js` L319–536) and the portal has `socialApi` wrappers, but **no screen uses them**; they handle Post/Comment/User only | new `/api/admin/safety/*` routes; the old ones stay untouched (owner) |
| C3: "only the app button is missing" for delete | Social `ProfileScreen.js` already deletes a confession (L370) and lists "my confessions" (L208) | only the ⋯ menu on the confession feed is new |
| P4-1 "suspend account" | `User.accountStatus` (suspended / banned) is **not enforced** anywhere (auth middleware, login) | new step **P0-6**, behind `accountStatusEnforce` (off) |
| P4-1 `422 { code, reasons }` | v1.x apps only show `err.error` | 422 bodies also carry an `error` sentence |
| P4-1 flag `confessionsV2` | — | separate flag `confessionSafety` so safety can reach 100% alone (owner) |
| (not in plan) | live `GET /confessions/my-confessions` (L1413) returns commenters' real names and photos to the author | fixed for everyone in P4-1, same shape, others' `user = null` (owner); S3 likes list likewise |
| P4-6 split comes late | owner rule: split big files before adding features | ConfessionScreen split-only commit comes first in P4-1 |
| P4-7 new admin page under menu "oversight" | the portal removed its "oversight" section earlier, and a portal check asserts it stays gone | "safety" in the existing "general" group, after "admin actions" |
| P4-7 routes in `routes/admin.routes.js` | that file is large, with its own admin check | same URLs (`/api/admin/safety/*`) in a new `routes/adminSafety.routes.js` |
| P4-1 report / mute routes in `social.routes.js` | 3,300 lines | new `routes/confessionSafety.routes.js`, mounted at `/api/social` before it (new paths only) |
| P4-1 guidelines gate via the existing Guidelines screens | full screens in other stacks | a rules sheet in the confession flow (`ConfessionRulesSheet.js`), accepted once on the server |
| P4-1 "delete own confession" from the card ⋯ menu | the feed doesn't say which posts are mine | with the flag on, the app reads its own ids from the existing `my-confessions` |
| P4-1b "suspend account" | suspension only locks out while `accountStatusEnforce` is on (P0-6) | a suspension also sets a long confession ban, so confessions stop either way |
| P4-1b e-mail shows "the author's handle" | handles come in P4-2 | an anonymous reference (`author-xxxxxxxxxx`), the same in e-mails and on the admin page |
| (owner, P4-1b) socket: verify the token, ignore the client id | most app socket screens send no token | the token decides when present; without one: as before while `accountStatusEnforce` is off, refused once on. The app now sends its token |
| §12 #6 "invitee reward: +50 points each" (and P2-7) | live system: the referrer gets +50 at signup; **both** get +100 when the friend starts using tdc (first card sorted) | **owner, 22 Nov 2026: keep the live system, no reward change.** Share and signup copy: "you both get 100 points when your friend starts using tdc" |
| P1-2 `GET /i/:code` server-rendered page on gettdc.pk | gettdc.pk is the portal (React, on Vercel), not the server | a static page in the portal (`public/i/index.html`) + `POST /api/invites/:code/open` on the server (owner) |
| P1-1 app links "verified host" | the Railway host's `autoVerify` fails (no assetlinks.json served); iOS has no associated domains | gettdc.pk app links prepared for 1.3.0 (`release-1.3.0.md`) |
| P1-4 "uses the existing getReferralLeaderboard" | all-time only, full names and photos of the top 10 to every student, no rank, no campus | monthly / rank / campus params; first names, no photos for everyone (owner) |
| P1-1 validate | public route returned the referrer's full name and photo (any code could be tried) | first name only, no photo, rate-limited, for everyone (owner) |
| (found in P1) | `referral_signup_bonus` / `referral_credited` events were written with `source: 'system'` (signup in `routes/auth.routes.js`, and `services/engagement/referral.js`), which the event model rejects (only server / client); the error was caught, so **the points were paid, only the event rows were lost** | fixed in P1 follow-ups: `source: 'server'` (an existing value, no enum change); read-only `scripts/count-referral-credits.js` for the owner |
| (found in P1 follow-ups) | live referral rewards: the signup route pays the referrer **+50 and +100** and the new student **+100** at signup, before the e-mail code is entered (students start `emailVerified: false`); `referral.js`'s "+100 on first sort" then finds the same keys and pays nothing. The P1 share text says "when your friend starts using tdc" | **owner, decision #6 updated (P1 follow-ups sign-off):** keep the amounts (referrer 150, new student 100) but pay only after the new student verifies their e-mail, behind `referralVerifyGate` (off); already-paid rewards never touched. Copy (growthV2): "your friend gets 100 points and you get 150 when they join and verify their email" (signup / invite page, the invitee's view: "you get 100 points and your friend gets 150 when you join and verify your email") |
| N-1..N-7 flags | the plan names `pushBudgetV1` and `pushAskV2` only | one flag per step, all off, grantable to students, none in ROLE_DEFAULTS: `pushOpenTracking` (N-6a), `pushBudgetV1` (N-2), `pushAskV2` (N-3), `unifiedInbox` (N-4), `notifSettingsV2` (N-5), `pushCopyV2` (N-7); server-only `referralVerifyGate` |
| N-2 classes | plan: personal "quiet hours respected except chat" | owner: quiet hours for relevant and broadcast only; personal never waits. Bell pushes are classed by the bell row's type (their push type is only a sound family). The budget replaces the gateway's own quiet hours and caps for flag accounts; the social daily max (N-1) stays as an extra ceiling |
| N-3 good moments | first deal claimed, first confession posted, first job applied | the same, from the success points of the 3 offer-claim screens, the job form and a confession that isn't held |
| N-4 tabs | for you · campus · system | social items and your own applications / tickets / bookings / payments / messages → for you; offers, jobs, scholarships, courses, programmes, promotions → campus; account / app messages → system. Chat messages stay out (own badge); event creators' notices stay separate (owner) |
| N-5 "mute per confession thread (P4-5)" | P4-5 (confession follow / unfollow) isn't built | waits for P4-5 |
| N-5 digest | "today at your campus: 12 confessions, 2 events" | real counts of today only: live confessions at the student's university, posts by its students, newly approved events (events are city-wide, so "N new events", not "at your campus"); a 0 part is left out; nothing → no push. With the digest on, the per-item campus pushes skip the student |
| N-6 report | from `PushLog` + receipts | opens were never recorded (see Phase N verification): N-6a adds tracking first; the report reads tracked rows only, rates from `PUSH_REPORT_MIN_SENT` sends of a type (default 50), "not enough data yet" below. Opt-outs are recorded (tracked accounts only) as `notif_opt_out` events |
| N-7 copy pass | wording | also found made-up numbers in today's win-back copy (`{n}` = days shown as "deals dropped" / "Rs saved", a "tdc · 20% off" offer that doesn't exist); fixed for `pushCopyV2` accounts with real counts and the best live offer, or no push |
| (found in P4-1) | confession mention notifications named the commenter ("<name> mentioned you in a confession") | anonymous with `confessionSafety` on; **recommend making it unconditional** (owner) |
| P0-1/P0-3/P0-5: add app helpers in Phase 0 | `tests/app/app-cleanup` fails on any `app/src` file nothing imports | written and tested in Phase 0, kept in `tdc-upgrade-v2/pending/`, moved into `app/src` with their first caller (P4-1) |
| P0-6 (new, owner) "super admins are exempt" | no admin levels exist until Phase A (`User.adminAccess`) | every `role: 'admin'` is exempt for now (plan A-1: admins without `adminAccess` count as super); revisit in Phase A |

## Known issues (recorded, not changed)

- SERVER `routes/social.routes.js`: `GET /admin/reports/stats` is declared after `GET /admin/reports/:reportId`, so `/stats` is answered by the detail route (`findById("stats")` → 500). No screen calls it. Leave as is (owner).
- SERVER repo is public on GitHub (S1): owner makes it private.
- N-1 (Railway `SOCIAL_PUSH_*` values): owner.
- APP repo tracks `google-services.json` and `eas.json` (already committed before this upgrade). Never edited or re-staged; commits stage explicit paths only.
- APP `app.json` has an uncommitted whitespace-only change from before this work; never staged.
- SERVER `tests/loyalty-visits` is flaky (pre-existing): "no name, phone or e-mail in the reply" checks the reply for the text `0300`, which a random ObjectId in the reply sometimes contains. Failed once in 8 runs; not changed.
- SERVER P0-6 does not cover the separate chat service (`chat-service/src/middleware/auth.middleware.ts` verifies tokens itself), and socket.io's `user_online` event takes a user id without any token check (pre-existing). To handle with P4-1b.
- APP ESLint baseline: 118 errors, 590 warnings (incl. 5 `no-dupe-keys` in style objects).
- ~~SERVER `tests/loyalty-visits` flaky~~: fixed before P4-1 (`4922ce01`: checks the exact phone).
- SERVER socket.io: apart from `user_online` (fixed in P4-1b), the chat events (`join_chat`, `send_message`, calls) still take ids from the client with no token (pre-existing). Worth its own step.
- SERVER `chat-service/dist` is older than its source in one place (`controllers/profileController` exists only in src; nothing loads it). P4-1b rebuilt only `dist/middleware/auth.middleware.js`.
- SERVER admin "warn" notices name the admin as sender (as the older report route does).
- SERVER `services/analytics/adminMetrics` and `services/accountDeletion` still read every confession whatever its status (metrics count what was posted; deletion must find everything): intended.
- APP a confession image is uploaded to Cloudinary before the pre-check; a blocked post leaves that image unused there.

## Steps

| Plan id | What changed | Files | Commit | Tests | Open |
|---|---|---|---|---|---|
| P0 setup | plan + this log | APP `tdc-upgrade-v2/TDC_UPGRADE_PLAN.md`, `PROGRESS.md` | APP `89d20ed` | baseline above | — |
| P0 baseline | `meta-attribution` expects the current version 1.2.2 (same check, current value) | APP `tests/app/meta-attribution.test.js` | APP `88f7fa4` | suite 22/22 | — |
| P0-4 | ESLint config: only the Expo flat config (three `module.exports` → the Babel one won). `npm run lint` runs: **118 errors, 590 warnings** (baseline, not fixed). Worth a look later: 5 `no-dupe-keys` in style objects (`ResumeStudio.js` 733, `Social/UserProfile.js` 2154, `University.js` 131/140/143). `package.json` name `testting` left as is (renaming has no benefit and some risk). | APP `eslint.config.js` | APP `25c1b3e` | APP run-all: all ok | dupe keys: owner to decide |
| P0-1 (server) | six upgrade flags + `accountStatusEnforce` (server only), all off; never in `ROLE_DEFAULTS` | SERVER `config/featureFlags.js`, `tests/feature-access/run.js` (counts 7→13, 6→12, startup line), new `tests/upgrade-flags/run.js` | SERVER `657ac685` | server 66/66 runnable suites ok (upgrade-flags 26/26, feature-access 96/96); APP `tests/server/app-flags` ok | admin: no code needed, tabs come from the server list |
| P0-1/P0-3/P0-5 (app) | `api/upgradeFlags.js`, `analytics/funnel.js`, `utils/reportError.js` + tests written and passing, but **parked** in `tdc-upgrade-v2/pending/`: `app-cleanup` forbids files nothing imports. They land with their first caller in P4-1. | APP `tdc-upgrade-v2/pending/*` | APP `a2123f8` | 11/11 + 13/13 when in place; APP app group 46/46 | move in with P4-1 |
| P0-3 (server) | funnel names accepted on `POST /api/engagement/events` (exact + families), meta cleaned, per-user limit `funnel_events` (120 / 10 min) on funnel events only; the five older events unchanged | SERVER `config/funnelEvents.js`, `routes/engagement.routes.js`, `utils/userRateLimit.js`, new `tests/funnel-events/run.js` | SERVER `6663d46b` | funnel-events 25/25; full server 66 ok + 1 flaky (see known issues), rerun 6/6 ok | — |
| P0-2 | `docs/STAGING.md`: status (no staging yet), owner's order of work, own MongoDB, never the production `MONGO_URI`, seed step, upgrade flags, local testing; stale warnings resolved. `scripts/seed-staging.js` (3 unis, 20 students @staging.test, 10 confessions, 5 resumes; refuses unless `APP_ENV=staging` and the DB name contains "staging"; dry run by default; never reads `.env`; idempotent) | SERVER `docs/STAGING.md`, `scripts/seed-staging.js`, new `tests/seed-staging/run.js` | SERVER `da0289b3` | seed-staging 21/21 | owner creates staging, then runs the seed |
| P0-5 | option A: `reportError()` (console.warn) parked with the other app helpers; Sentry goes into the 1.3.0 store build | (see P0-1 app row) | APP `a2123f8` | 13/13 (funnel-events incl. reportError) | Sentry in 1.3.0 |
| P0-6 | `accountStatusEnforce` (server only, off): banned / running suspensions get 401 `ACCOUNT_BANNED` / `ACCOUNT_SUSPENDED` on requests (the app's 401 handling signs out) and 403 with the reason on `/login` (after a correct password only) and `/signup/verify-otp`; expired suspensions, deactivated, guests unaffected; **admins never locked out**; `req.user` keeps its old fields. Read-only `scripts/count-account-status.js` for the owner. | SERVER `services/accountStatus.js`, `middleware/auth.middleware.js`, `routes/auth.routes.js`, `scripts/count-account-status.js`, new `tests/account-status/run.js` | SERVER `ad5286a9` | account-status 42/42; full server 69/69 runnable ok | owner runs the count, then decides; chat service + socket not covered (known issues) |
| P0 close | full runs on the final branches | — | — | APP run-all: 53 ok, 1 skip (admin UI, needs a build); SERVER: 69/69 runnable ok; ADMIN: unchanged (no admin code in Phase 0; baseline 38/38 + 106/106); `npx expo export --platform android` ok (bundle 9.7 MB, `app/src` unchanged) | owner sign-off |

## P4-1 confession safety + admin Safety log (branch `upgrade/p4-1-safety`, built on `upgrade/p0-safety`)

| Plan id | What changed | Files | Commit | Tests | Open |
|---|---|---|---|---|---|
| (owner) | loyalty-visits flaky test: checks the exact seeded phone, not the prefix "0300" | SERVER `tests/loyalty-visits/run.js` | SERVER `4922ce01` | 12/12 runs ok | — |
| P4-6 split | ConfessionScreen.js (1,742 → 1,061 lines) into ConfessionCard, ConfessionCommentThread, ConfessionComposer, ConfessionComments, confessionStyles; JSX moved verbatim | APP `screens/Social/*` | APP `c4a6416` | identical rendered trees before / after; APP run-all ok; export ok | — |
| P4-1 | status on confessions / comments (missing = live), Report reasons + evidence, User safety fields; every reader live-only (feed, comments, like, comment, likes, Daily Drop); muted authors. **For everyone:** my-confessions sends no commenter names; likes list names only for the author (S3) | SERVER `models/*`, `routes/social.routes.js`, `routes/adminEngagement.routes.js` | SERVER `bd9cd6f5` | confession-visibility 28/28; server 70/70 | — |
| P4-1 | pre-post check (profanity + banned words; phone / e-mail / CNIC / links / classmates' names; OpenAI moderation on text + image; topic check), 3 s timeouts, held on any failure; 422 NEEDS_EDIT with an `error` sentence; held posts: no push, no points; self-harm support; 3 blocks in 24 h → ban + strike; per-user limits; anonymous mentions | SERVER `services/confessionCheck.js`, `confessionStrikes.js`, `safetyAlerts.js`, `safetySettings.js`, `models/SafetySettings.js`, `models/SafetyAction.js` | SERVER `7184977a` | confession-precheck 49/49; server 71/71 | owner: `SAFETY_ALERT_EMAILS` on Railway |
| P4-1 / P4-1b / P4-7 | reports (evidence → hide + re-check → remove + strike, or restore + false-report mark; threshold 3), mute, rules accepted, safety/me; strike ladder → suspension; e-mail one-time blacklist / restore links; signup blocklist (hashes only); admin Safety routes (all content types, held, resolved, decisions, logged identity reveal, settings) | SERVER `routes/confessionSafety.routes.js`, `routes/safetyActions.routes.js`, `routes/adminSafety.routes.js`, `models/Blocklist.js`, `server.js`, `routes/auth.routes.js` | SERVER `cd71c8c9` | confession-reports 50/50, admin-safety 27/27; server 73/73 | — |
| P4-1b (owner) | socket `user_online` trusts the token, not the client id; chat service honours suspensions (dist rebuilt for that one file) | SERVER `socket/socketIdentity.js`, `server.js`, `chat-service/{src,dist}/middleware/auth.middleware.*` | SERVER `6716fedb` | socket-identity 16/16; server 74/74 | before enforcement: most installs must be on an app that sends the token |
| P4-1b (app) | `user_online` sends the token as the 2nd argument | APP InquiryChatScreen, MatchChatScreen, ChatDetails | APP `790cf22` | socket-token 5/5 | ships with the next app release |
| P4-1 (app) | ⋯ menu (report / mute / delete mine), comment report, ReportModal for confessions (+ evidence), rules sheet, needs-edit reasons in the composer, support sheet, "under review"; funnel events; the P0 helpers moved into `app/src` | APP `screens/Social/*`, `api/upgradeFlags.js`, `analytics/funnel.js`, `utils/reportError.js` | APP `d785e98` | confessions-v2 33/33 (flag off = the split commit exactly); APP run-all ok; export ok (9.74 MB, +40 KB) | — |
| P4-7 (admin) | Safety page (menu "general", after admin actions): reported / held / resolved / settings, decisions with a note, who-wrote-it with a reason | ADMIN `screens/AdminSafety.js`, `services/safetyApi.js`, `portal/PortalNav.js` (+ its test), `screens/AdminDashboard.js`, `scripts/portal-checks/admin-menu-ui-check.js` (expected menu + a mock reply) | ADMIN `3aa488b` | AdminSafety 5/5; jest 21 suites / 111 tests; portal checks 38/38 | — |

**Not done in P4-1, and why:** an "appeal" button for a suspended student (the 403 already says why; the button needs a login-screen change and an appeal inbox address from the owner); the live client-side pre-check hint (P4-4); handles (P4-2).

## P4-1 follow-ups (branch `upgrade/p4-1-followups`, owner 21 Nov 2026)

| # | What changed | Commit | Tests |
|---|---|---|---|
| 1 | Confession mentions anonymous **for everyone**: text "someone mentioned you…" and the notification's sender is a fixed id that matches no account (before: the commenter was the sender, so the app showed their name and photo and opened their profile) | SERVER `58421ded` | confession-precheck 51/51 |
| 5 | Images were already sent to omni-moderation (image_url with the text); `violence/graphic` wasn't mapped, so a gory image passed. Now blocked (`graphic`). Tests prove the image reaches the call and sexual / graphic images are blocked | SERVER `eb426b36` | confession-precheck 55/55 |
| 2 | Appeals: `SAFETY_APPEAL_EMAIL` → `appealEmail` in the locked-account 401 / 403 and in `CONFESSION_BANNED`; the sign-in screen shows "account paused / closed" with the reason and an "appeal" button (mailto, account e-mail filled in) | SERVER `c695348a`, APP `26753f2` | account-status 46/46, signin-appeal 6/6 |
| 3 | Mode setting **off / observe / enforce** (default enforce = as signed off). Observe: every new confession / comment from **every** student is checked after saving and reports are re-checked; decisions logged (`SafetyObservation`, 90 days); nothing blocked, held, hidden, struck or banned; self-harm still e-mails admins. Admin: mode in settings, new tab "would have blocked" (counts by outcome / reason, items, anonymous authors) | SERVER `6238a5fc`, ADMIN `5decb9d` | confession-observe 36/36, AdminSafety 7/7 |
| 4 | `POST /confessions/precheck` (text only, before an image upload); the app calls it first when an image is attached; server deletes the Cloudinary image when a post is blocked, removed after a confirmed report, or removed by an admin (our cloud only) | SERVER `6238a5fc`, APP `3dbe0f7` | confession-observe, confessions-v2 35/35 |
| 6 | Helplines stay editable in admin (no change) | — | — |

## SEC-1 socket identity (branch `upgrade/sec-1-socket`)

| Step | What changed | Commit | Tests |
|---|---|---|---|
| move | socket.io chat and call handlers moved verbatim from `server.js` to `socket/chatHandlers.js` (only require paths changed) | SERVER `6af65f69` | moved lines diffed; cors-origins, career, live-security, security ok |
| stage 1 + 2 | every event acts as the account of a **verified token** (handshake `auth.token`, `authenticate`, or `user_online`'s 2nd argument); a different client id is ignored and logged; a verified user must be a participant to join / send / read / type / delete in a conversation, deletes only their own messages, and calls / typing carry the real name. Without a token: as before (logged once per socket and event). Flag **`socketTokenRequired`** (server only, off): events without a verified token are refused (`auth_required`). A suspended / banned account's token is refused | SERVER `e1590090` | socket-sec1 25/25 (the old handlers: 7/25), socket-identity 16/16 |
| app | `useSocketAuth(socket, token)` sends `authenticate` now and after each reconnect (ChatDetails before its join, MessageScreen); InquiryChat sends the token at the handshake; MatchChat already did | APP `20ece58` | socket-token 14/14 |

**Before switching `socketTokenRequired` on:** most installs must run an app with SEC-1 (an older app's chats stop working: refused with `auth_required`). The server logs `[sec-1] … without a token (older app)` lines: when they become rare, it's time.

## CHAT-1 chat push notifications (branch `upgrade/chat-1-push`)

**Why they stopped:** on 5 Oct 2026 (commit `f7c672a2`) the device push for a chat message was moved out of `POST /notifications/create-message-notif` into `pushChatMessage` in `socket/chatSocket.js`. That file has never been loaded (since the first commit, `server.js` ran its own socket handlers, now `socket/chatHandlers.js`), so since 5 Oct no chat message has sent a push.

| Step | What changed | Commit | Tests |
|---|---|---|---|
| server | `services/chatPush.js` (the stranded logic, wired into `send_message`): a push to each other participant, opening that chat (MessagesScreen / MatchChat / InquiryChat), only when: flag **`chatPushV1`** on for the recipient; not in that chat's room; their **"messages"** switch on; they haven't blocked the sender; **no quiet hours** (person-to-person, any hour, like WhatsApp; optional override `CHAT_PUSH_QUIET_HOURS=on`); at most one per conversation every 20 s. No daily cap ("personal" in the Phase N budget). The "messages" switch exists only for flagged accounts (like loyalty): `GET/PUT /engagement/notification-prefs` and `/engagement/me` are unchanged for everyone else | SERVER `12681426` | chat-push 20/20 (real socket.io); feature-access 96/96 (14 grantable flags) |
| app | Notification Settings: a "messages · new chat messages" switch, shown only when the server sends it | APP `a9396d7` | social-push-settings 20/20 |

Quiet hours: the owner first asked for them on chat pushes, then corrected it (CHAT-1 sign-off): chat pushes have **no quiet hours** by default, as the plan's N-2 says (the phone's Do Not Disturb handles silence). `CHAT_PUSH_QUIET_HOURS=on` is an optional override; unset / empty = none. Broadcast pushes (posts, confessions, drops, streaks) keep their quiet hours. Commit SERVER `605af794`, chat-push 24/24.

## Backlog (owner, not now)

- Confession composer image button returns in P4-3 (images are now moderated; the precheck and server clean-up are ready).
- SkillShare `typing` event (server handles only `typing_start` / `typing_stop`); tell the other person when a message is deleted (polish phase).
- Fix `tests/app/events-fresh-data` isolation properly (its fixed waits fail under load); no weakening.
- ~~SERVER tests checking for the text "0300"~~: all fixed (loyalty-visits, career, then the remaining 7 suites in SERVER `3c62524c`).
- ~~`referral_credited` events rejected~~: fixed in P1 follow-ups (SERVER `bed92851`).

## Release plan

**Branches** (each repo; each built on the one before, so they merge in this order):
`upgrade/p0-safety` → `upgrade/p4-1-safety` → `upgrade/p4-1-followups` → `upgrade/sec-1-socket` → `upgrade/chat-1-push` → `upgrade/p1-growth` → `upgrade/p1-followups` → `upgrade/phase-n`, merged locally into `release/r1` (Release 1, `RELEASE-1.md`). ADMIN has changes in `p4-1-safety`, `p4-1-followups` and `p1-growth`; its other branches equal the one before. P1 adds: a portal deploy with the new `vercel.json` (check on a preview first), and the 1.3.0 store build later for app links and the install referrer. Nothing is merged, pushed or deployed without the owner's written OK.

**Before staging** (once the owner has created it, `server/docs/STAGING.md`):
1. Staging Railway variables: `APP_ENV=staging`, its own `MONGO_URI`, new `JWT_SECRET`, `SAFETY_ALERT_EMAILS`, `SAFETY_APPEAL_EMAIL`, a capped `OPENAI_API_KEY`, `PUBLIC_BASE_URL`.
2. Deploy the SERVER branch tip to staging (owner), run the seed (`scripts/seed-staging.js`), check the startup log lines (`[flags]`, `[jobs] staging`).
3. ADMIN: a staging build with `REACT_APP_API_URL=<staging-url>`.
4. APP: `EXPO_PUBLIC_API_URL=<staging-url> npx expo start` (or a preview build: owner).
5. Run each phase's manual test steps from its report (P0, P4-1, follow-ups, SEC-1, CHAT-1), on an Android phone and an iPhone.

**Before production**, in this order, each step after the owner's OK:
1. SERVER: merge the branches into `main` in the order above → Railway deploys. All new flags are off and `confessionSafety` mode is `enforce` (acts only for flagged accounts), so students see no change except the privacy fixes that apply to everyone: my-confessions without commenters' names, likes list names only for the author, anonymous confession mentions; chat sockets of **new** apps checked for membership (old apps unchanged).
2. Railway values (owner): `SAFETY_ALERT_EMAILS`, `SAFETY_APPEAL_EMAIL`; check `CLOUDINARY_NAME`.
3. ADMIN: deploy (the Safety page, mode, "would have blocked").
4. APP: all app changes so far are JS-only (no new native module), so they can ship over the air **per live runtime version** (1.2.2 now), after the owner's OK; or with the 1.3.0 store build.
5. Switch on, one at a time, watching 48 h each (plan §13): confession safety **observe** mode → review "would have blocked" → `confessionSafety` for test accounts → `enforce` → 10% → 50% → 100%; `chatPushV1` for test accounts → students; `FLAG_ACCOUNT_STATUS_ENFORCE` after the count review **and** once most installs send the socket token; `FLAG_SOCKET_TOKEN_REQUIRED` last, when the `[sec-1] … without a token` logs are rare. Phase N, after N-1 (owner, Railway): `pushOpenTracking` first (it only measures) → a week of data in the push report → `pushBudgetV1`, `notifSettingsV2`, `unifiedInbox`, `pushAskV2`, `pushCopyV2` for test accounts, then students, one at a time; `referralVerifyGate` after checking `count-referral-credits.js` (`FLAG_REFERRAL_VERIFY_GATE=ids:<test referrer>` first, then `on`).

**Rollback:** turn the flag (or mode) off in admin / Railway: instant. Every new field is optional; old code can be redeployed without a migration.

## P1 growth loop (branch `upgrade/p1-growth`)

Owner decisions (22 Nov 2026): the invite page lives in the portal on gettdc.pk; app links prepared for 1.3.0;
validate first name only and rate-limited; leaderboard monthly / rank / campus, first names, no photos, for everyone;
**rewards stay as live** (see plan corrections).

| Plan id | What changed | Commit | Tests |
|---|---|---|---|
| (flake) | `career` test checks the exact seeded phone, not "0300" (same as loyalty-visits) | SERVER `c285d73b` | 3/3 runs |
| P1-2 / P1-4 server | `POST /api/invites/:code/open` (public, 60 per address per 10 min; ReferralClick with channel, user agent, salted address hash); `GET /api/invites/config` (growthV2 for signed-out phones; `/api/app/flags` unchanged). **For everyone:** validate → first name, no photo, 30 per address per 10 min; leaderboard → first names, no photos. Leaderboard params `period=month` (this Karachi month's `referral:verified` ledger rows), `university`; reply adds `period`, `me`, `next` | SERVER `a9fc2e34` | invites-referrals 25/25 |
| P1-2 admin | the invite page `public/i/index.html` (one 7 KB file, 3 KB gzipped: no React, no web fonts; noindex; reports the open; first name when real; Android Play button with `referrer=ref%3D<CODE>`; iPhone "copy code & get the app"); `vercel.json` (rewrite `/i/:code`, SPA fallback, AASA content type, noindex); `/i/:code` React fallback route; `.well-known` files with placeholders | ADMIN `c855da1` | InvitePage 5/5; jest 22 / 118; portal 38/38 |
| P1-1 / P1-4 / P1-5 app | `growth/inviteLinks.js` (links, owner's share text, opening links by sign-in state, `@tdc_pending_ref`), `App.js` handles `tdcapp://i/CODE` and `gettdc.pk/i/CODE` first; Signup: `InviteCodeExtras` ("invited by <first name> ✓", "paste invite code" on tap only); crew screen behind **growthV2**: share link `gettdc.pk/i/CODE?c=`, WhatsApp first, owner's text, `ReferralLeaderboard`; behind **shareCards**: `ui/ShareCard.js` (1080×1350, QR, invite / levelUp / resumeReady / savings / confession) | APP `0126fe2` | invite-link 28/28; APP run-all ok; export ok (9.77 MB, +30 KB) |
| P1-3 | install referrer: waits for 1.3.0 (`tdc-upgrade-v2/release-1.3.0.md`) | — | — |

**Before production:** check `vercel.json` on a Vercel **preview** of the portal first (it is new to the repo): the exact
18-row list is in `release-1.3.0.md` → "Vercel preview check" (owner).

**Funnel note:** an invitee is signed out until they sign up, so `invite_link_opened` / `invite_code_prefilled` /
`signup_with_ref` can't be app events; they are measured on the server instead: `ReferralClick` (opens, by channel) and
`User.referredBy` (signups with a code).

## P1 follow-ups (branch `upgrade/p1-followups`, owner 22 Nov 2026)

| Item | What changed | Commit | Tests |
|---|---|---|---|
| 1 referral events | `source: 'system'` → `'server'` in the signup route and `referral.js` (2×): the `referral_signup_bonus` / `referral_credited` events are stored again. Points logic unchanged. New read-only `scripts/count-referral-credits.js` (owner runs it; refuses without `MONGO_URI`, prints host/db only, no names / e-mails / phones) | SERVER `bed92851` | referral-events 22/22 (events stored; +50 / +100 / +100 once each; nothing writes 'system'; count() writes nothing) |
| 3 flakes | the last 7 suites check the exact seeded value instead of "0300": admin-delete-account, career-best-matches, career-job-alerts, career-retention (×2), feature-access, surplus-announce, surplus (×2) | SERVER `3c62524c` | all 7 ok, 3 runs each |
| 2 App Store link | `Points.js`: `apps.apple.com/app/id6765877675` (and `itms-apps://…/app/id…`) for everyone, instead of the Brazil store page | APP `890cea6` | invite-link 30/30; APP run-all 52/52; export ok |
| 4 preview list | `release-1.3.0.md`: the 18-row Vercel preview check for `vercel.json` | APP docs commit (this log) | — |

Full runs after the changes: SERVER 79/79 suites (1 skipped as always: shopify-review needs a local MongoDB).

**Answer on referral points (item 1):** (a) the points **were credited**: `points.award` runs after the failed event
write (the error is caught) and saves the balance, then the ledger row. Only the event log was lost.
(b) No loss is expected, but `node scripts/count-referral-credits.js` (owner, read only) confirms it from the ledger:
per award type the students and points missing, by month, first/last date; plus how many referred students never
verified their e-mail but were paid. No balance was changed; back-payment is the owner's decision.

Not changed: the portal's own App Store link (`edu-boost/src/web/site.js`: `apps.apple.com/pk/…`) works for Pakistan;
the app-link values in `.well-known` are still placeholders (needed only for 1.3.0).

## Phase N verification (read only, 22 Nov 2026; no code yet)

| Plan | What the plan assumes | What the code has | Differs? |
|---|---|---|---|
| N1 / N-1 | social pushes for every post / confession / listing; `SOCIAL_PUSH_GROUP_MINUTES` default 0, `SOCIAL_PUSH_DAILY_MAX` default 10, quiet hours on | as described (`services/socialPush.js` L159–210), **but each kind only sends when its Railway switch is exactly `"true"`** (`SOCIAL_PUSH_POSTS` / `_CONFESSIONS` / `_SKILLSHARE`); quiet hours on unless `SOCIAL_PUSH_QUIET_HOURS=off` | small: whether N1 is live depends on those switches (owner checks; not read) |
| N2 / N-2 | ~20 sender files, each with its own rules | 23 files (incl. utils/scripts). Engagement gateway: daily cap 1, weekly 2/4, quiet hours, prefs, PushLog. **Not in the plan:** every new bell `Notification` row auto-pushes from a model hook (`models/Notification.js` L153, 52 create sites) through `sendToUser`: pref check only, **no quiet hours, no cap, no PushLog**. Chat push (CHAT-1): personal, no cap, as N-2 wants | **yes**: the bell hook is the biggest uncapped sender; N-2 must classify it (by `type`) or it bypasses the budget |
| N3 / N-3 | OS prompt on login, `App.js` ~L206, `utils/pushNotifications.js` L117 | `App.js` L207 → `registerForPushNotificationsAsync` → `requestPermissionsAsync` (L128); tour already held | no |
| N4 / N-4 | two inboxes: `Notification` and `SocialNotification` | as described (`/api/notifications/my-notifications`, `/api/social/notifications`). A third, `EventNotification` (`/api/events/notifications`), is for event creators only | small: leave event-creator notices out of the unified inbox (or a later tab) |
| N5 / N-5 | 9 switches; `NOTIF_PREF_DEFAULTS` at engagement.routes.js L948 | 8 for everyone (L958 now), + `messages` (chatPushV1 accounts) + `loyalty` (loyalty pilot) = up to 10 | no (line numbers only) |
| N6 / N-6 | push report from `PushLog` + receipts | **opens are never recorded**: the app never calls `POST /api/notifications/push-opened/:logId`, and the push data doesn't carry the log id (the row is written after the messages are built), so `openedAt` is always empty and today's admin "push opened" numbers are 0. Only the engagement gateway writes `PushLog` (social, bell, chat, career, loyalty, surplus don't). `markOpened` doesn't check the owner | **yes**: N-6 needs open tracking first (log id in the data + the app reporting the tap, behind a flag) and logging for the other senders, else the report shows a real-looking 0% |
| N7 / N-7 | copy bank `services/engagement/copy.js` | exists (`BANK`, `fill`, `pickVariant`) | no |

N-1 is the owner's Railway action (not touched).

## Phase N: notifications people keep on (branch `upgrade/phase-n`, owner 22 Nov 2026)

Every step behind its own flag, all **off**; flag off = today's behaviour (each test checks it).

| Step | What changed | Commits | Tests |
|---|---|---|---|
| referral gate (P1 follow-up) | signup awards moved to `services/engagement/referralSignup.js` (split only), then **`referralVerifyGate`** (server only, checked for the referrer): nothing paid at signup while the student still has to enter the e-mail code; `verify-otp` pays the same three awards (same keys) once; `verifiedReferralCount` counts only verified referees | SERVER `39e56ab6` (split), `6806caa7` | referral-gate 19/19 (fails without the change) |
| referral copy | growthV2 only: share text / crew hint "your friend gets 100 points and you get 150 when they join and verify their email"; signup and the invite page from the invitee's side | APP `16c822c`, ADMIN `8f2d64d` | invite-link 31/31; InvitePage 6/6 |
| N-6a open tracking | **`pushOpenTracking`**: `services/pushTracking.js` hooked into `sendAllSafe` (every sender): one tracked PushLog row per recipient per send, its id (`pushLogId`) in the push; receipts mark delivered; `markOpened` only by the recipient, first tap only. App: `utils/pushOpened.js` reports a tap (cold start and tray) to `/notification/push-opened/:id` | SERVER `22d2be20`, `f0f688fb`; APP `6e439cf`, `ebba8cf` (path fix) | push-tracking 20/20; push-opened 9/9 |
| N-2 budget | **`pushBudgetV1`**: `services/pushBudget.js` + `models/PushBudget.js` at the three paths every push takes (gateway, `sendToUser` incl. bell, social bulk): personal no cap / no quiet hours; relevant 3 a day; broadcast 2 a day (`PUSH_BUDGET_*_MAX`); quiet hours for relevant + broadcast; unknown types → relevant, logged once | SERVER `a9ba4d0a` | push-budget 25/25 |
| N-3 ask at a good moment | **`pushAskV2`**: no OS prompt on login (phones that already allow register as before); sheet after the first deal claimed / confession posted / job applied ("not now" → once more after 7 days, then Settings only); Settings row "turn on" / "turn on in settings" | SERVER `16654fad` (flag); APP `7a40013` | push-ask 25/25 |
| N-4 one inbox | **`unifiedInbox`**: `GET /api/notification/unified` (bell + social, tabs, per-tab unread), `/unread-count?scope=all`; app: the bell sheet and the "Notifications" route show it; reads / deletes go to each list's own endpoint; new route `SocialNotifications` for answering requests | SERVER `d05b491d`; APP `5084241` | unified-inbox 18/18 + 20/20 |
| N-5 settings | **`notifSettingsV2`**: `notifPrefs.mode` / `digest` (additive); modes act on every sender; 6 pm campus digest (scheduler, real counts only); app: how often + digest on top, the switches under "fine-tune · N" | SERVER `46eae697`; APP `871a27e` | notif-modes 16/16 + 10/10 |
| N-6b push report | `GET /api/admin/engagement/push-report` (tracked rows only; rates from 50 sends of a type; review under 3% opens or 2% opt-outs); opt-outs recorded for tracked accounts; admin: "push report" card on engagement metrics | SERVER `ed25c715`; ADMIN `7cfd8e8` | push-report 20/20; PushReport 5/5 |
| N-7 copy | **`pushCopyV2`**: `copy.fillV2`: no `{placeholder}` left, every variant names its thing, numbers real and above 0, else no push; win-back with real counts and the best live offer | SERVER `ef95a92a` | push-copy 17/17 |

Full runs at the end: SERVER 86/86 suites (shopify-review skipped as always); APP run-all ok, export ok; ADMIN jest 23 suites / 124
tests, portal 38/38.

**Found in Phase N (pre-existing, not changed, owner to decide):**
- An empty extensionless file `server/services/engagement/inactivity` (committed 27 Sep in "Add") shadows
  `inactivity.js`, so `POST /api/admin/engagement/nudge/win-back/:userId` has always answered 500. Removing it would
  switch the admin win-back nudge on, with today's copy (the made-up numbers above) unless `pushCopyV2` is on.
- Today's win-back copy uses made-up numbers (see plan corrections, N-7); only reachable through that broken route.
- `pushGateway.checkReceipts` is never scheduled; the per-send receipt check runs, and N-6a uses it for tracked rows.
- Per-thread mute (N-5) waits for P4-5.

## Phase N fixes (owner, Phase N sign-off)

| Fix | What changed | Commit | Tests |
|---|---|---|---|
| win-back nudge | the empty extensionless `services/engagement/inactivity` removed (the admin route works: 200); `sendWinBack` sends only with `pushCopyV2`, real numbers only, else nothing | SERVER `f1a1405d` | push-copy 22/22, push-report 21/21 |
| push receipts | `pushGateway.checkReceipts` every 30 min (job `pushReceipts`, `JOB_PUSH_RECEIPTS`; on in production like the other jobs, off on staging); delivered / failed, dead one-device tokens removed. Each send's own receipt check (every sender) already removes dead tokens; this catches what it missed on logged pushes | SERVER `b254e1e5` | push-receipts 13/13 (the test file landed in `f1a1405d`); SERVER 87/87 |

## Release 1 (local, branch `release/r1` in each repo)

`tdc-upgrade-v2/RELEASE-1.md`: contents, flags, changes for everyone, Railway values, deploy order, staging checklist,
switch-on order, rollback, and the merge / test results (every merge clean, all tests green after each).
Heads: SERVER `09d06818`, APP `07bd019`, ADMIN `efb2d8f`. Nothing pushed or deployed.

## SEC-2 admin creation (branch `upgrade/sec-2-admin`, server only; merged into `release/r1`)

| What changed | Commit | Tests |
|---|---|---|
| `POST /api/admin/users/create` (role admin, any case) and `PUT /api/admin/users/role/:id` (to admin, or changing an admin's role): only accounts in `SUPER_ADMIN_IDS` (empty / no valid id = nobody, fail closed), else 403 `SUPER_ADMIN_REQUIRED`; every attempt in AdminActionLog (`admin.create` / `admin.promote` / `admin.demote`, before / after, reason). Other roles: any admin, as before. The create reply no longer carries the User fields hidden by default (found by the leak scan; the same shape otherwise). `scripts/count-admins.js` (read only). The portal never calls these two routes | SERVER `6f29bd26`; release/r1 `e89c78cb` | sec2-admin-create 23/23; SERVER 88/88 (branch and release/r1) |

## Phase A verification (read only, on release/r1)

| Plan | What the plan assumes | What the code has | Differs? |
|---|---|---|---|
| R1 | one admin level; `User.role` student / brand / admin / traveler / employee | the same (`models/User.js` L28–31) | no |
| R2 | ~20 route files, at least 4 admin-check implementations (`adminMiddleware.isAdmin`, 3 local `requireAdmin`, inline) | 22 route files check for admin, with **10 local implementations**: `isAdmin` copied in admin, adminCrew, adminEngagement, brandApproval, event routes; `requireAdmin` in adminActions, adminFeatures, adminUniversities; `isAdminOrEmployee` (jobs); `isAdminReq` / `isAdminUser` (event, social); the shared `middleware/adminMiddleware.js` is used by **one** file (adminSafety). Plus inline `role === 'admin'` in ~20 files incl. **services** (careerTimelineService 6, accountStatus, confessionStrikes, accountDeletion, jobAlerts); jobs.routes alone has 17 | **yes, bigger**: more checks to map; services decide things for admins too (e.g. "admins never locked out", career timeline views) and need a rule for members |
| R3 | portal menu shows everything to every admin; `AppNavigator.js` L121 | the same: `ADMIN_MENU` 8 groups / 40 pages; role check at L124 | no (line) |
| R4 | auth reads the user every request; `AdminActionLog`; `OtpCode` | the same: `REQ_USER_FIELDS` + a DB read per request (L66); `AdminActionLog` and `AdminAuditLog` (deletions only); `OtpCode` with a `purpose` (signup-verify, password-reset) | no: a new purpose `admin-login` is additive |
| A-2 safety area | its own menu area | P4-7 put "safety" in the **general** group (portal check keeps "oversight" gone) | small: permissions `safety.*` map to a page in general |
| A-6 invite | a new invite flow | **`POST /api/admin/users/create` lets any admin create any role, including another `admin`** (`role` comes from the body, default employee) | **yes**: privilege-escalation path today; Phase A must restrict it to `team.manage` (or recommend a fix before) |
| A-8 | 12 h idle logout, new-device code | sign-in tokens last **180 days** for everyone, admins included; no login history, no device record | yes: needs a session/last-seen record for admins (additive) |
| A-4 masking | `pii.view` masks phone / e-mail / documents | admin list routes return them in full today (e.g. `admin.routes.js` L297 selects phone) | expected (that's the work) |
| migration | existing admins without `adminAccess` = super | needs the number of admin accounts in production: a read-only count script (like `count-account-status.js`) before shadow mode | add the count |

## Railway variables for the owner to set (never set by the developer)

| Variable | Value | Where | What it does |
|---|---|---|---|
| `SAFETY_ALERT_EMAILS` | the owner's recipients (given 21 Nov 2026; set by the owner, not written here) | production (+ staging later) | the safety e-mails (suspensions, threats, doxxing, self-harm) |
| `SAFETY_APPEAL_EMAIL` | `safety@gettdc.pk` | production (+ staging) | the appeal address shown to suspended / banned students |
| `OPENAI_API_KEY` | (already set) | — | the pre-post checks; without it every checked post is held |
| `FLAG_ACCOUNT_STATUS_ENFORCE` | leave unset until the count is reviewed (P0-6) | — | suspended / banned accounts locked out |
| `FLAG_SOCKET_TOKEN_REQUIRED` | leave unset until most installs run the SEC-1 app | — | socket events need a verified token |
| `FLAG_CHAT_PUSH_V1` | not needed: turn on per account in admin → features ("Chat pushes") | — | chat message pushes |
| `CHAT_PUSH_QUIET_HOURS` | leave unset (no quiet hours for chat, as planned) | — | optional override: `on` skips chat pushes 23:00–09:00 Karachi |
| `FLAG_CONFESSION_SAFETY` | not needed: turn on per account in admin → features | — | — |
| `FLAG_REFERRAL_VERIFY_GATE` | leave unset; after reviewing `count-referral-credits.js`: `ids:<test referrer id>`, then `on` | production | referral rewards wait for the e-mail code |
| `PUSH_BUDGET_RELEVANT_MAX` / `PUSH_BUDGET_BROADCAST_MAX` | optional; defaults 3 and 2 (broadcast only 1 or 2) | — | the N-2 daily caps |
| `PUSH_REPORT_MIN_SENT` | optional; default 50 | — | pushes of a type before the report shows its rates |
| Phase N flags (`pushOpenTracking`, `pushBudgetV1`, `pushAskV2`, `unifiedInbox`, `notifSettingsV2`, `pushCopyV2`) | not needed: per account in admin → features | — | — |
| N-1: `SOCIAL_PUSH_GROUP_MINUTES=180`, `SOCIAL_PUSH_DAILY_MAX=2` | owner action (plan N-1), at a quiet hour (a change restarts the service) | production | grouped social pushes, max 2 a day |
| Cloudinary | check that `CLOUDINARY_NAME` is the cloud the app uploads to (`decaxpera`); otherwise images aren't deleted (logged, nothing breaks) | — | image clean-up |

## Found along the way (pre-existing, not changed; owner to decide)

- ~~**Chat pushes are probably never sent.**~~ Confirmed and fixed behind `chatPushV1` in CHAT-1 (see above).
- SkillShare chats emit a `typing` event the server doesn't handle (the social chat uses `typing_start` / `typing_stop`).
- The confession composer has no image button since the redesign (`pickImage` / `showImageOptions` aren't rendered): today's app posts text-only confessions.
- After a REST delete, ChatDetails' socket `delete_message` finds nothing (already deleted), so the other side isn't told (no `message_deleted`).
- APP `tests/app/events-fresh-data` failed once while other suites ran in parallel (fixed 80 ms waits); 3/3 alone. Load-sensitive, not changed.

## Owner commands (P4-1)

- Railway (production and staging): `SAFETY_ALERT_EMAILS=<admin inbox>,<second inbox>`. Unset = no safety e-mails (logged as a warning). `OPENAI_API_KEY` must be set for the checks; without it every post is held.
- Call-test each helpline (1166, 0311-7786264, 0800-22-444, 1122, 15) before turning `confessionSafety` on for students; edit them on the admin Safety → settings tab.
- Test accounts: turn `confessionSafety` on per account (admin → features → "Confession safety").

## Owner commands (Phase 0)

- Count accounts the P0-6 flag would lock out (read only, prints no e-mail / phone / connection string), from the server folder:
  `MONGO_URI="<production connection string>" node scripts/count-account-status.js`
  (or just `node scripts/count-account-status.js` where the server's `.env` holds `MONGO_URI`)
- Switch P0-6 on later: Railway variable `FLAG_ACCOUNT_STATUS_ENFORCE=on` (off again: remove it or set `off`).
- Seed staging (after it exists): see server `docs/STAGING.md` section 1b.
