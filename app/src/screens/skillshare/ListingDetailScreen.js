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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const slideAnim = useRef(new Animated.Value(40)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const floatingY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  const floating = floatingY.interpolate({
    inputRange: [-8, 8],
    outputRange: [-8, 8],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Use refs to prevent infinite loops
  const isFetching = useRef(false);
  const fetchCount = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, {
          toValue: 8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingY, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Card animations
    const cardAnimations = [
      { anim: card1Anim, delay: 200 },
      { anim: card2Anim, delay: 400 },
      { anim: card3Anim, delay: 600 }
    ];

    cardAnimations.forEach(({ anim, delay }) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }).start();
    });
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

  const getOwnerData = () => {
    const owner = listing?.owner || {};
    return {
      name: owner.name || owner.fullName || owner.username || 'Anonymous',
      profileImage: owner.profileImage || null,
      email: owner.email || ''
    };
  };

  const getTypeColor = () => {
    if (listing?.type === 'barter') return '#f9c349';
    if (listing?.type === 'job') return '#FF6B6B';
    return '#34C759';
  };

  const getTypeGradient = () => {
    if (listing?.type === 'barter') return ['#f9c349', '#f5a623'];
    if (listing?.type === 'job') return ['#FF6B6B', '#EE5A24'];
    return ['#34C759', '#28A745'];
  };

  const getTypeIcon = () => {
    if (listing?.type === 'barter') return 'swap-horizontal';
    if (listing?.type === 'job') return 'briefcase';
    return 'cash';
  };

  const renderAnimatedCard = (anim, children) => (
    <Animated.View
      style={[
        styles.animatedCard,
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.92, 1.02, 1]
              })
            },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );

  const renderActionButtons = () => {
    if (!listing) return null;

    const currentUserId = getCurrentUserId();
    
    if (!currentUserId || isGuest) {
      return (
        <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.actionCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="log-in" size={32} color="#f9c349" />
            <Text style={styles.actionTitle}>Sign in to interact</Text>
            <Text style={styles.actionSubtitle}>Login to ask questions or make offers</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.primaryButtonText}>Login Now</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
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
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="settings" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{btnText}</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    if (listing.status !== 'open') {
      return (
        <View style={styles.closedContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.closedCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="lock-closed" size={32} color="#8E8E93" />
            <Text style={styles.closedTitle}>Listing Closed</Text>
            <Text style={styles.closedSubtitle}>This listing is no longer accepting offers.</Text>
          </LinearGradient>
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
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#34C759', '#28A745']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Chat Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    const offerBtnText = isBarter ? 'Make Offer' : 
                         listing.type === 'job' ? 'Apply Now' : 
                         'Enroll Now';
    
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton, { flex: 1.5 }]}
          onPress={() => navigation.navigate('CreateOffer', { listing })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={getTypeGradient()}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{offerBtnText}</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {existingInquiryThread ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
            onPress={() => navigation.navigate('InquiryChat', {
              threadId: existingInquiryThread._id,
              listingTitle: listing.title,
              otherParticipantId: listing.ownerId,
              listingId: listing._id
            })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble" size={18} color="#1C1C1E" />
            <Text style={styles.secondaryButtonText}>Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
            onPress={() => {
              setModalVisible(true);
              Animated.spring(modalAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }).start();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle" size={18} color="#1C1C1E" />
            <Text style={styles.secondaryButtonText}>Ask</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <Ionicons name="alert-circle" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          fetchCount.current = 0;
          fetchListing();
        }}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBarter = listing.type === 'barter';
  const ownerData = getOwnerData();
  const ownerInitial = ownerData.name !== 'Anonymous' ? ownerData.name.charAt(0).toUpperCase() : 'U';
  const typeColor = getTypeColor();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
      
      {/* Background Decoration */}
      <View style={styles.bgDecorations}>
        <Animated.View style={[styles.bgOrb, styles.bgOrb1, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.bgOrb, styles.bgOrb2, { transform: [{ translateY: floating }] }]} />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-15, 0]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Details</Text>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-outline" size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

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
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Status & Type Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
              <Ionicons name={getTypeIcon()} size={16} color={typeColor} />
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {isBarter ? 'Exchange' : listing.type === 'job' ? 'Job' : 'Paid'}
              </Text>
            </View>
            <View style={[styles.statusBadge, 
              listing.status === 'open' ? styles.statusOpen : styles.statusClosed
            ]}>
              <View style={[styles.statusDot, 
                listing.status === 'open' ? styles.statusDotOpen : styles.statusDotClosed
              ]} />
              <Text style={[styles.statusText, 
                listing.status === 'open' ? styles.statusTextOpen : styles.statusTextClosed
              ]}>
                {listing.status === 'open' ? 'Active' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Owner Card */}
          {renderAnimatedCard(card1Anim, (
            <View style={styles.ownerCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FAFBFF']}
                style={styles.ownerCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.ownerAvatarContainer}>
                  {ownerData.profileImage ? (
                    <Image source={{ uri: ownerData.profileImage }} style={styles.ownerAvatar} />
                  ) : (
                    <LinearGradient
                      colors={['#f9c349', '#f5a623']}
                      style={styles.ownerAvatar}
                    >
                      <Text style={styles.ownerAvatarText}>{ownerInitial}</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.ownerStatusDot} />
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{ownerData.name}</Text>
                  <View style={styles.ownerMeta}>
                    <Ionicons name="time" size={12} color="#8E8E93" />
                    <Text style={styles.ownerMetaText}>Posted {timeAgo(listing.createdAt)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ))}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Details Card */}
          {listing.type !== 'job' && renderAnimatedCard(card2Anim, (
            <View style={styles.detailCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FFFDF5']}
                style={styles.detailCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.detailHeader}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="star" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.detailTitle}>Skill Offered</Text>
                </View>
                
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Skill</Text>
                    <Text style={styles.detailValue}>{listing.skillOffered?.skillName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Experience</Text>
                    <Text style={styles.detailValue}>{listing.skillOffered?.yearsOfExperience} years</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Level</Text>
                    <View style={[styles.levelBadge, { backgroundColor: typeColor + '15' }]}>
                      <Text style={[styles.levelBadgeText, { color: typeColor }]}>
                        {listing.skillOffered?.proficiencyLevel}
                      </Text>
                    </View>
                  </View>
                </View>

                {listing.skillOffered?.experienceDetails && (
                  <View style={styles.experienceContainer}>
                    <Text style={styles.experienceLabel}>Experience Details</Text>
                    <Text style={styles.experienceText}>{listing.skillOffered.experienceDetails}</Text>
                  </View>
                )}

                {listing.skillOffered?.portfolioLinks?.length > 0 && (
                  <View style={styles.portfolioContainer}>
                    <Text style={styles.portfolioLabel}>Portfolio</Text>
                    {listing.skillOffered.portfolioLinks.map((link, index) => (
                      <TouchableOpacity key={index} onPress={() => handleOpenLink(link)}>
                        <Text style={styles.portfolioLink}>• {link}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </View>
          ))}

          {/* Requirements Card */}
          {renderAnimatedCard(card3Anim, (
            <View style={styles.detailCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FAFBFF']}
                style={styles.detailCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.detailHeader}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name={isBarter ? 'swap-horizontal' : listing.type === 'job' ? 'briefcase' : 'cash'} size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.detailTitle}>
                    {isBarter ? 'Skill Wanted' : listing.type === 'job' ? 'Job Details' : 'Pricing'}
                  </Text>
                </View>

                {isBarter ? (
                  <>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Skill</Text>
                        <Text style={styles.detailValue}>{listing.skillWanted?.skillName}</Text>
                      </View>
                    </View>
                    {listing.skillWanted?.notes && (
                      <View style={styles.experienceContainer}>
                        <Text style={styles.experienceLabel}>Notes</Text>
                        <Text style={styles.experienceText}>{listing.skillWanted.notes}</Text>
                      </View>
                    )}
                  </>
                ) : listing.type === 'job' ? (
                  <>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Skill</Text>
                        <Text style={styles.detailValue}>{listing.skillNeeded?.skillName}</Text>
                      </View>
                      {listing.skillNeeded?.experienceLevel && (
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Level</Text>
                          <Text style={styles.detailValue}>{listing.skillNeeded.experienceLevel}</Text>
                        </View>
                      )}
                    </View>
                    {listing.skillNeeded?.notes && (
                      <View style={styles.experienceContainer}>
                        <Text style={styles.experienceLabel}>Notes</Text>
                        <Text style={styles.experienceText}>{listing.skillNeeded.notes}</Text>
                      </View>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.compensationRow}>
                      <View style={styles.compensationItem}>
                        <Text style={styles.compensationLabel}>Budget</Text>
                        <Text style={styles.compensationValue}>${listing.budget}</Text>
                      </View>
                      <View style={styles.compensationDivider} />
                      <View style={styles.compensationItem}>
                        <Text style={styles.compensationLabel}>Positions</Text>
                        <Text style={styles.compensationValue}>{listing.positionsFilled || 0}/{listing.positionsAvailable || 1}</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Price</Text>
                        <Text style={[styles.detailValue, styles.priceHighlight]}>${listing.price}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{listing.duration}</Text>
                      </View>
                    </View>
                    {listing.syllabus && (
                      <View style={styles.experienceContainer}>
                        <Text style={styles.experienceLabel}>Roadmap</Text>
                        <Text style={styles.experienceText}>{listing.syllabus}</Text>
                      </View>
                    )}
                  </>
                )}
              </LinearGradient>
            </View>
          ))}

          {/* Action Buttons */}
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
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FC']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ask Question</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Ask the owner about this listing</Text>
              <View style={styles.modalInputContainer}>
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
              </View>
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
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.modalButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {submittingInquiry ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonSendText}>Send</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  bgDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.03,
  },
  bgOrb1: {
    width: 200,
    height: 200,
    top: -80,
    right: -80,
    backgroundColor: '#f9c349',
  },
  bgOrb2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -50,
    backgroundColor: '#34C759',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 80,
  },
  mainContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusOpen: {
    backgroundColor: '#F0FFF4',
  },
  statusClosed: {
    backgroundColor: '#FFF0F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: '#34C759',
  },
  statusDotClosed: {
    backgroundColor: '#FF3B30',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 14,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  animatedCard: {
    marginBottom: 12,
  },
  ownerCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  ownerCardGradient: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatarContainer: {
    position: 'relative',
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  ownerStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ownerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
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
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  description: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 22,
  },
  detailCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  detailCardGradient: {
    padding: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FC',
    padding: 10,
    borderRadius: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  priceHighlight: {
    color: '#34C759',
    fontSize: 16,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  experienceContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
  },
  experienceLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  experienceText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  portfolioContainer: {
    marginTop: 10,
  },
  portfolioLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  portfolioLink: {
    fontSize: 13,
    color: '#007AFF',
    textDecorationLine: 'underline',
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  compensationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    padding: 10,
  },
  compensationItem: {
    flex: 1,
    alignItems: 'center',
  },
  compensationLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  compensationValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '700',
    marginTop: 2,
  },
  compensationDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
  },
  footer: {
    marginTop: 4,
  },
  actionContainer: {
    marginTop: 8,
  },
  actionCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  closedContainer: {
    marginTop: 8,
  },
  closedCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  closedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
  },
  closedSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  modalInputContainer: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  modalInput: {
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#1C1C1E',
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
    backgroundColor: '#F8F9FC',
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonSendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});