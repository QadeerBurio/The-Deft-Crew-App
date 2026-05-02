import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
  StatusBar, Platform, ActivityIndicator, TextInput, Animated 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import StoriesSection from "./StoriesSection";
import io from "socket.io-client";

const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// ✅ Skeleton component (top-level component)
const MessagesSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
          <View style={styles.skeletonContent}>
            <Animated.View style={[styles.skeletonLine, { width: '50%', height: 14, opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: '80%', height: 10, marginTop: 6, opacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ✅ ChatItem component (separate top-level component)
const ChatItem = React.memo(({ item, currentUser, navigation, index }) => {
  const otherUser = item.participants.find(p => p._id !== currentUser?._id);
  const recipientName = otherUser?.name || "User";
  const itemFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemFade, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const getTimeString = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInSeconds < 604800) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Animated.View style={{ 
      opacity: itemFade, 
      transform: [{ translateY: itemFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
    }}>
      <TouchableOpacity 
        style={styles.chatCard} 
        onPress={() => navigation.navigate('ChatDetailScreen', { 
          conversationId: item._id, 
          recipient: otherUser 
        })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <LinearGradient 
            colors={otherUser?.online ? ['#4CAF50', '#2E7D32'] : ['#f9c349', '#1a1a1a']} 
            style={styles.avatarBorder}
          >
            <View style={styles.avatarCircle}>
              {otherUser?.profileImage ? (
                <Image source={{ uri: otherUser.profileImage }} style={styles.profileImg} />
              ) : (
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{recipientName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
          {otherUser?.online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatRow}>
            <Text style={styles.chatName} numberOfLines={1}>{recipientName}</Text>
            <Text style={styles.chatTime}>{getTimeString(item.updatedAt)}</Text>
          </View>
          <View style={styles.lastMsgRow}>
            <Text style={styles.chatMessage} numberOfLines={1}>
              {item.lastMessage || "Start a conversation..."}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { token, user: currentUser } = useContext(AuthContext);
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [])
  );

  useEffect(() => {
    socket.on('inbox_update', () => fetchInbox());
    return () => socket.off('inbox_update');
  }, []);

  const fetchInbox = async () => {
    try {
      const res = await axios.get(`${API_URL}/inbox`, config);
      setConversations(res.data);
    } catch (err) {
      console.error("Inbox fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.participants.some(p => 
      p._id !== currentUser?._id && 
      p.name?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.mainHeader, { opacity: headerFade }]}>
        <View style={styles.headerTop}>
          
          <Text style={styles.logoText}>Messages</Text>
        </View>
        
      </Animated.View>

      {/* Search */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInner}>
            <Ionicons name="search-outline" size={18} color="#999" />
            <TextInput 
              placeholder="Search messages..." 
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#999"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <MessagesSkeleton />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <ChatItem 
              item={item} 
              currentUser={currentUser} 
              navigation={navigation} 
              index={index} 
            />
          )}
          ListHeaderComponent={<StoriesSection />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={50} color="#ccc" />
              </View>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>Connect with people to start chatting!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Skeleton
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 100 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#e8e8e8', marginRight: 14 },
  skeletonContent: { flex: 1 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  
  // Header
  mainHeader: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15, padding:5 },
  logoText: { fontSize: 29, fontWeight: '900', color: '#1a1a1a' },
  mainTitle: { fontSize: 16, fontWeight: '700', color: '#666' },
  newMessageBtn: { borderRadius: 12, overflow: 'hidden', elevation: 5 },
  newMessageGradient: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  // Search
  searchContainer: { paddingHorizontal: 14, marginBottom: 10 },
  searchInner: { 
    flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8", 
    paddingHorizontal: 14, borderRadius: 14, height: 44, borderWidth: 2, borderColor: '#f0f0f0' 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  
  // List
  listContent: { paddingBottom: 30 },
  
  // Chat Card
  chatCard: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatarBorder: { 
    width: 58, height: 58, borderRadius: 20, padding: 2, justifyContent: 'center', alignItems: 'center' 
  },
  avatarCircle: { 
    width: 52, height: 52, borderRadius: 18, overflow: 'hidden', 
    borderWidth: 2, borderColor: '#fff', backgroundColor: '#f8f8f8' 
  },
  profileImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
  onlineDot: { 
    position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, 
    borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2.5, borderColor: '#fff' 
  },
  
  // Content
  chatContent: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingBottom: 12 },
  chatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  chatTime: { fontSize: 11, color: '#999', fontWeight: '500', marginLeft: 8 },
  lastMsgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  chatMessage: { fontSize: 13, color: '#999', flex: 1, fontWeight: '500' },
  unreadBadge: { 
    backgroundColor: '#f9c349', minWidth: 22, height: 22, borderRadius: 11, 
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7, marginLeft: 8 
  },
  unreadText: { color: '#1a1a1a', fontSize: 11, fontWeight: '800' },
  
  // Empty
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconCircle: { 
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16 
  },
  emptyText: { color: '#999', fontSize: 16, fontWeight: '700' },
  emptySubText: { color: '#ccc', fontSize: 13, marginTop: 6, fontWeight: '500' },
});

