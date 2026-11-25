# Flag rollout order (final, after r8)

Every feature from Releases 1-8 ships **off** (48 grantable flags; `tests/all-flags-on` checks them all on together). This is the order to switch them on, one at a time: first for the
team's test accounts, then a share of students, then everyone, with what to check before each next step. The
detailed manual tests are in RELEASE-1.md … RELEASE-6.md, section (e)/(f) of each; r7 / r8 features below.

**How to switch** (server flags, `config/featureFlags.js`):
- **test accounts / named students:** admin → features → the account → the flag, with a reason (logged); or Railway
  `FLAG_<NAME>=ids:<id1>,<id2>`;
- **a share of students:** Railway `FLAG_<NAME>=10%` (then `50%`), stable per student;
- **everyone:** Railway `FLAG_<NAME>=on`. (A Railway variable restarts the service: change it at a quiet hour.)
- **off again:** remove the variable or `FLAG_<NAME>=off` / untick in admin. Instant; data written while it was on
  stays and is harmless (every new field is optional).

**Rules:** one flag at a time; 48 hours of watching between steps (Railway logs, admin → Safety, admin → push report,
Play / App Store crashes, support messages); never in the same hour as a server deploy or an over-the-air update
(OTA-PLAN.md); off at the first real problem. The app must be on the release that contains the feature (OTA or
store) before its flag means anything.

## Before anything (Railway variables, owner)

`SUPER_ADMIN_IDS`, `SAFETY_ALERT_EMAILS`, `SAFETY_APPEAL_EMAIL` (safety@gettdc.pk), `SURPLUS_CODE_SECRET` (32+
characters, before `surplusBoxes`), `PORTAL_PROXY_SECRET` (Railway **and** Vercel, before `resumePublicPage` /
`confessionShare`), and gettdc.pk on Vercel (before anything with a gettdc.pk link: `growthV2` invites, public
resume pages, shared confessions).

## 1. Confession safety, observe mode first

1. Admin → Safety → settings → mode **`observe`** (works without the flag: every confession is checked, nothing is
   blocked, "would have acted" is logged). **Check for 3-5 days:** admin → Safety → "observed": what it would have
   held / blocked, and why. Review the false positives with the developer (word list, threshold) before going on.
2. `confessionSafety` for the test accounts, mode **`enforce`**. **Check:** a phone number in a confession is
   stopped with a sentence and can be edited; a report reaches admin → Safety; a strike / suspension e-mail reaches
   `SAFETY_ALERT_EMAILS`; the helplines show and the numbers were call-tested.
3. `confessionSafety=10%` → `50%` → `on`. **Check each step:** held posts per day in admin → Safety (a sudden jump =
   a false-positive pattern), appeals at safety@gettdc.pk, support messages.

## 2. Chat pushes

4. `chatPushV1` for the test accounts. **Check:** A messages B → B gets a push (not while B has that chat open); B's
   "messages" switch off → no push; the push opens the chat. Then `10%` → `on`; check the push report (opt-outs) and
   that nobody reports a flood.

## 3. Pushes (Phase N), in this order

5. `pushOpenTracking` (only measures): test accounts → `10%` → `on`; a week of data in the push report before the rest.
6. `pushBudgetV1` (the daily cap across senders) → `notifSettingsV2` (modes, digest) → `unifiedInbox` (one inbox,
   one unread count) → `pushAskV2` (ask after a good moment, not at login) → `pushCopyV2` (specific copy, real
   numbers only). Each: test accounts → `10%` → `on`. **Check:** open rates and opt-outs in the push report don't
   drop; the inbox count matches the list; no push says a number that isn't real.

## 4. Growth and the crew

7. `growthV2` (invite links, needs gettdc.pk on Vercel) and `shareCards`: test accounts → `on`. **Check:** an invite
   link opens signup with the code; the share card's QR opens the right page.
8. `referralVerifyGate`: after `scripts/count-referral-credits.js` (read only) and the owner's decision on
   back-payment; `ids:<test referrer>` → `on`.
9. `ambassadorV2` (pilot university) → `squadMission`. **Check:** applications reach admin → crew inbox; the
   ambassador invite shows at a good moment, once.

## 5. Careers, loyalty, Surprise Box

