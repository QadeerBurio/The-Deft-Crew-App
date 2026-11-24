// P3 #7 (owner): no made-up resume values for anyone: a guest's new resume has no "Software Engineer" title and no
// "Karachi, Pakistan" location unless the student gave them; the builder never assumes a target role for the AI
// skill suggestions (the server also doesn't: tests/resume-ai-defaults).
//   node tests/app/resume-defaults.test.js
const H = require("./harness");
const { ok, done } = H.counter();

const ctx = H.read("app/src/context/ResumeContext.js");
const builder = H.read("app/src/screens/Resume/ResumeBuilder.js") + H.read("app/src/screens/Resume/steps/Step1Personal.js"); // P3a: the steps live in steps/
ok(!/\|\| 'Software Engineer'/.test(ctx) && !/\|\| 'Karachi, Pakistan'/.test(ctx), "guest resume: no 'Software Engineer' / 'Karachi, Pakistan' fallbacks");
ok(/title: user\?\.headline \|\| '',/.test(ctx), "…the title is the student's headline or empty");
ok(/location: user\?\.location && String\(user\.location\)\.trim\(\)\.toLowerCase\(\) !== 'karachi, pakistan' \? user\.location : '',/.test(ctx), "…the account's default location isn't used as the resume's city");
ok(/currentResume\?\.targetJob\?\.jobTitle \|\| ''; \/\/ P3 #7/.test(builder) && !/jobTitle \|\| 'Software Engineer'/.test(builder), "builder: no assumed target role");
ok(/placeholder="Karachi, Pakistan"/.test(builder), "…placeholders (examples in empty fields) stay");
done();
