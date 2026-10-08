// app/src/screens/home/HomeDeals.js
// "fresh deals." — horizontal rail of brands that have an offer.
import React, { useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, Platform } from "react-native";
import SectionTitle from "./SectionTitle";
import PressScale from "./PressScale";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";

const CARD_W = 200;
const GAP = 12;

function metaFor(brand) {
  const category = brand?.category || "";
  if (brand?.isOnline) return category ? `${category} · online` : "online";
  if (brand?.isInStore) return category ? `${category} · in store` : "in store";
  return category;
}

const DealCard = React.memo(function DealCard({ brand, onPress }) {
  const [imageFailed, setImageFailed] = useState(false);
  const discount = Number(brand?.discount) || 0;
  const meta = metaFor(brand);
  const name = brand?.name || "";

  return (
    <PressScale
      onPress={() => onPress(brand)}
      accessibilityLabel={discount > 0 ? `${name}, ${discount}% off` : name}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        {/* Offer image or logo: always shown whole, never cropped */}
        {!imageFailed && brand?.displayImage ? (
          <Image
            source={{ uri: brand.displayImage }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.fallback}>
            {!!brand?.logo && <Image source={{ uri: brand.logo }} style={styles.logo} resizeMode="contain" />}
          </View>
        )}
        {discount > 0 && (
          <View style={styles.offPill}>
            <Text style={styles.offText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {discount}% off
            </Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {name}
        </Text>
        {!!meta && (
          <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {meta}
          </Text>
        )}
      </View>
    </PressScale>
  );
});

export default function HomeDeals({ deals, loading, savedLabel, onSeeAll, onOpenDeal }) {
  const hasDeals = Array.isArray(deals) && deals.length > 0;
  if (!hasDeals && !loading) return null;

  return (
    <View style={styles.section}>
      <SectionTitle
        title="fresh deals"
        right={savedLabel}
        onRightPress={onSeeAll}
        rightLabel="see all deals"
        style={styles.title}
      />
      {hasDeals ? (
        <FlatList
          data={deals}
          keyExtractor={(b, i) => String(b?._id || i)}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => <DealCard brand={item} onPress={onOpenDeal} />}
        />
      ) : (
        <View style={[styles.rail, styles.placeholderRow]}>
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24, paddingBottom: 24 },
  title: { paddingHorizontal: 20 },
  rail: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 6, gap: GAP },
  placeholderRow: { flexDirection: "row", overflow: "hidden" },
  placeholder: { width: CARD_W, height: 178, borderRadius: radius.deal, backgroundColor: color.sand },
  card: {
    width: CARD_W,
    borderRadius: radius.deal,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    ...Platform.select({
      ios: {
        shadowColor: color.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 7,
      },
      android: { elevation: 1 },
    }),
  },
  imageWrap: {
    height: 120,
    borderTopLeftRadius: radius.deal - 1,
    borderTopRightRadius: radius.deal - 1,
    overflow: "hidden",
    padding: 12,
    backgroundColor: color.card,
  },
  image: { width: "100%", height: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 48, height: 48 },
  offPill: {
    position: "absolute",
    left: 10,
    top: 10,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: color.yellow,
    justifyContent: "center",
  },
  // Spec asks for DM Sans 800; only 400–700 are loaded (FONTS.md), so 700
  offText: { fontFamily: font.bodyBold, fontSize: 12.5, color: color.ink },
  body: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 },
  name: { fontFamily: font.bodyBold, fontSize: 15, color: color.ink },
  meta: { marginTop: 2, fontFamily: font.body, fontSize: 12.5, color: color.textMuted },
});
