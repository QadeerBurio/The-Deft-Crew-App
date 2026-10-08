// app/src/screens/ChatHistoryScreen.js
// TDC Assistant chat history.
//
// ChatHistoryPanel is used inside the assistant (same modal), so picking a chat
// opens it right there. The default export is the same panel as a stack screen
// (route "ChatHistory") for any old links.
//
// - Shows the sessions already loaded at once, refreshes in the background
// - Search waits 300ms after typing (one request, not one per letter)
// - Pinned chats stay on top. Pins are saved on this phone (the chat server
//   has no pin field yet; the old pin button re-generated the title instead)

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ChatContext } from '../context/ChatContext';

import { color as T, font as F } from "../theme/tokens";
const DARK = T.ink;
const GOLD = T.yellow;
const GOLD_SOFT = T.yellowSoft;
const SOFT = T.sand;
const BORDER = T.line;
const MUTED = T.textFaint;
const DANGER = T.danger;

const PINS_KEY = '@tdc_chat_pins';

const when = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= today) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (t >= today - 86400000) return 'yesterday';
  if (t >= today - 6 * 86400000) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const groupOf = (d) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(d).getTime() || 0;
  if (t >= today) return 'today';
  if (t >= today - 6 * 86400000) return 'this week';
  return 'earlier';
};

export function ChatHistoryPanel({ onClose, onSelect, onNewChat, asScreen }) {
  const { sessions, loadSessions, loadSessionDetails, deleteSession, activeSessionId } = useContext(ChatContext);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(!sessions?.length);
  const [refreshing, setRefreshing] = useState(false);
  const [pins, setPins] = useState([]);
  const firstRun = useRef(true);

  // pins saved on this phone
  useEffect(() => {
    AsyncStorage.getItem(PINS_KEY)
      .then((v) => setPins(v ? JSON.parse(v) : []))
      .catch(() => {});
  }, []);

  // first load + debounced search
  useEffect(() => {
    const delay = firstRun.current ? 0 : 300;
    firstRun.current = false;
    const t = setTimeout(() => {
      loadSessions(search.trim()).finally(() => setLoading(false));
    }, delay);
    return () => clearTimeout(t);
  }, [search, loadSessions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions(search.trim());
    setRefreshing(false);
  };

  const togglePin = (id) => {
    Haptics.selectionAsync().catch(() => {});
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      AsyncStorage.setItem(PINS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const remove = (item) => {
    Alert.alert('Delete this chat?', `"${item.title || 'New conversation'}" will be removed for good.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(item.sessionId);
          setPins((prev) => {
            const next = prev.filter((p) => p !== item.sessionId);
            AsyncStorage.setItem(PINS_KEY, JSON.stringify(next)).catch(() => {});
            return next;
          });
        },
      },
    ]);
  };

  const open = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect?.(item.sessionId); // close the panel first so it feels instant
    await loadSessionDetails(item.sessionId);
  };

  // pinned section + date sections
  const data = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    const pinned = list.filter((s) => pins.includes(s.sessionId) || s.pinned);
    const rest = list
      .filter((s) => !(pins.includes(s.sessionId) || s.pinned))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const out = [];
    if (pinned.length) {
      out.push({ _section: 'pinned' });
      pinned.forEach((s) => out.push({ ...s, _pinned: true }));
    }
    let last = null;
    rest.forEach((s) => {
      const g = groupOf(s.updatedAt);
      if (g !== last) {
        out.push({ _section: g });
        last = g;
      }
      out.push(s);
    });
    return out;
  }, [sessions, pins]);

  const renderItem = ({ item }) => {
    if (item._section) return <Text style={styles.section}>{item._section}</Text>;
    const active = item.sessionId === activeSessionId;
    return (
      <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={() => open(item)} activeOpacity={0.75}>
        <View style={[styles.rowIcon, item._pinned && styles.rowIconPinned]}>
          <Ionicons name={item._pinned ? 'pin' : 'chatbubble-ellipses-outline'} size={17} color={item._pinned ? DARK : DARK} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title || 'New conversation'}
          </Text>
          <Text style={styles.rowMeta}>
            {active ? 'open now · ' : ''}
            {when(item.updatedAt)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => togglePin(item.sessionId)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name={item._pinned ? 'pin' : 'pin-outline'} size={17} color={item._pinned ? '#b7791f' : T.textFaint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => remove(item)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={17} color={T.textFaint} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.panel}>
      {asScreen ? <StatusBar barStyle="dark-content" backgroundColor={T.paper} /> : null}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.squareBtn} activeOpacity={0.7} hitSlop={10}>
          <Ionicons name={asScreen ? 'chevron-back' : 'close'} size={21} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.title}>
          chat history<Text style={{ color: GOLD }}>.</Text>
        </Text>
        <TouchableOpacity onPress={onNewChat} style={styles.newBtn} activeOpacity={0.85} hitSlop={10}>
          <Ionicons name="add" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.search, search.length > 0 && styles.searchOn]}>
          <Ionicons name="search" size={17} color={search ? DARK : MUTED} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="search your chats"
            placeholderTextColor={MUTED}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skRow}>
              <View style={styles.skIcon} />
              <View style={{ flex: 1 }}>
                <View style={[styles.skLine, { width: '60%' }]} />
                <View style={[styles.skLine, { width: '30%', height: 10, marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => (item._section ? `s-${item._section}` : item.sessionId || String(i))}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, data.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DARK]} tintColor={DARK} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={search ? 'search' : 'chatbubbles-outline'} size={30} color={DARK} />
              </View>
              <Text style={styles.emptyTitle}>{search ? 'no chats found' : 'no chats yet'}</Text>
              <Text style={styles.emptySub}>
                {search ? 'try a different word' : 'your conversations with the assistant show up here.'}
              </Text>
              {!search ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={onNewChat} activeOpacity={0.85}>
                  <Ionicons name="add" size={17} color={GOLD} />
                  <Text style={styles.emptyBtnText}>start a chat</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

// Stack-screen version (route "ChatHistory")
export default function ChatHistoryScreen() {
  const navigation = useNavigation();
  const { startNewSession } = useContext(ChatContext);
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTabs'));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.card }} edges={['top', 'bottom']}>
      <ChatHistoryPanel
        asScreen
        onClose={back}
        onSelect={back}
        onNewChat={() => {
          startNewSession?.();
          back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: T.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: F.heading, color: DARK, letterSpacing: -0.3 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchOn: { borderColor: DARK, backgroundColor: T.card },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.body, color: DARK, paddingVertical: 0 },

  list: { paddingHorizontal: 10, paddingBottom: 30 },
  section: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: MUTED,
    textTransform: 'none',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 4,
    marginHorizontal: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 8, borderRadius: 14 },
  rowActive: { backgroundColor: GOLD_SOFT },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: SOFT, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowIconPinned: { backgroundColor: GOLD },
  rowTitle: { fontSize: 14.5, fontFamily: F.bodyBold, color: DARK },
  rowMeta: { fontSize: 12, color: MUTED, marginTop: 3, fontFamily: F.bodySemi },
  iconBtn: { padding: 6, marginLeft: 2 },

  skRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  skIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: T.sand, marginRight: 12 },
  skLine: { height: 13, borderRadius: 6, backgroundColor: T.sand },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: GOLD_SOFT, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontFamily: F.heading, color: DARK },
  emptySub: { fontSize: 13.5, fontFamily: F.body, color: MUTED, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: DARK, height: 44, paddingHorizontal: 18, borderRadius: 14 },
  emptyBtnText: { color: T.white, fontSize: 14, fontFamily: F.bodyBold },
});
