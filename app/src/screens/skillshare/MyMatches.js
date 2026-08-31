// screens/MyMatches.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyMatches } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';

const TYPE_META = {
  barter: { label: 'Exchange', icon: 'swap-horizontal-outline' },
  paid: { label: 'Paid Service', icon: 'cash-outline' },
  job: { label: 'Hire', icon: 'briefcase-outline' },
};

function MatchRow({ item, onPress }) {
  const otherUser = item.otherUser;
  const userName = otherUser?.name || otherUser?.fullName || 'User';
  const userImage = otherUser?.profileImage;
  const userInitial = userName.charAt(0).toUpperCase();

  const listing = item.listingId || {};
  const listingType = listing.type || 'barter';
  const listingTitle = listing.title || 'Untitled Listing';
  const meta = TYPE_META[listingType] || TYPE_META.barter;

  const lastMessage = item.conversation?.lastMessage || 'Say hello 👋';
  const unreadCount = item.conversation?.unreadCount || 0;
  const isUnread = unreadCount > 0;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => onPress(item)}>
      <View style={styles.avatarWrap}>
        {userImage ? (
          <Image source={{ uri: userImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Ionicons name={meta.icon} size={10} color="#555" />
        </View>
      </View>

      <View style={styles.rowBody}>
        <Text style={[styles.userName, isUnread && styles.userNameUnread]} numberOfLines={1}>
          {userName}
        </Text>
        <View style={styles.typeLine}>
          <Text style={styles.typeLineText} numberOfLines={1}>
            {meta.label} • {listingTitle}
          </Text>
        </View>
        <Text style={[styles.previewText, isUnread && styles.previewTextUnread]} numberOfLines={1}>
          {lastMessage}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.timeText}>{timeAgo(item.updatedAt || item.createdAt)}</Text>
        {isUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : item.status === 'active' ? (
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>Active</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function MyMatches({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMatches = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMyMatches();
      const matchesData = data.matches || [];

      const processed = matchesData.map((match) => {
        const listingOwnerId = match.listingOwnerId?._id || match.listingOwnerId;
        const offerorId = match.offerorId?._id || match.offerorId;

        let otherUser = match.otherUser || match.offerorId || match.listingOwnerId;
        if (!otherUser?.name && !otherUser?.fullName) {
          if (listingOwnerId && listingOwnerId !== userId) otherUser = match.listingOwnerId;
          else if (offerorId && offerorId !== userId) otherUser = match.offerorId;
        }

        return { ...match, otherUser: otherUser || match.offerorId || match.listingOwnerId };
      });

      setMatches(processed);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleMatchPress = (match) => {
    navigation.navigate('MatchChat', {
      matchId: match._id,
      listingId: match.listingId?._id || match.listingId,
      otherUser: match.otherUser,
      listing: match.listingId,
    });
  };

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredMatches = !searchLower
    ? matches
    : matches.filter((m) => {
        const userName = (m.otherUser?.name || m.otherUser?.fullName || '').toLowerCase();
        const listingTitle = (m.listingId?.title || '').toLowerCase();
        return userName.includes(searchLower) || listingTitle.includes(searchLower);
      });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading your chats...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="chatbubbles-outline" size={56} color="#ddd" />
        <Text style={styles.emptyTitle}>Welcome Back!</Text>
        <Text style={styles.emptySubtext}>Login to view your chats and connect with others</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
       <TouchableOpacity onPress={() => navigation.getParent()?.navigate('HomeTabs')}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>
        {searchVisible ? (
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search chats..."
            placeholderTextColor={MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle}>My Chats</Text>
        )}

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (searchVisible) setSearchQuery('');
            setSearchVisible((v) => !v);
          }}
        >
          <Ionicons name={searchVisible ? 'close' : 'search'} size={20} color={INK} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <MatchRow item={item} onPress={handleMatchPress} />}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} colors={[BRAND]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color="#ddd" />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Chats Yet'}</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? `No matches found for "${searchQuery}"` : 'Start exchanging or applying to jobs to connect with others'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: MUTED },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INK, flex: 1, textAlign: 'center' },
  headerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: INK,
    marginHorizontal: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },

  divider: { height: 1, backgroundColor: '#eee', marginLeft: 82 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: BRAND, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: '#4A3B10' },
  typeBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rowBody: { flex: 1, marginRight: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: INK },
  userNameUnread: { fontWeight: '800' },
  typeLine: { marginTop: 1, marginBottom: 2 },
  typeLineText: { fontSize: 12.5, color: '#777', fontWeight: '500' },
  previewText: { fontSize: 13.5, color: '#777' },
  previewTextUnread: { color: INK, fontWeight: '700' },

  rowRight: { alignItems: 'flex-end', gap: 6 },
  timeText: { fontSize: 12, color: '#8a6d1d', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: BRAND,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: { color: INK, fontSize: 11, fontWeight: '800' },
  activePill: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  activePillText: { fontSize: 11, color: '#555', fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK, marginTop: 14 },
  emptySubtext: { fontSize: 13.5, color: MUTED, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  loginButton: { backgroundColor: BRAND, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14, marginTop: 18 },
  loginButtonText: { color: INK, fontWeight: '800', fontSize: 15 },
});