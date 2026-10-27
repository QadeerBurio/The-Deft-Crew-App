
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

                iosUserTrackingPermission:
                  "tdc uses this to see which tdc ads brought you here. your name, email and phone are never shared."
              }
            ]
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
