// app/src/utils/plainError.js
// Turns a failed request / thrown error into a short message a person can read.
// Raw technical text (axios "Network Error", "Request failed with status code 500",
// server stack / database messages, JSON) is never shown.

const CONNECTION = "please check your connection and try again.";

// words that only show up in technical text
const TECHNICAL =
  /\b(error:|exception|undefined|null|nan|objectid|cast to|validation failed|mongo|e11000|jwt|token|econn|enotfound|etimedout|timeout of|status code|stack|at \w+ \(|syntaxerror|typeerror|referenceerror|unexpected token|cloudinary|multer|axios|request failed|internal server)\b/i;

// A server message is shown only when it reads like a sentence for people.
export function plainText(msg, fallback) {
  if (typeof msg !== "string") return fallback;
  const s = msg.trim();
  if (!s || s.length > 140) return fallback;
  if (/[{}<>[\]\\]|https?:\/\//.test(s)) return fallback;
  if (TECHNICAL.test(s)) return fallback;
  return s;
}

export function plainError(err, fallback = "something went wrong. please try again.") {
  const res = err?.response;
  if (res) {
    // 4xx messages are written for the user (e.g. "event is full"); 5xx are not
    if (res.status >= 400 && res.status < 500) {
      return plainText(res.data?.message || res.data?.error, fallback);
    }
    return fallback;
  }
  // request sent but no reply: offline, timeout
  if (err?.request || /network error|network request failed|timeout/i.test(String(err?.message || ""))) return CONNECTION;
  return fallback;
}

export default plainError;
