// Puppeteer is a devDependency for the resume template tests and previews only (owner P3 #2): it never ships in the
// app and never downloads a browser on install (EAS builds and everyone's npm install stay as before). The template
// scripts use the Chrome / Edge already on the machine (tests/templates/browser.js finds it; or set
// PUPPETEER_EXECUTABLE_PATH).
module.exports = { skipDownload: true };
