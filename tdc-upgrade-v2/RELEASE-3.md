# Release 3

Release 3 = **Release 2** (`RELEASE-2.md`) **+ P2** (the ambassador programme). Prepared **locally only**: branch
`release/r3` in each repo, made from `release/r2` with `upgrade/p2-ambassador` merged. Nothing is pushed, merged into
`main` or deployed until the owner says so in writing. Release 1 and Release 2 ship first; Release 3 after them.

## (a) What's in it, in plain words

**The ambassador programme in the app.** A student who has just had a good moment (a friend joined with their code and
verified their e-mail, a 3rd deal claimed, a new level, a confession with 10+ likes) may be asked once "be a tdc
ambassador?". The server decides who and when; a student is asked at most twice ("not now" → again after 30 days,
"don't ask again" → never), never during the app tour.

- **Intro:** 4 cards: what it is, what you do, what you get, and the real number of ambassadors at their university
  (or "be the first at <uni>"; nothing when unknown).
- **Apply in the app:** name and university come from the profile; why (chips or a line), campus groups, handle. The
  status (in / pending / not this time, with the team's note and when they can apply again) comes from the server.
- **Ambassador hub** (approved ambassadors): friends who joined and verified this week / month, rank this month,
  live brand campaigns, credentials (the PDF opens in the browser), "post a campus moment" (photo + caption, checked
  like confessions, then reviewed by the crew team).
- **Home:** an ambassador's campaign to share today (only when a real campaign is live).
- **Bring your squad** (own flag): 3 friends who join with your code and verify their e-mail in a week → 100 points
  once that week.
- **Real amounts** in the copy: "your friend gets 100 points and you get 150 when they join and verify their email".

**Credentials.** Certificates and letters are PDFs made by the server: name, role, university, dates, credential id
and a verify link + QR (`gettdc.pk/verify/<id>`). The public verify page shows only those facts and valid / revoked.
Recommendation letters are written and approved by an admin before they're issued (never generated).

**Portal:** the crew inbox shows campus moments (photo + caption) and the in-app application's details, with a note
to the student; credentials get a letter editor, approve & issue, PDF preview and the verify link; partners can be
filtered by university and show verified invites. The web `/ambassador` page sends students to the app once the
programme is on for everyone.

## (b) Flags (all off) and settings

| Flag / setting | Default | What it does |
|---|---|---|
| `ambassadorV2` (per student; admin → features "Ambassador v2"; Railway `FLAG_AMBASSADOR_V2`) | off | the whole programme in the app; letters as drafts for that student; the review push; the referee's "+100" popup. `on` for everyone also switches the web `/ambassador` page to "apply in the app" |
| `squadMission` (per student; admin → features "Squad mission"; Railway `FLAG_SQUAD_MISSION`) | off | the weekly "bring your squad" card and reward |
| `SQUAD_REWARD_POINTS` | 100 (1–1000) | the weekly squad reward |
| `RATE_LIMIT_CREDENTIAL_VERIFY_MAX` | 30 per 10 minutes per address | the public verify page |
| `PORTAL_URL` | `https://gettdc.pk` | the verify link and QR printed on credentials |
| `PUBLIC_BASE_URL` | the Railway production URL | the 10-minute credential PDF link the app opens |

## (c) What changes for everyone with the flags off

- Students: nothing. The crew screen keeps the Google Form and today's text; the new routes answer "not found".
- Admins: the crew pages show more (moments, application details, a note box, a letter editor, the verify link, a
  university filter). With the flag off for a student, a letter is issued at once, as today. Revoking now also records
  who revoked it, and the credential's public verify page says "revoked".
- Anyone: `gettdc.pk/verify/<id>` works (only issued / revoked credentials; drafts are never shown).
- Old app versions: every reply they use is unchanged (new fields only).

## (d) Railway variables

None are required. Optional: `SQUAD_REWARD_POINTS`, `RATE_LIMIT_CREDENTIAL_VERIFY_MAX`, `PORTAL_URL`,
`PUBLIC_BASE_URL` (defaults above). `FLAG_AMBASSADOR_V2=on` only at step 5 below; `FLAG_SQUAD_MISSION` not needed (per
account in admin → features), `on` only at step 7.

## (e) Rollout order (owner)

1. **Server**: merge `release/r3` → Railway deploys (after Release 2 is live and settled). All flags off: nothing
   changes for students.
2. **Portal**: deploy `release/r3` (Vercel preview first; check `/verify/<a real issued id>` and `/ambassador`).
3. **App**: the P2 screens are JavaScript only: they reach phones with the next OTA update of the 1.3.0 line (or the
   1.3.0 store build), no native change. Until then the flag has nothing to show on old installs (the routes are only
   called by the new screens).
4. **`ambassadorV2` for test accounts**: admin → features → "Ambassador v2" on for 3–5 test students (and one test
   admin flow): run the manual tests in (f). Then for a small pilot (e.g. the current ambassadors and their
   universities) for a few days; watch the crew inbox, the verify page and support.
5. **`ambassadorV2` for everyone**: Railway `FLAG_AMBASSADOR_V2=on`. The web `/ambassador` page now says "apply in the
   app" with the store buttons.
6. Watch for a week: invitations shown vs answered, applications, moments, letters.
7. **`squadMission`, a week after step 5**: test accounts first (admin → features "Squad mission"), then
   `FLAG_SQUAD_MISSION=on`. Check the points ledger for `squad:weekly` rows on the first Monday after.

## (f) Manual tests (on a preview build / staging, flag on for a test student)

1. **Invitation:** a test friend joins with the student's code and verifies their e-mail → the sheet appears about 4
   seconds after the app opens; try "tell me more" (opens the intro), "not now" and "don't ask again".
2. **Apply** from the intro; in the portal inbox **reject with a note** → the push and the status screen show the
   note and the date they can apply again.
3. **Approve** in the portal → a "you're in" push; the crew screen's card opens the **hub**.
4. **Letter:** portal → credentials → issue a recommendation for the student (a draft) → write letter → PDF preview →
   approve & issue → open it from the hub. **Scan the QR** → the verify page says valid; **revoke** → scan again → it
   says revoked; the hub's PDF no longer opens.
5. **Campus moment:** post a photo + caption from the hub → it appears in the crew inbox with the photo; a blocked
   caption is refused with "change it and try again".
6. **Squad:** turn on Squad mission for the student; 3 friends join and verify in one week → +100 once (a 4th friend
   pays nothing more that week).
7. Flag off for another student: the crew screen still opens the Google Form; the copy is today's.

## (g) Rollback

- `ambassadorV2` / `squadMission` off (or Railway flag removed): the app is back to today at once; the web page goes
  back to the form. Applications, moments and credentials stay in the database.
- A wrong credential: revoke it in the portal (its verify page says "revoked").
- Server or portal: redeploy the Release 2 build (Railway: previous deployment; Vercel: promote the previous one).
  The new fields are optional; Release 2 code ignores them.

## (h) Merge and test results (local, release/r3)

| Repo | release/r3 | Tests after the merge |
|---|---|---|
| SERVER | `74908181` (from release/r2 `7202857f`) | 94/94 suites (shopify-review skipped as always) |
| APP | `eb8d462` (from `759e5ca`) | 57 suites ok; `expo export` android + ios ok |
| ADMIN | `95147b8` (from `e8ea924`) | jest 151/151; portal checks 38/38 |

One merge conflict, in the APP docs only (`PROGRESS.md`: release/r2 added the Phase A follow-ups and the P2 verification, P2 added its own section at the same place): both kept, nothing else touched. The owner's uncommitted `app.json` edit stays unstaged.
