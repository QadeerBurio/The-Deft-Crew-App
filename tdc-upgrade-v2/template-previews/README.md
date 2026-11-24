# Template previews (P3c step 1, for approval)

Made by `node tests/templates/render-previews.js` from the app's own renderer (`templateService.renderResumeHTML`).
Every preview uses the same **sample** resume (`tests/templates/sample.js`): a made-up student, not a real person.

| # | Template | Collection | One A4 page |
|---|---|---|---|
| 1 | Campus (`campus`): a colour band for your name, clean sections | Fresher & Student | yes |
| 2 | First Step (`first_step`): centred and calm, serif headings | Fresher & Student | yes |
| 3 | Fresh Start (`fresh_start`): bold name, a coloured bar on each heading | Fresher & Student | yes |
| 4 | Society Leader (`society_leader`): leadership and activities right after education | Fresher & Student | yes |
| 5 | Project First (`project_first`): projects on top, for builders and makers | Fresher & Student | yes |
| 6 | Internship Ready (`internship_ready`): compact, education and skills up front | Fresher & Student | yes |
| 7 | Scholar (`scholar`): academic: education, awards and research first | Fresher & Student | yes |
| 8 | Harvard (`harvard`): the classic: serif, centred, ruled headings | ATS Pro | yes |
| 9 | Clean Line (`clean_line`): minimal sans, thin lines, lots of air | ATS Pro | yes |
| 10 | Two-tone (`two_tone`): name and headings in two calm colours | ATS Pro | yes |

`00-contact-sheet.png` shows all 10 side by side. Fonts: DM Sans / Outfit (already in the app) and Georgia for the
serif ones; the final embedded font pairs come in step 2.
