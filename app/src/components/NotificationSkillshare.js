// app/src/screens/NotificationScreen.js
// Ultra Modern · detail slide-in · deep linking · clean animations
// SkillShare notifications ONLY

import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../api/api";
import { navigationRef } from "../navigation/navigationRef";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Theme ───
const GOLD = "#f9c349";
const GOLD_DARK = "#e0a82e";
const GOLD_LIGHT = "#fffbee";
const BLACK = "#0f0f0f";
const WHITE = "#ffffff";
const LIGHT = "#fafafa";
const BORDER = "#ececec";
const MUTED = "#888";
const DANGER = "#ef4444";
const SUCCESS = "#10b981";

// ════════════════════════════════════════════
// SKILLSHARE TYPES — only these are shown
// ════════════════════════════════════════════
const SKILLSHARE_TYPES = [
  "new_offer",
  "offer_accepted",
  "offer_rejected",
  "match_created",
  "message",
];

// ════════════════════════════════════════════
// DEEP LINK HELPER
// ════════════════════════════════════════════
const openDeepLink = (item, navigation) => {
  if (!item) return false;

  const nav = item.screenToOpen || item.metadata?.screenToOpen;
  const params = item.metadata?.params || item.params || {};

  if (nav) {
    try {
      if (navigationRef.isReady()) {
        navigationRef.navigate(nav, params);
      } else if (navigation) {
        navigation.navigate(nav, params);
      }
      return true;
    } catch (e) {
      console.log("[deepLink] structured nav failed:", e?.message);
    }
  }

  const link = item.link || item.metadata?.link || item.url;
  if (link && typeof link === "string") {
    return handleLinkPath(link, navigation);
  }

  return false;
};

const handleLinkPath = (path) => {
  try {
    const postMatch = path.match(/\/post\/([a-zA-Z0-9]+)/);
    if (postMatch && navigationRef.isReady()) {
      navigationRef.navigate("PostDetailScreen", { postId: postMatch[1] });
      return true;
    }

    if (path.includes("/offers") || path.includes("/offer")) {
      if (navigationRef.isReady()) navigationRef.navigate("Brands");
      return true;
    }
    if (path.includes("/jobs") || path.includes("/career")) {
      if (navigationRef.isReady()) navigationRef.navigate("Career");
      return true;
    }
    if (path.includes("/event")) {
      if (navigationRef.isReady()) navigationRef.navigate("Events");
      return true;
    }

    const profileMatch = path.match(/\/user\/([a-zA-Z0-9]+)/);
    if (profileMatch && navigationRef.isReady()) {
      navigationRef.navigate("UserProfile", { userId: profileMatch[1] });
      return true;
    }

    return false;
  } catch (e) {
    console.log("[handleLinkPath] error:", e?.message);
    return false;
  }
};

// ════════════════════════════════════════════
// ICON MAP — SkillShare only
// ════════════════════════════════════════════
const ICON_MAP = {
  new_offer: "briefcase-outline",
  offer_accepted: "checkmark-done-outline",
  offer_rejected: "close-circle-outline",
  match_created: "handshake-outline",
  message: "chatbubbles-outline",
  Default: "handshake-outline",
};

const getIconName = (type) => ICON_MAP[type] || ICON_MAP.Default;

