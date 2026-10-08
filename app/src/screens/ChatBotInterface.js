// app/src/screens/ChatBotInterface.js
// TDC Assistant (opened from Home in a full-screen sheet).
//
// - tdc design: white, black, gold. Same header style as the rest of the app
// - History opens inside this sheet (before, it closed the chat, went to
//   another screen and picking a chat dropped you back on Home)
// - New chat button
// - Copy uses expo-clipboard (Clipboard from react-native was removed in RN 0.81)
// - Retry only on the latest answer; actions hidden while it is still typing

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  Share,
  Linking,
  Animated,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ExpoClipboard from 'expo-clipboard';
import { ChatContext } from '../context/ChatContext';
import { ChatHistoryPanel } from './ChatHistoryScreen';

import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
const DARK = T.ink;
const GOLD = T.yellow;
const SOFT = T.sand;
const BORDER = T.line;
const MUTED = T.textFaint;
const TEXT2 = T.textMuted;

const STARTERS = [
  { icon: 'school-outline', title: 'study abroad', sub: 'masters, bachelors, phd', q: 'Study Abroad scholarship options and programs' },
  { icon: 'briefcase-outline', title: 'jobs & careers', sub: 'internships and full-time', q: 'Show me active internships and job opportunities on TDC', cat: 'jobs' },
  { icon: 'pricetags-outline', title: 'brand discounts', sub: '200+ brands', q: 'Show me the latest brand discounts and student deals', cat: 'offers' },
  { icon: 'gift-outline', title: 'exclusive offers', sub: 'promos and codes', q: 'Show exclusive student discounts and promo deals', cat: 'offers' },
  { icon: 'airplane-outline', title: 'travel packages', sub: 'student tours', q: 'Show me student travel packages and tour plans', cat: 'packages' },
  { icon: 'book-outline', title: 'learning', sub: 'notes and books', q: 'Show notes, lectures and books available on TDC', cat: 'notes' },
  { icon: 'card-outline', title: 'tdc gold card', sub: 'premium membership', q: 'What are the benefits of TDC Gold Card membership?', cat: 'tdc_knowledge' },
  { icon: 'star-outline', title: 'reward points', sub: 'earn and redeem', q: 'How can I earn and redeem TDC reward points?', cat: 'tdc_knowledge' },
];

/* ---------------- markdown (bold, links, headers, bullets, code, tables) ---------------- */
const parseInline = (content) => {
  const parts = [];
  String(content)
    .split('**')
    .forEach((part, index) => {
      const bold = index % 2 === 1;
      const re = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      let last = 0;
      while ((m = re.exec(part)) !== null) {
        if (m.index > last) {
          parts.push(
            <Text key={`t-${index}-${m.index}`} style={bold ? styles.mdBold : styles.mdText}>
              {part.substring(last, m.index)}
            </Text>
          );
        }
        const url = m[2];
        parts.push(
          <Text key={`l-${index}-${m.index}`} style={styles.link} onPress={() => Linking.openURL(url).catch(() => {})}>
            {m[1]}
          </Text>
        );
        last = re.lastIndex;
      }
      if (last < part.length) {
        parts.push(
          <Text key={`e-${index}`} style={bold ? styles.mdBold : styles.mdText}>
            {part.substring(last)}
          </Text>
        );
      }
    });
  return parts;
};

