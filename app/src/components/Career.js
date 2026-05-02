import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  Platform,
  ToastAndroid,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Linking,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const { height } = Dimensions.get("window");

const API_URL = "https://the-deft-crew-production.up.railway.app/api/admin/jobs/public";

const COLORS = {
  page: "#ffffff",
  pageAlt: "#f7f7f7",
  ink: "#000000",
  body: "#262626",
  muted: "#6f6f6f",
  line: "#e7e7e7",
  card: "#ffffff",
  surface: "#fafafa",
  primary: "#000000",
  accent: "#f9c349",
  accentSoft: "#fff4cf",
  overlay: "rgba(0,0,0,0.72)",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const CareerCard = ({ item, index, onPress }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const animatePress = (toValue) => {
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={() => animatePress(0.985)}
      onPressOut={() => animatePress(1)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.departmentText}>{item.department}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-sharp" size={14} color={COLORS.accent} />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color={COLORS.ink} />
          <Text style={styles.metaText}>{item.salary || "Competitive"}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsLabel}>View Details</Text>
        <Ionicons name="arrow-forward-circle" size={24} color={COLORS.ink} />
      </View>
    </AnimatedTouchable>
  );
};

const Career = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(20)).current;

  const runEntranceAnimation = useCallback(() => {
    entranceOpacity.setValue(0);
    entranceTranslate.setValue(20);
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(entranceTranslate, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceTranslate]);

  const fetchJobs = useCallback(async () => {
    setError(false);
    try {
      const response = await axios.get(API_URL, { timeout: 10000 });
      setJobs(Array.isArray(response.data) ? response.data : []);
      runEntranceAnimation();
    } catch (err) {
      setError(true);
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [runEntranceAnimation]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const filteredData = jobs.filter(
    (job) =>
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.department?.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = async (email) => {
    if (!email) return;
    await Clipboard.setStringAsync(email);
    if (Platform.OS === "android") {
      ToastAndroid.show("HR Email Copied!", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", "HR Email address copied to clipboard.");
    }
  };

  const handleApply = (email, title) => {
    const subject = `Application for ${title}`;
    const body = `Hi TDC Team,\n\nI am interested in applying for the ${title} position. Please find my resume attached.\n\nSent from TDC App`;
    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const shareJob = async (job) => {
    try {
      await Share.share({
        message: `Join the Crew!\nPosition: ${job.title}\nDepartment: ${job.department}\nApply at: ${job.email}`,
      });
    } catch (err) {
      console.log(err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>TDC Careers</Text>
          <Text style={styles.headerSub}>Join The Deft Crew</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles..."
            placeholderTextColor="#8f8f8f"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerSection}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerSection}>
          <View style={styles.errorIconWrap}>
            <MaterialCommunityIcons name="wifi-off" size={50} color={COLORS.ink} />
          </View>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchJobs} activeOpacity={0.88}>
            <LinearGradient colors={["#000000", "#2a2a2a"]} style={styles.retryGradient}>
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.listWrap,
            {
              opacity: entranceOpacity,
              transform: [{ translateY: entranceTranslate }],
            },
          ]}
        >
          <FlatList
            data={filteredData}
            renderItem={({ item, index }) => (
              <CareerCard
                item={item}
                index={index}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedJob(item);
                  setModalVisible(true);
                }}
              />
            )}
            keyExtractor={(item, index) => item._id || `${item.title}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.accent]}
                tintColor={COLORS.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons
                    name="briefcase-search-outline"
                    size={70}
                    color={COLORS.ink}
                  />
                </View>
                <Text style={styles.emptyTitle}>No opportunities found</Text>
              </View>
            }
          />
        </Animated.View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.blurContainer}>
              <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
            </View>
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <LinearGradient colors={[COLORS.accent, "#f6d980"]} style={styles.modalIconBg}>
                  <MaterialCommunityIcons name="rocket-launch" size={30} color={COLORS.ink} />
                </LinearGradient>
                <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
                <Text style={styles.modalJobMeta}>
                  {selectedJob?.department} • {selectedJob?.location}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionHeading}>About the Role</Text>
                <Text style={styles.descriptionText}>{selectedJob?.description}</Text>
              </View>

              {selectedJob?.requirements?.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionHeading}>Requirements</Text>
                  {selectedJob.requirements.map((req, i) => (
                    <View key={i} style={styles.reqRow}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                      <Text style={styles.reqText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.applySection}>
                <Text style={styles.sectionHeading}>Apply Now</Text>

                <TouchableOpacity
                  style={styles.mainApplyBtn}
                  onPress={() => handleApply(selectedJob?.email, selectedJob?.title)}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={["#000000", "#2a2a2a"]} style={styles.mainApplyGradient}>
                    <Text style={styles.mainApplyBtnText}>Send Application</Text>
                    <Ionicons name="paper-plane" size={18} color={COLORS.accent} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.copyEmailBtn}
                  onPress={() => copyToClipboard(selectedJob?.email)}
                  activeOpacity={0.88}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.copyLabel}>OR COPY HR EMAIL</Text>
                    <Text style={styles.emailText} numberOfLines={1}>
                      {selectedJob?.email || "hr@thedeftcrew.com"}
                    </Text>
                  </View>
                  <Ionicons name="copy-outline" size={20} color={COLORS.ink} />
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => shareJob(selectedJob)}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="share-social-outline" size={20} color={COLORS.ink} />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.closeBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginRight: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.ink,
  },
  listWrap: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    borderLeftWidth: 6,
    borderLeftColor: COLORS.accent,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },
  departmentText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
  },
  typeBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#f1dfa2",
  },
  typeBadgeText: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
    marginLeft: 5,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 12,
  },
  viewDetailsLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.ink,
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorIconWrap: {
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1dfa2",
  },
  errorTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.body,
  },
  retryBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  retryGradient: {
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
  },
  emptyView: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1dfa2",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.muted,
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === "ios" ? 30 : 10,
  },
  modalScrollContent: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 30,
  },
  modalDragHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#d8d8d8",
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 15,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 25,
  },
  modalIconBg: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalJobTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  modalJobMeta: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 5,
    textAlign: "center",
  },
  modalSection: {
    marginBottom: 25,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.body,
    lineHeight: 24,
  },
  reqRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  reqText: {
    fontSize: 15,
    color: COLORS.body,
    flex: 1,
    lineHeight: 20,
    marginLeft: 10,
  },
  applySection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 20,
  },
  mainApplyBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
  },
  mainApplyGradient: {
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  mainApplyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 10,
  },
  copyEmailBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 20,
  },
  copyLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 2,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
  },
  buttonRow: {
    flexDirection: "row",
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  shareBtnText: {
    fontWeight: "800",
    color: COLORS.ink,
    marginLeft: 8,
  },
  closeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "#f1dfa2",
  },
  closeBtnText: {
    fontWeight: "800",
    color: COLORS.ink,
  },
});

export default Career;