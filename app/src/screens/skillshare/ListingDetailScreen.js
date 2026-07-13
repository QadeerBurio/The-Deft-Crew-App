// screens/ListingDetailScreen.js
import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getListingById } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { getCurrentUserId, user, isGuest, isAuthenticated } = useContext(AuthContext);
  const { id } = route.params || {};
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [existingInquiryThread, setExistingInquiryThread] = useState(null);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Use refs to prevent infinite loops
  const isFetching = useRef(false);
  const fetchCount = useRef(0);
  const isMounted = useRef(true);

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
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchListing = useCallback(async (isRefresh = false) => {
    if (isFetching.current || !isMounted.current) return;
    if (fetchCount.current > 3 && !isRefresh) {
      console.log('Too many fetch attempts, stopping');
      return;
    }

    try {
      isFetching.current = true;
      if (!isRefresh) {
        fetchCount.current += 1;
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      
      const data = await getListingById(id);
      
      if (!isMounted.current) return;
      
      setListing(data);

      const currentUserId = getCurrentUserId();
      if (data && currentUserId && data.ownerId !== currentUserId && data.status === 'open') {
        // Check for existing inquiry
        try {
          const thread = await getInquiryForListing(id, currentUserId);
          if (isMounted.current) {
            setExistingInquiryThread(thread);
          }
        } catch (err) {
          console.log('No existing inquiry found');
          if (isMounted.current) {
            setExistingInquiryThread(null);
          }
        }

        // Check for active match
        try {
          const matches = await getMyMatches(currentUserId);
          if (isMounted.current) {
            const activeMatch = matches.data?.some(
              match => match.listingId?._id === id && match.status === 'active'
            );
            setHasActiveMatch(activeMatch || false);
          }
        } catch (err) {
          console.log('Error checking matches:', err);
          if (isMounted.current) {
            setHasActiveMatch(false);
          }
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || 'Failed to load listing details');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        isFetching.current = false;
      }
    }
  }, [id, getCurrentUserId]);

  const onRefresh = useCallback(() => {
    fetchListing(true);
  }, [fetchListing]);

  useEffect(() => {
    isMounted.current = true;
    fetchCount.current = 0;
    
    if (id) {
      fetchListing();
    }

    return () => {
      isMounted.current = false;
    };
  }, [id]);

  useEffect(() => {
    let focusUnsubscribe = null;

    const handleFocus = () => {
      if (isMounted.current && id && !isFetching.current && fetchCount.current <= 3) {
        fetchListing();
      }
    };

    focusUnsubscribe = navigation.addListener('focus', handleFocus);

    return () => {
      if (focusUnsubscribe) {
        focusUnsubscribe();
      }
    };
  }, [navigation, id, fetchListing]);

  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Don't know how to open this URL");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInquiry = async () => {
    if (!inquiryText.trim()) {
      Alert.alert("Error", "Please enter your question");
      return;
    }
    
    const currentUserId = getCurrentUserId();
    if (!currentUserId || isGuest) {
      Alert.alert(
        "Login Required",
        "Please login to ask a question.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    
    setSubmittingInquiry(true);
    try {
      const result = await startInquiry(listing._id, currentUserId, inquiryText.trim());
      setModalVisible(false);
      setInquiryText('');
      
      navigation.navigate('InquiryChat', {
        threadId: result.thread._id,
        listingTitle: listing.title,
        otherParticipantId: listing.ownerId,
        listingId: listing._id
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Get user data from listing owner
  const getOwnerData = () => {
    const owner = listing?.owner || {};
    return {
      name: owner.name || owner.fullName || owner.username || 'Anonymous',
      profileImage: owner.profileImage || null,
      email: owner.email || ''
    };
  };

  const renderActionButtons = () => {
    if (!listing) return null;

    const currentUserId = getCurrentUserId();
    
    if (!currentUserId || isGuest) {
      return (
        <Animated.View style={[styles.closedContainer, { opacity: fadeAnim }]}>
          <Ionicons name="log-in-outline" size={32} color="#f9c349" />
          <Text style={styles.closedText}>Please log in to interact with this listing.</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const isOwner = listing.ownerId === currentUserId;
    const isBarter = listing.type === 'barter';

    if (isOwner) {
      const btnText = isBarter ? 'Manage Offers' : 
                      listing.type === 'job' ? 'Manage Applications' : 
                      'Manage Requests';
      return (
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ManageOffers', { 
            id: listing._id, 
            type: listing.type 
          })}
        >
          <Text style={styles.primaryButtonText}>{btnText}</Text>
        </TouchableOpacity>
      );
    }

    if (listing.status !== 'open') {
      return (
        <View style={styles.closedContainer}>
          <Ionicons name="lock-closed-outline" size={32} color="#8E8E93" />
          <Text style={styles.closedText}>This listing is no longer accepting offers.</Text>
        </View>
      );
    }

    if (hasActiveMatch) {
      return (
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            navigation.navigate('MatchChat', { 
              listingId: listing._id 
            });
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Go to Match Chat</Text>
        </TouchableOpacity>
      );
    }

    const offerBtnText = isBarter ? 'Make an Offer' : 
                         listing.type === 'job' ? 'Apply Now' : 
                         'Request to Enroll';
    
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('CreateOffer', { listing })}
        >
          <Text style={styles.primaryButtonText}>{offerBtnText}</Text>
        </TouchableOpacity>
        
        {existingInquiryThread ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('InquiryChat', {
              threadId: existingInquiryThread._id,
              listingTitle: listing.title,
              otherParticipantId: listing.ownerId,
              listingId: listing._id
            })}
          >
            <Text style={styles.secondaryButtonText}>View Questions</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              setModalVisible(true);
              Animated.spring(modalAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }).start();
            }}
          >
            <Text style={styles.secondaryButtonText}>Ask Question</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setInquiryText('');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          fetchCount.current = 0;
          fetchListing();
        }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBarter = listing.type === 'barter';
  const ownerData = getOwnerData();
  const ownerInitial = ownerData.name !== 'Anonymous' ? ownerData.name.charAt(0).toUpperCase() : 'U';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'chevron-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Listing Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f9c349"
            colors={["#f9c349"]}
          />
        }
      >
        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <View style={styles.headerRow}>
            <View style={[styles.badge, 
              isBarter ? styles.badgeBarter : 
              listing.type === 'job' ? styles.badgeJob : 
              styles.badgePaid
            ]}>
              <Text style={[styles.badgeText,
                isBarter ? styles.badgeBarterText : 
                listing.type === 'job' ? styles.badgeJobText : 
                styles.badgePaidText
              ]}>
                {isBarter ? '↔ Barter' : listing.type === 'job' ? '💼 Job' : '💰 Paid'}
              </Text>
            </View>
            <View style={[styles.statusBadge, 
              listing.status === 'open' ? styles.statusOpen : styles.statusClosed
            ]}>
              <Text style={[styles.statusText, 
                listing.status === 'open' ? styles.statusTextOpen : styles.statusTextClosed
              ]}>
                {listing.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          
         
          
          <Text style={styles.description}>{listing.description}</Text>

          {listing.type !== 'job' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skill Offered</Text>
              <View style={styles.card}>
                <View style={styles.detailRow}>
                  <Ionicons name="star-outline" size={18} color="#f9c349" />
                  <Text style={styles.detailLabel}>Skill: <Text style={styles.detailValue}>{listing.skillOffered?.skillName}</Text></Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="analytics-outline" size={18} color="#f9c349" />
                  <Text style={styles.detailLabel}>Experience: <Text style={styles.detailValue}>{listing.skillOffered?.yearsOfExperience} years</Text></Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="trending-up-outline" size={18} color="#f9c349" />
                  <Text style={styles.detailLabel}>Proficiency: <Text style={styles.detailValue}>{listing.skillOffered?.proficiencyLevel}</Text></Text>
                </View>
                
                {listing.skillOffered?.experienceDetails ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={18} color="#f9c349" />
                    <Text style={styles.detailLabel}>Details: <Text style={styles.detailValue}>{listing.skillOffered.experienceDetails}</Text></Text>
                  </View>
                ) : null}

                {listing.skillOffered?.portfolioLinks && listing.skillOffered.portfolioLinks.length > 0 && (
                  <View style={styles.linksContainer}>
                    <Text style={styles.linksTitle}>Portfolio Links:</Text>
                    {listing.skillOffered.portfolioLinks.map((link, index) => (
                      <TouchableOpacity key={index} onPress={() => handleOpenLink(link)}>
                        <Text style={styles.linkText}>• {link}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isBarter ? 'Seeking' : 
               listing.type === 'job' ? 'Requirement & Terms' : 
               'Pricing & Details'}
            </Text>
            <View style={styles.card}>
              {isBarter ? (
                <>
                  <View style={styles.detailRow}>
                    <Ionicons name="swap-horizontal-outline" size={18} color="#f9c349" />
                    <Text style={styles.detailLabel}>Wants: <Text style={styles.detailValue}>{listing.skillWanted?.skillName}</Text></Text>
                  </View>
                  {listing.skillWanted?.notes ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="chatbox-outline" size={18} color="#f9c349" />
                      <Text style={styles.detailLabel}>Notes: <Text style={styles.detailValue}>{listing.skillWanted.notes}</Text></Text>
                    </View>
                  ) : null}
                </>
              ) : listing.type === 'job' ? (
                <>
                  <View style={styles.detailRow}>
                    <Ionicons name="construct-outline" size={18} color="#f9c349" />
                    <Text style={styles.detailLabel}>Skill Needed: <Text style={styles.detailValue}>{listing.skillNeeded?.skillName}</Text></Text>
                  </View>
                  {listing.skillNeeded?.experienceLevel && (
                    <View style={styles.detailRow}>
                      <Ionicons name="bar-chart-outline" size={18} color="#f9c349" />
                      <Text style={styles.detailLabel}>Experience Level: <Text style={styles.detailValue}>{listing.skillNeeded.experienceLevel}</Text></Text>
                    </View>
                  )}
                  {listing.skillNeeded?.notes ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="chatbox-outline" size={18} color="#f9c349" />
                      <Text style={styles.detailLabel}>Notes: <Text style={styles.detailValue}>{listing.skillNeeded.notes}</Text></Text>
                    </View>
                  ) : null}
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={18} color="#34C759" />
                    <Text style={styles.detailLabel}>Budget: <Text style={[styles.detailValue, styles.budgetValue]}>${listing.budget}</Text></Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={18} color="#34C759" />
                    <Text style={styles.detailLabel}>Positions: <Text style={styles.detailValue}>{listing.positionsFilled || 0} of {listing.positionsAvailable || 1} filled</Text></Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={18} color="#34C759" />
                    <Text style={styles.detailLabel}>Price: <Text style={[styles.detailValue, styles.priceValue]}>${listing.price}</Text></Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={18} color="#34C759" />
                    <Text style={styles.detailLabel}>Duration: <Text style={styles.detailValue}>{listing.duration}</Text></Text>
                  </View>
                  {listing.syllabus ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="book-outline" size={18} color="#34C759" />
                      <Text style={styles.detailLabel}>Syllabus: <Text style={styles.detailValue}>{listing.syllabus}</Text></Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            {renderActionButtons()}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Inquiry Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ask a Question</Text>
            <Text style={styles.modalSubtitle}>
              Ask the owner about this listing
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What would you like to ask?"
              placeholderTextColor="#8E8E93"
              value={inquiryText}
              onChangeText={setInquiryText}
              multiline
              autoFocus
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={closeModal}
                disabled={submittingInquiry}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonSend, (!inquiryText.trim() || submittingInquiry) && styles.modalButtonDisabled]} 
                onPress={handleSendInquiry}
                disabled={!inquiryText.trim() || submittingInquiry}
              >
                {submittingInquiry ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop:34
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeBarter: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#f9c349',
  },
  badgePaid: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  badgeJob: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeBarterText: {
    color: '#f9c349',
  },
  badgePaidText: {
    color: '#34C759',
  },
  badgeJobText: {
    color: '#FF6B6B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#F0FFF4',
  },
  statusClosed: {
    backgroundColor: '#FFF0F0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextOpen: {
    color: '#34C759',
  },
  statusTextClosed: {
    color: '#FF3B30',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 12,
    lineHeight: 32,
  },
  ownerSection: {
    marginBottom: 16,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  ownerEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  ownerMetaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  description: {
    fontSize: 16,
    color: '#3A3A3C',
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    color: '#1C1C1E',
    fontWeight: '400',
  },
  priceValue: {
    color: '#34C759',
    fontWeight: '700',
    fontSize: 16,
  },
  budgetValue: {
    color: '#34C759',
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  linksContainer: {
    marginTop: 6,
  },
  linksTitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 2,
    paddingVertical: 2,
  },
  footer: {
    marginTop: 8,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#f9c349',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  closedContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  closedText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalButtonCancelText: {
    color: '#1C1C1E',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonSend: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f9c349',
  },
  modalButtonDisabled: {
    backgroundColor: '#F5E5C8',
  },
  modalButtonSendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});