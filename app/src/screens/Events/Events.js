// EventsScreen.js — Manual events (internal form) + Imported events (external link) — both award points
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  useWindowDimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useOpenFromParams } from "../../engagement/hooks/useOpenFromParams";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { useGuestGate } from "../../guest/GuestGate";
import { PressScale, EmptyState, SkeletonBlock } from "../../ui";
import { imageUrl } from "../../utils/imageUrl";
import useSavedEvents from "./useSavedEvents";
import io from "socket.io-client";
import { engagementBus, ENGAGEMENT_EVENTS } from "../../engagement/engagementBus";

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { plainError } from "../../utils/plainError";
import RegisterSheet, { ProofSheet } from "./RegisterSheet";
import TicketButton from "./TicketButton";
import {
  getTemplates,
  cachedTemplates,
  priceLabel,
  seatsLabel,
  closesLabel,
  registrationState,
  detailRows,
  formatRs,
  PAYMENT_LABEL,
  fetchEvent,
  LIST_FRESH_MS,
} from "./eventsV2";
import { SERVER_ORIGIN } from "../../config/server";
import { isImportedEvent, getCategoryTheme, COLORS, formatCategoryLabel, real, eventImage, eventWhen, dateText, eventMeta, isPastEvent } from "./eventsFormat";
import { styles, EV } from "./eventsStyles";
import { SkeletonList, SaveButton, EventRow, ModernHeader } from "./EventCards";
const { height, width } = Dimensions.get("window");

const API_BASE = `${SERVER_ORIGIN}/api/events`;

// Last loaded events, so opening Events again shows them at once. `at` = when they were
// loaded: older than LIST_FRESH_MS (30 s) → refetched on focus; pull-to-refresh always.
const eventsCache = { events: null, at: 0 };
const SOCKET_URL = `${SERVER_ORIGIN}`;






















