# Release 6

Release 6 = what is on `main` today (Release 5 + P5a + Q-a, pushed 24 Nov 2026; the Cloudinary fixes, pushed
25 Nov 2026) **+ Part 2**: the Q-a splits, Q-b, Q-c, P5b, P5c, Q-d (native stack) and Q-4 (tablet layout). Prepared
**locally only** on `release/r6` in each repo; not merged to `main`, not pushed, not deployed.

| Repo | `release/r6` | What it adds to `main` |
|---|---|---|
| server | `c962914d` (= `upgrade/qd-flags`) | 11 flags, `POST /api/me/city`, `POST /api/engagement/goals`, `GET /api/engagement/next-action`, the confession 10-likes popup |
| app | this commit (= `upgrade/qd-navigation` + this file) | everything below (JavaScript only) |
| admin portal | `86b128b` (= `main`) | nothing |

The app part is JavaScript only (one approved JS package added: `@tanstack/query-async-storage-persister`; and
`@react-navigation/native-stack` made explicit, already in the build): it can go over the air. The native items
(app links, install referrer, rate-us ask, Sentry, Proguard) wait for 1.3.0 (`release-1.3.0.md` §3b).

## (a) What's in it

**For everyone, no flag (no visible change):** the four giant screens split into files (moved unchanged, checked
line by line); the last remote pictures use the cached RemoteImage (job logo, Surprise Box photos, SkillShare
profile photo, the chat's full-screen viewer); a guest can't upload SkillShare listing files (the global guard
already refused them).

**Behind flags (all off):**

| Flag | What it does | Needs |
|---|---|---|
| `lowDataImages` | smaller, "eco" pictures on 2G / 3G mobile | — |
| `persistCache` | Home opens with the last deals / points saved on the phone (deleted on sign-out) | — |
| `optimisticActions` | a post's save shows at once (goes back on failure) | — |
| `prefetchDetails` | touching an event card starts loading its details | — |
| `headerSearch` | the header's brand search button | — |
| `cityCheck` | "is your city right?" once on Home (old automatic Karachi) | server `POST /api/me/city` |
| `polishEmptyStates` | empty confessions / resumes use the Dot empty state | — |
| `celebrationsPlus` | "share it" on level up / cv ready; a confession's author hears at 10 likes | server |
| `onboardingGoals` | 3 "what tdc does" cards + pick 2 goals; Home's missions follow them | server |
| `homeNextAction` | one "next step" card at the top of Home | server |
| `nativeStackDrawer` | the home stack on the native stack (smoother transitions), from the next app start | — |
| `tabletLayout` | on an iPad / tablet, a centred column of max 600 pt | — |

## (b) What changes for everyone with every flag off

- Nothing on screen. Old app versions: every reply they use is unchanged (new fields only with the flags;
  `cityConfirmedAt`, `goals`, `likes10CelebratedAt` are optional and never required).
- Server: `POST /api/listings/upload` refuses guests with 401 (they were already refused by the global guard).

## (c) Railway / Vercel

Nothing new. (The earlier list in `PROGRESS.md` still applies: `SUPER_ADMIN_IDS`, `SAFETY_ALERT_EMAILS`,
`SAFETY_APPEAL_EMAIL`, `PORTAL_PROXY_SECRET`, `SURPLUS_CODE_SECRET`, …)

## (d) Rollout order (owner)

1. **Server**: merge `release/r6` → `main` (fast-forward), Railway deploys. All flags off.
2. **App**: over the air to a test channel, then production (or with the 1.3.0 build).
3. Flags, each to 3-5 test students first, then a pilot, then everyone:
   1. no-risk polish: `headerSearch`, `polishEmptyStates`, `lowDataImages`, `optimisticActions`, `prefetchDetails`;
   2. `persistCache` (check sign-out removes it: (e) 4);
   3. `cityCheck`, `celebrationsPlus`, `onboardingGoals`, `homeNextAction`;
   4. `tabletLayout` (an iPad test student);
   5. `nativeStackDrawer` last, with the device matrix (PERF-BASELINE.md before / after; Maestro flow 02).

## (e) Manual tests (preview build, flags on for a test student)

1. **Header search**: the search icon → type a brand → Brands filtered; the ✕ closes it.
2. **City check**: a test account with city Karachi and no `cityConfirmedAt`: the card above "near me"; "yes,
   karachi" → gone for good; another account: pick Lahore → near-me deals follow.
3. **Goals**: a new test account: the sheet (3 cards → pick 2) → Home's mission cards start with those goals;
   "later" on another account → never asked again on that phone.
4. **Instant reopen**: open Home, close the app, airplane mode, reopen → last deals / points shown; sign out →
   sign in as another account → nothing from the first.
5. **Next action**: a resume under 80 % → "your resume is N% done"; finish it → the next card.
6. **Celebrations**: level up → "share it" → the share card; a confession with 9 likes + 1 → its author sees
   "10 people liked your confession." once.
7. **Native stack**: flag on → restart the app twice → open / back on 10 home screens, swipe back on iOS, Android
   back; nothing stuck (Maestro flow 02).
8. **Tablet**: an iPad (or the simulator) → every screen in a centred column; rotate.

## (f) Known, not changed

- The keyboard migration (27 screens) waits for the emulator / phone checks.
- The older confession composer / card have accessibility gaps (labels, roles, sizes, text cap): fixing them
  changes the flag-off output; owner to decide (`PROGRESS.md`).
- `HelpCenter.js` opens the website `thedeftcrew.com` (a link): owner to decide.
- gettdc.pk still points at Hostinger until the owner moves DNS (then re-check /i/, /r/, /c/, .well-known).
