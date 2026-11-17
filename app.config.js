
module.exports = ({ config }) => {
  const appID = String(process.env.META_APP_ID || "").trim();
  const clientToken = String(
    process.env.META_CLIENT_TOKEN || ""
  ).trim();

  const configured =
    /^\d{5,25}$/.test(appID) &&
    clientToken.length >= 8;

  // A production build on EAS without the Meta IDs would send Meta nothing (no installs, no events): stop it here.
  // Only on the EAS build worker (EAS_BUILD=true) for the "production" profile; local runs, previews and
  // `eas update` aren't affected.
  if (process.env.EAS_BUILD === "true" && String(process.env.EAS_BUILD_PROFILE || "") === "production" && !configured) {
    throw new Error(
      "tdc: this production build needs META_APP_ID and META_CLIENT_TOKEN (EAS environment \"production\"). " +
      "Without them Meta sees no installs or events from this build."
    );
  }

  return {
    ...config,

    plugins: [
      ...(config.plugins || []),

      ...(configured
        ? [
            // Android: advertising-ID collection ON by default in the manifest (iOS stays off: Apple's Allow first).
            // Listed BEFORE the Meta plugin: Expo runs the plugins' manifest changes last-listed first, so this one runs
            // after the Meta plugin has written its entries (plugins/withAndroidAdIdDefault.js)
            "./plugins/withAndroidAdIdDefault",
            [
              "react-native-fbsdk-next",
              {
                appID,
                clientToken,
                displayName: config.name || "tdc",
                scheme: `fb${appID}`,

                isAutoInitEnabled: false,
                autoLogAppEventsEnabled: false,
                advertiserIDCollectionEnabled: false,

                // Apple's tracking prompt (NSUserTrackingUsageDescription), plain words; asked only after the tdc
                // pre-screen's "continue" (app/src/analytics/MetaConsent.js)
                iosUserTrackingPermission:
                  "tdc uses this to show you better student deals in ads on other apps, and to know which of our ads brought you here."
              }
            ],
            // Meta's SKAdNetwork IDs + the AEM deep-link line (plugins/withMetaAttribution.js)
            "./plugins/withMetaAttribution"
          ]
        : [])
    ],

    extra: {
      ...(config.extra || {}),
      meta: {
        enabled: configured
      }
    }
  };
};
