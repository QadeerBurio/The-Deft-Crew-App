import { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import api from "../api/api";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { Screen, ScreenHeader, Button, Card, EmptyState, Skeleton } from "../ui";
import { AuthContext } from "../context/AuthContext";

export default function BrandOffersScreen({ route }) {
  const { brandId, brandName } = route.params;
  const { token, user } = useContext(AuthContext); // get current student info
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Move fetchOffers outside useEffect so it can be reused
  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/brands/${brandId}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data);
    } catch (err) {
      console.error("Error fetching offers:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch offers on component mount
  useEffect(() => {
    fetchOffers();
  }, [brandId]);

  // Claim offer
  const handleClaim = async (offerId, offerTitle) => {
    try {
      const res = await api.post(
        `/offers/claim/${offerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", res.data.message);
      fetchOffers(); // ✅ refresh offers to update claim count and button
    } catch (err) {
      console.error(err);
      // Show proper message if already claimed
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to claim offer"
      );
    }
  };

  const renderOffer = ({ item }) => {
    const claimedByStudent = item.claimedBy?.includes(user._id); // check if current student claimed
    const claimedCount = item.claimedBy?.length || 0;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{item.title}</Text>
          {item.discount != null && item.discount !== "" && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{item.discount}</Text>
            </View>
          )}
        </View>

        {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
        <Text style={styles.uni} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          university: {item.university?.name || "all"}
        </Text>

        {/* Show how many students claimed this offer (hidden at 0) */}
        {claimedCount > 0 && (
          <Text style={styles.claimCount} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            claimed by {claimedCount} {claimedCount === 1 ? "student" : "students"}
          </Text>
        )}

        <Button
          title={claimedByStudent ? "already claimed" : "claim offer"}
          variant={claimedByStudent ? "secondary" : "accent"}
          onPress={() => handleClaim(item._id, item.title)}
          disabled={claimedByStudent}
          style={styles.claimButton}
        />
      </Card>
    );
  };

  if (loading)
    return (
      <Screen>
        <ScreenHeader title={brandName ? `${brandName} offers` : "offers"} />
        <Skeleton rows={3} height={140} style={{ paddingTop: 8 }} />
      </Screen>
    );

  if (!offers.length)
    return (
      <Screen>
        <ScreenHeader title={brandName ? `${brandName} offers` : "offers"} />
        <EmptyState
          mood="sleepy"
          title="no offers yet"
          line={brandName ? `no offers found for ${brandName}.` : "check back soon."}
        />
      </Screen>
    );

  return (
    <Screen>
      <ScreenHeader title={brandName ? `${brandName} offers` : "offers"} />
      <FlatList
        data={offers}
        keyExtractor={(item) => item._id}
        renderItem={renderOffer}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: {},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: { fontFamily: F.headingBold, fontSize: 17, color: T.ink, flexShrink: 1 },
  discountBadge: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: T.yellow,
    justifyContent: "center",
  },
  discountText: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.ink },
  desc: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted, marginBottom: 10 },
  uni: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted, marginBottom: 4 },
  claimCount: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink, marginBottom: 4 },
  claimButton: { marginTop: 10 },
});
