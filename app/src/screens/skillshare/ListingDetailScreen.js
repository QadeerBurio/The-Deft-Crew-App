// screens/ListingDetailScreen.js
import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView,
  Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform,
  SafeAreaView, StatusBar, RefreshControl, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getListingById, startInquiry, getInquiryForListing, getMyMatches } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { AuthContext } from '../../context/AuthContext';
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

const { width, height } = Dimensions.get('window');
const HERO_WIDTH = width - 40; // matches the ScrollView's 20px content padding on each side

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';
const BORDER = '#e5e5e5';

export default function ListingDetailScreen({ route, navigation }) {
const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();
  const { id } = route.params || {};

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [existingInquiryThread, setExistingInquiryThread] = useState(null);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const isFetching = useRef(false);
  const fetchCount = useRef(0);
  const isMounted = useRef(true);

  const fetchListing = useCallback(async (isRefresh = false) => {
    if (isFetching.current || !isMounted.current) return;
    if (fetchCount.current > 3 && !isRefresh) return;

    try {
      isFetching.current = true;
      if (!isRefresh) { fetchCount.current += 1; setLoading(true); } else setRefreshing(true);
      setError(null);

      const data = await getListingById(id);
      if (!isMounted.current) return;
      setListing(data);

      const currentUserId = getCurrentUserId();
      const ownerId = data?.ownerId?._id || data?.ownerId;
      if (data && currentUserId && ownerId !== currentUserId && data.status === 'open') {
        try {
          const thread = await getInquiryForListing(id, currentUserId);
          if (isMounted.current) setExistingInquiryThread(thread);
        } catch { if (isMounted.current) setExistingInquiryThread(null); }

        try {
          const matches = await getMyMatches(currentUserId);
          if (isMounted.current) {
            const activeMatch = matches.data?.some(
              (m) => m.listingId?._id === id && m.status === 'active'
            );
            setHasActiveMatch(activeMatch || false);
          }
        } catch { if (isMounted.current) setHasActiveMatch(false); }
      }
    } catch (err) {
      if (isMounted.current) setError(err.message || 'Failed to load listing details');
    } finally {
      if (isMounted.current) { setLoading(false); setRefreshing(false); isFetching.current = false; }
    }
  }, [id, getCurrentUserId]);

  const onRefresh = useCallback(() => fetchListing(true), [fetchListing]);

  useEffect(() => {
    isMounted.current = true;
    fetchCount.current = 0;
    if (id) fetchListing();
    return () => { isMounted.current = false; };
  }, [id]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (isMounted.current && id && !isFetching.current && fetchCount.current <= 3) fetchListing();
    });
    return unsub;
  }, [navigation, id, fetchListing]);

  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Error', "Don't know how to open this URL");
    } catch (err) { console.error(err); }
  };

  const handleSendInquiry = async () => {
    if (!inquiryText.trim()) { Alert.alert('Error', 'Please enter your question'); return; }
    const currentUserId = getCurrentUserId();
    if (!currentUserId || isGuest) {
      Alert.alert('Login Required', 'Please login to ask a question.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    setSubmittingInquiry(true);
    try {
      const result = await startInquiry(listing._id, currentUserId, inquiryText.trim());
      setModalVisible(false);
      setInquiryText('');
      navigation.navigate('InquiryChat', {
        threadId: result.thread._id,
        listingTitle: listing.title,
        otherParticipantId: listing.ownerId?._id || listing.ownerId,
        listingId: listing._id,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to send inquiry');
    } finally { setSubmittingInquiry(false); }
  };

  const getOwnerData = () => {
  const currentUserId = getCurrentUserId();
  const listingOwnerId = listing?.ownerId?._id || listing?.ownerId;

  if (currentUserId && listingOwnerId === currentUserId) {
    return { name: 'You', profileImage: myPhoto, ownerId: listingOwnerId };
  }

  const owner = listing?.ownerId || {};
  return {
    name: owner.name || owner.fullName || owner.username || 'Anonymous',
    profileImage: owner.profileImage || null,
    ownerId: owner._id || listing?.ownerId,
  };
};

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle" size={56} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { fetchCount.current = 0; fetchListing(); }}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBarter = listing.type === 'barter';
  const isJob = listing.type === 'job';
  const isPaid = listing.type === 'paid';
  const ownerData = getOwnerData();
  const currentUserId = getCurrentUserId();
  const isOwner = (listing.ownerId?._id || listing.ownerId) === currentUserId;

  const typeLabel = isBarter ? 'Exchange' : isJob ? 'Hire' : 'Paid';
  const typeIcon = isBarter ? 'swap-horizontal' : isJob ? 'briefcase' : 'cash';

  const roadmapSteps = (listing.syllabus || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
      >
        {/* ============= PAID LAYOUT ============= */}
        {isPaid ? (
          <>
            <View style={styles.paidTopRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Paid</Text>
              </View>
              <View style={styles.statusInlineRow}>
                <View style={[styles.statusDot, listing.status === 'open' && styles.statusDotOpen]} />
                <Text style={styles.statusInlineText}>Status: {listing.status === 'open' ? 'Active' : 'Closed'}</Text>
              </View>
            </View>

            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.ownerRow}>
              {ownerData.profileImage ? (
                <Image source={{ uri: ownerData.profileImage }} style={styles.ownerAvatar} />
              ) : (
                <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                  <Ionicons name="person" size={16} color="#999" />
                </View>
              )}
              <View>
                <Text style={styles.ownerName}>{ownerData.name}</Text>
                <Text style={styles.ownerMeta}>Posted {timeAgo(listing.createdAt)}</Text>
              </View>
            </View>

            {listing.attachments?.length > 0 && (
              <View style={styles.heroWrap}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / HERO_WIDTH);
                    setActiveAttachmentIndex(idx);
                  }}
                >
                  {listing.attachments.map((att, i) => (
                    <View key={i} style={styles.heroImageWrap}>
                      {att.type === 'video' ? (
                        <View style={[styles.heroImage, styles.attachmentVideoFallback]}>
                          <Ionicons name="play-circle" size={44} color="#fff" />
                        </View>
                      ) : (
                        <Image source={{ uri: att.url }} style={styles.heroImage} />
                      )}
                      <View style={styles.heroBadge}>
                        <Ionicons name="pricetag" size={11} color="#fff" />
                        <Text style={styles.heroBadgeText}>Paid</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {listing.attachments.length > 1 && (
                  <View style={styles.heroDotsRow}>
                    {listing.attachments.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.heroDot, i === activeAttachmentIndex && styles.heroDotActive]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            <Section title="Description">
              <Text style={styles.bodyText}>{listing.description}</Text>
            </Section>

            {roadmapSteps.length > 0 && (
              <Section title="Roadmap">
                {roadmapSteps.map((step, i) => (
                  <View key={i} style={styles.roadmapRow}>
                    <View style={[styles.roadmapDot, i === 0 && styles.roadmapDotActive]} />
                    <Text style={styles.roadmapText}>{step}</Text>
                  </View>
                ))}
              </Section>
            )}

            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>Rs. {listing.price?.toLocaleString?.() ?? listing.price ?? 0}</Text>
              <View style={styles.deliveryRow}>
                <Ionicons name="time-outline" size={13} color={MUTED} />
                <Text style={styles.deliveryText}>{listing.duration} delivery</Text>
              </View>

              {isOwner ? (
                <TouchableOpacity
                  style={styles.ctaBtn}
                  onPress={() => navigation.navigate('ManageOffers', { id: listing._id, type: listing.type })}
                >
                  <Text style={styles.ctaBtnText}>Manage Requests</Text>
                </TouchableOpacity>
              ) : !currentUserId || isGuest ? (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.ctaBtnText}>Login to Request</Text>
                </TouchableOpacity>
              ) : listing.status !== 'open' ? (
                <View style={styles.closedPill}><Text style={styles.closedPillText}>Listing Closed</Text></View>
              ) : hasActiveMatch ? (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('MatchChat', { listingId: listing._id })}>
                  <Text style={styles.ctaBtnText}>Chat Now</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('CreateOffer', { listing })}>
                  <Text style={styles.ctaBtnText}>Request Service</Text>
                </TouchableOpacity>
              )}
            </View>

            <Section title="Skill Offered">
              <SkillRow icon="apps-outline" label="Skill" value={listing.skillOffered?.skillName} />
              <SkillRow icon="briefcase-outline" label="Experience" value={`${listing.skillOffered?.yearsOfExperience || 0}+ Years`} />
              <SkillRow icon="star-outline" label="Level" value={capitalize(listing.skillOffered?.proficiencyLevel)} />
              {listing.skillOffered?.portfolioLinks?.[0] && (
                <SkillRow
                  icon="link-outline"
                  label="Portfolio"
                  value="View Projects"
                  valueStyle={styles.linkValue}
                  onPress={() => handleOpenLink(listing.skillOffered.portfolioLinks[0])}
                  last
                />
              )}
            </Section>

            {!isOwner && currentUserId && !isGuest && listing.status === 'open' && !hasActiveMatch && (
              <TouchableOpacity
                style={styles.askRow}
                onPress={() => existingInquiryThread
                  ? navigation.navigate('InquiryChat', {
                      threadId: existingInquiryThread._id,
                      listingTitle: listing.title,
                      otherParticipantId: ownerData.ownerId,
                      listingId: listing._id,
                    })
                  : setModalVisible(true)
                }
              >
                <Ionicons name="help-circle-outline" size={18} color={INK} />
                <Text style={styles.askRowText}>{existingInquiryThread ? 'Continue Chat' : 'Ask a Question'}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ============= BARTER / HIRE LAYOUT ============= */
          <>
            <View style={styles.mainCard}>
              <View style={styles.pill}>
                <Ionicons name={typeIcon} size={12} color={INK} style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>{typeLabel}</Text>
              </View>

              <Text style={styles.title}>{listing.title}</Text>

              <View style={styles.ownerRow}>
                {ownerData.profileImage ? (
                  <Image source={{ uri: ownerData.profileImage }} style={styles.ownerAvatar} />
                ) : (
                  <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                    <Ionicons name="person" size={16} color="#999" />
                  </View>
                )}
                <View>
                  <Text style={styles.ownerName}>{ownerData.name}</Text>
                  <Text style={styles.ownerMeta}>Posted {timeAgo(listing.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <Text style={styles.bodyText}>{listing.description}</Text>
            </View>

            <Section title="Skill Offered">
              <SkillRow icon="apps-outline" label="Skill" value={listing.skillOffered?.skillName} />
              <SkillRow icon="briefcase-outline" label="Experience" value={`${listing.skillOffered?.yearsOfExperience || 0} years`} />
              <SkillRow icon="star-outline" label="Level" value={capitalize(listing.skillOffered?.proficiencyLevel)} />
              {listing.skillOffered?.portfolioLinks?.[0] && (
                <SkillRow
                  icon="link-outline"
                  label="Portfolio"
                  value="LinkedIn"
                  valueStyle={styles.linkValue}
                  onPress={() => handleOpenLink(listing.skillOffered.portfolioLinks[0])}
                  last
                />
              )}
            </Section>

            {isJob && (
              <Section title="Compensation">
                <SkillRow icon="cash-outline" label="Budget" value={`$${listing.budget}`} />
                <SkillRow
                  icon="people-outline"
                  label="Positions"
                  value={`${listing.positionsFilled || 0}/${listing.positionsAvailable || 1}`}
                  last
                />
              </Section>
            )}

            <Text style={styles.sectionLabelSmall}>PRICING</Text>
            <View style={styles.mainCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name={isBarter ? 'swap-horizontal-outline' : 'briefcase-outline'} size={16} color={BRAND} />
                <Text style={styles.sectionHeaderText}>
                  {isBarter ? 'Exchange Service' : 'Hire Position'}
                </Text>
              </View>

              {isBarter && !!listing.skillWanted?.skillName && (
                <View style={styles.wantedBox}>
                  <Text style={styles.wantedLabel}>IN RETURN</Text>
                  <Text style={styles.wantedValue}>{listing.skillWanted.skillName}</Text>
                </View>
              )}

              {isOwner ? (
                <TouchableOpacity
                  style={styles.ctaBtn}
                  onPress={() => navigation.navigate('ManageOffers', { id: listing._id, type: listing.type })}
                >
                  <Text style={styles.ctaBtnText}>{isBarter ? 'Manage Offers' : 'Manage Applications'}</Text>
                </TouchableOpacity>
              ) : !currentUserId || isGuest ? (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.ctaBtnText}>Login to Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color={INK} />
                </TouchableOpacity>
              ) : listing.status !== 'open' ? (
                <View style={styles.closedPill}><Text style={styles.closedPillText}>Listing Closed</Text></View>
              ) : hasActiveMatch ? (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('MatchChat', { listingId: listing._id })}>
                  <Text style={styles.ctaBtnText}>Chat Now</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('CreateOffer', { listing })}>
                  <Text style={styles.ctaBtnText}>{isBarter ? 'Propose Exchange' : 'Apply Now'}</Text>
                  <Ionicons name="arrow-forward" size={16} color={INK} />
                </TouchableOpacity>
              )}

              <Text style={styles.ctaFootnote}>
                {isBarter ? 'Proposing is free. You will discuss details in chat.' : 'Applying is free. You will discuss details in chat.'}
              </Text>

              {!isOwner && currentUserId && !isGuest && listing.status === 'open' && !hasActiveMatch && (
                <TouchableOpacity
                  style={styles.askRow}
                  onPress={() => existingInquiryThread
                    ? navigation.navigate('InquiryChat', {
                        threadId: existingInquiryThread._id,
                        listingTitle: listing.title,
                        otherParticipantId: ownerData.ownerId,
                        listingId: listing._id,
                      })
                    : setModalVisible(true)
                  }
                >
                  <Ionicons name="help-circle-outline" size={18} color={INK} />
                  <Text style={styles.askRowText}>{existingInquiryThread ? 'Continue Chat' : 'Ask a Question'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask Question</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={MUTED} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Ask the owner about this listing</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What would you like to ask?"
              placeholderTextColor={MUTED}
              value={inquiryText}
              onChangeText={setInquiryText}
              multiline
              autoFocus
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[styles.modalSendBtn, (!inquiryText.trim() || submittingInquiry) && { opacity: 0.5 }]}
              onPress={handleSendInquiry}
              disabled={!inquiryText.trim() || submittingInquiry}
            >
              {submittingInquiry ? <ActivityIndicator color={INK} /> : <Text style={styles.modalSendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.mainCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SkillRow({ icon, label, value, valueStyle, onPress, last }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[styles.skillRow, !last && styles.skillRowBorder]}>
      <View style={styles.skillRowLeft}>
        <Ionicons name={icon} size={15} color={MUTED} />
        <Text style={styles.skillRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.skillRowValue, valueStyle]}>{value || '—'}</Text>
    </Wrapper>
  );
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 12, fontSize: 15, color: MUTED },
  errorText: { fontSize: 15, color: '#FF3B30', textAlign: 'center', marginVertical: 14 },
  retryButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryButtonText: { color: INK, fontWeight: '800', fontSize: 14 },

  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 34 : 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: BRAND },

  content: { padding: 20, paddingBottom: 40 },

  pill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#FFF3D6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 10,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: '#8a6d1d' },

  paidTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  statusDotOpen: { backgroundColor: '#34C759' },
  statusInlineText: { fontSize: 12, color: MUTED, fontWeight: '600' },

  title: { fontSize: 22, fontWeight: '800', color: INK, lineHeight: 28, marginBottom: 10 },

  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  ownerAvatar: { width: 34, height: 34, borderRadius: 17 },
  ownerAvatarFallback: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  ownerName: { fontSize: 14, fontWeight: '700', color: INK },
  ownerMeta: { fontSize: 11, color: MUTED, marginTop: 1 },

  heroWrap: { marginBottom: 16 },
  heroImageWrap: {
    width: HERO_WIDTH,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  heroImage: { width: '100%', height: '100%' },
  attachmentVideoFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  heroBadge: {
    position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(26,26,26,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  heroDotActive: { backgroundColor: BRAND, width: 16 },

  mainCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  bodyText: { fontSize: 14, color: '#3a3a3c', lineHeight: 21 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 12 },
  sectionLabelSmall: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6, marginBottom: 8, marginLeft: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionHeaderText: { fontSize: 15, fontWeight: '800', color: INK },

  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  skillRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  skillRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillRowLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  skillRowValue: { fontSize: 13, color: INK, fontWeight: '700' },
  linkValue: { color: BRAND, textDecorationLine: 'underline' },

  roadmapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  roadmapDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', marginTop: 5 },
  roadmapDotActive: { backgroundColor: BRAND },
  roadmapText: { flex: 1, fontSize: 13, color: '#3a3a3c', lineHeight: 19 },

  priceCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14, alignItems: 'center' },
  priceValue: { fontSize: 28, fontWeight: '800', color: INK },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 14 },
  deliveryText: { fontSize: 12, color: MUTED, fontWeight: '600' },

  ctaBtn: {
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch',
  },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: INK },
  ctaFootnote: { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 10 },

  closedPill: { backgroundColor: '#f0f0f0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch' },
  closedPillText: { fontSize: 14, fontWeight: '700', color: '#888' },

  wantedBox: { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 12, marginBottom: 14 },
  wantedLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, marginBottom: 4 },
  wantedValue: { fontSize: 14, fontWeight: '700', color: INK },

  askRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 6 },
  askRowText: { fontSize: 13, fontWeight: '700', color: INK },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 19, fontWeight: '800', color: INK },
  modalSubtitle: { fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 14 },
  modalInput: {
    backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top', color: INK, marginBottom: 16,
  },
  modalSendBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSendBtnText: { color: INK, fontWeight: '800', fontSize: 15 },
});