// ════════════════════════════════════════════
// MAIN SCREEN COMPONENT
// ════════════════════════════════════════════
const NotificationScreen = () => {
  const { token, user, setUnreadCount, updateUnreadCount } = useContext(AuthContext);
  const navigation = useNavigation();

  const [filter, setFilter] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // ── Animations ──
  const headerFade = useRef(new Animated.Value(0)).current;
  const detailSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // ── Entrance animation ──
  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();

    if (token && user) fetchNotifications();
  }, [token, user]);

  // ── Detail push / pop ──
  useEffect(() => {
    if (selectedNotification) {
      Animated.spring(detailSlide, {
        toValue: 0,
        friction: 10,
        tension: 55,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(detailSlide, {
        toValue: SCREEN_WIDTH,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedNotification]);

  const getTimeAgo = (dateString) => {
    if (!dateString) return "recently";
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return past.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // ════════════════════════════════════════════
  // FETCH — SkillShare only
  // ════════════════════════════════════════════
  const fetchNotifications = async () => {
    if (!token || !user) return;
    setLoading(true);

    try {
      // Fetch ONLY skillshare notifications from social endpoint
      const socialRes = await axios
        .get(`${BASE_URL}/social/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => ({ data: [] }));

      const socialDocs = Array.isArray(socialRes.data) ? socialRes.data : [];

      const TITLE_MAP = {
        new_offer: "new offer 💼",
        offer_accepted: "offer accepted 🎉",
        offer_rejected: "offer declined",
        match_created: "match created 🤝",
        message: "new message 💬",
      };

      // Keep ONLY skillshare-type notifications
      const normalized = socialDocs
        .filter((n) => SKILLSHARE_TYPES.includes(n.type))
        .map((n) => ({
          _id: n._id,
          title: TITLE_MAP[n.type] || "skillshare notification",
          description: n.text || "",
          type: n.type,
          category: "SkillShare",
          mood: n.mood || "sorted",
          iconUrl: n.iconUrl || null,
          createdAt: n.createdAt,
          isRead: (n.readBy || []).some(
            (id) => id.toString() === user._id.toString()
          ),
          link: n.postId ? `/post/${n.postId}` : n.link || "",
          metadata: n.metadata || {},
          screenToOpen: n.screenToOpen || n.metadata?.screen || null,
        }));

      const sorted = normalized
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((n) => ({ ...n, time: getTimeAgo(n.createdAt) }));

      setNotifications(sorted);

      const unreadTotal = sorted.filter((n) => !n.isRead).length;
      if (typeof setUnreadCount === "function") {
        setUnreadCount(unreadTotal);
      }
    } catch (error) {
      console.error("[SkillShare Notification] fetch error:", error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [token, user]);

  // ════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════
  const markAsReadOnServer = async (id) => {
    try {
      await axios.patch(
        `${BASE_URL}/social/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.log("[markAsRead] error:", err?.message);
    }
  };

  const markAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await axios.put(
        `${BASE_URL}/social/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log("[markAllRead] error:", err?.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/social/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const deletedItem = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (deletedItem && !deletedItem.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (selectedNotification?._id === id) {
        setSelectedNotification(null);
      }
    } catch {
      Alert.alert("error", "could not delete notification");
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      "clear all",
      "are you sure you want to delete all skillshare notifications?",
      [
        { text: "cancel", style: "cancel" },
        {
          text: "clear all",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/social/notifications/clear-all`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setNotifications([]);
              setUnreadCount(0);
            } catch (err) {
              console.log("[clearAll] error:", err?.message);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    updateUnreadCount(token);
    setSelectedNotification(null);
    navigation.goBack();
  };

  const handleOpenNotification = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNotification(item);
    if (!item.isRead) markAsReadOnServer(item._id);
  };

  const handleGoToContent = () => {
    if (!selectedNotification) return;
    const opened = openDeepLink(selectedNotification, navigation);
    if (opened) {
      setTimeout(() => handleClose(), 250);
    } else {
      Alert.alert("no link", "this notification has no linked content.");
    }
  };

  // ════════════════════════════════════════════
  // FILTER — SkillShare only
  // ════════════════════════════════════════════
  const filteredData = notifications.filter((n) => {
    if (filter === "All") return true;
    if (filter === "Unread") return !n.isRead;
    if (filter === "Offers") {
      return ["new_offer", "offer_accepted", "offer_rejected"].includes(n.type);
    }
    if (filter === "Matches") {
      return n.type === "match_created";
    }
    if (filter === "Messages") {
      return n.type === "message";
    }
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const canOpenContent = (item) =>
    !!(
      item.screenToOpen ||
      item.metadata?.screen ||
      item.metadata?.route ||
      item.link ||
      item.metadata?.link
    );

  // ════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════
  const Header = () => (
    <Animated.View style={[styles.headerContainer, { opacity: headerFade }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={BLACK} />
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>skillshare</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {notifications.length > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={markAllRead}
            style={styles.headerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={15} color={GOLD_DARK} />
            <Text style={styles.actionTextGold}>mark all read</Text>
          </TouchableOpacity>
          <View style={styles.actionDot} />
          <TouchableOpacity
            onPress={clearAllNotifications}
            style={styles.headerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color={DANGER} />
            <Text style={styles.actionTextRed}>clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {["All", "Unread", "Offers", "Matches", "Messages"].map((label) => {
          const active = filter === label;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(label);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );

  // ════════════════════════════════════════════
  // NOTIFICATION CARD
  // ════════════════════════════════════════════
  const NotificationCard = ({ item, index }) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(16)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 320,
          delay: Math.min(index * 40, 400),
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          friction: 8,
          tension: 45,
          delay: Math.min(index * 40, 400),
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const onPressIn = () =>
      Animated.spring(scale, {
        toValue: 0.98,
        friction: 5,
        useNativeDriver: true,
      }).start();

    const onPressOut = () =>
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();

    const linkable = canOpenContent(item);
    const unread = !item.isRead;

    return (
      <Animated.View
        style={{
          opacity: cardFade,
          transform: [{ translateY: cardSlide }, { scale }],
        }}
      >
        <TouchableOpacity
          style={[styles.card, unread ? styles.cardUnread : styles.cardRead]}
          onPress={() => handleOpenNotification(item)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={unread ? [GOLD + "25", GOLD + "08"] : [LIGHT, LIGHT]}
            style={styles.iconBox}
          >
            <Ionicons
              name={getIconName(item.type)}
              size={20}
              color={unread ? GOLD_DARK : MUTED}
            />
          </LinearGradient>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text
                style={[styles.cardTitle, unread && styles.cardTitleUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>

            {linkable && (
              <View style={styles.cardLinkHint}>
                <Text style={styles.cardLinkHintText}>tap to open</Text>
                <Ionicons name="arrow-forward" size={11} color={GOLD_DARK} />
              </View>
            )}
          </View>

          <View style={styles.rightCol}>
            {unread && <View style={styles.unreadDot} />}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteNotification(item._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#c5c5c5" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════
  const DetailView = () => {
    if (!selectedNotification) return null;
    const linkable = canOpenContent(selectedNotification);

    return (
      <Animated.View
        style={[
          styles.detailWrapper,
          { transform: [{ translateX: detailSlide }] },
        ]}
      >
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.detailBackBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedNotification(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={BLACK} />
          </TouchableOpacity>

          <Text style={styles.detailHeaderTitle}>detail</Text>

          <TouchableOpacity
            style={styles.detailDeleteBtn}
            onPress={() => deleteNotification(selectedNotification._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={DANGER} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailDateBadge}>
            <View style={styles.detailDateDot} />
            <Text style={styles.detailDateText}>{selectedNotification.time}</Text>
          </View>

          <View style={styles.detailCard}>
            <LinearGradient
              colors={[GOLD + "30", GOLD + "08"]}
              style={styles.detailIconWrap}
            >
              <Ionicons
                name={getIconName(selectedNotification.type)}
                size={30}
                color={GOLD_DARK}
              />
            </LinearGradient>

            <Text style={styles.detailTitle}>
              {selectedNotification.title}
            </Text>

            <View style={styles.detailDivider} />

            <Text style={styles.detailBody}>
              {selectedNotification.description}
            </Text>

            <View style={styles.detailFooter}>
              <View style={styles.detailMetaRow}>
                <View style={styles.detailMetaIconWrap}>
                  <Ionicons name="time-outline" size={13} color={MUTED} />
                </View>
                <Text style={styles.detailMetaText}>
                  {new Date(selectedNotification.createdAt).toLocaleString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </Text>
              </View>

              <View style={styles.detailMetaRow}>
                <View
                  style={[
                    styles.detailMetaIconWrap,
                    {
                      backgroundColor: selectedNotification.isRead
                        ? SUCCESS + "15"
                        : GOLD + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      selectedNotification.isRead ? "checkmark-circle" : "ellipse"
                    }
                    size={13}
                    color={selectedNotification.isRead ? SUCCESS : GOLD_DARK}
                  />
                </View>
                <Text
                  style={[
                    styles.detailMetaText,
                    {
                      color: selectedNotification.isRead ? SUCCESS : GOLD_DARK,
                    },
                  ]}
                >
                  {selectedNotification.isRead ? "read" : "unread"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailTypeCard}>
            <View style={styles.detailTypeLeft}>
              <Text style={styles.detailTypeLabel}>category</Text>
              <Text style={styles.detailTypeValue}>skillshare</Text>
            </View>
            <View style={styles.detailTypePill}>
              <Text style={styles.detailTypePillText}>
                {selectedNotification.type?.replace(/_/g, " ") || "notification"}
              </Text>
            </View>
          </View>

          {linkable && (
            <TouchableOpacity
              style={styles.openBtn}
              onPress={handleGoToContent}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color={BLACK} />
              <Text style={styles.openBtnText}>open notification</Text>
              <View style={styles.openBtnArrow}>
                <Ionicons name="arrow-forward" size={13} color={GOLD} />
              </View>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  // ════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.listWrapper}>
        <Header />
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.loaderText}>loading...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <NotificationCard item={item} index={index} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[GOLD]}
                tintColor={GOLD}
                progressBackgroundColor={WHITE}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={[GOLD + "20", GOLD + "05"]}
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name="handshake-outline"
                    size={44}
                    color={GOLD_DARK}
                  />
                </LinearGradient>
                <Text style={styles.emptyLabel}>no skillshare notifications</Text>
                <Text style={styles.emptySubLabel}>
                  offers, matches, and messages will show up here.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <DetailView />
    </SafeAreaView>
  );
};

// ════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  listWrapper: { flex: 1 },

  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: LIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: BLACK,
    letterSpacing: -0.5,
    textTransform: "lowercase",
  },
  unreadBadge: {
    backgroundColor: GOLD,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
    marginLeft: 10,
  },
  unreadBadgeText: { color: BLACK, fontSize: 11, fontWeight: "900" },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: LIGHT,
    gap: 5,
  },
  actionTextGold: {
    color: GOLD_DARK,
    fontWeight: "800",
    fontSize: 11,
    textTransform: "lowercase",
  },
  actionTextRed: {
    color: DANGER,
    fontWeight: "800",
    fontSize: 11,
    textTransform: "lowercase",
  },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: BORDER },

  filterScroll: { flexDirection: "row", gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: { backgroundColor: BLACK, borderColor: BLACK },
  filterChipText: {
    color: MUTED,
    fontWeight: "800",
    fontSize: 11.5,
    textTransform: "lowercase",
    letterSpacing: 0.2,
  },
  filterChipTextActive: { color: GOLD },

  listContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    backgroundColor: WHITE,
  },
  cardUnread: { backgroundColor: GOLD_LIGHT, borderColor: GOLD + "35" },
  cardRead: { backgroundColor: WHITE, borderColor: BORDER },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BLACK,
    flex: 1,
    marginRight: 8,
    textTransform: "lowercase",
    letterSpacing: -0.1,
  },
  cardTitleUnread: { fontWeight: "900" },
  cardTime: { fontSize: 10, color: MUTED, fontWeight: "600" },
  cardDesc: { fontSize: 12, color: "#666", lineHeight: 17, fontWeight: "500" },
  cardLinkHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  cardLinkHintText: {
    fontSize: 10,
    color: GOLD_DARK,
    fontWeight: "800",
    textTransform: "lowercase",
    letterSpacing: 0.2,
  },

  rightCol: {
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 8,
    alignSelf: "stretch",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginTop: 4,
  },
  deleteBtn: { padding: 4, marginTop: 4 },

  detailWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WHITE,
    zIndex: 10,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    paddingTop: Platform.OS === "android" ? 12 : 4,
  },
  detailBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: LIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailHeaderTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: BLACK,
    textTransform: "lowercase",
    letterSpacing: -0.2,
  },
  detailDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: DANGER + "30",
  },

  detailScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailDateBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  detailDateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  detailDateText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "lowercase",
  },

  detailCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  detailIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: GOLD + "40",
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: BLACK,
    textAlign: "center",
    marginBottom: 14,
    textTransform: "lowercase",
    letterSpacing: -0.3,
  },
  detailDivider: {
    width: 44,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 1,
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 14.5,
    color: "#444",
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 20,
  },
  detailFooter: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexWrap: "wrap",
    gap: 10,
  },
  detailMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailMetaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  detailMetaText: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: "700",
    textTransform: "lowercase",
  },

  detailTypeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: LIGHT,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  detailTypeLeft: {},
  detailTypeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    textTransform: "lowercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailTypeValue: {
    fontSize: 14,
    fontWeight: "900",
    color: BLACK,
    textTransform: "lowercase",
  },
  detailTypePill: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  detailTypePillText: {
    fontSize: 10,
    fontWeight: "900",
    color: BLACK,
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },

  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: BLACK,
  },
  openBtnText: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "lowercase",
    letterSpacing: 0.3,
    flex: 1,
  },
  openBtnArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BLACK,
    justifyContent: "center",
    alignItems: "center",
  },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GOLD + "30",
    marginBottom: 16,
  },
  emptyLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: BLACK,
    textTransform: "lowercase",
    letterSpacing: -0.2,
  },
  emptySubLabel: {
    fontSize: 12.5,
    color: MUTED,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

export default NotificationScreen;