10. `careerTimeline` → `careerMatching` → `careerRatings` → `employerFirstHireFree` (employers) → `loyaltyV2` →
    `surplusBoxes` (needs `SURPLUS_CODE_SECRET`) → `resumeStudioV2`. Each with test accounts (student + employer /
    brand) first. **Check:** RELEASE-2 / RELEASE-3 manual tests; an order / claim end to end; no 500s in Railway.

## 6. Resume

11. `resumeV2` (the base) → `resumeCoach` → `resumeSpeak` → `resumeTemplatesV2` → `resumeFeedback` → `resumeFinish`
    → `resumeVerified` → `resumePublicPage` (needs `PORTAL_PROXY_SECRET` + gettdc.pk on Vercel) →
    `resumeOutcomeStats` → `resumeWriter`. **Check:** a fresher builds a resume and downloads the PDF (Maestro flow 04); the AI never
    invents a number; a public page shows only what the student chose; views exclude their own.
    - `resumeTemplatesV2` **only after the owner approves the 10 new designs.** Then: the gallery shows 15; a template
      that looks wrong on a real phone → admin → features → "Resume template studio" tab → untick it (no app update;
      students already using it keep it). The "icons next to headings" switch is part of the studio.
    - `resumeWriter` (cover letter + LinkedIn): test accounts first. **Check:** a letter names only real entries from
      the resume and the job typed; "save as pdf" matches the resume's design; when the AI is down the screen says
      "try again" (never a letter). Off: the dashboard button disappears.

## 7. Confessions v2

12. `confessionsV2` (pilot university for a week) → `confessionPolls` → `confessionFollow` (watch
    `confession_follow` in the push report) → `confessionShare` (needs `PORTAL_PROXY_SECRET` + gettdc.pk) →
    `confessionRecap` (one Sunday on test accounts; check Monday's push log).
    - `confessionHandles` **only after the owner approves the word list.** Off = everyone "anon." (also old handle
      posts). **Check:** posts "as @handle" show the handle; a word that turns out bad → admin → Safety → settings →
      "words blocked from confession handles": those handles show "anon." at once, the student gets a new one on their
      next post.
    - `confessionsVoting` (optional, plan: off at launch; used only for auto-hide) last, test accounts → pilot
      university. **Check:** admin → Safety → held: items "hidden by down votes" (10+ down, 2x up) are real problems,
      not brigading; approving one is final. Off: the arrows disappear, nothing is hidden by votes any more.
    - With `confessionSafety` on: the live hint (phone / e-mail / CNIC / links while typing, needs `confessionsV2`)
      and the "appeal" button on a ban (needs `SAFETY_APPEAL_EMAIL`) come with it.

## 8. Release 6: polish and speed

13. No-risk polish: `headerSearch`, `polishEmptyStates`, `lowDataImages`, `optimisticActions`, `prefetchDetails`.
14. `persistCache` (check: sign out → sign in as another account → nothing of the first).
15. `cityCheck`, `celebrationsPlus`, `onboardingGoals` (shown once only), `homeNextAction`.
16. `tabletLayout` (an iPad test student; rotate).
17. `nativeStackDrawer` last, with the device matrix and PERF-BASELINE.md before / after (it takes effect from the
    next app start).

## 9. Server enforcement (last, after the logs say it's safe)

18. `accountStatusEnforce`: after `scripts/count-account-status.js` (read only) and once most installs run an app
    that sends the socket token.
19. `adminRbacEnforce`: after a week of admin "would deny" entries reviewed on the team page; `adminSessionsV1` once
    every admin uses the new portal sign-in.
20. `socketTokenRequired` very last: when `[sec-1] … without a token (older app)` lines are rare in the logs.

Shopify (not a flag): the webhooks verify Shopify's signature and are rate-limited since r8
(`RATE_LIMIT_SHOPIFY_WEBHOOK_MAX`, default 120/min; `/api/shopify-app` `RATE_LIMIT_SHOPIFY_APP_MAX`, default 300/min).
`SHOPIFY_API_SECRET` must be set in Railway or every webhook is refused (one warning in the logs).

Already on: `metaEvents` (the owner's `META_EVENTS_ENABLED`), `domainEvents` (on by design).
