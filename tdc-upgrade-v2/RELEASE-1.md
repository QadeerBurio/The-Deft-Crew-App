# Release 1

Release 1 bundles every upgrade phase signed off so far: P0, P4-1 (+ follow-ups), SEC-1, CHAT-1, P1 (+ follow-ups)
Phase N (+ its two fixes) and the security fix SEC-2. It is prepared **locally only**: branch `release/r1` in each repo, made from `main`, with
the upgrade branches merged in order. Nothing is pushed, merged into `main` or deployed until the owner says so in
writing.

Branches merged into `release/r1`, in this order (each repo; a branch that doesn't exist in a repo had no changes for
it): `upgrade/p0-safety` → `p4-1-safety` → `p4-1-followups` → `sec-1-socket` → `chat-1-push` → `p1-growth` →
`p1-followups` → `phase-n` → `sec-2-admin` (server only). Merge and test results: section (i).

## (a) What's in it, in plain words

**Safety (confessions).** Every new confession and comment can be checked before it's posted: no phone numbers, e-mails,
CNICs, links or classmates' names, no abuse, no graphic or sexual images. Posts the check isn't sure about wait for an
admin. Students can report a confession or a comment (with evidence), mute an author and delete their own confessions.
Repeated breaks lead to strikes, then a pause or a ban, with an appeal by e-mail. Admins get a Safety page: reported,
held, resolved, the settings, and an "observe" mode that only logs what the check *would* have done. A student in
distress gets helpline numbers and admins get an e-mail.

**Admin accounts (SEC-2).** Only the owner's accounts listed in `SUPER_ADMIN_IDS` can create an admin, make someone an
admin or change an admin's role through the API; every attempt is logged in admin actions. Other accounts (brands,
employees…) are created as before by any admin.

**Accounts.** Suspended or banned accounts can be locked out of the app and the chat (switched on separately, after a
count). The sign-in screen tells a paused student why and offers an appeal.