const Markdown = React.memo(({ text }) => {
  if (!text) return null;
  const blocks = [];
  let code = null;
  text.split('\n').forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', content: code.join('\n') });
        code = null;
      } else code = [];
    } else if (code) code.push(line);
    else blocks.push({ type: 'line', content: line });
  });
  if (code && code.length) blocks.push({ type: 'code', content: code.join('\n') });

  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === 'code') {
          return (
            <View key={i} style={styles.code}>
              <Text style={styles.codeText} selectable>
                {b.content}
              </Text>
            </View>
          );
        }
        const t = b.content.trim();
        if (!t) return <View key={i} style={{ height: 6 }} />;
        if (t.startsWith('|') && t.endsWith('|')) {
          if (t.replace(/[|\-:\s]/g, '') === '') return null;
          const cells = t.split('|').slice(1, -1).map((c) => c.trim());
          return (
            <View key={i} style={styles.tableRow}>
              {cells.map((c, ci) => (
                <Text key={ci} style={styles.tableCell}>
                  {parseInline(c)}
                </Text>
              ))}
            </View>
          );
        }
        const h = t.match(/^(#{1,6})\s+(.*)$/);
        if (h) {
          const st = h[1].length === 1 ? styles.h1 : h[1].length === 2 ? styles.h2 : styles.h3;
          return (
            <Text key={i} style={st}>
              {parseInline(h[2])}
            </Text>
          );
        }
        const bullet = /^[-*•]\s+/.test(t);
        const numbered = t.match(/^(\d+)[.)]\s+(.*)$/);
        if (bullet || numbered) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>{numbered ? `${numbered[1]}.` : '•'}</Text>
              <Text style={styles.mdLine}>{parseInline(numbered ? numbered[2] : t.replace(/^[-*•]\s+/, ''))}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.mdLine}>
            {parseInline(b.content)}
          </Text>
        );
      })}
    </View>
  );
});

