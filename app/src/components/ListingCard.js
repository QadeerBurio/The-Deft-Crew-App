// screens/skillshare/components/ListingCard.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { color as T, font as F } from "../theme/tokens";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;

function OwnerRow({ owner, size = 28 }) {
  const name = owner?.name || 'Unknown User';
  const image = owner?.profileImage;
  const rating = owner?.rating;

  return (
    <View style={styles.ownerRow}>
      {image ? (
        <Image source={{ uri: image }} style={[styles.ownerAvatar, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.ownerAvatar, styles.ownerAvatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.ownerAvatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.ownerName} numberOfLines={1}>{name}</Text>
        {rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={BRAND} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ================= PAID (image-forward) =================
export function PaidListingCard({ item, onPress, showOwner = true, ctaLabel = 'View Service', ownerOverride }) {
  const owner = ownerOverride || item.ownerId;
  const image = item.attachments?.[0]?.url;

  return (
    <TouchableOpacity style={styles.paidCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.paidImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.paidImage} />
        ) : (
          <View style={[styles.paidImage, styles.paidImageFallback]}>
            <Ionicons name="image-outline" size={30} color={T.textFaint} />
          </View>
        )}
        <View style={styles.paidBadgeLeft}>
          <Ionicons name="pricetag" size={11} color={T.white} />
          <Text style={styles.paidBadgeLeftText}>paid</Text>
        </View>
        {item.status === 'matched' && (
          <View style={styles.paidBadgeRight}>
            <Text style={styles.paidBadgeRightText}>active</Text>
          </View>
        )}
      </View>

      <View style={styles.paidBody}>
        {showOwner && <OwnerRow owner={owner} />}

        <Text style={styles.paidTitle} numberOfLines={2}>{item.title}</Text>

        {!!item.duration && (
          <View style={styles.paidMetaRow}>
            <Ionicons name="time-outline" size={13} color={MUTED} />
            <Text style={styles.paidMetaText}>{item.duration} Delivery</Text>
          </View>
        )}

        <View style={styles.paidDivider} />

        <View style={styles.paidBottomRow}>
          <View>
            <Text style={styles.paidStartingLabel}>starting at</Text>
            <Text style={styles.paidPrice}>Rs. {item.price?.toLocaleString?.() ?? item.price ?? 0}</Text>
          </View>
          <View style={styles.pillBtn}>
            <Text style={styles.pillBtnText}>{ctaLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ================= BARTER =================
export function BarterListingCard({ item, onPress, onPropose, showOwner = true, ctaLabel = 'Propose Exchange', ownerOverride }) {
  const owner = ownerOverride || item.ownerId;

  return (
    <TouchableOpacity style={styles.barterCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.barterTopRow}>
        {showOwner ? <OwnerRow owner={owner} /> : <View />}
        <View style={styles.badge}>
          <Ionicons name="swap-horizontal" size={12} color={INK} />
          <Text style={styles.badgeText}>exchange</Text>
        </View>
      </View>

      <View style={styles.barterBlock}>
        <Text style={styles.barterBlockLabel}>i'll do</Text>
        <Text style={styles.barterBlockValue} numberOfLines={2}>
          {item.skillOffered?.skillName || item.title}
        </Text>
      </View>

      <View style={styles.barterBlock}>
        <Text style={styles.barterBlockLabel}>in return</Text>
        <Text style={styles.barterBlockValue} numberOfLines={2}>
          {item.skillWanted?.skillName || 'Open to offers'}
        </Text>
      </View>

      <TouchableOpacity style={styles.proposeBtn} onPress={onPropose || onPress} activeOpacity={0.85}>
        <Text style={styles.proposeBtnText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ================= HIRE =================
export function HireListingCard({ item, onPress, showOwner = true, ctaLabel = 'View Job', ownerOverride }) {
  const owner = ownerOverride || item.ownerId;

  return (
    <TouchableOpacity style={styles.barterCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.barterTopRow}>
        {showOwner ? <OwnerRow owner={owner} /> : <View />}
        <View style={styles.badge}>
          <Ionicons name="briefcase" size={12} color={INK} />
          <Text style={styles.badgeText}>hire</Text>
        </View>
      </View>

      <Text style={styles.paidTitle} numberOfLines={2}>{item.title}</Text>
      {!!item.skillNeeded?.skillName && (
        <Text style={styles.hireSkills} numberOfLines={1}>{item.skillNeeded.skillName}</Text>
      )}

      <View style={styles.paidDivider} />

      <View style={styles.paidBottomRow}>
        <View>
          <Text style={styles.paidStartingLabel}>budget</Text>
          <Text style={styles.paidPrice}>Rs. {item.budget?.toLocaleString?.() ?? item.budget ?? 0}</Text>
        </View>
        <View style={styles.pillBtn}>
          <Text style={styles.pillBtnText}>{ctaLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ================= Router =================
export default function ListingCard({ item, onPress, onPropose, showOwner = true, ownerOverride, ...rest }) {
  if (item.type === 'paid') {
    return <PaidListingCard item={item} onPress={onPress} showOwner={showOwner} ownerOverride={ownerOverride} {...rest} />;
  }
  if (item.type === 'barter') {
    return <BarterListingCard item={item} onPress={onPress} onPropose={onPropose} showOwner={showOwner} ownerOverride={ownerOverride} {...rest} />;
  }
  return <HireListingCard item={item} onPress={onPress} showOwner={showOwner} ownerOverride={ownerOverride} {...rest} />;
}

const styles = StyleSheet.create({
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  ownerAvatar: {},
  ownerAvatarFallback: { backgroundColor: BRAND, justifyContent: 'center', alignItems: 'center' },
  ownerAvatarInitial: { fontSize: 12, fontFamily: F.bodyBold, color: '#4A3B10' },
  ownerName: { fontSize: 13, fontFamily: F.bodyBold, color: INK },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  ratingText: { fontSize: 11, color: MUTED, fontFamily: F.bodySemi },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.sand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontFamily: F.bodyBold, color: INK },

  paidCard: {
    backgroundColor: T.card, borderRadius: 18, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: T.line,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  paidImageWrap: { width: '100%', height: 160, backgroundColor: T.sand },
  paidImage: { width: '100%', height: '100%' },
  paidImageFallback: { justifyContent: 'center', alignItems: 'center' },
  paidBadgeLeft: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(26,26,26,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  paidBadgeLeftText: { fontSize: 11, fontFamily: F.bodyBold, color: T.white },
  paidBadgeRight: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#E8F0FE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  paidBadgeRightText: { fontSize: 11, fontFamily: F.bodyBold, color: T.ink },
  paidBody: { padding: 14 },
  paidTitle: { fontSize: 16, fontFamily: F.bodyBold, color: INK, marginTop: 10, marginBottom: 4 },
  paidMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  paidMetaText: { fontSize: 12, color: MUTED, fontFamily: F.bodySemi },
  paidDivider: { height: 1, backgroundColor: T.sand, marginVertical: 12 },
  paidBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paidStartingLabel: { fontSize: 11, fontFamily: F.body, color: MUTED },
  paidPrice: { fontSize: 16, fontFamily: F.bodyBold, color: INK, marginTop: 1 },
  pillBtn: { backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  pillBtnText: { fontSize: 12, fontFamily: F.bodyBold, color: INK },

  barterCard: {
    backgroundColor: T.card, borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: T.line,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  barterTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  barterBlock: { backgroundColor: T.sand, borderRadius: 12, padding: 12, marginBottom: 10 },
  barterBlockLabel: { fontSize: 10, fontFamily: F.bodyBold, color: MUTED, letterSpacing: 0.6, marginBottom: 4 },
  barterBlockValue: { fontSize: 15, fontFamily: F.bodyBold, color: INK, lineHeight: 20 },
  proposeBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 2 },
  proposeBtnText: { fontSize: 14, fontFamily: F.bodyBold, color: INK },
  hireSkills: { fontSize: 13, color: MUTED, fontFamily: F.bodySemi, marginBottom: 4 },
});