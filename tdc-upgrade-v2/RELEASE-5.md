# Release 5

Release 5 = **Release 4** (`RELEASE-4.md`) **+ P4a, P4b, P4c** (confessions v2). Prepared **locally only**: branch
`release/r5` in each repo, made from `release/r4` with `upgrade/p4a-confessions`, `upgrade/p4b-confessions` and
`upgrade/p4c-confessions` merged in that order. **`shopify/connect-fixes` is not in it.** Nothing is pushed, merged into
`main` or deployed until the owner says so in writing. Releases 1 to 4 ship first; Release 5 after them.

The app part is JavaScript only (no native module, permission or `app.json` change): it can reach phones by OTA on
the 1.3.0 line, or with the 1.3.0 store build.

## (a) What's in it, in plain words

**Confessions v2** (flag `confessionsV2`): sort by hot (default), new or top this week; tag chips (the owner's 9 tags,
editable in admin → Safety settings); a mood on a post; "me too" next to like; composer prompt chips (3 a week,
editable), 500 characters; a saved list. **Anonymous handles** (`adjective-noun-123`) are built but **off until the
owner approves the word list** (`tdc-upgrade-v2/confession-handle-words.md`): until then everyone posts as "anon.".

**Polls** (`confessionPolls`): 2-4 options, anonymous votes (who voted for what is never sent), can be changed.
**Follow** (`confessionFollow`): the bell; the author follows their own; a push on new replies with no name or text,
once per 30 minutes per confession, through the push budget and quiet hours; the bell mutes a thread.
**Share** (`confessionShare`): a public confession as an image card (text only, never a handle; its QR is the
confession's own page, no invite code), and its page `gettdc.pk/c/<id>` (text only, noindex); `tdcapp://confession/<id>`
opens it in the app. **Weekly recap** (`confessionRecap`): Sunday 18:30, "your campus this week: N confessions. the top
one got M likes." (numbers only; a campus with at least 5).

**With confessionSafety** (Release 1 flag): the photo button is back in the composer (every image is checked).

## (b) Flags (all off) and settings

Every flag is per student (admin → features), off by default; the sub-flags also need "Confessions v2".

| Flag / setting | Default | What it does |
|---|---|---|
| `confessionsV2` ("Confessions v2"; Railway `FLAG_CONFESSIONS_V2`) | off | sort, tags, moods, me too, prompts, 500 characters, save; post as @handle once handles are approved |
| `confessionPolls` ("Confession polls") | off | polls in posts and votes |
| `confessionFollow` ("Confession follow + reply pushes") | off | the bell, the author's own follow, reply pushes |
| `confessionShare` ("Confession share card + link") | off | the image card, its `/c/<id>` page (also goes away when the latest sharer's flag is off) |
| `confessionRecap` ("Confession weekly recap") | off | the Sunday recap push |
| Handles (`config/confessionHandles.js` `APPROVED`) | false | no handle anywhere until the owner approves the word list (a one-line commit) |
| `PORTAL_PROXY_SECRET` (Release 4) | — | also used by `gettdc.pk/c/` (real visitors for its rate limit): set before `confessionShare` |
| `RATE_LIMIT_CONFESSION_PAGE_MAX` | 120 a minute per visitor | the `/c/<id>` page |

## (c) What changes for everyone, with every flag off

- A new confession is at most 1,000 characters (the app already stopped at 1,000).
- A confession image must come from tdc's own Cloudinary account (what every app version uploads to); anything else
  is refused (400 with a sentence).
- Two duplicate confession routes that were never reached are deleted (no behaviour change).
- The photo / camera permission check works ("denied" was never caught). The photo button itself shows only with
  `confessionSafety`.
- Deleting an account also deletes that student's confession follows and the follows on their confessions.
- Old app versions: every reply they use is unchanged (the new fields are sent only to students with the flags).

## (d) Railway / Vercel variables

Nothing new is required. `PORTAL_PROXY_SECRET` (Release 4) also serves the `/c/` page. Optional:
`RATE_LIMIT_CONFESSION_PAGE_MAX`. The portal's middleware now forwards `/r/*` and `/c/*`.

## (e) Rollout order (owner)

1. **Server**: merge `release/r5` → Railway deploys (after Release 4 is live and settled). All flags off.
2. **Portal**: deploy `release/r5`, Vercel preview first (the build log lists the middleware; `gettdc.pk/c/<any id>`
   shows "this confession isn't available"). Then production.
3. **App**: OTA on the 1.3.0 line (or the 1.3.0 build).
4. **`confessionsV2`** for 3-5 test students: manual tests (f) 1-4; then a pilot (one university) for a week; then
   everyone (`FLAG_CONFESSIONS_V2=on`). Edit the tags and prompts in admin → Safety settings if wanted.
5. **`confessionPolls`** and **`confessionFollow`**: test accounts → everyone. Watch the push budget report for
   `confession_follow` the first days.
6. **`confessionShare`** after `PORTAL_PROXY_SECRET` is set (Release 4): test accounts (manual test (f) 7) → everyone.
7. **`confessionRecap`**: test accounts for one Sunday (check the push log on Monday) → everyone.
8. **Handles**: only after the owner approves `confession-handle-words.md` (`APPROVED = true`, one commit, then deploy).

## (f) Manual tests (preview build / staging, flags on for a test student)

1. **Feed**: hot / new / top this week change the order; a tag chip filters; "saved" lists saved ones.
2. **Composer**: empty → 3 prompt chips; a tag, a mood; 500 characters; posting shows the tag and mood on the card.
3. **Me too**: tap → count +1, tap again → back.
4. **Rules for everyone**: a 1,001-character post (via an older build) is refused; a post with an image works.
5. **Polls**: add a poll (2-4 options), vote, change the vote; a second phone sees the counts, not who voted.
6. **Follow**: post as A → A's bell is on; B replies → A gets "new reply on a confession you follow" (no name, no
   text); B replies again within 30 minutes → no second push; A taps the bell (mute) → no push.
7. **Share**: on a public post "share as an image" → the card (text, no handle; its QR opens `gettdc.pk/c/<id>`); the
   page shows the text only and "read the replies in the app"; a campus-only post has no share button; report the post
   → the page says "not available"; on a phone with the app, "read the replies in the app" opens the post pinned.
8. **Recap**: on staging with 5+ confessions in one campus, run the job (or wait for Sunday 18:30): a test student gets
   "your campus this week" with the right numbers; tapping opens the top confession.
9. **Admin**: Safety settings → rename a tag (its posts keep it), hide one (no longer offered), add one; prompts.

## (g) Known, not changed

- `gettdc.pk/c/<id>` opens the app directly only after the 1.3.0 build adds `gettdc.pk` as an app-link domain; until
  then the page's button uses `tdcapp://`.
- Hot / top show the top 50 (the server can page further; the app shows the first page).
- Voting (`confessionsVoting`): backlog (owner).
- `events-fresh-data` (app test) timing fix: polish phase (owner).
