// screens/BaseScreen.js
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function BaseScreen({ title, children }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 5, backgroundColor: "#f9f9f9" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#2C3A47" },
  content: { flex: 1 },
});
