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
| server | `services/chatPush.js` (the stranded logic, wired into `send_message`): a push to each other participant, opening that chat (MessagesScreen / MatchChat / InquiryChat), only when: flag **`chatPushV1`** on for the recipient; not in that chat's room; their **"messages"** switch on; they haven't blocked the sender; not 23:00–09:00 Karachi (skipped, not queued; `CHAT_PUSH_QUIET_HOURS=off` to send at night); at most one per conversation every 20 s. No daily cap ("personal" in the Phase N budget). The "messages" switch exists only for flagged accounts (like loyalty): `GET/PUT /engagement/notification-prefs` and `/engagement/me` are unchanged for everyone else | SERVER `12681426` | chat-push 20/20 (real socket.io); feature-access 96/96 (14 grantable flags) |
| app | Notification Settings: a "messages · new chat messages" switch, shown only when the server sends it | APP `a9396d7` | social-push-settings 20/20 |

Note (owner rule wins over the plan): the plan's N-2 says personal pushes ignore quiet hours for chat; the owner asked for quiet hours, so chat pushes respect them.

## Backlog (owner, not now)

- Confession composer image button returns in P4-3 (images are now moderated; the precheck and server clean-up are ready).
- SkillShare `typing` event (server handles only `typing_start` / `typing_stop`); tell the other person when a message is deleted (polish phase).
- Fix `tests/app/events-fresh-data` isolation properly (its fixed waits fail under load); no weakening.

## Release plan

**Branches** (each repo; each built on the one before, so they merge in this order):
`upgrade/p0-safety` → `upgrade/p4-1-safety` → `upgrade/p4-1-followups` → `upgrade/sec-1-socket` → `upgrade/chat-1-push` → (P1 next). ADMIN has changes only in `p4-1-safety` and `p4-1-followups`; its later branches equal `p4-1-followups`. Nothing is merged, pushed or deployed without the owner's written OK.

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
5. Switch on, one at a time, watching 48 h each (plan §13): confession safety **observe** mode → review "would have blocked" → `confessionSafety` for test accounts → `enforce` → 10% → 50% → 100%; `chatPushV1` for test accounts → students; `FLAG_ACCOUNT_STATUS_ENFORCE` after the count review **and** once most installs send the socket token; `FLAG_SOCKET_TOKEN_REQUIRED` last, when the `[sec-1] … without a token` logs are rare.

**Rollback:** turn the flag (or mode) off in admin / Railway: instant. Every new field is optional; old code can be redeployed without a migration.

## Railway variables for the owner to set (never set by the developer)

| Variable | Value | Where | What it does |
|---|---|---|---|
| `SAFETY_ALERT_EMAILS` | the owner's recipients (given 21 Nov 2026; set by the owner, not written here) | production (+ staging later) | the safety e-mails (suspensions, threats, doxxing, self-harm) |
| `SAFETY_APPEAL_EMAIL` | `safety@gettdc.pk` | production (+ staging) | the appeal address shown to suspended / banned students |
| `OPENAI_API_KEY` | (already set) | — | the pre-post checks; without it every checked post is held |
| `FLAG_ACCOUNT_STATUS_ENFORCE` | leave unset until the count is reviewed (P0-6) | — | suspended / banned accounts locked out |
| `FLAG_SOCKET_TOKEN_REQUIRED` | leave unset until most installs run the SEC-1 app | — | socket events need a verified token |
| `FLAG_CHAT_PUSH_V1` | not needed: turn on per account in admin → features ("Chat pushes") | — | chat message pushes |
| `CHAT_PUSH_QUIET_HOURS` | leave unset (quiet hours on) | — | `off` sends chat pushes at night too |
| `FLAG_CONFESSION_SAFETY` | not needed: turn on per account in admin → features | — | — |
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
