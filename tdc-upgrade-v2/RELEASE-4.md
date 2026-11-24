# Release 4

Release 4 = **Release 3** (`RELEASE-3.md`) **+ P3** (the resume builder: P3a, P3b, the fixes after P3b, P3c, P3d and
the fixes after P3d). Prepared **locally only**: branch `release/r4` in each repo, made from `release/r3` with
`upgrade/p3a-resume`, `upgrade/p3b-coach`, `upgrade/fixes-p3b`, `upgrade/p3c-templates` and `upgrade/p3d-finish`
merged in that order. Nothing is pushed, merged into `main` or deployed until the owner says so in writing. Releases 1
to 3 ship first; Release 4 after them.

The app part is JavaScript only (no native module or permission added): it can reach phones by OTA on the 1.3.0
line, or with the 1.3.0 store build.

## (a) What's in it, in plain words

**A resume builder made for freshers** (flag `resumeV2`): a start screen (upload my cv / build from my tdc profile /
start fresh, then "have you done an internship or job yet?"); a fair score for students with no experience (education,
projects and activities count; experience is a bonus); new sections (leadership & activities, volunteering, awards,
coursework, languages); month + year dates; "fits on 1 page"; nothing made up (no default city, job title or numbers).

**The resume coach** (`resumeCoach`): tap answers instead of typing, memory joggers, "we write it, you confirm it"
(every suggestion checked against the student's own facts; anything new is dropped), live checks on each field, "fix
everything", the ready-to-send check, chat mode, and the next button above the keyboard. **Speak mode**
(`resumeSpeak`): hold to talk; the audio is transcribed by OpenAI and never stored.

**The template studio** (`resumeTemplatesV2`): a gallery with "recommended for you" (with the reason), ATS-safe badges
tested on the real PDF, long-press two to compare, and customisation (12 colour sets or a readable custom colour, 8
font pairs embedded in the PDF, size, spacing, margins, headings, sections, photo, dates, page size, link style;
"reset" back to the template's own look). The 10 new templates stay hidden until the owner approves them: with the
flag on, students see today's five.

**Finishing** (each its own flag): recruiter-style **feedback** (`resumeFeedback`); the **finish moment**
(`resumeFinish`); **"verified by tdc"** (`resumeVerified`: verified student at the university, ambassador / founder
credentials with their verify link, off until the student adds it); the **public resume page** (`resumePublicPage`:
gettdc.pk/r/<link>, private by default); **interview rates per template** (`resumeOutcomeStats`, only from 30
applications and 10 interviews). With `resumeV2`, "my tdc resume" in the job application form sends the PDF in the
student's template and records which template went with it.

**Admin:** a read-only **resume metrics** page (general → resume metrics, `analytics.view`).

## (b) Flags (all off) and settings

Every flag below is per student (admin → features), off by default, and each sub-flag also needs "Resume v2".

| Flag / setting | Default | What it does |
|---|---|---|
| `resumeV2` ("Resume v2"; Railway `FLAG_RESUME_V2`) | off | the fresher builder, start screen, fair score, new sections; "my tdc resume" when applying |
| `resumeCoach` ("Resume coach") | off | tap / chat coach, live checks, fix everything, ready-to-send check |
| `resumeSpeak` ("Resume speak mode") | off | hold-to-talk in the coach (audio to OpenAI for text, not stored) |
| `resumeTemplatesV2` ("Resume template studio") | off | gallery, recommended row, badges, compare, customisation (approved templates only) |
| `resumeFeedback` ("Resume feedback") | off | the feedback screen (rules + one AI pass, cached per content) |
| `resumeFinish` ("Resume finish moment") | off | the celebration and next steps, once per resume |
| `resumeVerified` ("Resume verified-by-tdc line") | off | the verified line (on a resume only when the student adds it) |
| `resumePublicPage` ("Public resume page") | off | the public page and its controls on the share screen |
| `resumeOutcomeStats` ("Resume outcome stats") | off | real interview rates in the gallery (nothing until a template has 30 applications and 10 interviews) |
| `PORTAL_PROXY_SECRET` (Railway **and** Vercel, the same value, 16+ characters) | unset | lets the server see the real visitor behind gettdc.pk/r/ (views, rate limit). **Set before `resumePublicPage`** |
| `RESUME_PAGE_ORIGIN` (Vercel, optional) | the production server | where gettdc.pk/r/ forwards to (a staging portal: the staging server) |
| `RATE_LIMIT_RESUME_PAGE_MAX` | 120 a minute per visitor | the public resume page |
| `RATE_LIMIT_RESUME_AI_MAX` | 120 an hour per student | enhance, suggest-skills, the coach and feedback together |
| `OPENAI_MODEL` / `OPENAI_TRANSCRIBE_MODEL` | gpt-4o-mini / whisper-1 | the resume AI / speak mode |
| `PORTAL_URL` | `https://gettdc.pk` | the public page links (and, as before, the credential verify links) |

## (c) What changes for everyone, with every flag off

- **New student accounts** get an empty city instead of "Karachi"; a new resume no longer copies "Karachi, Pakistan";
  the social composer shows no location when none is set. Existing accounts and brands are unchanged.
- **Safe replies**: brand / employer signup, `/signup/verify-otp`, `/profile/me`, `/me` and `/admin-login-as-brand`
  reply with the safe fields only (as admin replies do). `GET /api/auth/me` is answered before `GET /:id`; `GET /:id`:
  self → own record, admin → Phase A check (phone / e-mail only with `pii.view`), anyone else → 403. The six portal
  screens that read these were checked with real-shaped replies.
- **Resume AI** (enhance / suggest skills): uses `OPENAI_MODEL`, never asks for or adds numbers, assumes no role,
  one shared limit of 120 an hour.
- **The Minimal template's headings** are a little less spaced (0.05em instead of 0.08em), so job portals read
  "EDUCATION" instead of "E D U C A T I O N". The other four templates are byte for byte as before.
- **The resume renderer** now lives in one file shared by the app and the server; its output is unchanged (395
  frozen outputs checked).
- Old app versions: every reply they use is unchanged (new fields only, all optional).

## (d) Railway / Vercel variables

Required only before step 7 below: `PORTAL_PROXY_SECRET`, the same value in Railway (production) and Vercel (the
portal's production environment). Make a long random value; never put it in the repo or in chat. Everything else is
optional (defaults above). The flags are per account in admin → features; a Railway `FLAG_…=on` only when a flag goes
to everyone.

## (e) Rollout order (owner)

1. **Server**: merge `release/r4` → Railway deploys (after Release 3 is live and settled). All flags off.
2. **Portal**: deploy `release/r4` to a **Vercel preview first**. Check the build log lists the routing middleware
   (`middleware.js`) and the build passed (Vercel's docs differ on whether a plain `.js` middleware needs ES-module
   settings; if the build fails because of it, rename it to `middleware.mjs`; if it still fails, delete it: the
   `vercel.json` rewrite still serves the page, only the view count then sees one visitor). Then production.
3. **App**: OTA on the 1.3.0 line (or the 1.3.0 build). No native change.
4. **`resumeV2` + `resumeCoach`** for 3–5 test students: the manual tests in (f) 1–4. Then a pilot (one university)
   for a week; then everyone (`FLAG_RESUME_V2=on`, `FLAG_RESUME_COACH=on`).
5. **`resumeTemplatesV2`**, test accounts, then everyone (only the five until the owner approves the 10 new ones).
6. **`resumeFeedback`, `resumeFinish`, `resumeVerified`** together: test accounts, then everyone.
7. **`resumePublicPage`**: first set `PORTAL_PROXY_SECRET` (d) and do the visitor check in (f) 8 on a test account.
   Only then test accounts → pilot → everyone.
8. **`resumeSpeak`** last (audio goes to OpenAI; the privacy line is shown): test accounts, then everyone.
9. **`resumeOutcomeStats`** once admin → resume metrics shows a template with "shown to students: yes" (30
   applications and 10 interviews). Before that it shows nothing anyway.

## (f) Manual tests (preview build / staging, flags on for a test student)

1. **Start**: new resume → the start screen; "start fresh" + "no internship yet" → the fresher order (education
   first, experience last); no city, title or numbers filled in for you.
2. **Score**: education with dates + 2 projects + a society → 80+ without any experience.
3. **Coach**: tap answers for a project → 3 suggestions, none with a number you didn't give; "fix everything" previews
   its changes first.
4. **Finish**: finish a resume → the finish moment once; finish again → the preview.
5. **Templates**: gallery → recommended row with a reason; customise → change colour, font, hide a section → save →
   the PDF matches; "reset" → the template's own look.
6. **Feedback**: "get recruiter feedback" → three sections; "fix it" opens that section.
7. **Verified**: a verified test student with an ambassador certificate → the line on the share screen; add it → it's
   on the PDF with the verify link, which opens the credential page.
8. **Public page: the visitor check (after `PORTAL_PROXY_SECRET` is set in both places)**:
   a. Share screen → turn the page on → note the views (0).
   b. Open the link on **phone A on mobile data** → the page shows; back in the app (reopen the share screen) → **1**.
   c. Open it on **phone B on a different network** (Wi-Fi) → **2**. If it stays at 1, the server sees the portal's
      address, not the visitor's: check the two `PORTAL_PROXY_SECRET` values match (16+ characters) and that the
      preview / production build log lists the middleware.
   d. Phone A again within 30 minutes → still 2. "open my page" in the app → still 2 (the student's own visits).
   e. Paste the link in WhatsApp (the preview fetch) → still 2.
   f. Turn the page off → both phones get "this resume page isn't available". "new link" → the old link stops at once.
   g. View source on the page: `noindex`; no phone or e-mail unless turned on; no street address or postal code.
9. **Apply**: a tdc job → "my tdc resume" → sent; admin → resume metrics → that template has 1 application.
10. **Admin**: an admin without `analytics.view` doesn't see "resume metrics" in the menu.

## (g) Known, not changed

- The iOS microphone text says "voice messages in chats"; speak mode uses the same permission. A wording that also
  mentions the resume needs a native build (1.3.0 backlog).
- Server PDFs (Resume Studio) keep their own "ATS Classic" design (a later task).
- Heading icons and the photo / two-column / one-page gallery filters: backlog (owner, P3c).
