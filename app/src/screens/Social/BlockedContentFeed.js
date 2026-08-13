// This is a wrapper that filters out blocked users' content
// Add this to your feed fetching logic

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function BlockedContentFeed() {
  const { token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (refresh = false) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/feed`, config);

      // The backend already filters out blocked users' content
      setPosts(response.data.posts || []);
      setHasMore(response.data.hasMore || false);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No posts to show</Text>
        <Text style={styles.emptySubtext}>
          Follow or connect with more people to see their posts.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
});