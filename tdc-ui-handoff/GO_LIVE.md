# Before going live: checklist

For the owner and the developer. Claude Code does **not** do any of this unless you explicitly ask it to.

## 1. Security (urgent, separate from the redesign)
The GitHub repo `The-Deft-Crew-App` is public and contains `credentials.json` (Android keystore passwords) and `google-services.json`. Your local folder also has two `.jks` keystore files in the root.
- [ ] Make the GitHub repo **private** (GitHub → Settings → General → Danger zone → Change visibility).
- [ ] Treat the keystore passwords as leaked. With your dev, review signing in `eas credentials` (Android). If you use Google Play App Signing, ask Google Play support for an **upload key reset** and upload a new upload key; never lose the current one before that's done.
- [ ] In Firebase / Google Cloud console, restrict the API key in `google-services.json` to your Android package name and SHA-1 fingerprints.
- [ ] Add to `.gitignore`: `credentials.json`, `*.jks`, `*.keystore`, `credentials/`. Remove them from git tracking (`git rm --cached ...`) in a separate commit, keep local copies safe (password manager / EAS).
- [ ] Note: removing a file now doesn't remove it from git history. If the repo has to stay public, history must be cleaned (e.g. `git filter-repo`) by your dev.

## 2. Review the redesign
- [ ] Claude Code's `git diff --stat` lists only: `Home.js`, `TabNavigator.js`, `App.js`, `DailyDropCard.js` (variant only), `package.json`, `package-lock.json`, new files in `app/src/screens/home/` and `app/src/theme/tokens.js`.
- [ ] Explore and Student Dashboard still show the Daily Drop card exactly as before.
- [ ] Your dev reads the diff once.

## 3. Test on real phones
- [ ] One Android (ideally a mid-range one) and one iPhone, signed in as a student with real data.
- [ ] Guest mode.
- [ ] A brand-new account (0 of 8 sorted, no streak).
- [ ] Vote on today's drop; the points celebration still appears.
- [ ] Tap every tool in the grid: each opens the same screen as before.
- [ ] Tap a deal → offer screen → claim still works.
- [ ] Tap the confession → it opens pinned in the confessions feed.
- [ ] AI button opens the chatbot.
- [ ] App tour (new user) highlights the right tabs.
- [ ] Pull to refresh.
- [ ] Biggest system font size; small screen.
- [ ] No red error screens; no new warnings in the console.

## 4. Release
- [ ] Commit on branch `ui/home-redesign`, open a PR, review, merge into `main`.
- [ ] Bump `version` in `app.json` (and Android `versionCode` / iOS `buildNumber` if you don't use `autoIncrement` in `eas.json`).
- [ ] `eas build --platform all --profile production`, test the build from TestFlight / Play internal testing first.
- [ ] `eas submit`, then staged rollout on Play (e.g. 20% → 100%).
- [ ] Update store screenshots to the new Home once it's live.

## 5. After launch, measure
These are what the design is meant to move. Compare 2 weeks before vs 2 weeks after.
- Opens per user per day (target 2+).
- Daily Drop vote rate.
- Share of sessions that open Social.
- Tools used per student per week.
- Deal redemptions per active student.

## 6. Later (needs backend work, not in this task)
The full design had a few things the backend can't do yet. They were left out on purpose; add them only when the backend supports them:
- 3 drops a day (morning / lunch / night) with "next drop at ..." text.
- A "confession of the day" pick, and same / lol / nope reactions.
- "[N] new posts since you last checked".
- Distance to each deal ("1.2 km").
- "+5 points" per vote shown up front (only if the backend awards and returns it).
