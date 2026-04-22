import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Clipboard, // Added for convenience
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import * as ImagePicker from "expo-image-picker";

export default function PaymentScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    phone: user?.phone || "",
    zipCode: "",
  });

  // Update these with your real details
  const EASYPAISA_NUM = "0340-1336579";
  const JAZZCASH_NUM = "0311-7654321";
  const ACCOUNT_TITLE = "Abdul Qadeer";

  const copyToClipboard = (text, type) => {
    Clipboard.setString(text);
    Alert.alert("Copied", `${type} number copied to clipboard.`);
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow gallery access to upload receipt.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleManualUpgrade = async () => {
    const { address, city, phone } = formData;

    if (!address || !city || !phone || !receiptImage) {
      Alert.alert("Error", "Please complete all details and upload the payment receipt.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload to Cloudinary
      const data = new FormData();
      const filename = receiptImage.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const type = match ? `image/${match[1]}` : `image`;

      data.append("file", {
        uri: receiptImage,
        name: filename,
        type: type,
      });
      data.append("upload_preset", "tdc_profiles");

      const uploadRes = await fetch(
        "https://api.cloudinary.com/v1_1/decaxpera/image/upload",
        { method: "POST", body: data }
      );
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");

      // 2. Send Data to Backend
      await api.post(
        "/membership/request-upgrade",
        {
          ...formData,
          paymentMethod: "EasyPaisa/JazzCash",
          receiptUrl: uploadData.secure_url,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Payment submitted! Admin will verify it shortly.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient colors={["#1a1a1a", "#000"]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#D4AF37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activation Portal</Text>
          <Text style={styles.headerSub}>Upgrade your account to Gold Edition</Text>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.tabRow}>
            <View style={styles.tab}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#000" />
              <Text style={styles.activeTabText}>MANUAL TRANSFER</Text>
            </View>
          </View>

          {/* Detailed Account Card */}
          <View style={styles.accountCard}>
            <Text style={styles.accountLabel}>Membership Fee</Text>
            <Text style={styles.accountMain}>RS. 750</Text>
            
            <View style={styles.paymentMethodsContainer}>
              <TouchableOpacity 
                style={styles.methodRow} 
                onLongPress={() => copyToClipboard(EASYPAISA_NUM, "EasyPaisa")}
              >
                <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color="#D4AF37" />
                <Text style={styles.accountSub}>EasyPaisa: <Text style={styles.boldNumber}>{EASYPAISA_NUM}</Text></Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.methodRow} 
                onLongPress={() => copyToClipboard(JAZZCASH_NUM, "JazzCash")}
              >
                <MaterialCommunityIcons name="wallet-outline" size={18} color="#D4AF37" />
                <Text style={styles.accountSub}>JazzCash: <Text style={styles.boldNumber}>{JAZZCASH_NUM}</Text></Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              <Text style={styles.accountHolder}>Account Title: {ACCOUNT_TITLE}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>SHIPPING & RECEIPT</Text>

            <TouchableOpacity style={styles.uploadBox} onPress={pickReceipt}>
              {receiptImage ? (
                <Image source={{ uri: receiptImage }} style={styles.previewImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="cloud-upload-outline" size={30} color="#D4AF37" />
                  <Text style={styles.uploadText}>Upload Payment Receipt</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Ionicons name="location-outline" size={18} color="#D4AF37" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Complete Delivery Address"
                placeholderTextColor="#666"
                onChangeText={(t) => setFormData({ ...formData, address: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="business-outline" size={18} color="#D4AF37" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="City Name"
                placeholderTextColor="#666"
                onChangeText={(t) => setFormData({ ...formData, city: t })}
              />
            </View>

            <TouchableOpacity style={styles.mainPayBtn} onPress={handleManualUpgrade} disabled={loading}>
              <LinearGradient colors={["#D4AF37", "#B8860B"]} style={styles.gradientBtn}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.payBtnText}>SUBMIT ACTIVATION</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginBottom: 15 },
  headerTitle: { color: "#D4AF37", fontSize: 26, fontWeight: "bold" },
  headerSub: { color: "#888", fontSize: 14, marginTop: 4 },
  content: { padding: 20 },
  sectionLabel: { color: "#AAA", fontSize: 11, fontWeight: "bold", marginBottom: 12, letterSpacing: 1.5 },
  tabRow: { flexDirection: "row", marginBottom: 25 },
  tab: { flex: 1, height: 50, borderRadius: 12, backgroundColor: "#D4AF37", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  activeTabText: { color: "#000", fontWeight: "bold" },
  
  // Account Card Styles
  accountCard: { backgroundColor: "#111", padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: "#D4AF37", alignItems: "center" },
  accountLabel: { color: "#888", fontSize: 12 },
  accountMain: { color: "#FFF", fontSize: 32, fontWeight: "bold" },
  paymentMethodsContainer: { marginTop: 15, width: '100%', alignItems: 'center' },
  methodRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 8 },
  accountSub: { color: "#ccc", fontSize: 14 },
  boldNumber: { color: "#D4AF37", fontWeight: "bold" },
  divider: { height: 1, backgroundColor: '#222', width: '80%', marginVertical: 10 },
  accountHolder: { color: "#888", fontSize: 12, fontStyle: 'italic' },

  formCard: { backgroundColor: "#111", padding: 20, borderRadius: 25 },
  uploadBox: { height: 120, backgroundColor: "#000", borderRadius: 15, borderStyle: "dashed", borderWidth: 1, borderColor: "#D4AF37", justifyContent: "center", alignItems: "center", marginBottom: 20, overflow: "hidden" },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  uploadText: { color: "#D4AF37", fontSize: 12, marginTop: 5 },
  inputGroup: { flexDirection: "row", alignItems: "center", backgroundColor: "#000", borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: "#222" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#FFF" },
  mainPayBtn: { borderRadius: 15, overflow: "hidden", marginTop: 10 },
  gradientBtn: { height: 60, justifyContent: "center", alignItems: "center" },
  payBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
});