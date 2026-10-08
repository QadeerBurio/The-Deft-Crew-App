// screens/MyInquiriesScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from '../../context/AuthContext';
import { getMyInquiries } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { goToAuth } from '../../utils/goToAuth';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader from "../../ui/ScreenHeader";
// last inquiries per user, so returning to this screen is instant
const inquiriesCache = new Map();

const InquiryItem = memo(function InquiryItem({ item, onPress }) {
  const isActive = item.status === 'active';
  const listing = item.listingId || {};
  const statusColor = isActive ? T.success : T.textMuted;
  const statusIcon = isActive ? 'chatbubble-ellipses-outline' : 'checkmark-done-outline';
  const statusLabel = isActive ? 'Active' : 'Resolved';
  const open = () => onPress(item);

  return (
    <TouchableOpacity
      style={styles.inquiryCard}
      onPress={open}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[T.white, isActive ? T.yellowSoft : T.white]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.inquiryHeader}>
          <View style={styles.inquiryTitleContainer}>
            <Text style={styles.inquiryTitle} numberOfLines={1}>
              {listing.title || 'Untitled Listing'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Ionicons name={statusIcon} size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.listingTypeContainer}>
          <View style={styles.typeBadge}>
            <Ionicons name="document-text-outline" size={12} color={T.textMuted} />
            <Text style={styles.listingType}>
              {listing.type ? listing.type.charAt(0).toUpperCase() + listing.type.slice(1) : 'Listing'}
            </Text>
          </View>
        </View>

        <View style={styles.inquiryDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={T.textMuted} />
            <Text style={styles.inquiryInfo}>
              started: <Text style={styles.inquiryInfoValue}>{timeAgo(item.createdAt)}</Text>
            </Text>
          </View>

          {!!item.lastMessage && (
            <View style={styles.messageContainer}>
              <Ionicons name="chatbubble-outline" size={14} color={T.textMuted} />
              <Text style={styles.lastMessage} numberOfLines={2}>
                {item.lastMessage}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={open}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[T.yellow, T.yellow]}
            style={styles.chatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={T.white} />
            <Text style={styles.chatButtonText}>open chat</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default function MyInquiriesScreen({ navigation }) {
  const { getCurrentUserId, isGuest, setIsGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const userId = getCurrentUserId();
  const cached = userId && !isGuest ? inquiriesCache.get(userId) : null;
  const [inquiries, setInquiries] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchInquiries = useCallback(async () => {
    if (!userId || isGuest) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (inFlightRef.current) { setRefreshing(false); return; }
    inFlightRef.current = true;

    try {
      setError(null);
      const data = await getMyInquiries();
      const list = data?.inquiries || [];
      inquiriesCache.set(userId, list);
      if (mountedRef.current) setInquiries(list);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      if (mountedRef.current) setError(err.message || 'Failed to load inquiries');
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId, isGuest]);

  // cached list shows instantly; refresh quietly every time the screen is shown
  useFocusEffect(
    useCallback(() => {
      fetchInquiries();
    }, [fetchInquiries])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInquiries();
  }, [fetchInquiries]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  // 'Dashboard' is a drawer screen outside skillshare; browse lives in this stack
  const goBrowse = useCallback(() => navigation.navigate('BrowseListings'), [navigation]);

  const handleInquiryPress = useCallback((item) => {
    const listing = item.listingId || {};
    navigation.navigate('InquiryChat', {
      threadId: item.conversationId,
      listingTitle: listing.title || 'Inquiry',
      otherParticipantId: listing.ownerId,
      listingId: listing._id
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <InquiryItem item={item} onPress={handleInquiryPress} />
  ), [handleInquiryPress]);

  const counts = useMemo(() => {
    const active = inquiries.filter(i => i.status === 'active').length;
    const resolved = inquiries.filter(i => i.status === 'resolved').length;
    return { active, resolved, total: inquiries.length };
  }, [inquiries]);

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <Ionicons name="person-outline" size={64} color={T.textFaint} />
        <Text style={styles.emptyTitle}>login required</Text>
        <Text style={styles.emptySubtext}>login to see your inquiries</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => goToAuth(setIsGuest)}
        >
          <LinearGradient
            colors={[T.yellow, T.yellow]}
            style={styles.loginGradient}
          >
            <Text style={styles.loginButtonText}>login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && inquiries.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>loading your inquiries...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScreenHeader title="my inquiries" onBack={goBack} />

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <LinearGradient
            colors={[T.white, T.sand]}
            style={[styles.statCard, styles.statCardTotal]}
          >
            <Text style={styles.statNumber}>{counts.total}</Text>
            <Text style={styles.statLabel}>total inquiries</Text>
          </LinearGradient>

          <LinearGradient
            colors={[T.white, T.successBg]}
            style={[styles.statCard, styles.statCardActive]}
          >
            <Text style={[styles.statNumber, { color: T.success }]}>{counts.active}</Text>
            <Text style={styles.statLabel}>active</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={[T.white, T.sand]}
            style={[styles.statCard, styles.statCardResolved]}
          >
            <Text style={[styles.statNumber, { color: T.ink }]}>{counts.resolved}</Text>
            <Text style={styles.statLabel}>resolved</Text>
          </LinearGradient>

          <LinearGradient
            colors={[T.white, T.yellowSoft]}
            style={[styles.statCard, styles.statCardBrowse]}
          >
            <TouchableOpacity
              style={styles.statCardButton}
              onPress={goBrowse}
            >
              <Ionicons name="search-outline" size={32} color={T.yellow} />
              <Text style={styles.statCardButtonText}>browse listings</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={inquiries}
          keyExtractor={(item, index) => String(item._id ?? item.conversationId ?? index)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={T.yellow}
              colors={[T.yellow]}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[T.yellowSoft, T.yellowSoft]}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="chatbubbles-outline" size={64} color={T.yellow} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{error ? 'could not load inquiries' : 'No Inquiries Yet'}</Text>
              <Text style={styles.emptySubtext}>
                {error ? 'pull down to try again' : 'Browse listings and ask questions to start a conversation'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={goBrowse}
              >
                <LinearGradient
                  colors={[T.yellow, T.yellow]}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="search-outline" size={20} color={T.white} />
                  <Text style={styles.emptyButtonText}>browse listings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  headerBarTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTotal: {
    borderWidth: 1,
    borderColor: T.line,
  },
  statCardActive: {
    borderWidth: 1,
    borderColor: T.success,
  },
  statCardResolved: {
    borderWidth: 1,
    borderColor: T.sand,
  },
  statCardBrowse: {
    borderWidth: 1,
    borderColor: T.line,
    paddingVertical: 10,
  },
  statCardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statCardButtonText: {
    fontSize: 12,
    color: T.yellow,
    fontFamily: F.bodySemi,
    marginTop: 2,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: F.heading,
    color: T.ink,
  },
  statLabel: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
    fontFamily: F.bodyMedium,
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: T.paper,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16, fontFamily: F.body,
    color: T.textMuted,
  },
  inquiryCard: {
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  inquiryHeader: {
    marginBottom: 8,
  },
  inquiryTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inquiryTitle: {
    fontSize: 16,
    fontFamily: F.bodySemi,
    color: T.ink,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: F.bodySemi,
  },
  listingTypeContainer: {
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingType: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
  },
  inquiryDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inquiryInfo: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
  },
  inquiryInfoValue: {
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  lastMessage: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 20,
    flex: 1,
  },
  chatButton: {
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  chatButtonText: {
    color: T.white,
    fontFamily: F.bodySemi,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 14,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  loginGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 16,
  },
});