**Chat.** Chat sockets know who's really talking (the sign-in token, not an id the phone sends): only the people in a
chat can join, read, type in or send to it, and only your own messages can be deleted. Chat messages can send a push
again (they haven't since 5 Oct 2026).

**Growth.** Invite links (`gettdc.pk/i/CODE`) with a small fast page that opens the store with the code; signup fills the
code in; a monthly invite leaderboard by campus with first names only; branded share cards. Referral rewards can wait
until the new student confirms their e-mail.

**Notifications.** Opens and opt-outs can be measured, and admin gets a push report. One daily budget across every
sender (personal always, relevant 3 a day, campus-wide 2 a day, nothing at night but personal). The app asks for
notifications after a good moment instead of at login. One inbox for the bell and social notifications. Three modes
(everything / only important / quiet), a 6 pm campus digest, the switches under "fine-tune". Push copy that names the
specific thing with real numbers only. Push receipts are checked every 30 minutes.

**For the team.** A staging guide and seed script, funnel events (never sent to Meta), a read-only count of the referral
rewards, and many more tests (server 87 suites, app 56, admin 23 jest suites + 38 portal checks).

## (b) Every flag and its default

All **off** by default and none in `ROLE_DEFAULTS` (so no role gets them automatically). "Admin" = admin → features,
per account; "Railway" = a `FLAG_*` variable (`on`, `ids:<id>,<id>`, `roles:…`, `NN%`).

| Flag | Default | Turned on in | What it does |
|---|---|---|---|
| `confessionSafety` | off | admin / Railway | the confession checks, report, mute, rules, strikes for that student (the admin "mode" setting decides off / observe / enforce; observe works without the flag) |
| `accountStatusEnforce` | off | Railway only | suspended / banned accounts are locked out of the app and the chat |
| `socketTokenRequired` | off | Railway only | chat socket events without a verified token are refused (older apps' chats stop) |
| `chatPushV1` | off | admin / Railway | chat message pushes and the "messages" switch |
| `growthV2` | off | admin / Railway | invite links, WhatsApp share, leaderboard, new reward copy, "paste invite code" |
| `shareCards` | off | admin / Railway | branded share cards |
| `referralVerifyGate` | off | Railway only (checked for the referrer) | referral rewards paid after the e-mail code, not at signup |
| `pushOpenTracking` | off | admin / Railway | log every push to the student with its id; the app reports opens; opt-outs recorded |
| `pushBudgetV1` | off | admin / Railway | the daily push budget across senders |
| `pushAskV2` | off | admin / Railway | no prompt on login; ask after a good moment |
| `unifiedInbox` | off | admin / Railway | one inbox, one unread count |
| `notifSettingsV2` | off | admin / Railway | modes, the 6 pm digest, "fine-tune" |
| `pushCopyV2` | off | admin / Railway | specific push copy, real numbers only; also the only way the admin win-back nudge sends |
| `ambassadorV2`, `resumeV2`, `confessionsV2` | off | — | defined for later phases; nothing uses them yet |

Admin setting (not a flag): confession safety **mode** `off / observe / enforce`, default `enforce` (acts only for
students with `confessionSafety`). Background job: `pushReceipts` (on in production like the other jobs;
`JOB_PUSH_RECEIPTS=off` stops it).

## (c) What changes for everyone with all flags off

- **Privacy fixes.** "My confessions" no longer sends commenters' names and photos to the author; a confession's likes
  list shows names only to its author; confession mentions are anonymous ("someone mentioned you…", no name, no photo,
  no profile link); the invite-code check and the invite leaderboard show first names only, no photos.
- **App Store link.** Country-neutral `apps.apple.com/app/id6765877675` (it opened the Brazil store page).
- **Referral events.** `referral_signup_bonus` / `referral_credited` events are stored again (they were rejected). Points
  were and are paid exactly as before.
- **Socket stage 1.** When an app sends its sign-in token (the new app does), the socket acts as that account, ignores
  any other id, and only lets participants into a chat. Older apps without a token: as before (logged).
- **Admin creation (SEC-2).** Creating, promoting or demoting an admin needs `SUPER_ADMIN_IDS` (empty = nobody can,
  through the API); the admin "create user" reply no longer includes the hidden fields (push tokens, ID-card images,
  webhook secret). The portal never used these calls, so no screen changes.
- **Read-side status filters.** Every confession reader (the feed, comments, liking, commenting, the likes list, the
  daily drop) shows and accepts only live items; old items have no status and count as live, so nothing disappears unless a check or an admin
  held or removed it.
- Also, small: the admin win-back nudge answers 200 (it was a 500) and sends nothing without `pushCopyV2`; push receipts
  are checked every 30 minutes (delivered / failed on logged pushes, dead tokens removed); new public routes
  `POST /api/invites/:code/open` (rate-limited, address hashed) and `GET /api/invites/config`; the invite-code check is
  rate-limited (30 per address per 10 min); more funnel event names are accepted (our server only); a graphic image is
  now blocked by the confession check (only where the check runs). The portal gets `vercel.json` (invite page, SPA
  fallback, app-link files) — check it on a Vercel preview first (`release-1.3.0.md`).

## (d) Railway variables to add

Set by the owner, never by the developer. Production (and staging when it exists).

| Variable | Value | Needed |
|---|---|---|
| `SAFETY_ALERT_EMAILS` | the owner's recipients | yes, before `confessionSafety` reaches students |
| `SAFETY_APPEAL_EMAIL` | `safety@gettdc.pk` | yes |
| `SUPER_ADMIN_IDS` | the owner's admin account id(s), comma separated (from `scripts/count-admins.js`, read only) | yes, if admins are ever created through the API; empty = nobody can (fail closed). Phase A replaces it with `adminAccess.level = super` |
| `OPENAI_API_KEY` | already set | check it's there (without it every checked post is held) |
| `CLOUDINARY_NAME` | check it's `decaxpera` | check (image clean-up) |
| `SOCIAL_PUSH_GROUP_MINUTES=180`, `SOCIAL_PUSH_DAILY_MAX=2` | plan N-1, at a quiet hour | yes (owner action) |
| `CHAT_PUSH_QUIET_HOURS` | leave unset | — |
| `PUSH_BUDGET_RELEVANT_MAX`, `PUSH_BUDGET_BROADCAST_MAX`, `PUSH_REPORT_MIN_SENT` | leave unset (3, 2, 50) | optional |
| `FLAG_ACCOUNT_STATUS_ENFORCE`, `FLAG_SOCKET_TOKEN_REQUIRED`, `FLAG_REFERRAL_VERIFY_GATE` | leave unset until their step in (g) | later |
| `JOB_PUSH_RECEIPTS` | leave unset (on) | — |

## (e) Deploy order

Each step only after the owner's written OK, and after the staging checklist (f).

1. **Server**: merge `release/r1` into `main` → Railway deploys. Check the startup lines: `[flags] …` (every new flag
   off), `[jobs] production: on …, pushReceipts`, no errors. All flags off = section (c) only.
2. **Variables** (d) on Railway (each change restarts the service: a quiet hour).
3. **Admin portal**: merge `release/r1` into the portal's `main` → Vercel. First a **preview** with the 18-row check in
   `release-1.3.0.md` (new `vercel.json`).
4. **App over the air** (JS only, no native change): `eas update` per **live runtime version** (1.2.2 now; each live
   runtime gets its own update; never mix). The 1.3.0 store build comes later (app links, install referrer, Sentry,
   store review: `release-1.3.0.md`).

## (f) Staging test checklist

Once staging exists (`server/docs/STAGING.md`): its own MongoDB, `APP_ENV=staging`, the seed (`scripts/seed-staging.js`),
a staging admin build and the app pointed at staging. Two test students (A, B), one test referrer, one admin; an Android
phone and an iPhone.

1. **All flags off** (the release as students get it): sign in, feed, confessions (post, comment, like), chat both ways,
   claim a deal, apply to a job, notification settings (the same 8 switches), bell list, invite code on signup. Check
   (c): my-confessions without commenters' names; likes list names only for the author; a mention reads "someone
   mentioned you"; the App Store button opens the store page.
2. **Safety observe**: set mode = observe in admin; post a confession with a phone number from A → it posts; admin →
   "would have blocked" lists it.
3. **confessionSafety** for A (enforce): the phone number → "needs an edit"; a graphic image → blocked; report a
   confession from B with evidence → hidden and re-checked; strikes / pause; appeal e-mail on the sign-in screen.
4. **accountStatusEnforce** (staging only): suspend B → locked out with the reason; an admin is never locked out.
5. **Socket**: the new app on both phones: chat works; another account's chat can't be joined (logged).
   `socketTokenRequired` on staging: an old app build's chat is refused, the new one works.
6. **chatPushV1** for B: A sends a message → B gets a push (not while B has that chat open).
7. **SEC-2**: with `SUPER_ADMIN_IDS` empty, `POST /api/admin/users/create {role: "admin"}` → 403 for every admin;
   with the owner's id listed: the owner → 201, another admin → 403; admin actions show every attempt.
8. **growthV2 / shareCards** for A: share link, invite page on a phone (Android Play button, iPhone copy code), signup
   prefill, leaderboard, share card.
9. **referralVerifyGate** (`ids:<test referrer>`): signup with the code → no points; enter the e-mail code → +150 / +100,
   once.
10. **Phase N**, each for A: `pushOpenTracking` (tap a push → the push report counts it later), `pushBudgetV1` (4th
   relevant / 3rd broadcast push of the day held; chat always), `pushAskV2` (fresh install: no prompt at login, sheet
   after claiming a deal), `unifiedInbox` (one list, one badge), `notifSettingsV2` (quiet: only personal; digest at 6 pm),
   `pushCopyV2` (a friend-joined push names the friend; the admin win-back nudge sends only real numbers or nothing).
11. **Receipts job**: after 30 minutes the log shows `[pushGateway] receipts: …`.
12. **Admin**: Safety page tabs, features tab lists every new flag, engagement → push report ("push tracking is off" /
    "not enough data yet"), the portal's 38 checks.

## (g) Flag switch-on order in production

One at a time, 48 hours of watching each (logs, admin Safety, push report, support messages); off again at the first
problem.

1. **Confession safety in observe mode** (admin → Safety → settings → mode `observe`): nothing is blocked; a few days
   of "would have blocked" to review false positives with the owner.
2. Mode `enforce` + `confessionSafety` for the team's test accounts → 10% (`FLAG_CONFESSION_SAFETY=10%`) → 50% → 100%.
   Before students: `SAFETY_ALERT_EMAILS` set, helplines call-tested.
3. `pushOpenTracking` for test accounts → 10% → all (it only measures; a week of data in the push report).
4. `chatPushV1`: test accounts → students.
5. `pushBudgetV1`, then `notifSettingsV2`, `unifiedInbox`, `pushAskV2`, `pushCopyV2`: test accounts → 10% → all, one at
   a time, watching the push report's open rates and opt-outs.
6. `growthV2` and `shareCards`: test accounts → all.
7. `referralVerifyGate`: after running `scripts/count-referral-credits.js` (read only) and deciding on back-payment;
   `ids:<test referrer>` → `on`.
8. `accountStatusEnforce`: after `scripts/count-account-status.js` (read only) **and** once most installs run the OTA
   app (it sends the socket token).
9. `socketTokenRequired` last: when the `[sec-1] … without a token (older app)` log lines are rare.

## (h) Rollback

- **A flag**: turn it off (admin → features, or remove / set the `FLAG_*` variable to `off`). Instant (Railway restarts
  the service for a variable). Data written while it was on stays and is harmless: every new field is optional.
- **Safety mode**: admin → Safety → settings → `off` or `observe`. Held posts stay held until an admin decides.
- **The server**: redeploy the previous `main` commit on Railway. No migration to undo: new fields are optional, new
  collections are only read by the new code. The push receipts job stops with `JOB_PUSH_RECEIPTS=off`.
- **Variables**: remove them; unset = the behaviour before (except `SUPER_ADMIN_IDS`: unset = nobody may create admins).
- **SEC-2**: redeploying the previous server code restores the old (unsafe) behaviour; not recommended. To let someone
  create admins, add their id to `SUPER_ADMIN_IDS`.
- **The admin portal**: Vercel → Deployments → promote the previous production deployment (it has no `vercel.json`).
- **The app (OTA)**: `eas update:rollback` (or republish the previous update) for that runtime version; the server keeps
  serving older apps (every new field optional, old endpoints kept).
- **Referral gate**: rewards held back while it was on are paid on the student's e-mail code only while it's on. Turned
  off in between, those students get no signup-time rewards; on their first card sorted the old rule still pays the
  referrer +100 and the student +100 (not the referrer's +50). Back-payment, if it happens: owner decision.

## (i) Merge and test results (local, release/r1)

Every merge `--no-ff` from `main`; no conflicts (the branches are a straight line). Full tests after every merge
that changed files; a merge that changed nothing (the branch equals the step before in that repo) wasn't re-tested.

| Branch | SERVER (from main `e3382bd7`) | APP (from main `a717165`): run-all + Android export | ADMIN (from main `03ece06`): jest + portal checks |
|---|---|---|---|
| p0-safety | `403e64b2`: 69/69 suites | `6dc242b`: 46 suites ok, export ok | no changes (same as main) |
| p4-1-safety | `4fc0c868`: 74/74 | `db16f47`: 50 ok, export ok | `aceea11`: 111/111, 38/38 |
| p4-1-followups | `7978cb19`: 75/75 | `76653a3`: 51 ok, export ok | `f3b0da6`: 113/113, 38/38 |
| sec-1-socket | `3f1af9f2`: 76/76 | `2720341`: 51 ok, export ok | no such branch (no admin changes) |
| chat-1-push | `ea0921c1`: 77/77 | `7dd5cc3`: 51 ok, export ok | no changes |
| p1-growth | `628b79ce`: 78/78 | `8e5227e`: 52 ok, export ok | `530a18a`: 118/118, 38/38 |
| p1-followups | `e5369465`: 79/79 | `f1a5b0b`: 52 ok, export ok | no changes |
| phase-n | `09d06818`: 87/87 | `07bd019`: **56 ok**, export ok | `efb2d8f`: **124/124, 38/38** |

| sec-2-admin (server only) | `e89c78cb`: **88/88** | — | — |

SERVER counts are runnable suites (shopify-review is always skipped: it needs a disposable local MongoDB). The owner's
uncommitted `app.json` edit stays unstaged in the APP working copy; nothing in Release 1 changes `app.json`.

Release heads: SERVER `e89c78cb` (with SEC-2), APP `07bd019` (+ this document), ADMIN `efb2d8f`. Nothing pushed.
