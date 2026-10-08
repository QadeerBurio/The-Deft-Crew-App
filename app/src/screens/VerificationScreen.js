import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Image, Platform // Fixed spelling here
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from "../api/api";

export default function VerificationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState({
    profileImage: null,
    cnicFront: null,
    cnicBack: null,
    studentIdCard: null,
  });

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert("Permission Required", "We need camera roll access to upload your IDs.");
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.2, // Slightly increased from 0.1 for better legibility while keeping file size low
    });

    if (!result.canceled) {
      setDocs({ ...docs, [field]: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!docs.profileImage || !docs.cnicFront || !docs.studentIdCard) {
      return Alert.alert("Missing Docs", "Please provide a profile photo, CNIC Front, and Student ID.");
    }

    try {
      setLoading(true);
      const formData = new FormData();

      // Bypass Axios v1.6.0+ React Native FormData detection bug
      const dummyProto = Object.create(FormData.prototype);
      Object.setPrototypeOf(formData, dummyProto);

      const createFileData = (uri) => {
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        return {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        };
      };

      formData.append("profileImage", createFileData(docs.profileImage));
      formData.append("cnicFront", createFileData(docs.cnicFront));
      formData.append("studentIdCard", createFileData(docs.studentIdCard));
      if (docs.cnicBack) formData.append("cnicBack", createFileData(docs.cnicBack));

      const response = await api.put("/auth/verify-student-docs", formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': null,
        },
        timeout: 60000, // 60 seconds timeout
      });

      if (response.status === 200) {
        Alert.alert("Success", "Documents submitted successfully!");
        navigation.replace("Login");
      }

    } catch (err) {
      console.error("Upload Error:", err);

      // Detailed error feedback
      if (err.code === 'ECONNABORTED') {
        Alert.alert("Connection Timeout", "Upload took too long. Please check your internet and try again.");
      } else if (!err.response) {
        Alert.alert("Network Error", "Cannot connect to server. Please check your connection.");
      } else {
        Alert.alert("Upload Failed", err.response?.data?.error || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const DocCard = ({ label, field, icon }) => (
    <TouchableOpacity
      style={[styles.docCard, docs[field] && styles.docCardActive]}
      onPress={() => pickImage(field)}
    >
      {docs[field] ? (
        <Image source={{ uri: docs[field] }} style={styles.previewImage} />
      ) : (
        <View style={styles.cardContent}>
          <Ionicons name={icon} size={30} color="#B8B2A5" />
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
      )}
      {docs[field] && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#6BD49A" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title} accessibilityRole="header">identity verification<Text style={{ color: "#F9C349" }}>.</Text></Text>
      <Text style={styles.subtitle}>upload your documents to join the community.</Text>

      <View style={styles.grid}>
        <DocCard label="profile picture" field="profileImage" icon="person-outline" />
        <DocCard label="CNIC front" field="cnicFront" icon="card-outline" />
        <DocCard label="CNIC back" field="cnicBack" icon="card-outline" />
        <DocCard label="student id card" field="studentIdCard" icon="school-outline" />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#111111" /> : <Text style={styles.submitText}>save & complete</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#111111", flexGrow: 1, paddingTop: 60 },
  title: { fontFamily: "Outfit_800ExtraBold", fontSize: 30, letterSpacing: -0.8, color: "#F5F2EA" },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 15, color: "#B8B2A5", marginTop: 6, marginBottom: 28 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  docCard: {
    width: "48%", height: 160, backgroundColor: "#1C1B19", borderRadius: 22,
    borderWidth: 1, borderColor: "#2A2925", marginBottom: 14, overflow: "hidden"
  },
  docCardActive: { borderColor: "#F9C349", borderWidth: 1.5 },
  cardContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 10 },
  cardLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: "#B8B2A5", marginTop: 10, textAlign: "center" },
  previewImage: { width: "100%", height: "100%" },
  checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "#111111", borderRadius: 10 },
  submitButton: { backgroundColor: "#F9C349", height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 20 },
  submitText: { fontFamily: "Outfit_800ExtraBold", color: "#111111", fontSize: 16 },
});
