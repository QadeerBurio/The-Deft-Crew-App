// app/src/screens/Splash.js
// First screen when signed out.
//   1. tdc video (1.5s). Storage is read while it plays.
//   2. First launch → 7 intro cards → Terms → Guidelines → Login
//      Seen before → Terms/Guidelines only if not accepted yet, else Login.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get('window');

const GOLD = T.yellow;
const DARK = T.ink;
const MUTED = T.textFaint;
const TEXT2 = T.textMuted;

const SLIDES = [
  {
    id: '1',
    title: 'student deals',
    description: 'Discounts at your favourite cafes, restaurants, salons and stores. Show your card, pay student prices.',
    icon: 'pricetags',
    stat: 'up to 50% off',
    category: 'savings',
  },
  {
    id: '2',
    title: 'jobs & internships',
    description: 'Find internships, mentorship and career workshops before everyone else does.',
    icon: 'briefcase',
    stat: 'career hub',
    category: 'careers',
  },
  {
    id: '3',
    title: 'skill share',
    description: "Teach what you know, learn what you don't. Team up with students on real projects.",
    icon: 'school',
    stat: 'learn, share, earn',
    category: 'learning',
  },
  {
    id: '4',
    title: 'resume builder',
    description: 'Build a clean, ATS-friendly resume in minutes with AI suggestions.',
    icon: 'document-text',
    stat: 'ai powered',
    category: 'careers',
  },
  {
    id: '5',
    title: 'events',
    description: 'Workshops, seminars and networking events. Meet people who can open doors.',
    icon: 'calendar',
    stat: 'near you',
    category: 'events',
  },
  {
    id: '6',
    title: 'travel with ai',
    description: 'Plan trips, routes and budgets in PKR in seconds with your AI travel assistant.',
    icon: 'airplane',
    stat: 'ai planner',
    category: 'travel',
  },
  {
    id: '7',
    title: 'go global',
    description: 'Discover exchange programs, scholarships and international university options.',
    icon: 'globe',
    stat: 'study abroad',
    category: 'scholarships',
  },
];

// Where to go once the intro is done or skipped
async function nextRoute() {
  try {
    const [[, terms], [, guidelines]] = await AsyncStorage.multiGet(['termsAccepted', 'guidelinesAccepted']);
    if (terms === 'true' && guidelines === 'true') return 'Login';
    if (terms === 'true') return 'CommunityGuidelines';
  } catch {}
  return 'Privacy';
}

// Stable component, so the video never remounts
const VideoSplash = React.memo(({ onDone }) => (
  <View style={styles.videoWrap}>
    <StatusBar barStyle="light-content" backgroundColor={T.paper} />
    <Video
      source={require('../../../assets/tdc.mp4')}
      style={styles.video}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping={false}
      isMuted={false}
      onPlaybackStatusUpdate={(s) => {
        if ((s.isLoaded && s.didJustFinish) || s.error) onDone();
      }}
      onError={onDone}
    />
  </View>
));

// One intro card
const SlideCard = ({ item, index, total }) => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.cardIcon}>
        <Ionicons name={item.icon} size={28} color={GOLD} />
      </View>
      <View style={styles.statPill}>
        <Text style={styles.statText}>{item.stat}</Text>
      </View>
    </View>

    <View style={styles.cardMid}>
      <Text style={styles.cardKicker}>tdc<Text style={{ color: GOLD }}>.</Text> privilege</Text>
      <Text style={styles.cardBig} numberOfLines={2}>{item.title}</Text>
    </View>

    <View style={styles.cardBottom}>
      <View>
        <Text style={styles.cardLabel}>category</Text>
        <Text style={styles.cardValue}>{item.category}</Text>
      </View>
      <Text style={styles.cardCount}>
        {String(index + 1).padStart(2, '0')}<Text style={{ color: 'rgba(255,255,255,0.35)' }}> / {String(total).padStart(2, '0')}</Text>
      </Text>
    </View>
    <View style={styles.cardGlow} />
  </View>
);

