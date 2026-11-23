// Owner (after P3b): the social post composer never shows or sends a made-up "Karachi": the student's own location,
// or none (the row is hidden). The server stores what is sent (tests/post-location in the server repo).
//   node tests/app/post-location.test.js
const H = require("./harness");
const { ok, done } = H.counter();
const src = H.read("app/src/screens/Social/CreatePostScreen.js");
ok(!/"Karachi"/.test(src.replace(/\/\/[^\n]*/g, "")), "no 'Karachi' fallback left in the composer");
ok(/location: String\(user\?\.location \|\| ""\)\.trim\(\),/.test(src), "the post sends the student's location, or an empty one");
ok(/\{!!String\(user\?\.location \|\| ""\)\.trim\(\) && \(\s*<View style=\{styles\.authorSub\}>/.test(src), "the location row shows only when the student has a location");
done();
