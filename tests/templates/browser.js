// tests/templates/browser.js — the headless browser for the template previews and tests (owner P3 #2: puppeteer is a
// devDependency; no browser is downloaded, see .puppeteerrc.cjs). Uses PUPPETEER_EXECUTABLE_PATH, else the Chrome /
// Edge installed on the machine. Returns null when none is found (the caller says so and skips).
const fs = require("fs");
const path = require("path");
const Module = require("module");
const reqApp = Module.createRequire(path.join(__dirname, "..", "..", "package.json"));

const CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);

function executable() { return CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null; }

async function launch() {
  const exe = executable();
  if (!exe) return null;
  const puppeteer = reqApp("puppeteer");
  return puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
}

module.exports = { executable, launch, reqApp };