export default function Splash({ navigation }) {
  const [phase, setPhase] = useState('video'); // video | intro
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const seenRef = useRef(null); // onboardingComplete read while the video plays
  const routeRef = useRef(null);

  // read storage during the video
  useEffect(() => {
    (async () => {
      try {
        const [[, done], [, launched]] = await AsyncStorage.multiGet(['onboardingComplete', 'alreadyLaunched']);
        seenRef.current = done === 'true' || launched === 'true';
      } catch {
        seenRef.current = true;
      }
      routeRef.current = await nextRoute();
    })();
    // safety: never stay on the video more than 4s
    const t = setTimeout(() => finishVideo(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishVideo = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (seenRef.current === null) {
      try {
        const v = await AsyncStorage.getItem('onboardingComplete');
        seenRef.current = v === 'true';
      } catch {
        seenRef.current = true;
      }
    }
    if (seenRef.current) {
      navigation.replace(routeRef.current || (await nextRoute()));
      return;
    }
    setPhase('intro');
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [navigation, fade]);

  const complete = useCallback(async () => {
    try {
      await AsyncStorage.multiSet([
        ['alreadyLaunched', 'true'],
        ['onboardingComplete', 'true'],
      ]);
    } catch {}
    navigation.replace(await nextRoute());
  }, [navigation]);

  const next = () => {
    if (index < SLIDES.length - 1) listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    else complete();
  };

  const onViewable = useRef(({ viewableItems }) => {
    if (viewableItems?.length) setIndex(viewableItems[0].index ?? 0);
  }).current;

  if (phase === 'video') return <VideoSplash onDone={finishVideo} />;

  const last = index === SLIDES.length - 1;
  const item = SLIDES[index];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            tdc<Text style={{ color: GOLD }}>.</Text>
          </Text>
          {!last ? (
            <TouchableOpacity onPress={complete} style={styles.skipBtn} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.skipText}>skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 34 }} />
          )}
        </View>

        {/* cards */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.id}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item: s, index: i }) => (
            <View style={styles.page}>
              <SlideCard item={s} index={i} total={SLIDES.length} />
            </View>
          )}
          style={{ flexGrow: 0 }}
        />

        {/* text for the current card */}
        <View style={styles.textBlock}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.description}</Text>
        </View>

        {/* footer */}
        <View style={styles.footer}>
          <View style={styles.bars}>
            {SLIDES.map((s, i) => (
              <View key={s.id} style={[styles.bar, i <= index && styles.barOn, i === index && styles.barCurrent]} />
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.88}>
            <Text style={styles.buttonText}>{last ? 'get started' : 'next'}</Text>
            <Ionicons name={last ? 'checkmark' : 'arrow-forward'} size={18} color={GOLD} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const CARD_W = width - 48;
const CARD_H = Math.min(height * 0.42, 360);

const styles = StyleSheet.create({
  videoWrap: { flex: 1, backgroundColor: T.ink },
  video: { position: 'absolute', top: 0, left: 0, width, height },

  container: { flex: 1, backgroundColor: T.card },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brand: { fontSize: 24, fontFamily: F.heading, color: DARK, letterSpacing: -0.6 },
  skipBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: 'center',
  },
  skipText: { fontSize: 13, fontFamily: F.bodyBold, color: DARK },

  page: { width, alignItems: 'center' },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    backgroundColor: DARK,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    right: -70,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: T.yellowSoft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  cardIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statPill: { backgroundColor: GOLD, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center' },
  statText: { color: DARK, fontSize: 12.5, fontFamily: F.bodyBold },
  cardMid: { zIndex: 1 },
  cardKicker: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: F.bodyBold, letterSpacing: 1, textTransform: 'none' },
  cardBig: { color: T.white, fontSize: 34, fontFamily: F.heading, letterSpacing: -1, marginTop: 6 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 },
  cardLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10.5, fontFamily: F.bodyBold, letterSpacing: 1, textTransform: 'none' },
  cardValue: { color: T.white, fontSize: 14, fontFamily: F.bodyBold, marginTop: 3 },
  cardCount: { color: T.white, fontSize: 14, fontFamily: F.bodyBold },

  textBlock: { paddingHorizontal: 28, paddingTop: 26, flex: 1 },
  title: { fontSize: 28, fontFamily: F.heading, color: DARK, letterSpacing: -0.8 },
  desc: { fontSize: 15, fontFamily: F.body, color: TEXT2, lineHeight: 22, marginTop: 10 },

  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  bars: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: T.sand },
  barOn: { backgroundColor: '#cfcfcf' },
  barCurrent: { backgroundColor: DARK },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: T.white, fontSize: 16, fontFamily: F.bodyBold },
});
