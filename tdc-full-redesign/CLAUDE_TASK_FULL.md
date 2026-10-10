# Task for Claude Code: redesign the whole tdc app in one go

The Home screen, tab bar and slider are already redesigned on branch `ui/home-redesign` (see `tdc-ui-handoff/` for how that went). Now apply the approved designs and the design system to **every screen**, and turn Home's deals section into **"near me"**.

The owner chose to do this **in one go**: one task, no stopping between screens for approval. You still ask the questions in section 4 first and show one plan; after "approved" you work through everything and report at the end.

Read first, in this order: `SCREEN_MAP.md`, `DESIGN_SYSTEM.md`, `NEAR_ME_SPEC.md`, `PROGRESS.md`, then the designs in `designs/home-final/` and `designs/screens/`.

---

## 1. Hard rules
1. **UI only, except the "near me" backend work** in NEAR_ME_SPEC §2. No other server, admin, database or API change. If a screen seems to need one, write it in the final report instead.
2. **Don't change behaviour.** Keep every API call, request/response shape, navigation route name and param, deep link, push routing, guest check, permission flow, sound, haptic, celebration, analytics call and tour target. A redesign that drops a feature is a bug. If a design doesn't show an existing feature, keep that feature and style it with the system.
3. **No fake data.** Placeholders in designs (`[brackets]`, sample numbers) are never shipped. Show real data or hide the element.
4. **Never open, print, change or commit** `credentials.json`, `google-services.json`, `eas.json`, `credentials/`, `*.jks`, `*.keystore`, `.env*` (you may add `.env.example` on the server only).
5. `app.json`: only the location permission text in NEAR_ME_SPEC §3.
6. **Don't delete** screens, components or assets. Unused code can stay.
7. **Packages:** don't add new packages without asking. `expo-location` is already installed.
8. **Git:**
   - start: `git checkout ui/home-redesign`, `git pull`, `git status` clean, then `git checkout -b ui/full-redesign`.
   - commit after each screen or group in PROGRESS.md (small commits, clear messages like `Brands: new design`), so any one screen can be reverted alone.
   - backend changes in their own commits (`server: brand geo + nearby endpoint`).
   - **don't push**, don't merge, don't run `eas build/submit/update`, don't run the backfill against production, don't deploy the server. The owner does those.
9. Work in this order so the app always runs: shared UI components → global header and drawer → deal screens → near me → social → career/campus → profile/engagement → auth → every remaining screen (part B).
10. If something is unclear mid-way, **don't guess**: skip that one item, note it in PROGRESS.md under "questions", and continue. Ask them all in the final report.

## 2. Progress file (important)
This job is big and may not fit in one session. Keep `tdc-full-redesign/PROGRESS.md` up to date after every commit: tick the screen, note the commit hash and anything hidden or skipped. If the session ends, a new session must be able to read PROGRESS.md and continue from the next unticked item. Don't commit PROGRESS.md (the folder stays untracked).

## 3. Steps
1. Git setup (rule 8).
2. Read the docs and designs. Read each target screen fully before changing it.
3. Ask the questions in section 4, all in one message. Wait for answers.
4. Send one plan: the order, the shared components you'll create, the screen-by-screen list (design or system-only), the backend changes, and anything in the designs you can't map to real data. Wait for **"approved"**.
5. Build, commit by commit, updating PROGRESS.md.
6. After each group: run the Android bundle check (`npx expo export --platform android --output-dir <temp>`). Fix anything you broke before moving on.
7. At the end:
   - bundle check, and lint with the temporary config you used before (the project's eslint config is broken; don't touch it).
   - `git log --oneline ui/home-redesign..HEAD` and `git diff --stat ui/home-redesign..HEAD`.
   - final report: what changed per screen, what was hidden for missing data, what you skipped and why, open questions, backend changes + exact deploy and backfill steps for the owner, and a test checklist.

## 4. Questions to ask the owner before planning
- **Q-N1. Geocoding provider** for turning brand addresses into map points:
  - Google Geocoding API: most accurate for Pakistani addresses; needs a Google Cloud key with billing; small cost per address (one-time backfill + new brands only).
  - OpenStreetMap Nominatim: free, no key, but less accurate for Pakistani addresses and limited to 1 request per second.
  [recommend: Google]
- **Q-N2. Range:** show brands within 25 km, nearest first, max 6 on Home? [default: yes]
- **Q-N3.** Add a "nearest" sort chip to the Brands screen too? [default: no, Home only]
- **Q-S1. Ask-first designs** (`designs/ask-first/`): `Hub`, `Wall`, `Crew`, `Discover` have no matching screen. Skip them? [default: skip]. Is `Onboard` meant for the first-run flow (`SplashScren.js` / `PermissionScreen.js`)? [default: skip unless confirmed]. `Deal`, `Claimed`, `Sorted` are replaced by `BalancedDeal`. [default: don't use]
- **Q-S2. Confessions** design is dark (`#111111`). Keep the confessions screen dark, or make it light like the rest? [default: keep dark, it was the approved design]
- **Q-S3. Sign in** design is dark too. Keep dark for sign in / sign up only? [default: yes]
- **Q-S4. Global header:** restyle `CustomeHeader` to match Home's design (logo, points pill, bell, menu)? [default: yes, it was in the approved Home design]
- **Q-S5. Lowercase:** apply the lowercase voice to buttons, titles and labels across the whole app (not legal text, names or user content)? [default: yes]
- Anything else you find while reading.
