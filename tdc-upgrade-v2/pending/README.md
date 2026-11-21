# pending: app code written in Phase 0, landing with its first caller

`tests/app/app-cleanup.test.js` requires every file in `app/src` to be imported by the app (no dead files).
These three modules have no caller until P4-1, so they wait here (not bundled, not run) and move into
place, with their tests, in the first P4-1 commit that uses them:

| File | Plan | First caller |
|---|---|---|
| `app/src/api/upgradeFlags.js` | P0-1 flag names | P4-1 (`FLAGS.confessionSafety`) |
| `app/src/analytics/funnel.js` | P0-3 funnel events (never Meta) | P4-1 (`confession_reported`, `confession_precheck_*`) |
| `app/src/utils/reportError.js` | P0-5 option A (console.warn until Sentry in 1.3.0) | P4-1 |
| `tests/app/upgrade-flags.test.js`, `tests/app/funnel-events.test.js` | their tests (11 + 13 checks, passing on 21 Nov 2026) | — |
