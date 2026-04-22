import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  BackHandler, // Added for hardware back button support
  Pressable, // Added for "Click Outside" support
} from "react-native";
const SERVER_URL = "https://the-deft-crew-production.up.railway.app/";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, setUser, token, setToken } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null); // Local URI for preview
  const [isSaving, setIsSaving] = useState(false);
  const navigation = useNavigation();

  const [claimedOffers, setClaimedOffers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ecardModalVisible, setEcardModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalSaved, setTotalSaved] = useState(0);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [unclaimingId, setUnclaimingId] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Optimized Fetching
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const [offersRes, savingsRes] = await Promise.all([
        api.get("/offers/claimed", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/offers/my-total-savings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setClaimedOffers(offersRes.data);
      setTotalSaved(savingsRes.data.totalSaved || 0);
      setRedemptionCount(savingsRes.data.redemptionCount || 0);
    } catch (err) {
      console.log("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData]),
  );

  // Initial Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --- HANDLE BACK BUTTON (Android) ---
  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true; // Stop the app from going back
      }
      if (ecardModalVisible) {
        setEcardModalVisible(false);
        return true; // Stop the app from going back
      }
      return false; // Let navigation handle it if no modal is open
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [modalVisible, ecardModalVisible]);

  const handleUnclaim = async (offerId) => {
    Alert.alert(
      "Cancel Discount",
      "Remove this voucher from your active list?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setUnclaimingId(offerId);
              await api.post(
                `/offers/unclaim/${offerId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
              );
              setClaimedOffers((prev) =>
                prev.filter((item) => item._id !== offerId),
              );
            } catch (err) {
              Alert.alert("Error", "Could not remove discount.");
            } finally {
              setUnclaimingId(null);
            }
          },
        },
      ],
    );
  };

  // 2. Function to pick an image
  const pickImage = async () => {
    // const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // if (!permission.granted) {
    //   Alert.alert("Permission required", "Allow gallery access");
    //   return;
    // }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 3. Function to upload to server
  const handleSaveProfile = async () => {
    if (!selectedImage) return;

    try {
      setIsSaving(true);

      const data = new FormData();

      const filename = selectedImage.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const type = match ? `image/${match[1]}` : `image`;

      data.append("file", {
        uri: selectedImage,
        name: filename,
        type: type,
      });

      data.append("upload_preset", "tdc_profiles");

      const uploadRes = await fetch(
        "https://api.cloudinary.com/v1_1/decaxpera/image/upload",
        {
          method: "POST",
          body: data,
        },
      );

      const uploadData = await uploadRes.json();

      console.log("Cloudinary response:", uploadData);

      if (!uploadData.secure_url) {
        Alert.alert("Upload Failed", "Image upload failed.");
        return;
      }

      const imageUrl = uploadData.secure_url;

      await api.post(
        "/profile/update-profile",
        { profileImage: imageUrl },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setUser((prev) => ({
        ...prev,
        profileImage: imageUrl,
      }));

      setSelectedImage(null);

      Alert.alert("Success", "Profile image updated!");
    } catch (error) {
      console.log("UPLOAD ERROR:", error);
      Alert.alert("Error", "Upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          setUser(null);
          setToken(null);
        },
      },
    ]);
  };

  const menuGroups = [
    {
      title: "Personal",
      items: [
        {
          name: "Profile Details",
          icon: "person-outline",
          color: "#4b7bec",
          onPress: () => navigation.navigate("ProfileDetails"),
        },
        {
          name: "Membership Card",
          icon: "id-card-outline",
          color: "#9b59b6",
          onPress: () => setEcardModalVisible(true),
        },
      ],
    },
    {
      title: "Rewards",
      items: [
        {
          name: "Loyalty Points",
          icon: "gift-outline",
          color: "#f39c12",
          rightText: "250 pts",
          onPress: () =>
            Alert.alert(
              "Coming Soon!",
              "We're currently building our rewards shop. Stay tuned for exciting ways to spend your points!",
              [{ text: "Got it", style: "default" }],
            ),
        },
        {
          name: "My Discounts",
          icon: "ticket-outline",
          color: "#05ae7c",
          rightText: claimedOffers.length,
          onPress: () => setModalVisible(true),
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          name: "Sign Out",
          icon: "log-out-outline",
          color: "#eb4d4b",
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              <View style={styles.avatarGradient}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.avatarImage}
                  />
                ) : user?.profileImage ? (
                  <Image
                    source={{
                      uri: `${user.profileImage}?t=${Date.now()}`,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Icon name="person" size={40} color="#fff" />
                )}

                <View style={styles.editIconBadge}>
                  <Icon name="camera" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{user?.name || "Student"}</Text>

              {/* 4. CONDITIONAL SAVE BUTTON */}
              {selectedImage && (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Photo</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={[styles.statValue, { color: "#05ae7c" }]}>
              {totalSaved.toFixed(0)} <Text style={styles.currency}>PKR</Text>
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Redemptions</Text>
            <Text style={styles.statValue}>{redemptionCount}</Text>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingBottom: 40,
          }}
        >
          {menuGroups.map((group, gIdx) => (
            <View key={gIdx} style={styles.groupContainer}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.card}>
                {group.items.map((item, iIdx) => (
                  <TouchableOpacity
                    key={iIdx}
                    style={[
                      styles.menuItem,
                      iIdx === group.items.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={styles.menuLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: item.color + "15" },
                        ]}
                      >
                        <Icon name={item.icon} size={20} color={item.color} />
                      </View>
                      <Text
                        style={[
                          styles.menuText,
                          item.danger && { color: "#eb4d4b" },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.menuRight}>
                      {item.rightText !== undefined ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.rightText}</Text>
                        </View>
                      ) : (
                        <Icon
                          name="chevron-forward"
                          size={18}
                          color="#C7C7CC"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.footerText}>TDC App • Version 1.2.0</Text>
        </Animated.View>
      </ScrollView>

      {/* Claimed Offers Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBlur}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Active Discounts</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close-circle" size={28} color="#D1D1D6" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color="#06629b" />
            ) : (
              <FlatList
                data={claimedOffers}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="receipt-outline" size={60} color="#E5E5EA" />
                    <Text style={styles.emptyStateText}>
                      No active vouchers found.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.voucherCard}>
                    <View style={styles.voucherLeft}>
                      <Text style={styles.voucherTitle}>{item.title}</Text>
                      <Text style={styles.voucherSubtitle} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <TouchableOpacity
                        style={styles.unclaimAction}
                        onPress={() => handleUnclaim(item._id)}
                        disabled={unclaimingId === item._id}
                      >
                        {unclaimingId === item._id ? (
                          <ActivityIndicator size="small" color="#eb4d4b" />
                        ) : (
                          <Text style={styles.unclaimText}>
                            Remove Discounts
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.voucherRight}>
                      <Text style={styles.percentText}>
                        {item.discountPercentage}%
                      </Text>
                      <Text style={styles.offText}>OFF</Text>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item._id}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Membership Modal */}
      <Modal
        visible={ecardModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEcardModalVisible(false)}
      >
        <Pressable
          style={styles.modalBlur}
          onPress={() => setEcardModalVisible(false)}
        >
          <Pressable
            style={styles.membershipCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.cardPattern}>
              <Icon
                name="sparkles"
                size={100}
                color="rgba(255,255,255,0.1)"
                style={styles.patternIcon}
              />
            </View>
            <Text style={styles.cardHeader}>TDC PREMIUM</Text>
            <View style={styles.cardBody}>
              <Icon name="card" size={60} color="#fff" />
              <Text style={styles.cardPromoTitle}>Unlock Full Access</Text>
              <Text style={styles.cardPromoDesc}>
                Get exclusive student discounts at all partner brands for just
                700-Rs / year.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cardBtn}
              onPress={() => {
                setEcardModalVisible(false);
                navigation.navigate("Card");
              }}
            >
              <Text style={styles.cardBtnText}>GET MEMBERSHIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEcardModalVisible(false)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: "#fff", opacity: 0.8 }}>Maybe Later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    padding: 25,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  avatarWrapper: { position: "relative" },
  avatarGradient: {
    width: 75,
    height: 75,
    borderRadius: 50,
    backgroundColor: "#06629b",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#05ae7c",
    borderWidth: 3,
    borderColor: "#fff",
  },
  headerInfo: { marginLeft: 20 },
  greeting: { fontSize: 14, color: "#8E8E93", fontWeight: "500" },
  name: { fontSize: 22, fontWeight: "bold", color: "#1C1C1E" },
  email: { fontSize: 13, color: "#636366", marginTop: 2 },

  groupContainer: { marginTop: 25, paddingHorizontal: 20 },
  groupTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#A1A1A1",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2E",
    marginLeft: 12,
  },
  badge: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#06629b" },

  footerText: {
    textAlign: "center",
    marginTop: 30,
    color: "#C7C7CC",
    fontSize: 12,
    fontWeight: "500",
  },

  // Modal Styles
  modalBlur: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    width: "100%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: "bold", color: "#1C1C1E" },

  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FB",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEF0F2",
  },
  voucherLeft: { flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: "bold", color: "#1C1C1E" },
  voucherSubtitle: { fontSize: 13, color: "#8E8E93", marginVertical: 4 },
  unclaimAction: { marginTop: 8 },
  unclaimText: { color: "#eb4d4b", fontSize: 12, fontWeight: "bold" },
  voucherRight: {
    backgroundColor: "#06629b",
    borderRadius: 12,
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  percentText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  offText: { color: "#fff", fontSize: 10, fontWeight: "600" },

  membershipCard: {
    backgroundColor: "#9b59b6",
    width: width * 0.85,
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 100,
  },
  cardPattern: { position: "absolute", top: -20, right: -20 },
  cardHeader: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "bold",
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 20,
  },
  cardBody: { alignItems: "center", marginBottom: 25 },
  cardPromoTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
  },
  cardPromoDesc: {
    color: "#E5E5EA",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  cardBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
  },
  cardBtnText: { color: "#9b59b6", fontWeight: "bold", fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateText: { color: "#C7C7CC", marginTop: 10 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    padding: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#F2F2F7",
  },
  statLabel: {
    fontSize: 11,
    color: "#8E8E93",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  currency: {
    fontSize: 10,
    fontWeight: "600",
  },
  avatarImage: {
    width: 75,
    height: 75,
    borderRadius: 75,
    resizeMode: "cover",
  },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000000",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  saveBtn: {
    backgroundColor: "#05ae7c",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
