// app/src/engagement/screens/NotificationSettingsScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Dot from '../components/Dot';
import engagementApi from '../api/engagementApi';
import api from '../../api/api';
import {
  registerForPushNotificationsAsync,
  savePushTokenToServer,
} from '../../utils/pushNotifications';

// Re-saves this device's push token, then asks the server to push to it.
// Shows exactly what is wrong if the push can't be delivered.
async function runPushTest(setTesting) {
  setTesting(true);
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      Alert.alert('no push token', 'allow notifications for tdc in phone settings, and test on the installed app, not Expo Go.');
      return;
    }
    await savePushTokenToServer(api, token);
    Alert.alert('test sent', 'minimise the app now. 4 notifications arrive over ~15 seconds, each with its own emoji and sound: new offer, message, streak, like.');
    const { data } = await api.get('/notification/test-push', { timeout: 30000 });
    if (!data?.ok) {
      const r = data?.results?.find((x) => x.error) || {};
      Alert.alert('push failed', [data?.problem, r.error, r.fix].filter(Boolean).join('\n\n') || 'unknown error');
    } else if (data?.legacyDevices) {
      Alert.alert('old build on a device', data.note);
    }
  } catch (e) {
    Alert.alert('push test error', e?.response?.data?.error || e?.message || 'unknown');
  } finally {
    setTesting(false);
  }
}

const GOLD = '#f9c349';
const DARK = '#1a1a1a';
const MUTED = '#888';
const LIGHT = '#fafafa';
const BORDER = '#f0f0f0';
const WHITE = '#fff';

const ROWS = [
  {
    key: 'streaks',
    label: 'streaks',
    sub: 'your daily streak reminders',
    mood: 'sleepy',
    color: '#94A3B8',
  },
  {
    key: 'dailyDrop',
    label: 'daily drop',
    sub: '7pm daily. one surprise.',
    mood: 'excited',
    color: '#f9c349',
  },
  {
    key: 'deals',
    label: 'deals',
    sub: 'new discounts near you',
    mood: 'broke',
    color: '#F97316',
  },
  {
    key: 'jobsScholarships',
    label: 'jobs & scholarships',
    sub: 'matched to your cv',
    mood: 'shook',
    color: '#06B6D4',
  },
  {
    key: 'social',
    label: 'social',
    sub: 'likes, comments, mentions',
    mood: 'sus',
    color: '#8B5CF6',
  },
];

// ─── Single pref row ────────────────────────────────────────────────────
const PrefRow = ({ row, value, onToggle, index }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        delay: index * 45,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 320,
        delay: index * 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: fade,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <View style={styles.rowIconWrap}>
        <Dot mood={row.mood} size={26} animated={false} />
      </View>

      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowLabel,
            !value && styles.rowLabelOff,
          ]}
        >
          {row.label}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {row.sub}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e5e5e5', true: GOLD }}
        thumbColor={Platform.OS === 'android' ? (value ? WHITE : '#f4f3f4') : undefined}
        ios_backgroundColor="#e5e5e5"
      />
    </Animated.View>
  );
};

// ─── Main screen ────────────────────────────────────────────────────────
export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [prefs, setPrefs] = useState({});
  const [osPermission, setOsPermission] = useState('undetermined');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    engagementApi
      .getNotificationPrefs()
      .then((res) => {
        setPrefs(res || {});
        setOsPermission(res?.osPermission || 'undetermined');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key, value) => {
    const prev = { ...prefs };
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await engagementApi.updateNotificationPrefs({ [key]: value });
    } catch (e) {
      setPrefs(prev); // revert on error
    }
  };

  const [testing, setTesting] = useState(false);

  // Count how many are ON
  const enabledCount = ROWS.filter((r) => prefs[r.key] !== false).length;
  const totalCount = ROWS.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.title}>notifications</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.loadingText}>loading…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO ─────────────────────────────────────────── */}
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>your preferences</Text>
                <Text style={styles.heroAmount}>
                  {enabledCount}
                  <Text style={styles.heroSlash}>/{totalCount}</Text>
                </Text>
                <Text style={styles.heroSub}>turned on</Text>
              </View>

              <View style={styles.heroIconWrap}>
                <LinearGradient
                  colors={[GOLD + '30', GOLD + '10']}
                  style={styles.heroIconCircle}
                >
                  <Ionicons name="notifications" size={26} color={GOLD} />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>

          {/* ── OS PERMISSION WARNING ─────────────────────────── */}
          {osPermission === 'denied' && (
            <TouchableOpacity
              style={styles.permissionRow}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
            >
              <View style={styles.permissionIconWrap}>
                <Ionicons name="alert-circle" size={20} color="#e74c3c" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.permissionTitle}>
                  notifications are off
                </Text>
                <Text style={styles.permissionText}>
                  tap to enable them in settings.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#e74c3c" />
            </TouchableOpacity>
          )}

          {/* ── WHAT YOU GET ─────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>what you get</Text>
            <View style={styles.sectionUnderline} />
          </View>

          <View style={styles.card}>
            {ROWS.map((r, i) => (
              <PrefRow
                key={r.key}
                row={r}
                index={i}
                value={prefs[r.key] !== false}
                onToggle={(v) => toggle(r.key, v)}
              />
            ))}
          </View>

          {/* ── PUSH TEST ─────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => runPushTest(setTesting)}
            disabled={testing}
            activeOpacity={0.85}
          >
            {testing ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color={DARK} />
                <Text style={styles.testBtnText}>send me a test notification</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── INFO NOTE ─────────────────────────────────────── */}
          <View style={styles.note}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={MUTED}
            />
            <Text style={styles.noteText}>
              we only send what matters. max 2 a week.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  testBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testBtnText: { color: DARK, fontWeight: '700', fontSize: 14 },
  container: { flex: 1, backgroundColor: WHITE },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.2,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, color: MUTED, fontWeight: '600' },

  scroll: { paddingBottom: 20 },

  // ── Hero ─────────────────────────────────────────────────────────
  hero: {
    margin: 16,
    padding: 22,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  heroAmount: {
    fontSize: 42,
    color: '#fff',
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -1.2,
  },
  heroSlash: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '700',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginTop: 2,
  },
  heroIconWrap: { marginTop: 2 },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GOLD + '40',
  },

  // ── Permission banner ────────────────────────────────────────────
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef0f0',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  permissionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#fde2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: -0.1,
  },
  permissionText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Section header ──────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: DARK,
    letterSpacing: -0.2,
    textTransform: 'lowercase',
  },
  sectionUnderline: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 6,
  },

  // ── Card + rows ─────────────────────────────────────────────────
  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1, marginRight: 10 },
  rowLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.1,
    textTransform: 'lowercase',
  },
  rowLabelOff: { color: '#a0a0a0' },
  rowSub: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Bottom note ─────────────────────────────────────────────────
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 24,
  },
  noteText: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});