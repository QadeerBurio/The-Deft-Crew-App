import React, { useState, useContext, useRef, useEffect } from "react";
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
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";

const { width, height } = Dimensions.get("window");

export default function PaymentScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    phone: user?.phone || "",
    zipCode: "",
  });

  // Bank Account Details
  const BANK_NAME = "Bank Al Habib";
  const ACCOUNT_TITLE = "MSB Group";
  const ACCOUNT_NUMBER = "1118-0981-0055-72018";
  const MEMBERSHIP_FEE = "750";

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation for crown
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    // Bounce animation for cards
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const bounceInterpolate = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -5, 0],
  });

  const copyToClipboard = async (text, type) => {
    await Clipboard.setStringAsync(text);
    Vibration.vibrate(50);
    Alert.alert("✨ Copied!", `${type} copied to clipboard.`);
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow gallery access to upload your receipt."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
      Vibration.vibrate(30);
    }
  };

  const handleManualUpgrade = async () => {
    const { address, city, phone } = formData;

    if (!address || !city || !phone || !receiptImage) {
      Alert.alert(
        "⚠️ Oops!",
        "Please fill all fields and upload your payment receipt."
      );
      return;
    }

    setLoading(true);

    try {
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

      await api.post(
        "/membership/request-upgrade",
        {
          ...formData,
          paymentMethod: "Bank Transfer",
          bankName: BANK_NAME,
          accountTitle: ACCOUNT_TITLE,
          accountNumber: ACCOUNT_NUMBER,
          receiptUrl: uploadData.secure_url,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowSuccess(true);
      Vibration.vibrate([50, 100, 50]);

      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      Alert.alert(
        "❌ Error",
        err.response?.data?.message || "Failed to submit request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Animated.View
            style={[
              styles.contentWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Modern Minimal Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Activate Card</Text>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                  <MaterialCommunityIcons name="crown" size={24} color="#f9c349" />
                </Animated.View>
              </View>
            </View>

            {/* Price Card */}
            <Animated.View 
              style={[
                styles.priceCard,
                { transform: [{ translateY: bounceInterpolate }] }
              ]}
            >
              <LinearGradient
                colors={["#f9c349", "#f5a623"]}
                style={styles.priceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.priceContent}>
                  <View>
                    <Text style={styles.priceLabel}>MEMBERSHIP FEE</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceSymbol}>Rs.</Text>
                      <Text style={styles.priceAmount}>{MEMBERSHIP_FEE}</Text>
                    </View>
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>⭐ BEST DEAL</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Bank Account Details */}
            <View style={styles.paymentCard}>
              <Text style={styles.cardTitle}>🏦 Bank Account Details</Text>
              
              <View style={styles.bankCard}>
                <View style={styles.bankHeader}>
                  <View style={styles.bankIconContainer}>
                    <MaterialCommunityIcons name="bank" size={28} color="#f9c349" />
                  </View>
                  <Text style={styles.bankName}>{BANK_NAME}</Text>
                </View>

                <View style={styles.bankDetails}>
                  {/* Account Title */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Title</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{ACCOUNT_TITLE}</Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(ACCOUNT_TITLE, "Account Title")}
                        style={styles.copySmallBtn}
                      >
                        <Ionicons name="copy-outline" size={16} color="#f9c349" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  {/* Account Number - On New Line */}
                  <View style={styles.accountNumberWrapper}>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <View style={styles.accountNumberContainer}>
                      <View style={styles.accountNumberBox}>
                        <Text style={styles.accountNumberPart}>1118</Text>
                        <Text style={styles.accountNumberDash}>-</Text>
                        <Text style={styles.accountNumberPart}>0981</Text>
                        <Text style={styles.accountNumberDash}>-</Text>
                        <Text style={styles.accountNumberPart}>0055</Text>
                        <Text style={styles.accountNumberDash}>-</Text>
                        <Text style={styles.accountNumberPart}>72018</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(ACCOUNT_NUMBER, "Account Number")}
                        style={styles.copySmallBtn}
                      >
                      <Ionicons name="copy-outline" size={16} color="#f9c349" />
                          
                        
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Quick Copy Button */}
                <TouchableOpacity
                  style={styles.quickCopyBtn}
                  onPress={() => copyToClipboard(ACCOUNT_NUMBER, "Complete Account Number")}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#f9c349", "#f5a623"]}
                    style={styles.quickCopyGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="copy" size={18} color="#FFFFFF" />
                    <Text style={styles.quickCopyText}>Copy Full Account Number</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.bankNote}>
                  <Ionicons name="information-circle-outline" size={16} color="#888" />
                  <Text style={styles.noteText}>
                    Please use your name as reference when transferring
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>📦 Shipping Details</Text>

              {/* Receipt Upload */}
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={pickReceipt}
                activeOpacity={0.8}
              >
                {receiptImage ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: receiptImage }}
                      style={styles.previewImage}
                    />
                    <View style={styles.previewOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      <Text style={styles.previewText}>Receipt Uploaded</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={40} color="#f9c349" />
                    <Text style={styles.uploadTitle}>Upload Payment Receipt</Text>
                    <Text style={styles.uploadSubtext}>Tap to select from gallery</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Input Fields */}
              <View style={styles.inputGroup}>
                <Ionicons name="location-outline" size={20} color="#f9c349" />
                <TextInput
                  style={styles.input}
                  placeholder="Complete Delivery Address"
                  placeholderTextColor="#999"
                  value={formData.address}
                  onChangeText={(t) => setFormData({ ...formData, address: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="business-outline" size={20} color="#f9c349" />
                <TextInput
                  style={styles.input}
                  placeholder="City Name"
                  placeholderTextColor="#999"
                  value={formData.city}
                  onChangeText={(t) => setFormData({ ...formData, city: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="call-outline" size={20} color="#f9c349" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#999"
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleManualUpgrade}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#f9c349", "#f5a623"]}
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.submitBtnText}>PROCESSING...</Text>
                    </View>
                  ) : (
                    <View style={styles.submitContent}>
                      <Text style={styles.submitBtnText}>ACTIVATE NOW</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Success Message */}
              {showSuccess && (
                <Animated.View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.successText}>Submitted successfully! 🎉</Text>
                </Animated.View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🔒 Verified within 24-48 hours
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  contentWrapper: {
    flex: 1,
  },

  // Modern Minimal Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
    shadowOpacity: 0.04,
    elevation: 2,
    marginTop: 37,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    marginTop: 4,
  },

  // Price Card
  priceCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  priceGradient: {
    padding: 20,
  },
  priceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  priceSymbol: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  priceAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "bold",
    letterSpacing: -1,
    marginLeft: 2,
  },
  priceBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },

  // Bank Card
  bankCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f9c34930",
  },
  bankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  bankIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
  },
  bankName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  bankDetails: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    marginBottom: 8,
  },
  detailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  copySmallBtn: {
    padding: 6,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 12,
  },

  // Account Number - New Line Layout
  accountNumberWrapper: {
    marginTop: 4,
  },
  accountNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  accountNumberBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f9c34930",
    flex: 1,
  },
  accountNumberPart: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  accountNumberDash: {
    fontSize: 18,
    fontWeight: "300",
    color: "#999",
    marginHorizontal: 3,
  },
  copyAccountBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  copyGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  quickCopyBtn: {
    marginTop: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  quickCopyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  quickCopyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  bankNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#888",
    lineHeight: 16,
  },

  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  // Upload Box
  uploadBox: {
    height: 130,
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#f9c34930",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
  },
  previewText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadTitle: {
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  uploadSubtext: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },

  // Inputs
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 12,
  },
  input: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 14,
    paddingVertical: 10,
  },

  // Submit Button
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBtn: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Success
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  successText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },

  // Footer
  footer: {
    marginTop: 24,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  footerText: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },
});