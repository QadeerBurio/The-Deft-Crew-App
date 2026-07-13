// screens/MyInquiriesScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import { getMyInquiries } from '../../api/api';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Create a separate component for Inquiry Item with animations
const InquiryItem = React.memo(({ item, index, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(itemSlideAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const isActive = item.status === 'active';
  const listing = item.listingId || {};
  
  const getStatusColor = () => {
    if (isActive) return '#34C759';
    return '#8E8E93';
  };

  const getStatusIcon = () => {
    if (isActive) return 'chatbubble-ellipses-outline';
    return 'checkmark-done-outline';
  };

  const getStatusLabel = () => {
    if (isActive) return 'Active';
    return 'Resolved';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFFFFF', isActive ? '#FFF8F0' : '#FFFFFF']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.inquiryHeader}>
            <View style={styles.inquiryTitleContainer}>
              <Text style={styles.inquiryTitle} numberOfLines={1}>
                {listing.title || 'Untitled Listing'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
                <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusLabel()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.listingTypeContainer}>
            <View style={styles.typeBadge}>
              <Ionicons name="document-text-outline" size={12} color="#8E8E93" />
              <Text style={styles.listingType}>
                {listing.type ? listing.type.charAt(0).toUpperCase() + listing.type.slice(1) : 'Listing'}
              </Text>
            </View>
          </View>

          <View style={styles.inquiryDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.inquiryInfo}>
                Started: <Text style={styles.inquiryInfoValue}>{timeAgo(item.createdAt)}</Text>
              </Text>
            </View>

            {item.lastMessage && (
              <View style={styles.messageContainer}>
                <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {item.lastMessage}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#f9c349', '#f7b731']}
              style={styles.chatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MyInquiriesScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const userId = getCurrentUserId();

  useEffect(() => {
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

  const fetchInquiries = useCallback(async () => {
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMyInquiries();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isGuest]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInquiries();
  };

  const handleInquiryPress = (item) => {
    const listing = item.listingId || {};
    navigation.navigate('InquiryChat', {
      threadId: item.conversationId,
      listingTitle: listing.title || 'Inquiry',
      otherParticipantId: listing.ownerId,
      listingId: listing._id
    });
  };

  const getStatusCounts = () => {
    const active = inquiries.filter(i => i.status === 'active').length;
    const resolved = inquiries.filter(i => i.status === 'resolved').length;
    return { active, resolved, total: inquiries.length };
  };

  const counts = getStatusCounts();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your inquiries...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="person-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptySubtext}>Login to see your inquiries</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <LinearGradient
            colors={['#f9c349', '#f7b731']}
            style={styles.loginGradient}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Modern Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>My Inquiries</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Stats Cards */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={[styles.statCard, styles.statCardTotal]}
          >
            <Text style={styles.statNumber}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total Inquiries</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#F0FFF4']}
            style={[styles.statCard, styles.statCardActive]}
          >
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{counts.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F0FF']}
            style={[styles.statCard, styles.statCardResolved]}
          >
            <Text style={[styles.statNumber, { color: '#AF52DE' }]}>{counts.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#FFF8F0']}
            style={[styles.statCard, styles.statCardBrowse]}
          >
            <TouchableOpacity
              style={styles.statCardButton}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <Ionicons name="search-outline" size={32} color="#f9c349" />
              <Text style={styles.statCardButtonText}>Browse Listings</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Inquiries List */}
      <Animated.View 
        style={[
          styles.listContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <FlatList
          data={inquiries}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <InquiryItem 
              item={item} 
              index={index} 
              onPress={handleInquiryPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#f9c349"
              colors={["#f9c349"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f7b73120']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="chatbubbles-outline" size={64} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
              <Text style={styles.emptySubtext}>
                Browse listings and ask questions to start a conversation
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <LinearGradient
                  colors={['#f9c349', '#f7b731']}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Browse Listings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
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
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTotal: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statCardActive: {
    borderWidth: 1,
    borderColor: '#34C75930',
  },
  statCardResolved: {
    borderWidth: 1,
    borderColor: '#AF52DE30',
  },
  statCardBrowse: {
    borderWidth: 1,
    borderColor: '#f9c34930',
    paddingVertical: 10,
  },
  statCardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statCardButtonText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
    marginTop: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  inquiryCard: {
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  inquiryHeader: {
    marginBottom: 8,
  },
  inquiryTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inquiryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listingTypeContainer: {
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingType: {
    fontSize: 13,
    color: '#8E8E93',
  },
  inquiryDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inquiryInfo: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inquiryInfoValue: {
    color: '#1C1C1E',
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: '#3A3A3C',
    lineHeight: 20,
    flex: 1,
  },
  chatButton: {
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});