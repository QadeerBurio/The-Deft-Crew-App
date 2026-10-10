# Reference designs

- `home-design.html` is the approved Home design, exported from the design canvas. It uses the canvas template format (`{{values}}`, `sc-for`, `dc-import`) and won't open as a normal web page. Read it as a spec: every size, colour, radius and gap is written inline in `px` (1 px = 1 dp/pt). The component script at the bottom holds the copy, colours per tool and states.
- Text and numbers in `[brackets]`, and sample numbers like `1,240`, `214`, `46%`, `rs 2,420`, `12`, are placeholders. Never ship them; HOME_SPEC.md says which real data replaces each one, or that it's hidden.
- `home-anatomy.html` explains the reasoning for each section (optional reading).
- Where these files and HOME_SPEC.md disagree, HOME_SPEC.md wins.
- If the owner added PNG screenshots to this folder, use them to check the visual result.
