import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { getOffersForListing, updateOfferStatus } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

export default function ManageOffersScreen({ route, navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const { id, type } = route.params;

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOffers = useCallback(async () => {
    try {
      setError(null);
      const data = await getOffersForListing(id);
      setOffers(data.offers || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleOfferAction = async (offerId, action) => {
    // Map the action to the correct status value
    const statusMap = {
      'accept': 'accepted',
      'reject': 'rejected'
    };
    const status = statusMap[action];
    
    Alert.alert(
      action === 'accept' ? 'Accept Offer' : 'Reject Offer',
      action === 'accept' 
        ? 'Accepting this offer will create a match and close the listing to other offers. Continue?'
        : 'Are you sure you want to reject this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              // Send the correct status value
              const result = await updateOfferStatus(offerId, status);
              
              Alert.alert(
                'Success',
                action === 'accept' 
                  ? 'Offer accepted! A match has been created.'
                  : 'Offer rejected successfully.'
              );
              
              if (action === 'accept') {
                navigation.goBack();
              } else {
                fetchOffers();
              }
            } catch (err) {
              const errorMsg = err.response?.data?.error || err.message || 'Failed to update offer';
              Alert.alert('Error', errorMsg);
            }
          }
        }
      ]
    );
  };

  const renderOfferItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const isBarter = item.listingId?.type === 'barter' || type === 'barter';

    return (
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <Text style={styles.offerorName}>
            {item.offerorId?.name || 'User'}
          </Text>
          <View style={[styles.statusBadge, 
            item.status === 'pending' ? styles.statusPending :
            item.status === 'accepted' ? styles.statusAccepted :
            item.status === 'rejected' ? styles.statusRejected :
            styles.statusWithdrawn
          ]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {isBarter && item.offeredSkillName && (
          <Text style={styles.offerDetail}>
            Offers: <Text style={styles.detailValue}>{item.offeredSkillName}</Text>
            {item.offeredSkillLevel && ` (${item.offeredSkillLevel})`}
          </Text>
        )}

        {item.proposedPrice && (
          <Text style={styles.offerDetail}>
            Proposed Price: <Text style={styles.detailValue}>${item.proposedPrice}</Text>
          </Text>
        )}

        {item.applicationNotes && (
          <Text style={styles.offerDetail}>
            Notes: <Text style={styles.detailValue}>{item.applicationNotes}</Text>
          </Text>
        )}

        {item.message && (
          <Text style={styles.messageText}>{item.message}</Text>
        )}

        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleOfferAction(item._id, 'accept')}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleOfferAction(item._id, 'reject')}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOffers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Offers</Text>
        <Text style={styles.headerSubtitle}>
          {offers.length} offer{offers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => item._id}
        renderItem={renderOfferItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No offers yet</Text>
            <Text style={styles.emptySubtext}>Check back later for offers on your listing</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusAccepted: {
    backgroundColor: '#D4EDDA',
  },
  statusRejected: {
    backgroundColor: '#F8D7DA',
  },
  statusWithdrawn: {
    backgroundColor: '#E5E5EA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  offerDetail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    color: '#1C1C1E',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 14,
    color: '#3A3A3C',
    marginVertical: 8,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});