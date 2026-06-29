import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Linking,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from "../api/api";

const { width, height } = Dimensions.get('window');

const ExchangeScreen = ({ navigation }) => {
  const { token, isGuest, logout } = useContext(AuthContext);

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState('Bachelors');
  const [searchQuery, setSearchQuery] = useState('');

  // Details Modal State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const degrees = ['Bachelors', 'Masters', 'PhD'];

  const getDegreeStyle = (degree) => {
    switch (degree) {
      case 'Masters': return { color: '#C0392B', bg: '#FDE8E8' };
      case 'PhD': return { color: '#D4AF37', bg: '#FDF5E6' };
      default: return { color: '#1B1B1B', bg: '#E8E8E8' };
    }
  };

  // Entrance animation
  useEffect(() => {
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
      })
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

  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and explore study abroad opportunities!`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Sign Up',
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/admin/exchange/all');
      const activePrograms = response.data.filter(p => p.active === true);
      setPrograms(activePrograms);
    } catch (err) {
      if (err.response?.status === 401 && !isGuest) {
        Alert.alert("Session Expired", "Please login again to continue.");
        logout();
      } else if (!isGuest) {
        console.log('Error fetching programs:', err.message);
      }
      setPrograms([]);
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
    return programs.filter(p => {
      const matchesDegree = p.degree === selectedDegree;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(query) ||
        p.university.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query);
      return matchesDegree && matchesSearch;
    });
  }, [selectedDegree, searchQuery, programs]);

  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setDetailsVisible(true);
  };

  const handleApplyNow = (program) => {
    if (isGuest) {
      showGuestAlert('apply for programs');
      return;
    }
    navigation.navigate('ApplicationForm', { program });
  };

  const handleProfile = () => {
    if (isGuest) {
      showGuestAlert('view profile');
      return;
    }
    navigation.navigate('Profile');
  };

  // Card Item Component with Animation
  const CardItem = ({ item, index }) => {
    const { color, bg } = getDegreeStyle(item.degree);
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: index * 80,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 80,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleViewDetails(item)}
        >
          <View style={styles.card}>
            <View style={[styles.cardGradient, { backgroundColor: color }]} />

            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={styles.titleArea}>
                  <Text style={styles.programTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.universityRow}>
                    <FontAwesome5 name="university" size={12} color="#6B7280" />
                    <Text style={styles.universityName} numberOfLines={1}>
                      {item.university}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{item.location}</Text>
                    <View style={styles.dotSeparator} />
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{item.duration}</Text>
                  </View>
                </View>
                <View style={[styles.degreeBadge, { backgroundColor: bg, borderColor: color }]}>
                  <Text style={[styles.degreeText, { color: color }]}>{item.degree}</Text>
                </View>
              </View>

              <View style={styles.dateContainer}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateLabel}>
                    <FontAwesome5 name="calendar-alt" size={10} color="#9CA3AF" /> OPENS
                  </Text>
                  <Text style={styles.dateValue}>{item.appStart}</Text>
                </View>
                <View style={styles.dateDivider} />
                <View style={styles.dateBox}>
                  <Text style={[styles.dateLabel, { color: '#EF4444' }]}>
                    <FontAwesome5 name="clock" size={10} color="#EF4444" /> DEADLINE
                  </Text>
                  <Text style={[styles.dateValue, { color: '#EF4444' }]}>{item.deadline}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.detailsBtn]}
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsBtnText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }) => {
    return <CardItem item={item} index={index} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Modern Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>🌍 International Hub</Text>
            <Text style={styles.headerTitle}>Study Abroad</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={handleProfile}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="user-graduate" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search universities, countries..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Guest Banner */}
      {isGuest && (
        <Animated.View
          style={[
            styles.guestBanner,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.guestBannerContent}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.guestBannerText}>
              Browsing as guest. <Text style={styles.guestBannerLink}>Sign in</Text> to apply!
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.filterWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>🎯 Degree Level</Text>
            <Text style={styles.filterCount}>{filteredPrograms.length} programs</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {degrees.map((degree) => {
              const isActive = selectedDegree === degree;
              const { color, bg } = getDegreeStyle(degree);
              return (
                <TouchableOpacity
                  key={degree}
                  onPress={() => setSelectedDegree(degree)}
                  style={[
                    styles.chip,
                    isActive ? { backgroundColor: color, borderColor: color } : { backgroundColor: '#FFF', borderColor: '#E5E7EB' }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive ? { color: '#FFF' } : { color: '#4B5563' }
                    ]}
                  >
                    {degree}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B1B1B" />
            <Text style={styles.loadingText}>Loading programs...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPrograms}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1B1B1B"
                colors={['#1B1B1B']}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <FontAwesome5 name="search-location" size={50} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>No programs found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search or filters
                </Text>
                {isGuest && (
                  <TouchableOpacity
                    style={styles.signUpButton}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </TouchableOpacity>
                )}
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
            style={[
              styles.modalContent,
              { transform: [{ translateY: modalAnim }] }
            ]}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Program Details</Text>
                {selectedProgram && (
                  <View style={[styles.modalDegreeBadge, { backgroundColor: getDegreeStyle(selectedProgram.degree).bg, borderColor: getDegreeStyle(selectedProgram.degree).color }]}>
                    <Text style={[styles.modalDegreeText, { color: getDegreeStyle(selectedProgram.degree).color }]}>
                      {selectedProgram.degree}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              {selectedProgram && (
                <>
                  <View style={styles.modalProgramInfo}>
                    <Text style={styles.modalProgramTitle}>{selectedProgram.title}</Text>
                    <View style={styles.modalUniversityRow}>
                      <FontAwesome5 name="university" size={14} color="#6B7280" />
                      <Text style={styles.modalUniversity}>{selectedProgram.university}</Text>
                    </View>
                    <View style={styles.modalLocationRow}>
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text style={styles.modalLocation}>{selectedProgram.location}</Text>
                      <View style={styles.modalDot} />
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.modalDuration}>{selectedProgram.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDivider} />

                  <Text style={styles.detailHeading}>
                    <Ionicons name="globe-outline" size={16} color="#6B7280" /> University Website
                  </Text>
                  <TouchableOpacity
                    onPress={() => selectedProgram?.link && Linking.openURL(selectedProgram.link)}
                    style={styles.linkContainer}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkText} numberOfLines={1}>
                      {selectedProgram?.link || 'No link provided'}
                    </Text>
                    <Ionicons name="open-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>

                  <Text style={[styles.detailHeading, { marginTop: 24 }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#6B7280" /> Requirements
                  </Text>
                  {selectedProgram?.requirements && selectedProgram.requirements.length > 0 ? (
                    <View style={styles.requirementsList}>
                      {selectedProgram.requirements.map((req, index) => (
                        <View key={index} style={styles.reqItem}>
                          <View style={styles.reqIcon}>
                            <Ionicons name="checkmark" size={12} color="#10B981" />
                          </View>
                          <Text style={styles.reqText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyTextSmall}>
                      No specific requirements listed.
                    </Text>
                  )}

                  <View style={styles.modalDateInfo}>
                    <View style={styles.modalDateBox}>
                      <Text style={styles.modalDateLabel}>Application Opens</Text>
                      <Text style={styles.modalDateValue}>{selectedProgram.appStart}</Text>
                    </View>
                    <View style={styles.modalDateDivider} />
                    <View style={styles.modalDateBox}>
                      <Text style={[styles.modalDateLabel, { color: '#EF4444' }]}>Deadline</Text>
                      <Text style={[styles.modalDateValue, { color: '#EF4444' }]}>{selectedProgram.deadline}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Apply Button in Modal */}
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
                {isGuest ? 'Sign Up to Apply' : 'Apply Now'}
              </Text>
              <Ionicons
                name={isGuest ? 'person-add-outline' : 'arrow-forward'}
                size={20}
                color="#FFF"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Header
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1C1E',
    padding: 0,
  },
  // Guest Banner
  guestBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F59E0B20',
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  guestBannerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterWrapper: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    marginRight: 10,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  // Cards
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    height: 4,
    width: '100%',
  },
  cardBody: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  programTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1E',
    letterSpacing: -0.3,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  universityName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  degreeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  degreeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailsBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  detailsBtnText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 30,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 24,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  signUpButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalDegreeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalDegreeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingBottom: 20,
  },
  modalProgramInfo: {
    marginBottom: 20,
  },
  modalProgramTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  modalUniversityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalUniversity: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  modalLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  detailHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 10,
    gap: 6,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkText: {
    flex: 1,
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  requirementsList: {
    gap: 8,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  reqIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reqText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  emptyTextSmall: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 12,
  },
  modalDateInfo: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  modalDateBox: {
    flex: 1,
    alignItems: 'center',
  },
  modalDateDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  modalDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalDateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  applyModalBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 20,
  },
  applyModalBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default ExchangeScreen;