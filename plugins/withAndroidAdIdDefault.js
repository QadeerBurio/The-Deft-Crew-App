// plugins/withAndroidAdIdDefault.js
// Android: the Meta SDK's advertising-ID collection is ON by default in the manifest (the Android advertising ID is
// on unless the student turns off "ads with your details"; app/src/analytics/metaEvents.js still switches it off at
// runtime, before the SDK starts, for a student who said no or turned measurement off). iOS keeps the plugin's
// default (off): the iPhone ad ID needs "continue" + Apple's Allow, set at runtime.
// Runs only when the Meta SDK plugin is in (app.config.js adds both together); without the Meta entries it changes
// nothing. Also makes sure the advertising-ID permission is declared.
const { withAndroidManifest, AndroidConfig, createRunOncePlugin } = require("expo/config-plugins");

const KEY = "com.facebook.sdk.AdvertiserIDCollectionEnabled";
const AD_ID = "com.google.android.gms.permission.AD_ID";

function setAdIdDefault(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const metas = app["meta-data"] || [];
  const isMeta = metas.some((m) => String(m.$?.["android:name"] || "").startsWith("com.facebook.sdk."));
  if (!isMeta) return manifest; // the Meta SDK isn't in this build
  const entry = metas.find((m) => m.$?.["android:name"] === KEY);
  if (entry) entry.$["android:value"] = "true";
  else metas.push({ $: { "android:name": KEY, "android:value": "true" } });
  app["meta-data"] = metas;
  const perms = manifest.manifest["uses-permission"] || [];
  if (!perms.some((p) => p.$?.["android:name"] === AD_ID)) perms.push({ $: { "android:name": AD_ID } });
  manifest.manifest["uses-permission"] = perms;
  return manifest;
}

const withAndroidAdIdDefault = (config) => withAndroidManifest(config, (c) => { c.modResults = setAdIdDefault(c.modResults); return c; });

module.exports = createRunOncePlugin(withAndroidAdIdDefault, "tdc-android-ad-id-default", "1.0.0");
module.exports.setAdIdDefault = setAdIdDefault;
