# Release 2

Release 2 = **Release 1** (`RELEASE-1.md`) **+ Phase A** (team access for the admin portal) and the P0-6 lock-out fix for
the two route files with their own sign-in. Prepared **locally only**: branch `release/r2` in each repo, made from
`release/r1` with `upgrade/phase-a` merged. Nothing is pushed, merged into `main` or deployed until the owner says so in
writing. Release 1 ships first; Release 2 after it.

## (a) What's in it, in plain words

**Team access for the admin portal.** Each admin can be given exactly the access their job needs: role templates
(core team, employer success, brand partnerships, campus & students, community & safety, growth & marketing, finance,
viewer) or single permissions. Super admins manage the team on a new **team & access** page: invite by e-mail, change
access, pause or remove someone (they're signed out at once), see what each person did and when they signed in. Nobody
can give themselves more access, the last super admin can't be removed, and making a super admin needs a second super
admin when there are two or more.

**Every admin action has a permission**, on the server (224 routes, the chat service's admin routes, and sensitive
actions checked again inside: deleting accounts, suspending, revealing who wrote an anonymous post, the hiring
timeline). Admin replies never carry passwords, codes, push tokens or store secrets; ID cards only for those allowed to
see them.

**Shadow mode first:** until the owner switches enforcement on, a member who opens something outside their access is
still allowed, and the "would deny" is listed on the team page for review.

**Admin sign-in security (switched on later):** a 6-digit e-mailed code from a new device (and every 30 days),
automatic sign-out after 12 hours without activity, and a sign-in history.

**Portal:** the menu shows only what each admin can open; safety has its own menu group; a page opened without access
says "you don't have access to this".

**Fix:** suspended / banned accounts are also locked out of the jobs and the account routes, which signed in on their
own (only while `accountStatusEnforce` is on, like everywhere else).

## (b) Flags (all off) and settings

| Flag / setting | Default | What it does |
|---|---|---|
| `adminRbacEnforce` (server only, Railway `FLAG_ADMIN_RBAC_ENFORCE`) | off = shadow mode | admin permissions refused instead of logged |
| `adminSessionsV1` (server only, Railway `FLAG_ADMIN_SESSIONS_V1`) | off | sign-in code, 12-hour idle sign-out, sign-in history |
| `team.manage` | always enforced | only super admins (`SUPER_ADMIN_IDS`, or made super on the team page) manage the team |
| admins without access settings (every admin today) | — | every permission except `team.manage` |

## (c) What changes for everyone with the flags off

- Admins: nothing they can open or do changes, except managing the team (super admins only) and the menu's new
  "safety" group; admin replies no longer include hidden secret fields (no page used them).
- Students, brands, employers: nothing, except that suspended / banned accounts are refused on the jobs and account
  routes **while `accountStatusEnforce` is on** (it's off until its own step in Release 1).

## (d) Railway variables

| Variable | Value | When |
|---|---|---|
| `SUPER_ADMIN_IDS` | the owner's admin account id(s), from `scripts/count-admins.js` (read only) | before the portal (Release 1 needs it too) |
| `PORTAL_URL` | optional, default `https://gettdc.pk` | the link in invitation e-mails |
| `FLAG_ADMIN_RBAC_ENFORCE` | leave unset | step 6 below |
| `FLAG_ADMIN_SESSIONS_V1` | leave unset | step 7 below |

## (e) Rollout order (owner)

1. **Server**: merge `release/r2` → Railway deploys (after Release 1 is live and settled). All flags off: admins see no
   difference.
2. **`SUPER_ADMIN_IDS`** set on Railway (if not already).
3. **Portal**: deploy `release/r2` (Vercel preview first). The menu follows each admin's access; "team & access" appears
   for super admins; the sign-in page can show the code step. **The portal must be live before step 7.**
4. **Assign access**: on the team page, give each team member a template (or invite new members). Admins without
   access settings keep everything except team management until changed.
5. **One week of shadow mode**: members work normally; review "would deny" on the team page daily; fix templates where
   people needed something; repeat until the list stays empty for normal work.
6. **`FLAG_ADMIN_RBAC_ENFORCE=on`**: permissions are enforced (members see "you don't have access to this"). Watch admin
   actions and support for a day.
7. **`FLAG_ADMIN_SESSIONS_V1=on`** (only after step 3): every admin is signed out once and signs in with an e-mailed code
   on each device. Check the e-mails arrive before switching it on (send yourself a test invitation first).

## (f) Staging checklist

1. Flags off: every admin page opens as today for an admin without access settings; the team page is only for the
   super admin (`SUPER_ADMIN_IDS`); another admin gets 403 on `/api/admin/team`.
2. Invite a member as "brand partnerships"; open the e-mail link, set a password, sign in: the menu shows general,
   brands (and safety only if given); employers pages say "you don't have access to this" when opened by link.
3. Shadow mode: the member opens an employer API by hand → allowed, and the team page's "would deny" lists it.
4. `FLAG_ADMIN_RBAC_ENFORCE=on`: the same request → 403; student phones show masked for that member.
5. Pause the member → their next click: "your admin access is paused"; restore → works again.
6. Make a second super admin, then ask for a third: it waits for the other super admin's confirmation.
7. `FLAG_ADMIN_SESSIONS_V1=on`: sign in from a new browser → code e-mail → in; the same browser again → no code; leave
   it 12 hours (or shorten the session in the database) → signed out with the reason; sign-in history lists it.
8. `accountStatusEnforce` on: a suspended employer is refused on jobs pages; an admin never.
9. Admin portal checks (38) and the server suites, as in (h).

## (g) Rollback

- Enforcement / sessions: remove the flag (or set it `off`): back to shadow mode / sign-in as before at once.
- Access settings are optional fields; older code ignores them. Pausing someone is undone with "restore".
- Server or portal: redeploy the Release 1 build (Railway: previous deployment; Vercel: promote the previous one).
- The new collections (sessions, invitations, templates, pending changes, shadow log) are only read by Release 2 code.

## (h) Merge and test results (local, release/r2)

| Repo | release/r2 | Tests after the merge |
|---|---|---|
| SERVER | `7202857f` (from release/r1 `e89c78cb`) | 93/93 suites (`admin-access` re-run once the portal repo was on release/r2: it compares the two permission files) |
| APP | `a8f2421` (from `5f89419`; Phase A has no app code) | 56 suites ok; Android export ok |
| ADMIN | `e8ea924` (from `efb2d8f`) | jest 142/142; portal checks 38/38 |

No merge conflicts. The owner's uncommitted `app.json` edit stays unstaged.
