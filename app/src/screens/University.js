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

import { color as T, font as F } from "../theme/tokens";
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
          <Ionicons name="chevron-back" size={28} color={T.success} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>my university</Text>
      </View>
    <View style={styles.container}>
      <Text style={styles.title}>my university</Text>

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
        <Text style={styles.status}>verified student</Text>
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
    backgroundColor: T.card,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: F.heading,
    color: T.success,
  },

  title: {
    fontSize: 28,
    fontFamily: F.heading,
    textAlign: "center",
    marginBottom: 30,
    color: "#1e2a78",
  },

  card: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 40, fontFamily: F.body,
  },

  uniName: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.ink,
    textAlign: "center",
  },

  status: {
    marginTop: 10,
    fontSize: 14,
    color: T.success,
    fontFamily: F.bodySemi,
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
    backgroundColor: T.card,
    marginTop:40
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: F.heading,
    color: T.success,
  },
});
