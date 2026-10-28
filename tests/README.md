# tests

Checks written while building events v2, tickets, push notifications and Meta App Events.
They use fakes only: in-memory models (no database), a fake Expo push service, a fake Meta
SDK, fake phone storage. No secrets, no `.env`, nothing leaves `127.0.0.1` (the admin UI test
answers the production URL locally and maps it to a dead port in Chrome).

## Run

```bash
node tests/run-all.js          # everything
node tests/run-all.js server   # or: app | admin
node tests/app/meta-events.test.js   # one suite
```

- **Server repo:** the server suites load the real routes and models from the server repo, a
  sibling folder `../server` (or set `TDC_SERVER_DIR`). They use the server's
  `node_modules`; the app suites use this repo's.
- **Branches:** each suite checks the code on the branches it was written for. `server/app-flags`
  needs the server's `feat/app-flags` (or main after it is merged).
- **Admin UI test:** needs Chrome and an edu-boost production build:
  `cd ../edu-boost && BUILD_PATH=<folder> npm run build`, then
  `ADMIN_BUILD=<folder> node tests/run-all.js admin`. Without `ADMIN_BUILD` it is skipped.
- **Output files** (sample ticket email / page, screenshots, Chrome profile) go to the OS temp
  folder `tdc-tests/`, never into the repo.

## Suites

| Suite | Checks |
|---|---|
| `server/events-v2.test.js` | events v2: category templates, create / edit validation, registration form, tiers, seats, payment proof, admin review, CSV, public vs private fields |
| `server/events-security.test.js` | events routes: sign-in, admin and owner rules |
| `server/tickets.test.js` | tickets: issued once, reject / verify, multi-seat, code uniqueness, access, admin cancel / restore / resend, backfill, ticket page link, email, rate limit |
| `server/push-test-route.test.js` | Notification Settings push test with phones from two EAS projects |
| `server/push-two-projects.test.js` | per-project Expo access tokens, learned projects, receipts, save-token projectId |
| `server/app-flags.test.js` | `GET /api/app/flags` (Meta kill switch) |
| `app/meta-events.test.js` | Meta App Events module: gates, strict consent, waiting events, duplicates, kill switch, never throws |
| `app/meta-consent.test.js` | consent sheet and the Settings → privacy switch |
| `app/notifications.test.js` | push token save / change / logout removal, one foreground handler |
| `app/push-token-project.test.js` | the token save sends the build's EAS projectId |
| `app/perf-app.test.js` | App speed: [perf] marks, splash waits for fonts only, legacy channels once, Home's unused requests, phone cache, RemoteImage + Cloudinary sizes, parallel brands + summary, unread count |
| `app/responsiveness.test.js` | Tab taps and re-renders: whole Social circle tappable (layout + hit test), lazy/frozen tabs and the tour, header visibility renders, stable AuthContext, one shared unread count, feed/confession polling only on screen, search encoding, story delete errors, own posts on every page, unmountOnBlur replacement, memoised list rows, post details as one list. Uses `harness/realrender.js` (real React via react-reconciler) for memo/hook checks |
| `app/ticket-screen.test.js` | ticket screen, download / share, offline copy, download button states |
| `app/events-fresh-data.test.js` | events screen always shows the latest event, form and fee |
| `admin/tickets-admin-ui.test.js` | admin registrations: ticket codes, cancel / restore, re-send, copy link, email status |
