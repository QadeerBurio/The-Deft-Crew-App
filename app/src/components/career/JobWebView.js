// app/src/components/career/JobWebView.js
// The in-app browser for job links (an external job's apply page, a company website, a map fallback), moved out
// of Career.js so the jobs list and the JobDetails screen share it.
//   <WebViewModal visible url title onClose />   formatUrl(url) → https URL or null   buildLocationUrl(text) → maps URL
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Linking, Platform, StatusBar, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { color as T, font as F } from "../../theme/tokens";

const { width } = Dimensions.get("window");

export const formatUrl = (url) => {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return 'https://' + trimmed;
  if (!trimmed.includes('://') && !trimmed.startsWith('mailto:') && !trimmed.startsWith('tel:')) {
    return 'https://' + trimmed;
  }
  return trimmed;
};

// Build a Google Maps search URL for a given location string
export const buildLocationUrl = (locationString) => {
  if (!locationString) return null;
  const clean = String(locationString).trim();
  if (!clean) return null;
  const encoded = encodeURIComponent(clean);
  // Universal Google Maps link — opens native app if installed, falls back to web
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
};

export const WebViewModal = ({ visible, url, title, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setProgress(0);
      setError(null);
      setCanGoBack(false);
    }
  }, [visible, url]);

  const handleShouldStartLoad = (request) => {
    const { url: reqUrl } = request;
    // Let the WebView handle http(s) — block only non-web protocols
    if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://') || reqUrl.startsWith('about:')) {
      return true;
    }
    // mailto:, tel:, intent://, whatsapp:// etc → open externally
    Linking.canOpenURL(reqUrl).then((supported) => {
      if (supported) Linking.openURL(reqUrl);
    });
    return false;
  };

  const handleOpenInBrowser = async () => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'This link cannot be opened in your browser.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open link.');
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setProgress(0);
    webViewRef.current?.reload();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={webViewStyles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

        {/* Header */}
        <View style={webViewStyles.header}>
          <TouchableOpacity onPress={onClose} style={webViewStyles.headerBtn}>
            <Ionicons name="close" size={22} color={T.ink} />
          </TouchableOpacity>

          <View style={webViewStyles.headerCenter}>
            <Text style={webViewStyles.headerTitle} numberOfLines={1}>
              {title || 'Application'}
            </Text>
            <Text style={webViewStyles.headerUrl} numberOfLines={1}>
              {url ? url.replace(/^https?:\/\//, '').split('/')[0] : ''}
            </Text>
          </View>

          <View style={webViewStyles.headerActions}>
            {canGoBack && (
              <TouchableOpacity
                onPress={() => webViewRef.current?.goBack()}
                style={webViewStyles.headerBtn}
              >
                <Ionicons name="arrow-back" size={20} color={T.ink} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleOpenInBrowser}
              style={webViewStyles.headerBtn}
            >
              <Ionicons name="open-outline" size={20} color={T.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar */}
        {loading && !error && (
          <View style={webViewStyles.progressTrack}>
            <View style={[webViewStyles.progressFill, { width: `${Math.max(progress * 100, 5)}%` }]} />
          </View>
        )}

        {/* Error state */}
        {error ? (
          <View style={webViewStyles.errorContainer}>
            <View style={webViewStyles.errorIconCircle}>
              <MaterialCommunityIcons name="wifi-off" size={48} color={T.yellow} />
            </View>
            <Text style={webViewStyles.errorTitle}>couldn't load page</Text>
            <Text style={webViewStyles.errorSubtitle}>
              {error.message || "Please check your internet connection and try again."}
            </Text>
            <View style={webViewStyles.errorActions}>
              <TouchableOpacity style={webViewStyles.retryBtn} onPress={handleRetry}>
                <Ionicons name="refresh" size={16} color={T.ink} />
                <Text style={webViewStyles.retryText}>retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={webViewStyles.openBrowserBtn} onPress={handleOpenInBrowser}>
                <Ionicons name="open-outline" size={16} color={T.white} />
                <Text style={webViewStyles.openBrowserText}>open in browser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={webViewStyles.webview}
            onLoadStart={() => {
              setLoading(true);
              setError(null);
            }}
            onLoadEnd={() => setLoading(false)}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setLoading(false);
              setError({
                message: nativeEvent.description || 'Failed to load page',
                code: nativeEvent.code,
              });
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              // Only surface hard failures — 4xx on form pages might still render
              if (nativeEvent.statusCode >= 500) {
                setLoading(false);
                setError({ message: `Server error (${nativeEvent.statusCode})` });
              }
            }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            userAgent={
              Platform.OS === 'android'
                ? 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                : undefined
            }
            renderLoading={() => (
              <View style={webViewStyles.loadingOverlay}>
                <ActivityIndicator size="large" color={T.yellow} />
                <Text style={webViewStyles.loadingText}>loading application...</Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ==================== WEBVIEW STYLES ====================
const webViewStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.card,
    gap: 6,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: { fontSize: 14, fontFamily: F.bodyBold, color: T.ink },
  headerUrl: { fontSize: 10, color: T.textFaint, fontFamily: F.bodyMedium, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  progressTrack: {
    height: 3,
    backgroundColor: T.sand,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: T.yellow,
  },
  webview: { flex: 1, backgroundColor: T.card },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.card,
  },
  loadingText: { marginTop: 12, fontSize: 13, color: T.textFaint, fontFamily: F.bodyMedium },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: T.card,
  },
  errorIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: T.yellowSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: T.line,
  },
  errorTitle: { fontSize: 20, fontFamily: F.heading, color: T.ink, marginBottom: 6 },
  errorSubtitle: { fontSize: 13, fontFamily: F.body, color: T.textFaint, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
  },
  retryText: { fontFamily: F.bodyBold, color: T.ink, fontSize: 13 },
  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: T.ink,
  },
  openBrowserText: { fontFamily: F.bodyBold, color: T.white, fontSize: 13 },
});

export default WebViewModal;
