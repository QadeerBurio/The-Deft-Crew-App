// app/src/screens/ExchangeScreen.js
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useOpenFromParams } from '../engagement/hooks/useOpenFromParams';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Linking,
  Animated,
  Dimensions,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api, { publicAPI } from "../api/api";
import { WebView } from 'react-native-webview';
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { engagementBus, ENGAGEMENT_EVENTS } from '../engagement/engagementBus';

import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { ScreenHeader, HeaderIconButton, Input, Chip, EmptyState, Skeleton } from "../ui";

// empty date fields are hidden, never shown as a placeholder
const isBlank = (v) => v === null || v === undefined || v === '';
const { width, height } = Dimensions.get('window');

// ─── DATE FORMATTER ───────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (value) => {
  if (value === null || value === undefined || value === '') return 'TBD';

  // If it's already a formatted string (contains letters), return as-is
  if (typeof value === 'string' && /[a-zA-Z]/.test(value)) {
    return value;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(numValue) && isFinite(numValue)) {
    // 1️⃣ Unix timestamp in MILLISECONDS (e.g. 1767225600000 for 2026)
    //    Range: ~2001 to ~2286
    if (numValue > 1000000000000 && numValue < 10000000000000) {
      const d = new Date(numValue);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    // 2️⃣ Unix timestamp in SECONDS (e.g. 1767225600 for 2026)
    //    Range: ~2001 to ~2286
    if (numValue > 1000000000 && numValue < 10000000000) {
      const d = new Date(numValue * 1000);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    // 3️⃣ Excel serial date — ONLY if in the valid Excel range (1 to 2958465)
    //    Excel epoch: 30 Dec 1899
    //    2958465 = 31 Dec 9999
    if (numValue >= 1 && numValue <= 2958465) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const msPerDay = 24 * 60 * 60 * 1000;
      const dateObj = new Date(excelEpoch + Math.floor(numValue) * msPerDay);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getUTCDate();
        const month = MONTHS_SHORT[dateObj.getUTCMonth()];
        const year = dateObj.getUTCFullYear();
        return `${day} ${month} ${year}`;
      }
    }
    // 4️⃣ Year-only value (e.g. 2026)
    if (numValue >= 1900 && numValue <= 2100 && Number.isInteger(numValue)) {
      return `${numValue}`;
    }
  }

  // 5️⃣ Try native Date parsing for strings like "2026-01-15"
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (value.length <= 20) return value;
  }

  return 'TBD';
};

