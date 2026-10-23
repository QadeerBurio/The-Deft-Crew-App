
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
                  "Allow TDC to track your activity across other companies' apps and websites to measure advertising performance."
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
