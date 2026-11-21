# tdc upgrade v2: progress log

Plan: [TDC_UPGRADE_PLAN.md](TDC_UPGRADE_PLAN.md) (copied unchanged from the owner's copy, md5 `58616ee8…`).
Repos (sibling folders): APP `Testting` (The-Deft-Crew-App), SERVER `server` (the-deft-crew), ADMIN `edu-boost` (tdc_admin_portal).
Branch per phase in every repo: `upgrade/p0-safety`, …. Nothing is pushed, deployed or published without the owner's written OK.

## Release facts (owner, 21 Nov 2026)

- `app.json` on main: version **1.2.2**, build 89, `runtimeVersion.policy = appVersion`. (`package.json` still says 1.1.13; EAS ignores it.)
- Live store versions: Play = _[owner to fill from Play Console]_, App Store = _[owner to fill from App Store Connect]_.
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
| P0-1/P0-3/P0-5: add app helpers in Phase 0 | `tests/app/app-cleanup` fails on any `app/src` file nothing imports | written and tested in Phase 0, kept in `tdc-upgrade-v2/pending/`, moved into `app/src` with their first caller (P4-1) |
| P0-6 (new, owner) "super admins are exempt" | no admin levels exist until Phase A (`User.adminAccess`) | every `role: 'admin'` is exempt for now (plan A-1: admins without `adminAccess` count as super); revisit in Phase A |

## Known issues (recorded, not changed)

- SERVER `routes/social.routes.js`: `GET /admin/reports/stats` is declared after `GET /admin/reports/:reportId`, so `/stats` is answered by the detail route (`findById("stats")` → 500). No screen calls it. Leave as is (owner).
- SERVER repo is public on GitHub (S1): owner makes it private.
- N-1 (Railway `SOCIAL_PUSH_*` values): owner.
- APP repo tracks `google-services.json` and `eas.json` (already committed before this upgrade). Never edited or re-staged; commits stage explicit paths only.
- APP `app.json` has an uncommitted whitespace-only change from before this work; never staged.

## Steps

| Plan id | What changed | Files | Commit | Tests | Open |
|---|---|---|---|---|---|
| P0 setup | plan + this log | APP `tdc-upgrade-v2/TDC_UPGRADE_PLAN.md`, `PROGRESS.md` | APP `89d20ed` | baseline above | — |
| P0 baseline | `meta-attribution` expects the current version 1.2.2 (same check, current value) | APP `tests/app/meta-attribution.test.js` | APP `88f7fa4` | suite 22/22 | — |
| P0-4 | ESLint config: only the Expo flat config (three `module.exports` → the Babel one won). `npm run lint` runs: **118 errors, 590 warnings** (baseline, not fixed). Worth a look later: 5 `no-dupe-keys` in style objects (`ResumeStudio.js` 733, `Social/UserProfile.js` 2154, `University.js` 131/140/143). `package.json` name `testting` left as is (renaming has no benefit and some risk). | APP `eslint.config.js` | APP `25c1b3e` | APP run-all: all ok | dupe keys: owner to decide |
| P0-1 (server) | six upgrade flags + `accountStatusEnforce` (server only), all off; never in `ROLE_DEFAULTS` | SERVER `config/featureFlags.js`, `tests/feature-access/run.js` (counts 7→13, 6→12, startup line), new `tests/upgrade-flags/run.js` | SERVER `657ac685` | server 66/66 runnable suites ok (upgrade-flags 26/26, feature-access 96/96); APP `tests/server/app-flags` ok | admin: no code needed, tabs come from the server list |
| P0-1/P0-3/P0-5 (app) | `api/upgradeFlags.js`, `analytics/funnel.js`, `utils/reportError.js` + tests written and passing, but **parked** in `tdc-upgrade-v2/pending/`: `app-cleanup` forbids files nothing imports. They land with their first caller in P4-1. | APP `tdc-upgrade-v2/pending/*` | (next APP commit) | 11/11 + 13/13 when in place | move in with P4-1 |