/* ---------------- typing dots ---------------- */
const TypingDots = () => {
  const a = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = a.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [a]);
  return (
    <View style={styles.dots}>
      {a.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
};

/* ================================================================ */
const ChatBotInterface = ({ onClose }) => {
  const navigation = useNavigation();
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();

  const {
    messages,
    suggestions,
    isLoading,
    isStreaming,
    isOnline,
    activeSessionId,
    sendMessage,
    loadSessionDetails,
    regenerateLastResponse,
    startNewSession,
  } = useContext(ChatContext);

  const [input, setInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const close = () => (onClose ? onClose() : navigation.goBack());

  // Android back: close history first
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showHistory) {
        setShowHistory(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showHistory]);

  // keep the newest message in view
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, isLoading, isStreaming]);

  // keyboard height → bottom spacer (works inside the sheet on both platforms)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    });
    const h = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const send = (text, category) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    sendMessage(msg, category);
    if (text === undefined) setInput('');
  };

  const newChat = () => {
    Haptics.selectionAsync().catch(() => {});
    startNewSession?.();
    setShowHistory(false);
    setInput('');
  };

  const onRefresh = async () => {
    if (!activeSessionId) return;
    setRefreshing(true);
    await loadSessionDetails(activeSessionId);
    setRefreshing(false);
  };

  const copy = async (id, text) => {
    try {
      await ExpoClipboard.setStringAsync(text || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {}
  };

  const share = (text) => Share.share({ message: text }).catch(() => {});

  const lastBotId = [...messages].reverse().find((m) => m.role === 'assistant' && !String(m._id).startsWith('warn-'))?._id;

  const data = [...messages];
  if (isLoading && !isStreaming) data.push({ _id: 'typing', role: 'assistant', typing: true });

  const renderItem = ({ item }) => {
    const bot = item.role === 'assistant';
    if (item.typing) {
      return (
        <View style={styles.botRow} accessibilityLabel="tdc ai is typing">
          <View style={[styles.bubble, styles.botBubble, { paddingVertical: 14 }]}>
            <TypingDots />
          </View>
        </View>
      );
    }

    if (!bot) {
      return (
        <View style={styles.userRow}>
          <TouchableOpacity activeOpacity={0.9} onLongPress={() => copy(item._id, item.message)} style={[styles.bubble, styles.userBubble]}>
            <Text style={styles.userText} selectable>
              {item.message}
            </Text>
          </TouchableOpacity>
          {item.isOffline ? <Text style={styles.queued}>queued, sends when you're online</Text> : null}
        </View>
      );
    }

    const isWarn = String(item._id).startsWith('warn-');
    const stillTyping = isStreaming && item._id === lastBotId;
    return (
      <View style={styles.botRow}>
        <View style={{ flex: 1 }}>
          <View style={[styles.bubble, styles.botBubble, isWarn && styles.warnBubble]}>
            {isWarn ? (
              <Ionicons name="cloud-offline-outline" size={15} color={T.danger} style={{ marginBottom: 4 }} />
            ) : null}
            <Markdown text={item.message} />
          </View>
          {!isWarn && !stillTyping ? (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => copy(item._id, item.message)} style={styles.action} hitSlop={8}>
                <Ionicons name={copiedId === item._id ? 'checkmark' : 'copy-outline'} size={14} color={TEXT2} />
                <Text style={styles.actionText}>{copiedId === item._id ? 'copied' : 'copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => share(item.message)} style={styles.action} hitSlop={8}>
                <Ionicons name="share-social-outline" size={14} color={TEXT2} />
                <Text style={styles.actionText}>share</Text>
              </TouchableOpacity>
              {item._id === lastBotId && !isLoading ? (
                <TouchableOpacity onPress={regenerateLastResponse} style={styles.action} hitSlop={8}>
                  <Ionicons name="refresh" size={14} color={TEXT2} />
                  <Text style={styles.actionText}>retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const Welcome = (
    <View style={styles.welcome}>
      <View style={styles.welcomeIcon}>
        <Ionicons name="sparkles" size={26} color={GOLD} />
      </View>
      <Text style={styles.welcomeTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        ask tdc anything<Text style={{ color: GOLD }}>.</Text>
      </Text>
      <Text style={styles.welcomeSub}>deals, jobs, scholarships, events or how something in the app works.</Text>

      <Text style={styles.sectionLabel}>try asking about</Text>
      <View style={styles.grid}>
        {STARTERS.map((s) => (
          <TouchableOpacity
            key={s.title}
            style={styles.starter}
            onPress={() => send(s.q, s.cat)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}, ${s.sub}`}
          >
            <View style={styles.starterIcon}>
              <Ionicons name={s.icon} size={17} color={GOLD} />
            </View>
            <Text style={styles.starterTitle} numberOfLines={1}>
              {s.title}
            </Text>
            <Text style={styles.starterSub} numberOfLines={1}>
              {s.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const busy = isLoading || isStreaming;
  const canSend = !!input.trim() && !busy;
  const bottomSpacer = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={close}
          style={styles.squareBtn}
          activeOpacity={0.7}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={onClose ? 'close' : 'back'}
        >
          <Ionicons name={onClose ? 'close' : 'chevron-back'} size={21} color={DARK} />
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            tdc ai<Text style={{ color: GOLD }}>.</Text>
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? T.success : T.danger }]} />
            <Text style={styles.statusText}>{isOnline ? (busy ? 'typing…' : 'online') : 'offline, messages will queue'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {messages.length ? (
            <TouchableOpacity
              onPress={newChat}
              style={styles.squareBtn}
              activeOpacity={0.7}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="new chat"
            >
              <Ionicons name="create-outline" size={19} color={DARK} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => setShowHistory(true)}
            style={styles.darkBtn}
            activeOpacity={0.8}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="chat history"
          >
            <Ionicons name="time-outline" size={19} color={T.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, i) => String(item._id || i)}
          contentContainerStyle={[styles.list, data.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={activeSessionId ? onRefresh : undefined}
          ListEmptyComponent={Welcome}
        />

        {/* follow-up suggestions */}
        {suggestions.length > 0 && !busy ? (
          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(s, i) => `${i}-${s}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.chip} onPress={() => send(item)} activeOpacity={0.8}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            style={{ flexGrow: 0 }}
          />
        ) : null}

        {/* input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={isOnline ? 'ask anything…' : "you're offline, it will send later"}
              placeholderTextColor={MUTED}
              multiline
              maxLength={2000}
              onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150)}
            />
            <TouchableOpacity
              onPress={() => send()}
              style={[styles.send, !canSend && styles.sendOff]}
              disabled={!canSend}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="send"
            >
              <Ionicons name="arrow-up" size={20} color={canSend ? T.white : T.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.footNote}>tdc ai plans it. you book it.</Text>
        </View>
        <View style={{ height: bottomSpacer, backgroundColor: T.paper }} />
      </View>

      {/* history inside the same sheet */}
      {showHistory ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: T.card, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ChatHistoryPanel onClose={() => setShowHistory(false)} onSelect={() => setShowHistory(false)} onNewChat={newChat} />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  squareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
  headerMid: { flex: 1, marginLeft: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 26, fontFamily: F.heading, color: DARK, letterSpacing: -0.6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 12, color: TEXT2, fontFamily: F.body },

  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },

  userRow: { alignItems: 'flex-end', marginVertical: 6 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, paddingRight: 28 },
  bubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: DARK, borderBottomRightRadius: 6, maxWidth: '78%' },
  userText: { color: T.white, fontSize: 15, fontFamily: F.body, lineHeight: 21 },
  queued: { fontSize: 11.5, fontFamily: F.body, color: TEXT2, marginTop: 4, marginRight: 4 },
  botBubble: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  warnBubble: { backgroundColor: T.dangerBg, borderColor: T.dangerBg },

  actions: { flexDirection: 'row', gap: 16, marginTop: 4, marginLeft: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  actionText: { fontSize: 12, color: TEXT2, fontFamily: F.bodySemi },

  dots: { flexDirection: 'row', gap: 5, paddingHorizontal: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: DARK },

  // markdown
  mdLine: { fontSize: 14.5, fontFamily: F.body, color: T.ink, lineHeight: 21 },
  mdText: { color: T.ink },
  mdBold: { fontFamily: F.bodyBold, color: DARK },
  link: { color: T.ink, fontFamily: F.bodyBold, textDecorationLine: 'underline' },
  h1: { fontSize: 17, fontFamily: F.heading, color: DARK, marginTop: 6, marginBottom: 4 },
  h2: { fontSize: 15.5, fontFamily: F.bodyBold, color: DARK, marginTop: 6, marginBottom: 3 },
  h3: { fontSize: 14.5, fontFamily: F.bodyBold, color: DARK, marginTop: 4, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginVertical: 2, paddingRight: 4 },
  bulletMark: { width: 18, fontSize: 14.5, color: DARK, fontFamily: F.bodyBold, lineHeight: 21 },
  code: { backgroundColor: SOFT, borderRadius: 12, padding: 10, marginVertical: 6 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5, color: DARK },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.line, paddingVertical: 6 },
  tableCell: { flex: 1, fontSize: 12.5, fontFamily: F.body, color: T.ink, paddingHorizontal: 3 },

  // welcome
  welcome: { flex: 1, paddingTop: 18 },
  welcomeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 26, fontFamily: F.heading, color: DARK, letterSpacing: -0.6, marginTop: 16 },
  welcomeSub: { fontSize: 14.5, fontFamily: F.body, color: TEXT2, lineHeight: 21, marginTop: 6 },
  sectionLabel: {
    fontSize: 12.5,
    fontFamily: F.bodyBold,
    color: TEXT2,
    marginTop: 24,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  starter: {
    width: '48.5%',
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line,
    padding: 14,
  },
  starterIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  starterTitle: { fontSize: 14, fontFamily: F.bodyBold, color: DARK },
  starterSub: { fontSize: 12, fontFamily: F.body, color: TEXT2, marginTop: 2 },

  // suggestions + input
  suggestions: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    maxWidth: 260,
  },
  chipText: { fontSize: 13, fontFamily: F.bodySemi, color: DARK },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: T.paper,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 58,
    maxHeight: 130,
    borderRadius: 29,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: BORDER,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 5,
  },
  input: { flex: 1, fontSize: 15, fontFamily: F.body, color: DARK, paddingTop: Platform.OS === 'ios' ? 13 : 10, paddingBottom: Platform.OS === 'ios' ? 13 : 10, maxHeight: 110 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  sendOff: { backgroundColor: T.sand },
  footNote: { textAlign: 'center', fontSize: 12, fontFamily: F.body, color: TEXT2, marginTop: 8 },
});

export default ChatBotInterface;
