import React, { useState, useEffect, useContext, useCallback } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
   StatusBar, Platform, ActivityIndicator, TextInput 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import StoriesSection from "./StoriesSection";
import io from "socket.io-client";

const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { token, user: currentUser } = useContext(AuthContext);
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [])
  );

  useEffect(() => {
  socket.on('inbox_update', () => {
    fetchInbox(); // Refresh the list when a new message arrives anywhere
  });

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

  const renderChatItem = ({ item }) => {
    // 1. Get the recipient's full profile
    const otherUser = item.participants.find(p => p._id !== currentUser._id);
    const recipientName = otherUser?.name || "User";
    
    return (
      <TouchableOpacity 
        style={styles.chatCard} 
        onPress={() => navigation.navigate('ChatDetailScreen', { 
          conversationId: item._id, 
          recipient: otherUser 
        })}
      >
        {/* Profile Image Section */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarCircle, { backgroundColor: '#F0F5FF' }]}>
            {otherUser?.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.profileImg} />
            ) : (
              <Text style={styles.avatarInitial}>{recipientName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          {otherUser?.online && <View style={styles.onlineIndicator} />}
        </View>

        {/* Info Section */}
        <View style={styles.chatContent}>
          <View style={styles.chatRow}>
            <Text style={styles.chatName} numberOfLines={1}>{recipientName}</Text>
            <Text style={styles.chatTime}>
              {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          

          <View style={styles.lastMsgRow}>
             <Text style={styles.chatMessage} numberOfLines={1}>
                {item.lastMessage || "No messages yet"}
             </Text>
            
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>Messages</Text>
        
      </View>

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
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6C63FF" size="large" /></View>
      ) : (
        <FlatList
          data={conversations.filter(c => 
            c.participants.some(p => p.name?.toLowerCase().includes(search.toLowerCase()))
          )}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          ListHeaderComponent={<StoriesSection />}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'android' ? 10 : 10 
  },
  mainTitle: { fontSize: 28, fontWeight: "900", color: "#1A1A1A" },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchInner: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F7FB", paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1A1A1A' },
  chatCard: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarCircle: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  profileImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 22, fontWeight: 'bold', color: '#6C63FF' },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFF' },
  chatContent: { flex: 1, marginLeft: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  chatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  chatTime: { fontSize: 11, color: '#AAA' },
  headlineText: { fontSize: 13, color: '#6C63FF', fontWeight: '600', marginTop: 1 }, // Computer Systems Engineer
  lastMsgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  chatMessage: { fontSize: 14, color: '#777', flex: 1 },
  locationTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EEFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  locationText: { fontSize: 10, color: '#6C63FF', marginLeft: 2, fontWeight: 'bold' }
});