// app.config.js
// Everything comes from app.json (EAS project, owner, version stay there, unchanged). This
// file only adds Meta App Events, with the IDs from the environment. Never put real values
// in git.
//
//   META_APP_ID        Meta app ID (digits)
//   META_CLIENT_TOKEN  Meta client token (Meta for Developers → app → Settings → Advanced)
//
// Set them in your shell before `npx expo prebuild -p android` (writes the native settings)
// and as EAS environment variables (preview / production), so the build knows Meta is
// configured. Without them: no Meta settings, and the app never starts the Meta SDK.
//
// The SDK never starts or logs by itself (auto init / auto events / ad ID all off here).
// The app starts it only after the student allows it, while the server's switch
// (GET /api/app/flags → metaEvents) is on. See app/src/analytics/metaEvents.js.

module.exports = ({ config }) => {
  const appID = String(process.env.META_APP_ID || "").trim();
  const clientToken = String(process.env.META_CLIENT_TOKEN || "").trim();
  const configured = /^\d{5,25}$/.test(appID) && clientToken.length >= 8;

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
              },
            ],
          ]
        : []),
    ],
    extra: {
      ...(config.extra || {}),
      // the build's switch: true only when this build was made with the Meta IDs
      meta: { enabled: configured },
    },
  };
};