// ─── Main Screen ──────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { token, user, isGuest } = useContext(AuthContext);
  const { requireAccount } = useGuestGate();
  // saved events: this student's own device list (none for guests)
  const savedUserId = token && !isGuest ? user?._id || user?.id || null : null;
  const { savedIds, isSaved, toggle: toggleSaved, prune: pruneSaved } = useSavedEvents(savedUserId);
  const [feedComplete, setFeedComplete] = useState(false); // the feed returned every event
  const [feedLoaded, setFeedLoaded] = useState(false);
  const onSave = useCallback(
    (ev) => {
      if (!requireAccount()) return; // guests: the sign up sheet
      if (ev?._id) toggleSaved(ev._id);
    },
    [requireAccount, toggleSaved]
  );
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions(); // details sheet = 85% (follows rotation)

  const [events, setEvents] = useState(eventsCache.events || []);
  const [loading, setLoading] = useState(!eventsCache.events);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [activeCity, setActiveCity] = useState("All");
  const [registerEvent, setRegisterEvent] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showApplied, setShowApplied] = useState(false);
  const [appliedEventsData, setAppliedEventsData] = useState([]);
  const [userEventsCount, setUserEventsCount] = useState(0);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Dynamic categories fetched from backend
  const [categories, setCategories] = useState([]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const filterTranslate = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    title: "",
    university: "",
    city: "",
    type: "Hackathons",
    prize: "",
    deadline: "",
    description: "",
    location: "",
    contact: "",
    date: "",
    teamSize: "",
    registrationUrl: "",
  });

  // events v2: category templates (labels for event details) and "send proof again"
  const [templates, setTemplates] = useState(cachedTemplates());
  const [proofFor, setProofFor] = useState(null); // { registration, event }
  const [detailStatus, setDetailStatus] = useState("fresh"); // loading | fresh | offline
  const openIdRef = useRef(null);
  const feedRequest = useRef(null); // one /feed request at a time
  useEffect(() => {
    let alive = true;
    getTemplates()
      .then((t) => alive && setTemplates(t))
      .catch(() => {}); // labels fall back to the detail keys
    return () => {
      alive = false;
    };
  }, []);

  const availableCities = useMemo(() => {
    if (!events || events.length === 0) return [];
    const set = new Set();
    events.forEach((ev) => {
      const c = (ev.city || "").toString().trim();
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  // Derive categories from the loaded events (like cities), merging with the
  // backend-provided list so nothing gets lost during a partial fetch.
  const availableCategories = useMemo(() => {
    const set = new Set();

    events.forEach((ev) => {
      const push = (v) => {
        if (!v) return;
        const s = String(v).trim();
        if (!s) return;
        if (s.toLowerCase() === "general") return;
        set.add(s);
      };
      push(ev.type);
      if (Array.isArray(ev.categories)) ev.categories.forEach(push);
      if (Array.isArray(ev.tags)) ev.tags.forEach(push);
    });

    (categories || []).forEach((c) => {
      const s = String(c || "").trim();
      if (!s) return;
      if (s.toLowerCase() === "general") return;
      set.add(s);
    });

    return ["All", ...Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )];
  }, [events, categories]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePostEvent = async () => {
    if (!requireAccount()) return;
    if (!form.title || !form.university || !form.date) {
      Alert.alert("Validation Error", "Please fill required fields (Title, University, Date).");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/create`,
        { ...form, image: selectedImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Event created successfully.");
      setModalVisible(false);
      setForm({
        title: "",
        university: "",
        city: "",
        type: "Hackathons",
        prize: "",
        deadline: "",
        description: "",
        location: "",
        contact: "",
        date: "",
        teamSize: "",
        registrationUrl: "",
      });
      setSelectedImage(null);
      fetchEvents();
      fetchCategories();
    } catch (error) {
      Alert.alert("Error", plainError(error, "Failed to post event."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = (eventItem) => {
    if (!eventItem) return;
    if (!requireAccount()) return;

    if (isEventRegistered(eventItem._id)) {
      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        Alert.alert("Already Registered", "You're already registered for this event.");
      }
      return;
    }

    if (isImportedEvent(eventItem)) {
      (async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/track-external/${eventItem._id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res?.data?.engagement?.popups?.length) {
            engagementBus.emit(
              ENGAGEMENT_EVENTS.POPUPS_QUEUED,
              res.data.engagement.popups
            );
          }

          engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
          await fetchRegisteredEvents();
        } catch (e) {
          console.log("[track-external] failed:", e?.response?.data || e?.message);
        }
      })();

      const targetUrl =
        eventItem.registrationUrl ||
        eventItem.externalUrl ||
        eventItem.organizerWebsite;

      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        Linking.openURL(formattedUrl).catch(() => {
          Alert.alert("Notice", "Unable to open registration link.");
        });
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          (eventItem.title || "") + " " + (eventItem.organizer || "") + " event registration"
        )}`;
        Linking.openURL(searchUrl).catch(() => {
          Alert.alert("Notice", "No registration link available for this event.");
        });
      }
      return;
    }

    const state = registrationState(eventItem);
    if (!state.open) {
      Alert.alert(state.reason, state.reason === "sold out" ? "this event is full." : "registration for this event has closed.");
      return;
    }
    setRegisterEvent(eventItem);
  };

  // after POST /register (RegisterSheet): points popups, profile, lists
  const onRegistered = (data) => {
    if (data?.engagement?.popups?.length) {
      engagementBus.emit(ENGAGEMENT_EVENTS.POPUPS_QUEUED, data.engagement.popups);
    }
    engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
    fetchRegisteredEvents();
    fetchEvents(); // seats left / tickets left
  };

  useEffect(() => {
    bootstrap();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.emit("subscribe_events");

    socket.on("events:new_imported", (data) => {
      if (data?.events && Array.isArray(data.events)) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e._id));
          const newUnique = data.events.filter((e) => !existingIds.has(e._id));
          return [...newUnique, ...prev];
        });
      } else {
        fetchEvents();
      }
      fetchCategories();
    });

    socket.on("events:expired", () => {
      fetchEvents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchRegisteredEvents();
      }
    });
    return () => sub.remove();
  }, [token]);

  // Events list decides when the screen shows; categories and "registered"
  // load alongside without holding the screen.
  const bootstrap = async () => {
    const hadCache = !!eventsCache.events;
    if (hadCache) runEntranceAnimations();
    else setLoading(true);
    fetchCategories();
    fetchRegisteredEvents();
    try {
      await fetchEvents(true);
    } finally {
      setLoading(false);
      if (!hadCache) runEntranceAnimations();
    }
  };

  const runEntranceAnimations = () => {
    headerOpacity.setValue(0);
    headerTranslate.setValue(-20);
    filterOpacity.setValue(0);
    filterTranslate.setValue(20);
    listOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(filterOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(filterTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 60);

    setTimeout(() => {
      Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, 100);
  };

  const fetchEvents = async (isInitial = false) => {
    if (feedRequest.current) return feedRequest.current; // already loading
    const run = (async () => {
    try {
      if (!isInitial) setRefreshing(true);
      const res = await axios.get(`${API_BASE}/feed`, { params: { _: Date.now() }, headers: { "Cache-Control": "no-cache" } });
      const fetchedEvents = Array.isArray(res.data) ? res.data : res.data?.events || [];
      setEvents(fetchedEvents);
      eventsCache.events = fetchedEvents;
      eventsCache.at = Date.now();
      setLoadError(false);
      const total = Array.isArray(res.data) ? fetchedEvents.length : Number(res.data?.total);
      setFeedComplete(!Number.isFinite(total) || fetchedEvents.length >= total);
      setFeedLoaded(true);
    } catch (error) {
      // nothing cached to show → the error state (ui kit) instead of an alert
      if (!eventsCache.events) setLoadError(true);
    } finally {
      setRefreshing(false);
      feedRequest.current = null;
    }
    })();
    feedRequest.current = run;
    return run;
  };

  // Back on this screen: refetch when the list is older than LIST_FRESH_MS (30 s)
  useFocusEffect(
    useCallback(() => {
      if (eventsCache.at && Date.now() - eventsCache.at > LIST_FRESH_MS) {
        fetchEvents(true);
        fetchRegisteredEvents();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Fetch the distinct category list from the backend.
  // Fails silently — the derived `availableCategories` still covers the UI.
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.categories)
        ? res.data.categories
        : [];
      setCategories(list);
    } catch (error) {
      console.log("fetchCategories failed:", error?.message);
    }
  };

  const fetchRegisteredEvents = async () => {
    if (!token) {
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawList = Array.isArray(res.data) ? res.data : [];

      const ids = rawList
        .map((r) => {
          if (!r) return null;
          if (typeof r === "string") return r;
          if (r.eventId && typeof r.eventId === "object") {
            return r.eventId._id || r.eventId.id || null;
          }
          return r.eventId || null;
        })
        .filter(Boolean)
        .map(String);

      setRegisteredEventIds(ids);

      const appliedList = rawList
        .filter((r) => r && r.eventId && typeof r.eventId === "object")
        .map((r) => ({ event: r.eventId, registration: r }));
      setAppliedEventsData(appliedList);
    } catch (error) {
      console.log("Error fetching registrations:", error);
      setRegisteredEventIds([]);
      setAppliedEventsData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchCategories(), fetchRegisteredEvents()]);
  };

  const handleCancelRegistration = async (event) => {
    if (!token) {
      requireAccount();
      return;
    }

    Alert.alert(
      "Cancel Registration",
      `Are you sure you want to cancel your registration for "${event.title}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/register/${event._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Registration cancelled successfully.");
              await fetchRegisteredEvents();
            } catch (error) {
              Alert.alert(
                "Error",
                plainError(error, "Failed to cancel registration.")
              );
            }
          },
        },
      ]
    );
  };

  const normalizeCategoryStr = (str) => {
    if (!str) return "";
    let s = str.toString().trim().toLowerCase();
    if (s.length > 3 && s.endsWith("s")) s = s.slice(0, -1);
    return s;
  };

  const isCategoryMatch = (event, category) => {
    if (!category || category === "All") return true;
    const normTab = normalizeCategoryStr(category);

    if (event.type) {
      const normType = normalizeCategoryStr(event.type);
      if (normType === normTab || normType.includes(normTab) || normTab.includes(normType)) {
        return true;
      }
    }
    if (Array.isArray(event.categories)) {
      if (event.categories.some((cat) => {
        const n = normalizeCategoryStr(cat);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    if (Array.isArray(event.tags)) {
      if (event.tags.some((tag) => {
        const n = normalizeCategoryStr(tag);
        return n === normTab || n.includes(normTab) || normTab.includes(n);
      })) return true;
    }
    return false;
  };

  const isCityMatch = (event, city) => {
    if (!city || city === "All") return true;
    return (event.city || "").toString().trim().toLowerCase() ===
           city.toString().trim().toLowerCase();
  };

  const filteredEvents = useMemo(() => {
    if (showApplied) {
      return appliedEventsData
        .map((item) => ({ ...item.event, registration: item.registration }))
        .filter((ev) => isCityMatch(ev, activeCity));
    }

    let list = events;
    if (activeTab && activeTab !== "All") list = list.filter((e) => isCategoryMatch(e, activeTab));
    if (activeCity && activeCity !== "All") list = list.filter((e) => isCityMatch(e, activeCity));
    return list;
  }, [activeTab, activeCity, events, showApplied, appliedEventsData]);

  const isEventRegistered = (eventId) => registeredEventIds.includes(eventId);

  // Saved events that are gone or past are dropped quietly (only after a fresh feed;
  // with a partial feed an id that isn't in it is kept, just not shown)
  useEffect(() => {
    if (!feedLoaded || !savedIds.length) return;
    const byId = new Map(events.map((e) => [String(e._id), e]));
    const keep = savedIds.filter((id) => {
      const ev = byId.get(id);
      if (ev) return !isPastEvent(ev);
      return !feedComplete;
    });
    if (keep.length !== savedIds.length) pruneSaved(keep);
  }, [feedLoaded, feedComplete, events, savedIds, pruneSaved]);

  // live saved events (same city filter as "registered")
  const savedEvents = useMemo(() => {
    if (!savedIds.length) return [];
    const byId = new Map(events.map((e) => [String(e._id), e]));
    return savedIds
      .map((id) => byId.get(id))
      .filter((e) => e && !isPastEvent(e))
      .filter((e) => isCityMatch(e, activeCity));
  }, [savedIds, events, activeCity]);

  const appliedCount = registeredEventIds.length + savedEvents.length;

  // List rows. All events: featured + "coming up.". Mine: "registered." then "saved.",
  // each with its own empty line.
  const listRows = useMemo(() => {
    if (!showApplied) return filteredEvents.map((e) => ({ kind: "event", key: String(e._id), event: e }));
    const rows = [{ kind: "header", key: "h-registered", title: "registered" }];
    if (filteredEvents.length) filteredEvents.forEach((e) => rows.push({ kind: "event", key: `r-${e._id}`, event: e }));
    else rows.push({ kind: "empty", key: "e-registered", which: "registered" });
    rows.push({ kind: "header", key: "h-saved", title: "saved" });
    if (savedEvents.length) savedEvents.forEach((e) => rows.push({ kind: "event", key: `s-${e._id}`, event: e }));
    else rows.push({ kind: "empty", key: "e-saved", which: "saved" });
    return rows;
  }, [showApplied, filteredEvents, savedEvents]);

  // Category chips (Events design: white pills, ink when active)
  const CategoryScroll = () => (
    <Animated.View style={{ opacity: filterOpacity, transform: [{ translateY: filterTranslate }] }}>
      {!showApplied && availableCategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={EV.chips}>
          {availableCategories.map((cat) => {
            const active = activeTab === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[EV.chip, active && EV.chipOn]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(cat);
                  setShowApplied(false);
                }}
              >
                <Text style={[EV.chipText, active && EV.chipTextOn]} numberOfLines={1}>
                  {formatCategoryLabel(cat).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );

  const CityFilterScroll = () => {
    if (availableCities.length <= 1) return null;

    return (
      <Animated.View style={{ opacity: filterOpacity }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[EV.chips, { paddingTop: 0 }]}>
          {availableCities.map((city) => {
            const active = activeCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[EV.cityChip, active && EV.cityChipOn]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCity(city);
                }}
              >
                <Ionicons name="location-outline" size={13} color={T.ink} />
                <Text style={[EV.cityChipText, active && { fontFamily: F.bodyBold }]}>
                  {city === "All" ? "all cities" : String(city).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  };


  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowApplied(!showApplied);
    if (!showApplied) {
      setActiveTab("All");
      setActiveCity("All");
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const closeDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openIdRef.current = null;
    setSelectedEvent(null);
  };

  // Details: show the list's copy at once, then the latest event (GET /api/events/:id).
  // The list's copy stays only while loading or when offline.
  const openEvent = (ev) => {
    if (!ev?._id) return;
    const id = String(ev._id);
    openIdRef.current = id;
    setSelectedEvent(ev);
    setDetailStatus("loading");
    fetchEvent(id)
      .then((fresh) => {
        if (openIdRef.current !== id) return; // closed or another event opened
        setSelectedEvent((cur) => (cur && String(cur._id) === id ? { ...fresh, registration: cur.registration } : cur));
        setDetailStatus("fresh");
        // the list shows the same version from now on
        setEvents((list) => {
          const next = list.map((e) => (String(e._id) === id ? fresh : e));
          eventsCache.events = next;
          return next;
        });
      })
      .catch(() => {
        if (openIdRef.current === id) setDetailStatus("offline");
      });
  };

  // Daily Drop / push → navigate('Events', { openEventId }) opens that event
  useOpenFromParams("openEventId", async (id) => {
    let ev = events.find((e) => String(e._id) === String(id));
    if (!ev) {
      const res = await axios.get(`${API_BASE}/${id}`);
      ev = res.data;
    }
    if (ev?._id) openEvent(ev);
    return true;
  }, !loading);

  // the ticket screen, ready to download (mine card, event details)
  const openTicket = (reg) => navigation.navigate("EventTicket", { registrationId: String(reg._id), download: true });

  // List rows (EventRow is memoised): stable callbacks and renderItem
  const rowOpen = useStableCallback((ev) => openEvent(ev));
  const rowRegister = useStableCallback((ev) => handleRegister(ev));
  const rowCancel = useStableCallback((ev) => handleCancelRegistration(ev));
  const rowTicket = useStableCallback((reg) => openTicket(reg));
  const rowSave = useStableCallback((ev) => onSave(ev));
  const rowProof = useStableCallback((reg, ev) => setProofFor({ registration: reg, event: ev }));
  const renderRow = useCallback(({ item: row, index }) => {
    if (row.kind === "header") {
      return (
        <Text style={EV.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {row.title}<Text style={{ color: T.yellow }}>.</Text>
        </Text>
      );
    }
    if (row.kind === "empty") {
      return row.which === "saved" ? (
        <EmptyState mood="sleepy" title="nothing saved yet." line="save an event and it shows up here." style={EV.sectionEmpty} />
      ) : (
        <EmptyState mood="sleepy" title="no registrations yet." line="register for an event and it shows up here." style={EV.sectionEmpty} />
      );
    }
    const ev = row.event;
    return (
      <EventRow
        ev={ev}
        index={index}
        showApplied={showApplied}
        saved={isSaved(ev._id)}
        registered={registeredEventIds.includes(ev._id)}
        onOpen={rowOpen}
        onRegister={rowRegister}
        onCancel={rowCancel}
        onTicket={rowTicket}
        onSave={rowSave}
        onProof={rowProof}
      />
    );
  }, [showApplied, isSaved, registeredEventIds, rowOpen, rowRegister, rowCancel, rowTicket, rowSave, rowProof]);
  const registrationFor = (eventId) =>
    appliedEventsData.find((x) => String(x?.event?._id || x?.event) === String(eventId))?.registration || null;

  // "your ticket is ready" (push, in-app list) → navigate('Events', { ticketRegistrationId })
  useOpenFromParams("ticketRegistrationId", (id) => {
    navigation.navigate("EventTicket", { registrationId: String(id) });
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
        <ModernHeader
          onBack={handleBackPress}
          onMenuPress={handleMenuPress}
          showApplied={showApplied}
          appliedCount={appliedCount}
        />
        <SkeletonList />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />

      <ModernHeader
        onBack={handleBackPress}
        onMenuPress={handleMenuPress}
        showApplied={showApplied}
        appliedCount={appliedCount}
      />

      <CategoryScroll />
      <CityFilterScroll />

      <Animated.View style={[styles.feedContainer, { opacity: listOpacity }]}>
        <FlatList
          data={listRows}
          keyExtractor={(row) => row.key}
          extraData={[savedIds, registeredEventIds]}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !refreshing ? (
              loadError && !showApplied ? (
                <EmptyState
                  mood="panic"
                  title="couldn't load events."
                  line="check your connection and try again."
                  actionLabel="try again"
                  onAction={() => fetchEvents()}
                />
              ) : showApplied ? (
                <EmptyState
                  mood="sleepy"
                  title="no registered events."
                  line="register for an event and it shows up here."
                  actionLabel="explore events"
                  onAction={() => setShowApplied(false)}
                />
              ) : activeCity !== "All" ? (
                <EmptyState
                  mood="sleepy"
                  title={`no events in ${String(activeCity).toLowerCase()}.`}
                  line="try another city."
                  actionLabel="all cities"
                  onAction={() => setActiveCity("All")}
                />
              ) : (
                <EmptyState mood="sleepy" title="no events yet." line="new events show up here. check back soon." />
              )
            ) : null
          }
        />
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EVENT DETAIL — BOTTOM SHEET */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetail}
        statusBarTranslucent={true}
      >
        {/* The sheet is a plain View: it used to be a Pressable (to stop taps reaching the
            backdrop), which took the touch responder at touch start and stopped the
            ScrollView inside from scrolling on Android. The backdrop is now its own
            Pressable behind the sheet. */}
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetail}
            accessibilityRole="button"
            accessibilityLabel="close event details"
          />
          <View style={[styles.sheetContainer, { height: Math.round(windowHeight * 0.85) }]}>
            {selectedEvent && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetGrabber} />
                  <View style={styles.sheetHeaderRow}>
                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="back to events"
                    >
                      <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
                        event details
                      </Text>
                      {detailStatus === "loading" && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLiveRegion="polite">
                          <ActivityIndicator size="small" color={T.textMuted} />
                          <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>updating…</Text>
                        </View>
                      )}
                      {detailStatus === "offline" && (
                        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>offline · showing saved details</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={closeDetail}
                      activeOpacity={0.7}
                      style={styles.sheetHeaderBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="close event details"
                    >
                      <Ionicons name="close" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  bounces={true}
                  nestedScrollEnabled={true}
                  overScrollMode="always"
                >
                  <View style={styles.sheetImageWrapper}>
                    {/* the event's own image only; no stock banner when it has none */}
                    {eventImage(selectedEvent) ? (
                      <RemoteImage
                        source={{ uri: eventImage(selectedEvent) }}
                        style={styles.sheetBanner}
                        resizeMode="cover"
                        size="banner"
                      />
                    ) : (
                      <View style={[styles.sheetBanner, { backgroundColor: T.sand, alignItems: "center", justifyContent: "center" }]}>
                        <MaterialCommunityIcons name="calendar-star" size={44} color={T.textFaint} />
                      </View>
                    )}
                    <LinearGradient
                      colors={["rgba(17,17,17,0.05)", "rgba(17,17,17,0.55)"]}
                      style={styles.sheetBannerOverlay}
                    />
                    {isEventRegistered(selectedEvent._id) && (
                      <View style={styles.sheetRegisteredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.sheetRegisteredText}>registered</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sheetBody}>
                    <View style={styles.detailTopRow}>
                      {!!real(selectedEvent, "type") && (
                      <View
                        style={[
                          styles.detailTag,
                          { backgroundColor: getCategoryTheme(selectedEvent.type).bg },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryTheme(selectedEvent.type).icon}
                          size={12}
                          color={getCategoryTheme(selectedEvent.type).color}
                        />
                        <Text
                          style={[
                            styles.detailTagText,
                            { color: getCategoryTheme(selectedEvent.type).color },
                          ]}
                          numberOfLines={1}
                        >
                          {String(real(selectedEvent, "type")).toLowerCase()}
                        </Text>
                      </View>
                      )}
                      {isEventRegistered(selectedEvent._id) && (
                        <View style={[styles.detailTag, { backgroundColor: T.successBg }]}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={[styles.detailTagText, { color: COLORS.success }]}>
                            registered
                          </Text>
                        </View>
                      )}
                    </View>
                    {isEventRegistered(selectedEvent._id) && (
                      <TicketButton
                        registration={registrationFor(selectedEvent._id)}
                        onOpen={(reg) => {
                          setSelectedEvent(null);
                          openTicket(reg);
                        }}
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    <Text style={styles.detailTitle}>{selectedEvent.title}</Text>

                    {!!real(selectedEvent, "city") && (
                    <View style={styles.detailOrgRow}>
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        style={styles.detailAvatarSmall}
                      >
                        <Ionicons name="location" size={16} color={T.white} />
                      </LinearGradient>
                      <Text style={styles.detailOrgLocationLarge}>
                        {real(selectedEvent, "city")}
                      </Text>
                    </View>
                    )}

                    {!!(eventWhen(selectedEvent) || real(selectedEvent, "deadline") || real(selectedEvent, "teamSize")) && (
                    <View style={styles.specRow}>
                      {!!eventWhen(selectedEvent) && (
                        <View style={styles.specCard}>
                          <View style={styles.specIcon}>
                            <Ionicons name="calendar" size={18} color={T.ink} />
                          </View>
                          <Text style={styles.specTitle}>date</Text>
                          <Text style={styles.specText}>{eventWhen(selectedEvent)}</Text>
                        </View>
                      )}

                      {!!real(selectedEvent, "deadline") && (
                      <View style={styles.specCard}>
                        <View style={styles.specIcon}>
                          <Ionicons name="hourglass" size={18} color={T.ink} />
                        </View>
                        <Text style={styles.specTitle}>deadline</Text>
                        <Text style={styles.specText}>{dateText(selectedEvent, "deadline")}</Text>
                      </View>
                      )}

                      {!!real(selectedEvent, "teamSize") && (
                      <View style={[styles.specCard, styles.specCardLast]}>
                        <View style={styles.specIcon}>
                          <Ionicons name="people" size={18} color={T.ink} />
                        </View>
                        <Text style={styles.specTitle}>team</Text>
                        <Text style={styles.specText}>{real(selectedEvent, "teamSize")}</Text>
                      </View>
                      )}
                    </View>
                    )}

                    {/* events v2: price, seats, closing date (not for external events) */}
                    {!isImportedEvent(selectedEvent) && (
                      <View style={EV.infoRow}>
                        <View style={[EV.infoPill, { backgroundColor: T.yellowSoft }]}>
                          <Text style={EV.infoPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{priceLabel(selectedEvent)}</Text>
                        </View>
                        {!!seatsLabel(selectedEvent) && (
                          <View style={[EV.infoPill, seatsLabel(selectedEvent) === "sold out" && { backgroundColor: T.dangerBg }]}>
                            <Text style={[EV.infoPillText, seatsLabel(selectedEvent) === "sold out" && { color: T.danger }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                              {seatsLabel(selectedEvent)}
                            </Text>
                          </View>
                        )}
                        {!!closesLabel(selectedEvent) && (
                          <View style={EV.infoPill}>
                            <Text style={EV.infoPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{closesLabel(selectedEvent)}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {detailRows(selectedEvent, templates).length > 0 && (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>details</Text>
                        {detailRows(selectedEvent, templates).map((row) => (
                          <View key={row.key} style={EV.detailRow}>
                            <Text style={EV.detailLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{row.label}</Text>
                            <Text style={EV.detailValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {!!String(selectedEvent.description || "").trim() && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>description</Text>
                      <Text style={styles.sectionCardBody}>{selectedEvent.description}</Text>
                    </View>
                    )}

                    {!!real(selectedEvent, "location") && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionCardTitle}>location</Text>
                      <Text style={styles.sectionCardBody}>
                        <Ionicons name="location" size={14} color={T.ink} />{" "}
                        {real(selectedEvent, "location")}
                      </Text>
                    </View>
                    )}

                    {selectedEvent.university ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>university</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="school" size={14} color={T.ink} />{" "}
                          {selectedEvent.university}
                        </Text>
                      </View>
                    ) : null}

                    {real(selectedEvent, "prize") && !selectedEvent.details?.prizePool ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>prize pool</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="trophy" size={14} color={T.ink} />{" "}
                          {real(selectedEvent, "prize")}
                        </Text>
                      </View>
                    ) : null}

                    {selectedEvent.contact ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionCardTitle}>contact</Text>
                        <Text style={styles.sectionCardBody}>
                          <Ionicons name="call" size={14} color={T.ink} />{" "}
                          {selectedEvent.contact}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ height: 24 }} />
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.sheetStickyFooter,
                    { paddingBottom: (insets.bottom || 0) + 12 },
                  ]}
                >
                  <View style={styles.sheetStickyContent}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      {isImportedEvent(selectedEvent) ? (
                        <Text style={styles.stickyLabel}>external event</Text>
                      ) : !isImportedEvent(selectedEvent) && registrationState(selectedEvent).reason ? (
                        <Text style={styles.stickyLabel}>{registrationState(selectedEvent).reason}</Text>
                      ) : selectedEvent.registrationCloses ? (
                        <>
                          <Text style={styles.stickyLabel}>register before</Text>
                          <Text style={styles.stickyValue} numberOfLines={1}>
                            {(closesLabel(selectedEvent) || "").replace(/^registration closes /, "")}
                          </Text>
                        </>
                      ) : real(selectedEvent, "deadline") ? (
                        <>
                          <Text style={styles.stickyLabel}>register before</Text>
                          <Text style={styles.stickyValue} numberOfLines={1}>
                            {dateText(selectedEvent, "deadline")}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    <View style={{ marginRight: 8 }}>
                      <SaveButton saved={isSaved(selectedEvent._id)} onPress={() => onSave(selectedEvent)} />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      disabled={!isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open}
                      style={!isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open ? { opacity: 0.45 } : null}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !isImportedEvent(selectedEvent) && !isEventRegistered(selectedEvent._id) && !registrationState(selectedEvent).open }}
                      onPress={() => {
                        const e = selectedEvent;
                        setSelectedEvent(null);
                        handleRegister(e);
                      }}
                    >
                      <LinearGradient
                        colors={
                          isImportedEvent(selectedEvent)
                            ? [T.ink, T.ink]
                            : [COLORS.primary, COLORS.gradientEnd]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.stickyButton}
                      >
                        <Text style={styles.stickyButtonText}>
                          {isImportedEvent(selectedEvent) ? "open link" : "Save my Spot"}
                        </Text>
                        <Ionicons
                          name={isImportedEvent(selectedEvent) ? "open-outline" : "arrow-forward"}
                          size={16}
                          color={COLORS.accent}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE EVENT MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalScreen}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={[styles.modalHero, { paddingTop: (insets.top || 0) + 12 }]}
              >
                <View style={styles.modalHeroTop}>
                  <View style={styles.modalHeroTitleRow}>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                    <Text style={styles.modalHeroTitle}>create event</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityLabel="close create event"
                  >
                    <Ionicons name="close" size={25} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalHeroSubtitle}>
                  Publish an event and connect with your campus community
                </Text>
              </LinearGradient>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
              >
                <ScrollView
                  style={styles.formScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.formScrollContent,
                    { paddingBottom: (insets.bottom || 12) + 24 },
                  ]}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Event Title *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter event title"
                      placeholderTextColor={T.textFaint}
                      value={form.title}
                      onChangeText={(text) => setForm({ ...form, title: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>University *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="University name"
                          placeholderTextColor={T.textFaint}
                          value={form.university}
                          onChangeText={(text) => setForm({ ...form, university: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>City *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="City"
                          placeholderTextColor={T.textFaint}
                          value={form.city}
                          onChangeText={(text) => setForm({ ...form, city: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category *</Text>
                    {/* ✅ FIX: long labels shrink and stay on one line inside the pill */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {availableCategories
                        .filter((item) => item !== "All")
                        .map((cat) => {
                          const selected = form.type === cat;
                          const theme = getCategoryTheme(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              activeOpacity={0.86}
                              onPress={() => setForm({ ...form, type: cat })}
                              style={[
                                styles.optionPill,
                                selected && styles.optionPillActive,
                                { borderColor: selected ? theme.color : COLORS.line },
                              ]}
                            >
                              {selected && (
                                <LinearGradient
                                  colors={[theme.color, theme.color + "80"]}
                                  style={StyleSheet.absoluteFillObject}
                                />
                              )}
                              <Ionicons
                                name={theme.icon}
                                size={14}
                                color={selected ? T.white : theme.color}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextActive,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                maxFontSizeMultiplier={MAX_FONT_SCALE}
                              >
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>description</Text>
                    <TextInput
                      style={[styles.textInput, styles.multiLineInput]}
                      placeholder="Describe your event..."
                      placeholderTextColor={T.textFaint}
                      multiline
                      value={form.description}
                      onChangeText={(text) => setForm({ ...form, description: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>event date</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="15 May 2026"
                          placeholderTextColor={T.textFaint}
                          value={form.date}
                          onChangeText={(text) => setForm({ ...form, date: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>team size</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2-4 Members"
                          placeholderTextColor={T.textFaint}
                          value={form.teamSize}
                          onChangeText={(text) => setForm({ ...form, teamSize: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location / Venue</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Auditorium, online, lab..."
                      placeholderTextColor={T.textFaint}
                      value={form.location}
                      onChangeText={(text) => setForm({ ...form, location: text })}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.colLeft}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>prize pool</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="PKR 100,000"
                          placeholderTextColor={T.textFaint}
                          value={form.prize}
                          onChangeText={(text) => setForm({ ...form, prize: text })}
                        />
                      </View>
                    </View>
                    <View style={styles.colRight}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>deadline</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="30 April 2026"
                          placeholderTextColor={T.textFaint}
                          value={form.deadline}
                          onChangeText={(text) => setForm({ ...form, deadline: text })}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>contact info</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email or phone"
                      placeholderTextColor={T.textFaint}
                      value={form.contact}
                      onChangeText={(text) => setForm({ ...form, contact: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Original Event / Registration Link</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="https://forms.google.com/... or https://luma.com/..."
                      placeholderTextColor={T.textFaint}
                      value={form.registrationUrl}
                      onChangeText={(text) => setForm({ ...form, registrationUrl: text })}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>event banner</Text>
                    <TouchableOpacity
                      style={styles.uploadCard}
                      activeOpacity={0.88}
                      onPress={pickImage}
                    >
                      {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.uploadPreview} />
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <View style={styles.uploadIconCircle}>
                            <Ionicons name="image-outline" size={30} color={COLORS.primary} />
                          </View>
                          <Text style={styles.uploadTitle}>upload banner</Text>
                          <Text style={styles.uploadSubtitle}>Recommended 16:9 ratio</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryFormButton}
                    activeOpacity={0.88}
                    disabled={submitting}
                    onPress={handlePostEvent}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryFormGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color={COLORS.accent} />
                      ) : (
                        <>
                          <Text style={styles.primaryFormText}>publish event</Text>
                          <Ionicons name="rocket-outline" size={22} color={COLORS.accent} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.formBottomSpacer} />
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* REGISTRATION (events v2): the event's own form, tickets, payment */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {registerEvent && (
        <RegisterSheet
          event={registerEvent}
          token={token}
          user={user}
          onClose={() => setRegisterEvent(null)}
          onRegistered={onRegistered}
          onAlreadyRegistered={() => {
            Alert.alert("Notice", "You're already registered for this event.");
            setRegisterEvent(null);
            fetchRegisteredEvents();
          }}
        />
      )}
      {proofFor && (
        <ProofSheet
          registration={proofFor.registration}
          event={proofFor.event}
          token={token}
          onClose={() => setProofFor(null)}
          onSent={() => {
            setProofFor(null);
            fetchRegisteredEvents();
          }}
        />
      )}
    </SafeAreaView>
  );
}


