# tdc full redesign: Claude Code handoff

Everything Claude Code needs to redesign the whole app in one go, plus "near me" deals on Home.

| File | What it is |
|---|---|
| `CLAUDE_TASK_FULL.md` | rules, steps and the questions Claude Code asks you first |
| `SCREEN_MAP.md` | which approved design goes on which screen; which screens just get the new style |
| `DESIGN_SYSTEM.md` | colours, fonts, buttons, cards, inputs for every screen |
| `NEAR_ME_SPEC.md` | location permission, nearest brands, and the small backend change it needs |
| `PROGRESS.md` | checklist Claude Code ticks as it goes (so a new session can continue) |
| `designs/` | the approved designs (`home-final`, `screens`), ones it must ask about (`ask-first`), shared parts (`reference`) |

## How to use
1. Put this `tdc-full-redesign` folder in your project root, next to `tdc-ui-handoff`.
2. Make sure the server code is in the same VS Code workspace (Claude Code read it before, so it should be).
3. Paste the command below into Claude Code.
4. Answer its questions, read its plan, reply "approved". It then works through everything and reports at the end.
5. If the session runs out before it finishes, start a new one and paste: `Read @tdc-full-redesign/CLAUDE_TASK_FULL.md and @tdc-full-redesign/PROGRESS.md and continue from the next unticked item. Same rules.`

## The command
```
Read every file in @tdc-full-redesign/ (start with CLAUDE_TASK_FULL.md, then SCREEN_MAP.md, DESIGN_SYSTEM.md, NEAR_ME_SPEC.md, PROGRESS.md, then the designs). Follow CLAUDE_TASK_FULL.md exactly. UI only, except the "near me" backend work in NEAR_ME_SPEC.md section 2. Keep every existing feature and behaviour. Never touch credentials.json, google-services.json, eas.json, .jks or .env files. Ask me the questions in section 4 first, then show one plan and wait for "approved". After that, do everything in one go, commit screen by screen on ui/full-redesign, keep PROGRESS.md updated, and don't push or deploy.
```

## After it finishes
- Test on your phone screen by screen, send screenshots of anything that looks off.
- Deploy the server change, then run the backfill (Claude Code gives you the exact commands). Until then "near me" shows your city's deals instead, so nothing breaks.
- Students get the redesign and "near me" with your next store build.
