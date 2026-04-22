import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  FlatList, Dimensions, Platform, StatusBar, ImageBackground, 
  ActivityIndicator, Alert, Share, BackHandler, RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function UserProfile({ route, navigation }) {
  const { userId } = route.params || {}; 
  const { user: currentUser, token, setUnreadCount } = useContext(AuthContext);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');
  const [connectionStatus, setConnectionStatus] = useState("none");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState([]);

  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetId = userId || currentUser?._id;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [targetId])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/profile/${targetId}`, config);
      setProfileData(res.data.profile);
      setUserPosts(res.data.posts || []);
      
      if (!isOwnProfile && res.data.profile) {
        // Check connection status properly
        const isConnected = res.data.profile.connections?.some(conn => conn._id === currentUser._id);
        const isRequestSent = currentUser.sentRequests?.includes(targetId);
        const isRequestReceived = currentUser.receivedRequests?.includes(targetId);
        
        if (isConnected) {
          setConnectionStatus("connected");
        } else if (isRequestSent) {
          setConnectionStatus("pending");
        } else if (isRequestReceived) {
          setConnectionStatus("received");
        } else {
          setConnectionStatus("none");
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleConnect = async () => {
    try {
      setIsActionLoading(true);
      const res = await axios.post(`${API_URL}/user/connect/${targetId}`, {}, config);
      
      if (res.data.status === "connecting") {
        setConnectionStatus("pending");
        Alert.alert("Success", "Connection request sent!");
        // Update local currentUser
        if (currentUser && !currentUser.sentRequests?.includes(targetId)) {
          currentUser.sentRequests = [...(currentUser.sentRequests || []), targetId];
        }
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to connect");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setIsActionLoading(true);
      const res = await axios.post(`${API_URL}/user/accept/${targetId}`, {}, config);
      
      if (res.data.status === "connected") {
        setConnectionStatus("connected");
        Alert.alert("Success", "Connection accepted!");
        fetchProfile(); // Refresh to update both profiles
      }
    } catch (err) {
      Alert.alert("Error", "Failed to accept request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      "Remove Connection",
      `Are you sure you want to remove ${profileData?.name} from your connections?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await axios.post(`${API_URL}/user/disconnect/${targetId}`, {}, config);
              setConnectionStatus("none");
              Alert.alert("Success", "Connection removed");
              fetchProfile();
            } catch (err) {
              Alert.alert("Error", "Failed to remove connection");
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async () => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this connection request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await axios.post(`${API_URL}/user/cancel-request/${targetId}`, {}, config);
              setConnectionStatus("none");
              Alert.alert("Success", "Request cancelled");
              fetchProfile();
            } catch (err) {
              Alert.alert("Error", "Failed to cancel request");
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectRequest = async () => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this connection request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await axios.post(`${API_URL}/user/reject-request/${targetId}`, {}, config);
              setConnectionStatus("none");
              Alert.alert("Success", "Request rejected");
              fetchProfile();
            } catch (err) {
              Alert.alert("Error", "Failed to reject request");
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profileData?.name}'s profile on TDC!`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleMessagePress = async () => {
    if (connectionStatus !== "connected" && !isOwnProfile) {
      Alert.alert("Not Connected", "You need to be connected to send a message.");
      return;
    }
    
    try {
      setIsActionLoading(true);
      const res = await axios.post(`${API_URL}/conversations/get-or-create`, {
        recipientId: targetId
      }, config);

      if (res.data.conversationId) {
        navigation.navigate('ChatDetailScreen', { 
          conversationId: res.data.conversationId, 
          recipient: profileData 
        });
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Could not initiate chat.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewConnections = async () => {
    try {
      setIsActionLoading(true);
      const res = await axios.get(`${API_URL}/user/connections/${targetId}`, config);
      setConnectionsList(res.data.connections);
      setShowConnectionsModal(true);
    } catch (err) {
      Alert.alert("Error", "Failed to load connections");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLikePost = async (postId, index) => {
    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      const updatedPosts = [...userPosts];
      const isLiked = response.data.liked;
      
      updatedPosts[index] = {
        ...updatedPosts[index],
        likes: isLiked 
          ? [...(updatedPosts[index].likes || []), { _id: currentUser._id }]
          : (updatedPosts[index].likes || []).filter(like => like._id !== currentUser._id)
      };
      setUserPosts(updatedPosts);
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/posts/${postId}`, config);
              setUserPosts(prev => prev.filter(post => post._id !== postId));
              Alert.alert("Success", "Post deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete post");
            }
          }
        }
      ]
    );
  };

  const renderButton = () => {
    if (isOwnProfile) {
      return (
        <>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareProfileBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={18} color="#6C63FF" />
            <Text style={styles.shareProfileBtnText}>Share</Text>
          </TouchableOpacity>
        </>
      );
    }

    switch (connectionStatus) {
      case "connected":
        return (
          <>
            <TouchableOpacity 
              style={styles.connectedBtn}
              onPress={handleDisconnect}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Connected</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={handleMessagePress}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#6C63FF" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={18} color="#6C63FF" />
                  <Text style={styles.secondaryBtnText}>Message</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        );
      
      case "pending":
        return (
          <TouchableOpacity 
            style={styles.pendingBtn}
            onPress={handleCancelRequest}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="time-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Pending</Text>
              </>
            )}
          </TouchableOpacity>
        );
      
      case "received":
        return (
          <View style={styles.responseBtnRow}>
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={handleAcceptRequest}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.rejectBtn}
              onPress={handleRejectRequest}
              disabled={isActionLoading}
            >
              <Ionicons name="close" size={18} color="#666" />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <>
            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleConnect}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={handleMessagePress}
              disabled={isActionLoading}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#6C63FF" />
              <Text style={styles.secondaryBtnText}>Message</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  const renderPost = ({ item, index }) => {
    const isLiked = item.likes?.some(like => like._id === currentUser._id);
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}>
            {profileData?.profileImage ? (
              <Image source={{ uri: profileData.profileImage }} style={styles.avatarSmall} />
            ) : (
              <Text style={styles.postAvatarText}>{profileData?.name?.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.postInfo}>
            <View style={styles.postNameRow}>
              <Text style={styles.postName}>{profileData?.name}</Text>
              <Text style={styles.postHandle}> • {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.postCategory}>{item.category}</Text>
          </View>
          {isOwnProfile && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postText}>{item.content}</Text>
        
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.postActionBtn} 
            onPress={() => handleLikePost(item._id, index)}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#FF3B30" : "#666"} />
            <Text style={[styles.postActionText, isLiked && styles.likedText]}>{item.likes?.length || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.postActionBtn}
            onPress={() => navigation.navigate("PostDetailScreen", { postId: item._id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.postActionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.postActionBtn}>
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'About') {
      return (
        <View style={styles.tabContentContainer}>
          <View style={styles.infoSection}>
            <Ionicons name="person-outline" size={22} color="#6C63FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bio</Text>
              <Text style={styles.infoText}>{profileData?.bio || "No bio added yet"}</Text>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Ionicons name="briefcase-outline" size={22} color="#6C63FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Headline</Text>
              <Text style={styles.infoText}>{profileData?.headline || "No headline added"}</Text>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Ionicons name="location-outline" size={22} color="#6C63FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoText}>{profileData?.location || "Not specified"}</Text>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Ionicons name="school-outline" size={22} color="#6C63FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoText}>{profileData?.university?.name || "Not specified"}</Text>
            </View>
          </View>
        </View>
      );
    }
    
    if (activeTab === 'Education') {
      return (
        <View style={styles.tabContentContainer}>
          {profileData?.education && profileData.education.length > 0 ? (
            profileData.education.map((edu, index) => (
              <View key={index} style={styles.eduItem}>
                <View style={styles.eduIcon}>
                  <Ionicons name="school" size={24} color="#6C63FF" />
                </View>
                <View>
                  <Text style={styles.eduUni}>{edu.school || "University"}</Text>
                  <Text style={styles.eduDegree}>{edu.degree || "Degree"}</Text>
                  {edu.year && <Text style={styles.eduYear}>{edu.year}</Text>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No education information added</Text>
          )}
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <FlatList
        data={activeTab === 'Posts' ? userPosts : []}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListEmptyComponent={renderTabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6C63FF"]} />
        }
        ListHeaderComponent={
          <>
            <ImageBackground 
              source={{ uri: profileData?.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926' }} 
              style={styles.coverPhoto}
            >
              <SafeAreaView style={styles.safeBack}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                {!isOwnProfile && (
                  <TouchableOpacity onPress={handleShare} style={styles.shareCircle}>
                    <Ionicons name="share-social" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </SafeAreaView>
            </ImageBackground>

            <View style={styles.profileMeta}>
              <View style={styles.avatarWrapper}>
                <TouchableOpacity onPress={handleViewConnections} style={styles.largeAvatar}>
                  {profileData?.profileImage ? (
                    <Image source={{ uri: profileData.profileImage }} style={styles.largeAvatarImg} />
                  ) : (
                    <Text style={styles.largeAvatarText}>{profileData?.name?.charAt(0).toUpperCase()}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.nameSection}>
                <Text style={styles.fullName}>{profileData?.name}</Text>
                <Text style={styles.headline}>{profileData?.headline || "Member"}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.locationText}>{profileData?.location || "Location not set"}</Text>
                </View>
                <TouchableOpacity onPress={handleViewConnections}>
                  <Text style={styles.connectionCount}>
                    {profileData?.connections?.length || 0} connections
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                {renderButton()}
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity onPress={handleViewConnections} style={styles.statItem}>
                <Text style={styles.statNumber}>{profileData?.connections?.length || 0}</Text>
                <Text style={styles.statLabel}>Connections</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionDivider} />
            
            <View style={styles.tabBar}>
              {['Posts', 'About', 'Education'].map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(tab)} 
                  style={[styles.tabItem, activeTab === tab && styles.activeTabBorder]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Connections Modal */}
      <Modal
        visible={showConnectionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConnectionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connections</Text>
              <TouchableOpacity onPress={() => setShowConnectionsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.connectionItem}
                  onPress={() => {
                    setShowConnectionsModal(false);
                    navigation.push('UserProfile', { userId: item._id });
                  }}
                >
                  <Image 
                    source={{ uri: item.profileImage || 'https://via.placeholder.com/150' }} 
                    style={styles.connectionAvatar} 
                  />
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{item.name}</Text>
                    <Text style={styles.connectionHeadline}>{item.headline || "Member"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyConnections}>No connections yet</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  coverPhoto: { width: '100%', height: 140 },
  safeBack: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  shareCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  profileMeta: { paddingHorizontal: 16, marginTop: -45 },
  avatarWrapper: { position: 'relative', width: 95 },
  largeAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#6C63FF', borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  largeAvatarImg: { width: '100%', height: '100%' },
  largeAvatarText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  nameSection: { marginTop: 12 },
  fullName: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  headline: { fontSize: 15, color: '#666', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: { fontSize: 13, color: '#666', marginLeft: 4 },
  connectionCount: { fontSize: 14, color: '#6C63FF', fontWeight: '600', marginTop: 8 },
  btnRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: '#6C63FF', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  connectedBtn: { flex: 1, backgroundColor: '#4CAF50', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  pendingBtn: { flex: 1, backgroundColor: '#FFA500', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  responseBtnRow: { flex: 1, flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#4CAF50', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: '#F0F0F0', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  rejectBtnText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: { flex: 1, borderWidth: 1.5, borderColor: '#6C63FF', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  secondaryBtnText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 15 },
  editBtn: { flex: 1, backgroundColor: '#1A1A1A', height: 45, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  editBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  shareProfileBtn: { flex: 1, borderWidth: 1.5, borderColor: '#6C63FF', height: 45, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  shareProfileBtnText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 15 },
  statsContainer: { flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  sectionDivider: { height: 8, backgroundColor: '#F5F5F5' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  tabItem: { paddingVertical: 15, marginRight: 25 },
  activeTabBorder: { borderBottomWidth: 3, borderBottomColor: '#6C63FF' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 15 },
  activeTabText: { color: '#1A1A1A', fontWeight: 'bold' },
  tabContentContainer: { padding: 20 },
  infoSection: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  infoText: { fontSize: 15, color: '#333', lineHeight: 22 },
  eduItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 10 },
  eduIcon: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  eduUni: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  eduDegree: { fontSize: 14, color: '#666', marginTop: 2 },
  eduYear: { fontSize: 12, color: '#999', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 14, paddingVertical: 30 },
  postCard: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarSmall: { width: '100%', height: '100%' },
  postAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  postInfo: { flex: 1, marginLeft: 12 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  postName: { fontWeight: 'bold', fontSize: 15, color: '#1A1A1A' },
  postHandle: { color: '#666', fontSize: 13, marginLeft: 5 },
  postCategory: { fontSize: 12, color: '#6C63FF', marginTop: 2 },
  deleteBtn: { padding: 5 },
  postText: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 10 },
  postImage: { width: '100%', height: 250, borderRadius: 12, marginTop: 8, backgroundColor: '#F0F0F0' },
  postActions: { flexDirection: 'row', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  postActionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  postActionText: { marginLeft: 6, color: '#666', fontSize: 13 },
  likedText: { color: '#FF3B30' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  connectionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  connectionAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  connectionHeadline: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyConnections: { textAlign: 'center', color: '#999', fontSize: 14, padding: 40 }
});