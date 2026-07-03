// screens/ChatHistoryScreen.js
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ChatContext } from '../context/ChatContext';
import aiService from '../services/aiService';

const ChatHistoryScreen = () => {
  const navigation = useNavigation();
  const {
    sessions,
    loadSessions,
    loadSessionDetails,
    deleteSession,
  } = useContext(ChatContext);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadSessions().finally(() => setLoading(false));
  }, [loadSessions]);

  useEffect(() => {
    loadSessions(search);
  }, [search, loadSessions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions(search);
    setRefreshing(false);
  };

  const handleSelectSession = async (sessionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadSessionDetails(sessionId);
    navigation.goBack();
  };

  const handleTogglePin = async (sessionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await aiService.togglePinSession(sessionId);
      await loadSessions(search);
    } catch (err) {
      console.error('Failed to toggle pin:', err.message);
    }
  };

  const handleDeleteSession = (sessionId, title) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    return (
      <View style={[styles.sessionItem, item.pinned && styles.pinnedItem]}>
        <TouchableOpacity
          onPress={() => handleSelectSession(item.sessionId)}
          style={styles.sessionInfo}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubbles-outline" size={20} color="#111111" />
          </View>
          <View style={styles.textWrapper}>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.sessionTime}>
              {new Date(item.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionControls}>
          <TouchableOpacity
            onPress={() => handleTogglePin(item.sessionId)}
            style={styles.controlBtn}
          >
            <Ionicons
              name={item.pinned ? 'pin' : 'pin-outline'}
              size={18}
              color={item.pinned ? '#f9c349' : '#888888'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteSession(item.sessionId, item.title)}
            style={styles.controlBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Panel */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#888888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversation titles..."
          placeholderTextColor="#888888"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Sessions History List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={50} color="#cccccc" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Conversations found</Text>
              <Text style={styles.emptySubtitle}>
                Your active chat histories will be listed here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  pinnedItem: {
    borderColor: '#f9c349',
    backgroundColor: '#fffdf4',
  },
  sessionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  sessionTime: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  actionControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
});

export default ChatHistoryScreen;
