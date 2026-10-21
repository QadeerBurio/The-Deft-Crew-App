// tests/paths.js
// Where the code under test lives, and where tests may write files (never into the repo).
//   APP     this repo (the tdc app)
//   SERVER  the server repo: TDC_SERVER_DIR, else a sibling folder named "server"
//   out(f)  a file in the OS temp folder (sample emails, screenshots, browser profile)
const fs = require("fs");
const os = require("os");
const path = require("path");

const APP = path.resolve(__dirname, "..");
const SERVER = path.resolve(process.env.TDC_SERVER_DIR || path.join(APP, "..", "server"));
const OUT = path.join(os.tmpdir(), "tdc-tests");

function out(name) {
  fs.mkdirSync(OUT, { recursive: true });
  return path.join(OUT, name);
}

if (!fs.existsSync(path.join(SERVER, "server.js"))) {
  console.error(`[tests] server repo not found at ${SERVER}. Set TDC_SERVER_DIR to its folder.`);
}

module.exports = { APP, SERVER, OUT, out };
