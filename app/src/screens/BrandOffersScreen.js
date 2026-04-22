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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}</Text>
          </View>
        </View>

        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.uni}>University: {item.university?.name || "All"}</Text>

        {/* Show how many students claimed this offer */}
        <Text style={styles.claimCount}>
          Claimed by {claimedCount} {claimedCount === 1 ? "student" : "students"}
        </Text>

        <TouchableOpacity
          style={[styles.claimButton, claimedByStudent && styles.claimedButton]}
          onPress={() => handleClaim(item._id, item.title)}
          disabled={claimedByStudent}
        >
          <Text style={styles.claimButtonText}>
            {claimedByStudent ? "Already Claimed" : "Claim Offer"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading)
    return <ActivityIndicator style={styles.loading} size="large" color="#007bff" />;

  if (!offers.length)
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>No offers found for {brandName}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{brandName} Offers</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item._id}
        renderItem={renderOffer}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 15,
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#007bff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flexShrink: 1,
  },
  discountBadge: {
    backgroundColor: "#ff6347",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  desc: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
    lineHeight: 20,
  },
  uni: {
    fontSize: 13,
    color: "#28a745",
    fontWeight: "600",
    marginBottom: 5,
  },
  claimCount: {
    fontSize: 13,
    color: "#ff6347",
    fontWeight: "600",
    marginBottom: 10,
  },
  claimButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  claimedButton: {
    backgroundColor: "#6c757d",
  },
  claimButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
});
