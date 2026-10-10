// app/src/components/AmbassadorForm.js
// The ambassador Google Form inside the app (full-screen modal over the Crew screen).
//   • ScreenHeader "ambassador form." (yellow full stop) with back; progress bar + skeleton while loading;
//     error state with "try again" (offline / load failure)
//   • locked down: only the form's Google pages load in the WebView (see isAllowed);
//     any other link opens in the system browser. No injected JavaScript, no app token,
//     user data, headers or cookies are passed in (incognito: nothing shared either way).
//     No field is pre-filled.
//   • Android back: back inside the form first, then close
//   • submitted = the top frame reaches Google's confirmation page (a docs.google.com
//     /forms/… URL containing "formResponse") → onSubmitted()
import React, { useCallback, useRef, useState } from "react";
import { Modal, View, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import ScreenHeader from "../ui/ScreenHeader";
import EmptyState from "../ui/EmptyState";
import { SkeletonBlock } from "../ui/Skeleton";
import { color as T } from "../theme/tokens";

const hostOf = (url) => {
  const m = String(url || "").match(/^https:\/\/([^/?#]+)(\/[^?#]*)?/i);
  return m ? { host: m[1].toLowerCase(), path: (m[2] || "/").toLowerCase() } : null;
};

// Top-level pages the form may show
export const isAllowed = (url) => {
  const u = hostOf(url);
  if (!u) return false; // https only
  if (u.host === "forms.gle") return true;
  if (u.host === "docs.google.com" && u.path.startsWith("/forms")) return true;
  if (u.host === "accounts.google.com") return true; // sign-in, if the form requires it
  return false;
};

// Frames inside the form page (reCAPTCHA, Google static files)
const isAllowedFrame = (url) => {
  const u = hostOf(url);
  if (!u) return String(url || "").startsWith("about:");
  return (
    isAllowed(url) ||
    u.host === "www.google.com" ||
    u.host === "www.gstatic.com" ||
    u.host.endsWith(".gstatic.com") ||
    u.host.endsWith(".googleusercontent.com")
  );
};

export const isFormSubmitted = (url) => {
  const u = hostOf(url);
  return !!u && u.host === "docs.google.com" && u.path.startsWith("/forms") && u.path.includes("formresponse");
};

export default function AmbassadorForm({ visible, url, onClose, onSubmitted }) {
  const webRef = useRef(null);
  const canGoBackRef = useRef(false);
  const submittedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // remounts the WebView on "try again"

  const reset = useCallback(() => {
    canGoBackRef.current = false;
    submittedRef.current = false;
    setProgress(0);
    setFirstLoadDone(false);
    setFailed(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  // Android back: inside the form first, then close
  const onBack = useCallback(() => {
    if (canGoBackRef.current && !failed) webRef.current?.goBack();
    else close();
  }, [close, failed]);

  const onNavChange = useCallback(
    (nav) => {
      canGoBackRef.current = !!nav?.canGoBack;
      if (!submittedRef.current && isFormSubmitted(nav?.url)) {
        submittedRef.current = true;
        onSubmitted?.();
      }
    },
    [onSubmitted]
  );

  const onShouldStart = useCallback((req) => {
    const target = req?.url || "";
    const topFrame = req?.isTopFrame !== false;
    if (topFrame ? isAllowed(target) : isAllowedFrame(target)) return true;
    // anything else: system browser for http(s) links, otherwise ignored
    if (topFrame && /^https?:\/\//i.test(target)) Linking.openURL(target).catch(() => {});
    return false;
  }, []);

  const retry = useCallback(() => {
    reset();
    setAttempt((n) => n + 1);
  }, [reset]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} statusBarTranslucent>
      <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
        <ScreenHeader title="ambassador form" onBack={onBack} />
        <View style={s.progressTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {!failed && progress < 1 && <View style={[s.progressBar, { width: `${Math.max(8, progress * 100)}%` }]} />}
        </View>

        {failed ? (
          <View style={s.center}>
            <EmptyState
              mood="panic"
              title="couldn't open the form."
              line="check your connection and try again."
              actionLabel="try again"
              onAction={retry}
            />
          </View>
        ) : (
          <View style={s.flex}>
            {visible && !!url && (
              <WebView
                key={attempt}
                ref={webRef}
                source={{ uri: url }}
                style={s.flex}
                originWhitelist={["https://*"]}
                onShouldStartLoadWithRequest={onShouldStart}
                onNavigationStateChange={onNavChange}
                onLoadProgress={(e) => setProgress(e?.nativeEvent?.progress || 0)}
                onLoadEnd={() => setFirstLoadDone(true)}
                onError={() => setFailed(true)}
                onHttpError={(e) => {
                  if ((e?.nativeEvent?.statusCode || 0) >= 500) setFailed(true);
                }}
                incognito
                javaScriptEnabled // Google Forms needs its own scripts; nothing is injected
                domStorageEnabled
                setSupportMultipleWindows={false}
                allowsBackForwardNavigationGestures
                allowFileAccess={false}
                allowsLinkPreview={false}
                mixedContentMode="never"
                nestedScrollEnabled
              />
            )}
            {!firstLoadDone && (
              <View style={[StyleSheet.absoluteFill, s.skeleton]} accessible accessibilityLabel="loading the form">
                <SkeletonBlock height={140} radius={18} />
                <SkeletonBlock width="70%" height={18} style={{ marginTop: 18 }} />
                <SkeletonBlock height={52} radius={16} style={{ marginTop: 14 }} />
                <SkeletonBlock height={52} radius={16} style={{ marginTop: 12 }} />
                <SkeletonBlock height={52} radius={16} style={{ marginTop: 12 }} />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },
  progressTrack: { height: 3, backgroundColor: T.lineSoft },
  progressBar: { height: 3, backgroundColor: T.yellow },
  skeleton: { backgroundColor: T.paper, padding: 16 },
});
