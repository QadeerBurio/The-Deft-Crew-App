// plugins/withMetaAttribution.js
// iOS attribution for Meta without App Tracking Transparency (feat/ios-meta-attribution):
//   1. SKAdNetwork: Meta's SKAdNetwork IDs in Info.plist (SKAdNetworkItems), so installs from Meta ads are attributed
//      by Apple, aggregated, with no identifier. The SDK manages the conversion values (sign-up, first redemption)
//      itself; its SKAdNetwork reporting is on by default and nothing here turns it off.
//   2. Aggregated Event Measurement: the SDK records AEM for the events it logs; it also needs the URL an ad opened the
//      app with, so the AppDelegate's deep-link handler passes it to the SDK too (the react-native-fbsdk-next plugin
//      doesn't). If Expo's handler isn't found, nothing is changed (a warning), never a half-edited file.
// Meta's SKAdNetwork IDs: https://developers.facebook.com/docs/SKAdNetwork (the same two react-native-fbsdk-next adds).
const { withInfoPlist, withAppDelegate, createRunOncePlugin } = require("expo/config-plugins");

const META_SKADNETWORK_IDS = ["v9wttpbfk9.skadnetwork", "n38lu8286q.skadnetwork"];

function addSkAdNetworkIds(infoPlist, ids = META_SKADNETWORK_IDS) {
  const items = Array.isArray(infoPlist.SKAdNetworkItems) ? infoPlist.SKAdNetworkItems : [];
  const have = new Set(items.map((i) => String(i?.SKAdNetworkIdentifier || "").toLowerCase()).filter(Boolean));
  for (const id of ids) if (!have.has(id.toLowerCase())) items.push({ SKAdNetworkIdentifier: id.toLowerCase() });
  infoPlist.SKAdNetworkItems = items;
  return infoPlist;
}

const MARK = "// tdc: Meta AEM (withMetaAttribution)";
/** Swift AppDelegate: pass the opening URL to the Meta SDK (Aggregated Event Measurement). Returns { contents, changed }. */
function addAemDeepLink(contents) {
  if (contents.includes(MARK)) return { contents, changed: false };
  // Expo's Swift AppDelegate: application(_:open:options:) returning super.application(...) || RCTLinkingManager...
  const handler = /(public override func application\(\s*_ app: UIApplication,\s*open url: URL,\s*options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s*\) -> Bool \{\n)(\s*)(return super\.application\(app, open: url, options: options\))/;
  const m = contents.match(handler);
  if (!m || !/^import Expo\b/m.test(contents)) return { contents, changed: false };
  let out = contents.replace(handler, (all, head, indent, ret) => `${head}${indent}${MARK}\n${indent}_ = ApplicationDelegate.shared.application(app, open: url, options: options)\n${indent}${ret}`);
  if (!/^import FBSDKCoreKit\b/m.test(out)) out = out.replace(/^import Expo\b.*$/m, (line) => `${line}\nimport FBSDKCoreKit`);
  return { contents: out, changed: true };
}

const withMetaAttribution = (config) => {
  config = withInfoPlist(config, (c) => { c.modResults = addSkAdNetworkIds(c.modResults); return c; });
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift") { console.warn("[withMetaAttribution] AppDelegate isn't Swift: the AEM deep-link line wasn't added"); return c; }
    const r = addAemDeepLink(c.modResults.contents);
    if (!r.changed && !c.modResults.contents.includes(MARK)) console.warn("[withMetaAttribution] Expo's deep-link handler wasn't found: the AEM deep-link line wasn't added");
    c.modResults.contents = r.contents;
    return c;
  });
  return config;
};

module.exports = createRunOncePlugin(withMetaAttribution, "tdc-meta-attribution", "1.0.0");
module.exports.META_SKADNETWORK_IDS = META_SKADNETWORK_IDS;
module.exports.addSkAdNetworkIds = addSkAdNetworkIds;
module.exports.addAemDeepLink = addAemDeepLink;
