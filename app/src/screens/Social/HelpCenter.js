import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StatusBar,
  Linking,
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { color as T, font as F } from "../../theme/tokens";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { ScreenHeader, HeaderIconButton } from "../../ui";

export default function HelpCenter({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const helpUrl = 'https://thedeftcrew.com/';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.timing(progressWidth, {
        toValue: loadingProgress / 100,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [loadingProgress]);

  const openInBrowser = () => {
    Linking.openURL(helpUrl);
  };

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <Animated.View style={{ opacity: headerFade }}>
        <ScreenHeader
          title="help center"
          onBack={() => navigation.goBack()}
          right={<HeaderIconButton icon="open-outline" label="open thedeftcrew.com in browser" onPress={openInBrowser} />}
        />
      </Animated.View>

      {/* Loading Progress Bar */}
      {loading && (
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidthInterpolated }]}>
            <LinearGradient colors={[T.ink, T.ink]} style={styles.progressGradient} />
          </Animated.View>
        </View>
      )}

      {/* WebView */}
      <View style={styles.webWrapper}>
        <WebView
          source={{ uri: helpUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => setLoadingProgress(nativeEvent.progress * 100)}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          renderLoading={() => null}
        />

        {/* Loading Overlay */}
        {loading && (
          <Animated.View style={[styles.loaderContainer, { opacity: fadeAnim }]}>
            <LinearGradient colors={[T.ink, T.ink]} style={styles.loaderIconCircle}>
              <Ionicons name="help-circle" size={36} color={T.yellow} />
            </LinearGradient>
            <Text style={styles.loadingTitle}>loading help center</Text>
            <Text style={styles.loadingSubtitle}>fetching the latest support articles...</Text>
            <ActivityIndicator size="small" color={T.ink} style={{ marginTop: 16 }} />
          </Animated.View>
        )}

        {/* Bottom Toolbar */}
        <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={T.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color={T.textFaint} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.toolbarBtn} onPress={openInBrowser} activeOpacity={0.7}>
            <Ionicons name="compass-outline" size={20} color={T.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color={T.ink} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.line, backgroundColor: T.card
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 10, color: T.textFaint, fontFamily: F.bodyMedium, marginTop: 1 },

  // Progress Bar
  progressBarContainer: { height: 3, backgroundColor: T.sand, overflow: 'hidden' },
  progressBar: { height: '100%' },
  progressGradient: { width: '100%', height: '100%' },

  // WebView
  webWrapper: { flex: 1, backgroundColor: T.card },
  webview: { flex: 1 },

  // Loading
  loaderContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: T.card
  },
  loaderIconCircle: {
    width: 80, height: 80, borderRadius: 20, justifyContent: 'center',
    alignItems: 'center', marginBottom: 16
  },
  loadingTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink },
  loadingSubtitle: { fontSize: 13, color: T.textFaint, marginTop: 6, fontFamily: F.bodyMedium },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.card,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6
  },
  toolbarBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});

