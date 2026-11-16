
module.exports = ({ config }) => {
  const appID = String(process.env.META_APP_ID || "").trim();
  const clientToken = String(
    process.env.META_CLIENT_TOKEN || ""
  ).trim();

  const configured =
    /^\d{5,25}$/.test(appID) &&
    clientToken.length >= 8;

  return {
    ...config,

    plugins: [
      ...(config.plugins || []),

      ...(configured
        ? [
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
