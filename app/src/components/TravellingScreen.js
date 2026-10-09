// app/src/components/TravellingScreen.js
// Travel home: hero + quick trip ideas. Every card opens the travel chat
// with that question already sent. Black / gold tdc style.
import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  BackHandler,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import * as Haptics from 'expo-haptics';
import TravelChatBot from './TravelChatBot';
import { ScreenHeader } from "../ui";

import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
const GOLD = T.yellow;
const DARK = T.ink;
const MUTED = T.textMuted;
const BORDER = T.line;
const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 10) / 2;

const QUICK_TRIPS = [
  { emoji: '🏔️', title: 'Hunza in 5 days', sub: 'itinerary + PKR budget', message: 'Plan a 5-day trip to Hunza Valley with budget breakdown in PKR' },
  { emoji: '💰', title: 'Swat on a budget', sub: '4 days, student budget', message: 'Help me plan a budget in PKR for a 4-day trip to Swat for students' },
  { emoji: '✈️', title: 'Turkey visa', sub: 'documents + timeline', message: 'What are the required documents and processing time for a Turkey tourist visa from Pakistan?' },
  { emoji: '🏨', title: 'Hotels in Skardu', sub: 'safe, student friendly', message: 'Recommend good budget hotels in Skardu and Hunza for students' },
  { emoji: '🍽️', title: 'Food in GB', sub: 'what to try', message: 'What are the local cuisines to try in Gilgit Baltistan?' },
  { emoji: '🚌', title: 'Northern routes', sub: 'roads + safety', message: 'What are the best routes and safety tips for Pakistan Northern Areas?' },
];

const CAN_DO = [
  { icon: 'map-outline', title: 'Day-by-day plans', sub: 'built around your budget and days' },
  { icon: 'wallet-outline', title: 'Budget in PKR', sub: 'transport, stay, food, extras' },
  { icon: 'document-text-outline', title: 'Visa help', sub: 'documents and processing time' },
  { icon: 'shield-checkmark-outline', title: 'Safety tips', sub: 'routes, weather, local advice' },
];

const TravelingScreen = () => {
  const navigation = useNavigation();
  const chatRef = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fade]);

  // Back: previous screen if there is one, otherwise Home (drawer root)
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeTabs');
    }
  }, [navigation]);

  // Android hardware back: close the chat first, then leave the screen
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (chatRef.current?.isOpen?.()) {
          chatRef.current.close();
          return true;
        }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const ask = useCallback((message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    chatRef.current?.open(message);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <ScreenHeader title="travel" onBack={goBack} />

      <Animated.ScrollView
        style={[styles.container, { opacity: fade }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={[T.ink, T.ink]} style={styles.hero}>
          <View style={{ flex: 1 }}>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>online 24/7</Text>
            </View>
            <Text style={styles.heroTitle}>where to next?</Text>
            <Text style={styles.heroSub}>
              plans, budgets in PKR and visa help, in one chat.
            </Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => ask(null)} activeOpacity={0.85} accessibilityRole="button">
              <Ionicons name="chatbubble-ellipses" size={16} color={DARK} />
              <Text style={styles.heroBtnText}>start planning</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={require('../../../assets/travel_mascot.png')}
            style={styles.heroMascot}
            resizeMode="contain"
          />
        </LinearGradient>

        {/* Quick trips */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            quick trip ideas<Text style={{ color: GOLD }}>.</Text>
          </Text>
        </View>
        <View style={styles.grid}>
          {QUICK_TRIPS.map((t) => (
            <TouchableOpacity
              key={t.title}
              style={styles.tripCard}
              onPress={() => ask(t.message)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}, ${t.sub}`}
            >
              <View style={styles.tripEmojiWrap}>
                <Text style={styles.tripEmoji}>{t.emoji}</Text>
              </View>
              <Text style={styles.tripTitle} numberOfLines={1}>{t.title.toLowerCase()}</Text>
              <Text style={styles.tripSub} numberOfLines={1}>{t.sub}</Text>
              <View style={styles.tripArrow}>
                <Ionicons name="arrow-forward" size={13} color={DARK} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* What it does */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            what it can do<Text style={{ color: GOLD }}>.</Text>
          </Text>
        </View>
        <View style={styles.listCard}>
          {CAN_DO.map((c, i) => (
            <View key={c.title} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={styles.listIcon}>
                <Ionicons name={c.icon} size={18} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{c.title.toLowerCase()}</Text>
                <Text style={styles.listSub}>{c.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footNote}>
          answers are AI-generated. double-check visa rules and prices before you book.
        </Text>
      </Animated.ScrollView>

      {/* Chat (floating button + full-screen chat) */}
      <TravelChatBot ref={chatRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.paper },


  container: { flex: 1, backgroundColor: T.paper },
  content: { paddingHorizontal: 16, paddingBottom: 140 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    padding: 20,
    marginTop: 6,
    overflow: 'hidden',
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.success },
  liveText: { color: T.onInkMuted, fontSize: 12, fontFamily: F.bodyBold },
  heroTitle: { color: T.white, fontSize: 24, fontFamily: F.heading, letterSpacing: -0.4 },
  heroSub: { color: T.onInkMuted, fontSize: 13.5, fontFamily: F.body, lineHeight: 19, marginTop: 4, marginRight: 6 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    marginTop: 14,
  },
  heroBtnText: { color: DARK, fontSize: 14, fontFamily: F.bodyBold },
  heroMascot: { width: 96, height: 96 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: F.heading, color: DARK },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tripCard: {
    width: CARD_W,
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  tripEmojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.yellowSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripEmoji: { fontSize: 19, fontFamily: F.body },
  tripTitle: { fontSize: 14, fontFamily: F.bodyBold, color: DARK },
  tripSub: { fontSize: 12, fontFamily: F.body, color: MUTED, marginTop: 2 },
  tripArrow: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listCard: {
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, minHeight: 58 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: T.lineSoft },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listTitle: { fontSize: 14, fontFamily: F.bodyBold, color: DARK },
  listSub: { fontSize: 12, fontFamily: F.body, color: MUTED, marginTop: 2 },

  footNote: { fontSize: 11.5, fontFamily: F.body, color: T.textMuted, textAlign: 'center', marginTop: 18, lineHeight: 16 },
});

export default TravelingScreen;
