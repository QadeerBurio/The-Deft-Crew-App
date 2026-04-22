import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

export default function WhatsApp() {

  const openWhatsApp = async () => {
  const phoneNumber = "923222969595";
  const message = "Hello TDC Support Team,\n\nI am using The Deft Crew app and need assistance with [mention issue].\n\nThank you!";
  const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
  const fallbackUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  try {
    // Try the deep link first
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // If deep link isn't supported, try opening the web link 
      // which usually triggers the app or the browser
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    Alert.alert("Error", "WhatsApp is not installed or could not be opened.");
  }
};

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.item} onPress={openWhatsApp}>
        <View style={styles.left}>
          <View style={[styles.iconCircle, { backgroundColor: "#e9f9ee" }]}>
            <FontAwesome name="whatsapp" size={22} color="#25D366" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Chat on WhatsApp</Text>
            <Text style={styles.value}>+923222969595</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#aaa" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    marginVertical: 10,
    elevation: 2, // for Android shadow
    shadowColor: "#000", // for iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: {
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  value: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
});
