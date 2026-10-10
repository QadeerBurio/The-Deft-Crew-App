# tdc home redesign: Claude Code handoff

This folder is everything Claude Code in VS Code needs to rebuild the **Home screen and the bottom tab bar** in the new design. It covers the frontend UI only. Nothing in here touches the backend, the admin panel, the API or your credentials.

## What's inside

| File | What it is | Who reads it |
|---|---|---|
| `README.md` | this page | you |
| `CLAUDE_TASK.md` | the rules and steps Claude Code must follow | Claude Code |
| `HOME_SPEC.md` | the exact Home layout, sizes, colours, copy and which existing data feeds each part | Claude Code |
| `TAB_BAR_SPEC.md` | the exact tab bar design and what must not break | Claude Code |
| `FONTS.md` | how to add Outfit + DM Sans | Claude Code |
| `GO_LIVE.md` | the checklist before you release | you + your dev |
| `reference/home-design.html` | the approved design source (exact pixel values) | Claude Code |
| `reference/home-anatomy.html` | why every element is there | Claude Code, optional |

## How to use it (5 steps)

1. **Copy this whole `tdc-ui-handoff` folder into the root of your project** (the "Testing" folder you have open in VS Code, next to `App.js` and `app.json`).
2. **Optional but helpful:** open the design canvas, export the Home board as PNG and drop the images into `tdc-ui-handoff/reference/` (any name, e.g. `home-first-screen.png`, `home-full-scroll.png`). Claude Code can look at images.
3. Make sure your project is on the latest `main` and has no unsaved changes. In the VS Code terminal:
   ```
   git checkout main
   git pull
   git status
   ```
   `git status` should say "nothing to commit, working tree clean".
4. Open the Claude Code panel and paste the command below.
5. Claude Code will **ask you questions first, then show a plan, and wait**. Answer, read the plan, and only then reply "approved".

## The command to paste into Claude Code

```
Read every file in @tdc-ui-handoff/ (start with CLAUDE_TASK.md, then HOME_SPEC.md, TAB_BAR_SPEC.md, FONTS.md and reference/home-design.html). Follow CLAUDE_TASK.md exactly. Frontend UI only: do not touch the backend, the admin panel, any API file, credentials.json, google-services.json, eas.json or any .jks file. First ask me the open questions in CLAUDE_TASK.md section 4, then show me your plan with the list of files you will change, and wait for my approval before editing anything. Do not commit or push.
```

## After Claude Code finishes

- It will tell you which files it changed. Run the app (`npx expo start`) and check Home and the tab bar on a real phone, Android and iPhone if you can.
- If something looks wrong, tell Claude Code what you see (a screenshot helps) and ask it to fix only that.
- When you're happy, ask it: "commit this on the branch ui/home-redesign with a clear message". Pushing and releasing stays your (or your dev's) call. See `GO_LIVE.md`.

## Important: security (do this soon, separate from the redesign)

Your project folder has `credentials.json`, `google-services.json` and two `.jks` keystore files, and the GitHub repo `The-Deft-Crew-App` is public with `credentials.json` and `google-services.json` committed. Anyone can read those. Details and fixes are in `GO_LIVE.md` section 1. Claude Code has been told never to open, change or commit those files.
