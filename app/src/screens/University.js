import { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

export default function University() {
  const { user } = useContext(AuthContext);
const navigation = useNavigation();
  // Loading state (if user not loaded yet)
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4b7bec" />
      </View>
    );
  }

  return (
    <>
{/* Header with back arrow */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#08634f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My University</Text>
      </View>
    <View style={styles.container}>
      <Text style={styles.title}>My University</Text>

      <View style={styles.card}>
        {/* University Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🎓</Text>
        </View>

        {/* University Name */}
        <Text style={styles.uniName}>
          {user?.university?.name || "No University Assigned"}
        </Text>

        {/* Status */}
        <Text style={styles.status}>Verified Student</Text>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f5fa",
    padding: 20,
    justifyContent: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#08634f",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#1e2a78",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4b7bec20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  iconText: {
    fontSize: 40,
  },

  uniName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },

  status: {
    marginTop: 10,
    fontSize: 14,
    color: "#28a745",
    fontWeight: "600",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    marginTop:40
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#08634f",
  },
});
