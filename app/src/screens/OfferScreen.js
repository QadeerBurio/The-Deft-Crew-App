import { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

export default function OfferScreen() {
  const { token, user } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Animation refs
  const animations = useRef([]).current;

  // Fetch offers
  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/offers/student", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data);

      // Initialize animation values
      animations.length = 0;
      res.data.forEach(() => animations.push(new Animated.Value(0)));

      // Run animations
      Animated.stagger(
        100,
        animations.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          })
        )
      ).start();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Claim offer
  const claimOffer = async (offerId) => {
    try {
      const res = await api.post(
        `/offers/claim/${offerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", res.data.message);
      fetchOffers();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.message || "Failed to claim offer");
    }
  };

  // Render single card with animation
  const renderOffer = ({ item, index }) => {
    const claimed = item.claimedBy?.includes(user._id);
    const claimedCount = item.claimedBy?.length || 0;

    const translateY = animations[index]?.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    }) || 0;

    const opacity = animations[index] || 0;

    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}</Text>
          </View>
        </View>

        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.brand}>Brand: {item.brand.name}</Text>
        <Text style={styles.uni}>University: {item.university?.name || "All"}</Text>
        <Text style={styles.claimCount}>
          Claimed by {claimedCount} {claimedCount === 1 ? "student" : "students"}
        </Text>

        <TouchableOpacity
          style={[styles.claimButton, claimed && styles.claimedButton]}
          onPress={() => claimOffer(item._id)}
          disabled={claimed}
          activeOpacity={0.8}
        >
          <Text style={styles.claimButtonText}>
            {claimed ? "Already Claimed" : "Claim Offer"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading)
    return <ActivityIndicator style={styles.loading} size="large" color="#007bff" />;

  if (!offers.length)
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>No offers available</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={offers}
        keyExtractor={(item) => item._id}
        renderItem={renderOffer}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 15 }}
      />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007bff",
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
    fontSize: 15,
    color: "#555",
    marginBottom: 10,
    lineHeight: 22,
  },
  brand: {
    fontSize: 13,
    color: "#007bff",
    fontWeight: "600",
    marginBottom: 3,
  },
  uni: {
    fontSize: 13,
    color: "#28a745",
    fontWeight: "600",
    marginBottom: 10,
  },
  claimCount: {
    fontSize: 13,
    color: "#ff6347",
    fontWeight: "600",
    marginBottom: 10,
  },
  claimButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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
    textAlign: "center",
  },
});
