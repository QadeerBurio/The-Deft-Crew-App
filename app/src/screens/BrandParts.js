// screens/BrandParts.js — the brands screen's pieces (category tile, stats bar, brand card, loading grid, list
// gap) and the set of logos already preloaded, moved unchanged from Brands.js (Q-a split-only, plan Q-3f).
import React, { useEffect, useState, memo } from "react";
import { View, Text } from "react-native";
import RemoteImage, { prefetchRemoteImages } from "../ui/RemoteImage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { isLocallyClaimed } from "./OfferScreen";
import { color as T, MAX_FONT_SCALE } from "../theme/tokens";
import { Chip, PressScale, SkeletonBlock } from "../ui";
import { brandImageOf, brandDiscount } from "./brandsData";
import { styles, GRID_GAP } from "./brandsStyles";

export const preloadedImages = new Set();
// ==========================================
// CATEGORY CHIP
// ==========================================
export const CategoryGridItem = memo(({ category, isSelected, onPress }) => (
  <Chip
    label={category.id === "all" ? "all" : category.name.toLowerCase()}
    selected={isSelected}
    onPress={() => onPress(category.id)}
  />
));
// ==========================================
// STATS BAR (not rendered; kept for reference)
// ==========================================
export const StatsBar = memo(({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <View style={styles.statsBarContainer}>
        <View style={styles.statsBarSkeleton} />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={styles.statsBarContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalBrands}</Text>
        <Text style={styles.statLabel}>brands</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalOffers}</Text>
        <Text style={styles.statLabel}>offers</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.maxDiscount}%</Text>
        <Text style={styles.statLabel}>max off</Text>
      </View>
    </View>
  );
});
// ==========================================
// BRAND CARD (2-column grid: image · name · category · off pill + modes)
// ==========================================
export const BrandCard = memo(
  ({ item, onPress, cardWidth }) => {
    const firstOffer = item.offers?.[0];
    const imageUri = brandImageOf(item);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [imageUri]);

    // ✅ Consult BOTH server flag AND local registry
    const isClaimed =
      !!firstOffer?.isClaimed ||
      (firstOffer?._id && isLocallyClaimed(firstOffer._id));

    useEffect(() => {
      if (imageUri && !preloadedImages.has(imageUri)) {
        preloadedImages.add(imageUri);
        prefetchRemoteImages(imageUri, "card"); // same sized URL and cache as the card
      }
    }, [imageUri]);

    const category = String(item.category || "general").toLowerCase();
    const discount = brandDiscount(item);
    const showImage = !!imageUri && !failed;
    const label = [
      item.name,
      category,
      discount > 0 ? discount + "% off" : null,
      isClaimed ? "claimed" : null,
      item.isInStore ? "in store" : null,
      item.isOnline ? "online" : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <PressScale
        onPress={() => onPress(item)}
        containerStyle={{ width: cardWidth }}
        style={styles.card}
        accessibilityLabel={label}
      >
        <View style={[styles.imageBox, !showImage && styles.imageBoxEmpty]}>
          {showImage ? (
            <RemoteImage
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setFailed(true)}
              accessibilityIgnoresInvertColors
              size="card"
            />
          ) : (
            <MaterialCommunityIcons name="storefront-outline" size={28} color={T.textFaint} />
          )}
        </View>

        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {category}
        </Text>

        <View style={styles.cardFoot}>
          {discount > 0 ? (
            <View style={styles.offPill}>
              <Text style={styles.offPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {discount}% off
              </Text>
            </View>
          ) : null}
          {isClaimed ? (
            <Ionicons name="checkmark-circle" size={18} color={T.success} accessibilityLabel="claimed" />
          ) : null}
          <View style={styles.modeIcons}>
            {item.isInStore ? (
              <View accessible accessibilityLabel="in store">
                <Ionicons name="storefront-outline" size={16} color={T.textMuted} />
              </View>
            ) : null}
            {item.isOnline ? (
              <View accessible accessibilityLabel="online">
                <Ionicons name="globe-outline" size={16} color={T.textMuted} />
              </View>
            ) : null}
          </View>
        </View>
      </PressScale>
    );
  },
  (prev, next) => {
    const prevFirst = prev.item.offers?.[0];
    const nextFirst = next.item.offers?.[0];

    const prevClaimed =
      !!prevFirst?.isClaimed ||
      (prevFirst?._id && isLocallyClaimed(prevFirst._id));
    const nextClaimed =
      !!nextFirst?.isClaimed ||
      (nextFirst?._id && isLocallyClaimed(nextFirst._id));

    return (
      prev.cardWidth === next.cardWidth &&
      prev.item._id === next.item._id &&
      prev.item.name === next.item.name &&
      prev.item.category === next.item.category &&
      prev.item.discount === next.item.discount &&
      prev.item.logo === next.item.logo &&
      prev.item.displayImage === next.item.displayImage &&
      prev.item.isOnline === next.item.isOnline &&
      prev.item.isInStore === next.item.isInStore &&
      prev.item.hasOffer === next.item.hasOffer &&
      prevClaimed === nextClaimed
    );
  }
);
// Loading: the same 2-column card shape
export const BrandGridSkeleton = ({ cardWidth }) => (
  <View style={styles.skeletonGrid} accessible accessibilityLabel="loading brands">
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} style={[styles.card, { width: cardWidth, flex: 0 }]}>
        <SkeletonBlock height={Math.round((cardWidth - 18) * 0.75)} radius={18} />
        <SkeletonBlock width="70%" height={14} style={{ marginTop: 12 }} />
        <SkeletonBlock width="45%" height={11} style={{ marginTop: 8 }} />
        <SkeletonBlock width={56} height={22} radius={11} style={{ marginTop: 10 }} />
      </View>
    ))}
  </View>
);
export const ListGap = () => <View style={{ height: GRID_GAP }} />;
