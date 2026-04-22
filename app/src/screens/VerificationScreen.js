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

      // Sending request with explicit timeout and error handling
      const response = await api.put("/auth/verify-student-docs", formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
        transformRequest: (data) => data, 
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
          <Ionicons name={icon} size={32} color="#666" />
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
      )}
      {docs[field] && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#08634f" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.subtitle}>Upload your documents to join the community.</Text>

      <View style={styles.grid}>
        <DocCard label="Profile Picture" field="profileImage" icon="person-outline" />
        <DocCard label="CNIC Front" field="cnicFront" icon="card-outline" />
        <DocCard label="CNIC Back" field="cnicBack" icon="card-outline" />
        <DocCard label="Student ID Card" field="studentIdCard" icon="school-outline" />
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && { opacity: 0.7 }]} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save & Complete</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: "#fff", flexGrow: 1, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "900", color: "#000" },
  subtitle: { fontSize: 15, color: "#7a7a7a", marginBottom: 30 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  docCard: { 
    width: "48%", height: 160, backgroundColor: "#f9f9f9", borderRadius: 20, 
    borderWidth: 1, borderColor: "#eee", marginBottom: 15, overflow: "hidden" 
  },
  docCardActive: { borderColor: "#000", borderWidth: 2 },
  cardContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  cardLabel: { fontSize: 13, fontWeight: "600", color: "#666", marginTop: 10 },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "#fff", borderRadius: 10 },
  submitButton: { backgroundColor: "#000", padding: 20, borderRadius: 15, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" }
});