const ExchangeScreen = ({ navigation }) => {
  const { token, isGuest, logout, user } = useContext(AuthContext);

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState('Bachelors');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Details Modal State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // WebView Modal State
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewProgress, setWebViewProgress] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;
  const webViewFade = useRef(new Animated.Value(0)).current;
  const webViewSlide = useRef(new Animated.Value(height)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  const degrees = ['Bachelors', 'Masters', 'PhD'];

  const getDegreeStyle = (degree) => {
    switch (degree) {
      case 'Masters': return { color: T.ink, bg: T.yellowSoft };
      case 'PhD': return { color: T.yellow, bg: T.ink };
      default: return { color: T.ink, bg: T.sand };
    }
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  }, []);

  // Modal animation
  useEffect(() => {
    if (detailsVisible) {
      Animated.spring(modalAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [detailsVisible]);

  // WebView animation - full screen
  useEffect(() => {
    if (webViewVisible) {
      Animated.parallel([
        Animated.timing(webViewFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(webViewSlide, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true })
      ]).start();
    } else {
      Animated.timing(webViewFade, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      Animated.timing(webViewSlide, { toValue: height, duration: 300, useNativeDriver: true }).start();
    }
  }, [webViewVisible]);

  // Progress bar animation
  useEffect(() => {
    if (webViewLoading) {
      Animated.timing(progressWidth, {
        toValue: webViewProgress / 100,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [webViewProgress]);

  // App foreground refresh — flips the Home Scholarships card if points were awarded elsewhere
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isGuest) {
        engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
      }
    });
    return () => sub.remove();
  }, [isGuest]);

  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and explore study abroad opportunities!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Sign Up', onPress: () => navigation.navigate('Login') }
      ]
    );
  };

  const fetchPrograms = async () => {
    try {
      setError(null);
      const response = await publicAPI.getExchangePrograms();
      const programsData = Array.isArray(response) ? response : [];
      const activePrograms = programsData.filter(p => p.active !== false);
      setPrograms(activePrograms);
      if (activePrograms.length === 0) {
        console.log('No active programs found');
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      if (err.response?.status === 401 && !isGuest) {
        Alert.alert("Session Expired", "Please login again to continue.");
        logout();
      } else if (err.response?.status === 404) {
        setError('Programs endpoint not found. Please try again later.');
        setPrograms([]);
      } else if (!isGuest) {
        Alert.alert('Network Error', 'Unable to load exchange programs. Please check your connection.', [
          { text: 'Retry', onPress: fetchPrograms }
        ]);
        setPrograms([]);
      } else {
        setPrograms([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrograms();
  };

  const filteredPrograms = useMemo(() => {
    if (!Array.isArray(programs)) return [];
    return programs.filter(p => {
      const matchesDegree = p.degree === selectedDegree;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (p.title || '').toLowerCase().includes(query) ||
        (p.university || '').toLowerCase().includes(query) ||
        (p.location || '').toLowerCase().includes(query);
      return matchesDegree && matchesSearch;
    });
  }, [selectedDegree, searchQuery, programs]);

  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setDetailsVisible(true);
  };

  // ✅ Updated: awards +50 pts (scholarship_applied) AND opens the university website
  const handleApplyNow = (program) => {
    if (isGuest) {
      showGuestAlert('apply for programs');
      return;
    }

    if (!program?.link) {
      Alert.alert(
        'No Website Available',
        'This program does not have a website link available.',
        [{ text: 'OK' }]
      );
      return;
    }

    let url = program.link;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 🔥 1. Fire the points award (async, non-blocking)
    (async () => {
      try {
        const res = await api.post(
          '/auth/exchange/track-external',
          { programId: program._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 🎯 Celebration popups
        if (res?.data?.engagement?.popups?.length) {
          engagementBus.emit(
            ENGAGEMENT_EVENTS.POPUPS_QUEUED,
            res.data.engagement.popups
          );
        }

        // 🎯 Flip Home's Scholarships card to "sorted"
        engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
      } catch (e) {
        console.log(
          '[track-external scholarship] failed:',
          e?.response?.data || e?.message
        );
      }
    })();

    // 🔥 2. Open the WebView immediately
    setWebViewUrl(url);
    setWebViewVisible(true);
    setWebViewLoading(true);
    setWebViewProgress(0);
  };

  const handleProfile = () => {
    if (isGuest) {
      showGuestAlert('view profile');
      return;
    }
    navigation.navigate('Profile');
  };

  const closeWebView = () => {
    setWebViewVisible(false);
    setWebViewUrl('');
    setWebViewLoading(true);
  };

  const openInBrowser = () => {
    if (webViewUrl) {
      Linking.openURL(webViewUrl).catch((err) => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Unable to open in browser');
      });
    }
  };

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Card Item Component with Animation
  const CardItem = ({ item, index }) => {
    const { color, bg } = getDegreeStyle(item.degree || 'Bachelors');
    const scaleAnim = useRef(new Animated.Value(0.97)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const hasAppStart = !isBlank(item.appStart);
    const hasDeadline = !isBlank(item.deadline);
    const meta = [item.location, item.duration].filter(Boolean).join(' · ');

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: Math.min(index * 60, 300),
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          delay: Math.min(index * 60, 300),
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[EX.cardWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleViewDetails(item)}
          style={EX.card}
          accessibilityRole="button"
          accessibilityLabel={`${item.title || 'program'}${item.university ? `, ${item.university}` : ''}, view details`}
        >
          <View style={EX.cardTop}>
            <View style={EX.cardIcon}>
              <FontAwesome5 name="university" size={16} color={T.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={EX.cardTitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {item.title || item.university || 'program'}
              </Text>
              {!!item.university && !!item.title && (
                <Text style={EX.cardSub} numberOfLines={1}>{item.university}</Text>
              )}
              {!!meta && <Text style={EX.cardMeta} numberOfLines={1}>{meta}</Text>}
            </View>
            {!!item.degree && (
              <View style={[EX.degreePill, { backgroundColor: bg }]}>
                <Text style={[EX.degreeText, { color }]}>{String(item.degree).toLowerCase()}</Text>
              </View>
            )}
          </View>

          {(hasAppStart || hasDeadline) && (
            <View style={EX.dates}>
              {hasAppStart && (
                <View style={{ flex: 1 }}>
                  <Text style={EX.dateLabel}>opens</Text>
                  <Text style={EX.dateValue}>{formatDate(item.appStart).toLowerCase()}</Text>
                </View>
              )}
              {hasDeadline && (
                <View style={{ flex: 1 }}>
                  <Text style={[EX.dateLabel, { color: T.danger }]}>deadline</Text>
                  <Text style={[EX.dateValue, { color: T.danger }]}>{formatDate(item.deadline).toLowerCase()}</Text>
                </View>
              )}
            </View>
          )}

          <View style={EX.cardFoot}>
            <Text style={EX.cardFootText}>view details</Text>
            <Ionicons name="arrow-forward" size={16} color={T.ink} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }) => {
    return <CardItem item={item} index={index} />;
  };

  // Daily Drop / push → navigate('Exchange', { openProgramId }) opens that program
  useOpenFromParams('openProgramId', (id) => {
    const program = (programs || []).find((p) => String(p._id) === String(id));
    if (!program) return !loading; // not loaded yet → retry; loaded but missing → give up
    handleViewDetails(program);
    return true;
  }, !loading);

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ScreenHeader title="study abroad" />
        <View style={EX.center}>
          <EmptyState mood="panic" title="something went wrong." line={String(error).toLowerCase()} actionLabel="try again" onAction={fetchPrograms} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <ScreenHeader
        title="study abroad"
        right={<HeaderIconButton icon="person-outline" label="your profile" onPress={handleProfile} />}
      />

      <Animated.View style={[EX.top, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={EX.lead} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          programs, deadlines and university links in one place.
        </Text>
        <Input
          placeholder="search universities, countries…"
          accessibilityLabel="search programs"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          style={{ marginTop: 12 }}
          left={<Ionicons name="search-outline" size={18} color={T.textMuted} style={{ marginRight: 8 }} />}
          right={
            searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="clear search">
                <Ionicons name="close-circle" size={20} color={T.textFaint} />
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Guest note */}
        {isGuest && (
          <View style={EX.guest}>
            <Ionicons name="information-circle-outline" size={18} color={T.ink} />
            <Text style={EX.guestText}>
              browsing as guest. <Text style={EX.guestLink}>sign in</Text> to apply.
            </Text>
          </View>
        )}

        <View style={EX.filterHead}>
          <Text style={EX.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            degree<Text style={{ color: T.yellow }}>.</Text>
          </Text>
          {!loading && (
            <Text style={EX.count}>
              {filteredPrograms.length} {filteredPrograms.length === 1 ? 'program' : 'programs'}
            </Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={EX.chips}>
          {degrees.map((degree) => (
            <Chip
              key={degree}
              label={degree.toLowerCase()}
              selected={selectedDegree === degree}
              onPress={() => setSelectedDegree(degree)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 4 }} accessibilityLabel="loading programs">
            <Skeleton rows={3} height={150} />
          </View>
        ) : (
          <FlatList
            data={filteredPrograms}
            keyExtractor={item => item._id || Math.random().toString()}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.ink} colors={[T.ink]} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={{ paddingTop: 30 }}>
                <EmptyState
                  mood="sleepy"
                  title="no programs found."
                  line={searchQuery ? 'try a different search.' : 'check back soon for new programs.'}
                  actionLabel={isGuest ? 'create account' : undefined}
                  onAction={isGuest ? () => navigation.navigate('Login') : undefined}
                />
              </View>
            }
          />
        )}
      </View>

      {/* Modern Details Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={detailsVisible}
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDetailsVisible(false)}
          />
          <Animated.View
            style={[styles.modalContent, { transform: [{ translateY: modalAnim }] }]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle} accessibilityRole="header">program details<Text style={{ color: T.yellow }}>.</Text></Text>
                {selectedProgram && (
                  !!selectedProgram.degree && (
                    <View style={[styles.modalDegreeBadge, { backgroundColor: getDegreeStyle(selectedProgram.degree).bg }]}>
                      <Text style={[styles.modalDegreeText, { color: getDegreeStyle(selectedProgram.degree).color }]}>
                        {String(selectedProgram.degree).toLowerCase()}
                      </Text>
                    </View>
                  )
                )}
              </View>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="close"
              >
                <Ionicons name="close" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {selectedProgram && (
                <>
                  <View style={styles.modalProgramInfo}>
                    <Text style={styles.modalProgramTitle}>{selectedProgram.title || selectedProgram.university || 'program'}</Text>
                    {!!selectedProgram.university && (
                      <View style={styles.modalUniversityRow}>
                        <FontAwesome5 name="university" size={14} color={T.textMuted} />
                        <Text style={styles.modalUniversity}>{selectedProgram.university}</Text>
                      </View>
                    )}
                    {!!(selectedProgram.location || selectedProgram.duration) && (
                      <View style={styles.modalLocationRow}>
                        {!!selectedProgram.location && (
                          <>
                            <Ionicons name="location-outline" size={16} color={T.textMuted} />
                            <Text style={styles.modalLocation}>{selectedProgram.location}</Text>
                          </>
                        )}
                        {!!selectedProgram.location && !!selectedProgram.duration && <View style={styles.modalDot} />}
                        {!!selectedProgram.duration && (
                          <>
                            <Ionicons name="time-outline" size={16} color={T.textMuted} />
                            <Text style={styles.modalDuration}>{selectedProgram.duration}</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.modalDivider} />

                  <Text style={styles.detailHeading}>
                    <Ionicons name="globe-outline" size={16} color={T.textMuted} /> university website
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailsVisible(false);
                      setTimeout(() => {
                        if (selectedProgram) {
                          handleApplyNow(selectedProgram);
                        }
                      }, 300);
                    }}
                    style={styles.linkContainer}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkText} numberOfLines={1}>
                      {selectedProgram?.link || 'no link provided'}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={T.ink} />
                  </TouchableOpacity>

                  <Text style={[styles.detailHeading, { marginTop: 24 }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={T.textMuted} /> requirements
                  </Text>
                  {selectedProgram?.requirements && selectedProgram.requirements.length > 0 ? (
                    <View style={styles.requirementsList}>
                      {selectedProgram.requirements.map((req, index) => (
                        <View key={index} style={styles.reqItem}>
                          <View style={styles.reqIcon}>
                            <Ionicons name="checkmark" size={12} color={T.success} />
                          </View>
                          <Text style={styles.reqText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyTextSmall}>no specific requirements listed.</Text>
                  )}

                  {(!isBlank(selectedProgram.appStart) || !isBlank(selectedProgram.deadline)) && (
                    <View style={styles.modalDateInfo}>
                      {!isBlank(selectedProgram.appStart) && (
                        <View style={styles.modalDateBox}>
                          <Text style={styles.modalDateLabel}>application opens</Text>
                          <Text style={styles.modalDateValue}>
                            {formatDate(selectedProgram.appStart).toLowerCase()}
                          </Text>
                        </View>
                      )}
                      {!isBlank(selectedProgram.deadline) && (
                        <View style={styles.modalDateBox}>
                          <Text style={[styles.modalDateLabel, { color: T.danger }]}>deadline</Text>
                          <Text style={[styles.modalDateValue, { color: T.danger }]}>
                            {formatDate(selectedProgram.deadline).toLowerCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Apply Button in Modal — triggers handleApplyNow (+50 pts) */}
            <TouchableOpacity
              style={styles.applyModalBtn}
              onPress={() => {
                setDetailsVisible(false);
                if (selectedProgram) {
                  setTimeout(() => handleApplyNow(selectedProgram), 300);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.applyModalBtnText}>
                {isGuest ? 'sign up to apply' : 'apply now · +50 pts'}
              </Text>
              <Ionicons
                name={isGuest ? 'person-add-outline' : 'arrow-forward'}
                size={20}
                color={T.ink}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* WebView Modal - FULL SCREEN */}
      <Modal
        animationType="none"
        transparent={true}
        visible={webViewVisible}
        onRequestClose={closeWebView}
        statusBarTranslucent={true}
      >
        <View style={styles.webViewFullScreen}>
          <Animated.View
            style={[
              styles.webViewContainer,
              { opacity: webViewFade, transform: [{ translateY: webViewSlide }] }
            ]}
          >
            {/* WebView Header */}
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={closeWebView} style={styles.webViewHeaderBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="close website">
                <Ionicons name="close" size={24} color={T.ink} />
              </TouchableOpacity>

              <View style={styles.webViewHeaderCenter}>
                <Text style={styles.webViewHeaderTitle}>university website</Text>
                <Text style={styles.webViewHeaderSubtitle} numberOfLines={1}>
                  {selectedProgram?.university || 'loading…'}
                </Text>
              </View>

              <TouchableOpacity onPress={openInBrowser} style={styles.webViewHeaderBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="open in browser">
                <Ionicons name="open-outline" size={22} color={T.ink} />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            {webViewLoading && (
              <View style={styles.webViewProgressContainer}>
                <Animated.View style={[styles.webViewProgressBar, { width: progressWidthInterpolated }]}>
                  <LinearGradient colors={[T.ink, T.ink]} style={styles.webViewProgressGradient} />
                </Animated.View>
              </View>
            )}

            {/* WebView */}
            <View style={styles.webViewWrapper}>
              <WebView
                source={{ uri: webViewUrl }}
                onLoadStart={() => setWebViewLoading(true)}
                onLoadEnd={() => setWebViewLoading(false)}
                onLoadProgress={({ nativeEvent }) => setWebViewProgress(nativeEvent.progress * 100)}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                renderLoading={() => null}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
              />

              {/* Loading Overlay */}
              {webViewLoading && (
                <Animated.View style={[styles.webViewLoaderContainer, { opacity: webViewFade }]}>
                  <LinearGradient colors={[T.ink, T.ink]} style={styles.webViewLoaderIcon}>
                    <Ionicons name="school" size={36} color={T.yellow} />
                  </LinearGradient>
                  <Text style={styles.webViewLoadingTitle}>loading university website</Text>
                  <Text style={styles.webViewLoadingSubtitle}>fetching program details...</Text>
                  <ActivityIndicator size="small" color={T.ink} style={{ marginTop: 16 }} />
                </Animated.View>
              )}

              {/* Bottom Toolbar */}
              <Animated.View style={[styles.webViewBottomBar, { opacity: webViewFade }]}>
                <TouchableOpacity style={styles.webViewToolbarBtn} onPress={closeWebView} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={24} color={T.textMuted} />
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity style={styles.webViewToolbarBtn} onPress={openInBrowser} activeOpacity={0.7}>
                  <Ionicons name="compass-outline" size={22} color={T.ink} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.webViewToolbarBtn} onPress={() => {
                  if (webViewUrl) {
                    Alert.alert(
                      'Share Link',
                      `Share this university website link: ${webViewUrl}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Copy Link', onPress: () => Alert.alert('Copied!', 'Link copied to clipboard') }
                      ]
                    );
                  }
                }} activeOpacity={0.7}>
                  <Ionicons name="share-outline" size={22} color={T.ink} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  header: {
    backgroundColor: T.ink,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: T.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: F.heading, color: T.white, letterSpacing: 0.5, textAlign: 'center' },
  headerSubtitle: { fontSize: 10, fontFamily: F.body, color: T.textFaint, textTransform: 'none', letterSpacing: 1.5, marginBottom: 2, textAlign: 'center' },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.body, color: T.ink, padding: 0 },
  guestBanner: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: T.yellowSoft, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: T.line,
  },
  guestBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  guestBannerText: { flex: 1, fontSize: 13, color: T.ink, fontFamily: F.bodyMedium, textAlign: 'center' },
  guestBannerLink: { fontFamily: F.bodyBold, textDecorationLine: 'underline' },
  content: { flex: 1, paddingHorizontal: 16 },
  filterWrapper: { paddingTop: 20, paddingBottom: 8 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterLabel: { fontSize: 14, fontFamily: F.bodyBold, color: T.ink },
  filterCount: { fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium },
  chipContainer: { paddingVertical: 4, gap: 8 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, marginRight: 10 },
  chipText: { fontFamily: F.bodySemi, fontSize: 14 },
  cardWrapper: { marginBottom: 16 },
  card: {
    backgroundColor: T.card, borderRadius: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: T.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardGradient: { height: 4, width: '100%' },
  cardBody: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleArea: { flex: 1, marginRight: 12 },
  programTitle: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink, letterSpacing: -0.3 },
  universityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  universityName: { fontSize: 14, color: T.textMuted, fontFamily: F.bodyMedium },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  locationText: { fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium },
  dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: T.sand },
  degreeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  degreeText: { fontSize: 10, fontFamily: F.bodyBold, textTransform: 'none', letterSpacing: 0.5 },
  dateContainer: {
    flexDirection: 'row', backgroundColor: T.sand,
    borderRadius: 14, padding: 14, marginTop: 14, marginBottom: 14,
  },
  dateBox: { flex: 1, alignItems: 'center' },
  dateDivider: { width: 1, backgroundColor: T.sand },
  dateLabel: { fontSize: 9, fontFamily: F.bodyBold, color: T.textFaint, marginBottom: 4, letterSpacing: 0.5 },
  dateValue: { fontSize: 13, fontFamily: F.bodyBold, color: T.ink },
  detailsBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 14, backgroundColor: T.sand, gap: 8,
  },
  detailsBtnText: { color: T.textMuted, fontFamily: F.bodyBold, fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: T.textMuted, fontFamily: F.bodyMedium },
  listContent: { paddingBottom: 30 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: T.textMuted, fontSize: 14, fontFamily: F.body, marginBottom: 24 },
  signUpButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.ink, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, gap: 10,
  },
  signUpButtonText: { color: T.white, fontFamily: F.bodyBold, fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.overlay },
  modalContent: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: T.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 20, fontFamily: F.heading, color: T.ink },
  modalDegreeBadge: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: 13 },
  modalDegreeText: { fontSize: 12, fontFamily: F.bodyBold },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center',
  },
  modalBody: { paddingBottom: 20 },
  modalProgramInfo: { marginBottom: 20 },
  modalProgramTitle: { fontSize: 22, fontFamily: F.heading, color: T.ink, marginBottom: 6 },
  modalUniversityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalUniversity: { fontSize: 15, color: T.textMuted, fontFamily: F.bodyMedium },
  modalLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  modalLocation: { fontSize: 14, fontFamily: F.body, color: T.textMuted },
  modalDuration: { fontSize: 14, fontFamily: F.body, color: T.textMuted },
  modalDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.sand },
  modalDivider: { height: 1, backgroundColor: T.sand, marginVertical: 16 },
  detailHeading: { fontSize: 13, fontFamily: F.bodyBold, color: T.textMuted, marginBottom: 10, gap: 6 },
  linkContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: T.sand, borderRadius: 12,
    borderWidth: 1, borderColor: T.line,
  },
  linkText: { flex: 1, color: T.ink, fontSize: 14, fontFamily: F.bodySemi, textDecorationLine: 'underline' },
  requirementsList: { gap: 8 },
  reqItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.sand, borderRadius: 10,
  },
  reqIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: T.successBg, justifyContent: 'center', alignItems: 'center',
  },
  reqText: { fontSize: 14, color: T.ink, fontFamily: F.bodyMedium, flex: 1 },
  emptyTextSmall: { fontSize: 14, fontFamily: F.body, color: T.textFaint, paddingVertical: 12 },
  modalDateInfo: { flexDirection: 'row', backgroundColor: T.sand, borderRadius: 14, padding: 16, marginTop: 20 },
  modalDateBox: { flex: 1, alignItems: 'center' },
  modalDateDivider: { width: 1, backgroundColor: T.sand },
  modalDateLabel: { fontSize: 12, fontFamily: F.bodyBold, color: T.textMuted, marginBottom: 4 },
  modalDateValue: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink },
  applyModalBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.yellow, height: 54, borderRadius: 27, gap: 10, marginTop: 20,
  },
  applyModalBtnText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorTitle: { fontSize: 20, fontFamily: F.headingBold, color: T.ink, marginTop: 16, marginBottom: 8 },
  errorText: { textAlign: 'center', color: T.textMuted, fontSize: 14, fontFamily: F.body, marginBottom: 24 },
  retryButton: { backgroundColor: T.ink, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  retryButtonText: { color: T.white, fontFamily: F.bodyBold, fontSize: 16 },

  // WebView Styles - FULL SCREEN
  webViewFullScreen: { flex: 1, backgroundColor: T.overlay },
  webViewContainer: {
    flex: 1, backgroundColor: T.card,
    position: 'absolute', top: 37, left: 0, right: 0, bottom: 0,
  },
  webViewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: T.line,
    backgroundColor: T.card, zIndex: 10,
  },
  webViewHeaderBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center',
  },
  webViewHeaderCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  webViewHeaderTitle: { fontSize: 16, fontFamily: F.bodyBold, color: T.ink, letterSpacing: 0.3 },
  webViewHeaderSubtitle: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyMedium, marginTop: 2, maxWidth: width * 0.6 },
  webViewProgressContainer: { height: 3, backgroundColor: T.sand, overflow: 'hidden', zIndex: 10 },
  webViewProgressBar: { height: '100%' },
  webViewProgressGradient: { width: '100%', height: '100%' },
  webViewWrapper: { flex: 1, backgroundColor: T.card },
  webView: { flex: 1 },
  webViewLoaderContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.card, zIndex: 5,
  },
  webViewLoaderIcon: {
    width: 80, height: 80, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  webViewLoadingTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink },
  webViewLoadingSubtitle: { fontSize: 13, color: T.textFaint, marginTop: 6, fontFamily: F.bodyMedium },
  webViewBottomBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: T.line,
    backgroundColor: T.card,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    zIndex: 10,
  },
  webViewToolbarBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});

export default ExchangeScreen;

// ─── Scholarships design layout ─────────────────────────────────────
const EX = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  top: { paddingHorizontal: 16 },
  lead: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted },
  guest: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: T.yellowSoft,
  },
  guestText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 13, color: T.ink },
  guestLink: { fontFamily: F.bodyBold, textDecorationLine: 'underline' },
  filterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 },
  h2: { fontFamily: F.heading, fontSize: 19, color: T.ink },
  count: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted },
  chips: { gap: 8, paddingTop: 10, paddingBottom: 12 },

  cardWrap: { marginBottom: 12 },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: F.headingBold, fontSize: 17, lineHeight: 21, color: T.ink },
  cardSub: { fontFamily: F.bodyMedium, fontSize: 13.5, color: T.textMuted, marginTop: 2 },
  cardMeta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  degreePill: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  degreeText: { fontFamily: F.bodyBold, fontSize: 12 },
  dates: { flexDirection: 'row', gap: 12, marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: T.sand },
  dateLabel: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.textMuted },
  dateValue: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink, marginTop: 2 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.lineSoft },
  cardFootText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
});
