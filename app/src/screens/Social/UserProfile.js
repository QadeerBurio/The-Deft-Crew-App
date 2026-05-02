import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  FlatList, Dimensions, Platform, StatusBar, 
  ActivityIndicator, Alert, Share, BackHandler, RefreshControl,
  Modal, Animated, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// Skeleton Component
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonCover, { opacity }]} />
      <View style={{ padding: 16, marginTop: -45, alignItems: 'center' }}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 150, height: 20, marginTop: 10, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 200, height: 12, marginTop: 6, opacity }]} />
        <Animated.View style={[styles.skeletonBtn, { opacity, marginTop: 15 }]} />
        <Animated.View style={[styles.skeletonLine, { width: '100%', height: 40, marginTop: 15, opacity }]} />
      </View>
    </View>
  );
};

export default function UserProfile({ route, navigation }) {
  const { userId } = route.params || {}; 
  const { user: currentUser, token } = useContext(AuthContext);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');
  const [connectionStatus, setConnectionStatus] = useState("none");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState([]);
  const [likingItems, setLikingItems] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetId = userId || currentUser?._id;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (navigation.canGoBack()) { navigation.goBack(); return true; }
        return false;
      });
      return () => subscription.remove();
    }, [targetId])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/profile/${targetId}`, config);
      setProfileData(res.data.profile);
      setUserPosts(res.data.posts || []);
      
      if (!isOwnProfile) {
        const isConnected = currentUser?.connections?.includes(targetId);
        const isRequestSent = currentUser?.sentRequests?.includes(targetId);
        const isRequestReceived = currentUser?.receivedRequests?.includes(targetId);
        if (isConnected) setConnectionStatus("connected");
        else if (isRequestSent) setConnectionStatus("pending");
        else if (isRequestReceived) setConnectionStatus("received");
        else setConnectionStatus("none");
      }
    } catch (err) { console.error("Fetch profile error:", err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const handleConnect = async () => {
    setIsActionLoading(true);
    try { await axios.post(`${API_URL}/user/connect/${targetId}`, {}, config); setConnectionStatus("pending"); }
    catch (err) { Alert.alert("Error", "Failed to connect"); }
    finally { setIsActionLoading(false); }
  };

  const handleAcceptRequest = async () => {
    setIsActionLoading(true);
    try { await axios.post(`${API_URL}/user/accept/${targetId}`, {}, config); setConnectionStatus("connected"); fetchProfile(); }
    catch (err) { Alert.alert("Error", "Failed to accept"); }
    finally { setIsActionLoading(false); }
  };

  const handleDisconnect = async () => {
    Alert.alert("Remove Connection", `Remove ${profileData?.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          setIsActionLoading(true);
          try { await axios.post(`${API_URL}/user/disconnect/${targetId}`, {}, config); setConnectionStatus("none"); fetchProfile(); }
          catch (err) { Alert.alert("Error", "Failed to remove"); }
          finally { setIsActionLoading(false); }
      }}
    ]);
  };

  const handleCancelRequest = async () => {
    setIsActionLoading(true);
    try { await axios.post(`${API_URL}/user/cancel-request/${targetId}`, {}, config); setConnectionStatus("none"); }
    catch (err) { Alert.alert("Error", "Failed to cancel"); }
    finally { setIsActionLoading(false); }
  };

  const handleRejectRequest = async () => {
    setIsActionLoading(true);
    try { await axios.post(`${API_URL}/user/reject-request/${targetId}`, {}, config); setConnectionStatus("none"); }
    catch (err) { Alert.alert("Error", "Failed to reject"); }
    finally { setIsActionLoading(false); }
  };

  const handleShare = async () => {
    try { await Share.share({ message: `Check out ${profileData?.name}'s profile on TDC!` }); } catch (error) {}
  };

  const handleMessagePress = async () => {
    if (connectionStatus !== "connected" && !isOwnProfile) { Alert.alert("Not Connected", "You need to be connected to send a message."); return; }
    setIsActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/conversations/get-or-create`, { recipientId: targetId }, config);
      if (res.data.conversationId) navigation.navigate('ChatDetailScreen', { conversationId: res.data.conversationId, recipient: profileData });
    } catch (err) { Alert.alert("Error", "Could not initiate chat."); }
    finally { setIsActionLoading(false); }
  };

  const handleViewConnections = async () => {
    setIsActionLoading(true);
    try {
      const res = await axios.get(`${API_URL}/user/connections/${targetId}`, config);
      setConnectionsList(res.data.connections);
      setShowConnectionsModal(true);
    } catch (err) { Alert.alert("Error", "Failed to load connections"); }
    finally { setIsActionLoading(false); }
  };

  const handleLikePost = async (postId, index) => {
    if (likingItems[postId]) return;
    setLikingItems(prev => ({ ...prev, [postId]: true }));
    const wasLiked = userPosts[index]?.likes?.some(like => like._id === currentUser._id || like === currentUser._id);
    const updatedPosts = [...userPosts];
    if (wasLiked) {
      updatedPosts[index] = { ...updatedPosts[index], likes: updatedPosts[index].likes.filter(l => (l._id || l) !== currentUser._id) };
    } else {
      updatedPosts[index] = { ...updatedPosts[index], likes: [...(updatedPosts[index].likes || []), currentUser._id] };
    }
    setUserPosts(updatedPosts);
    try {
      const response = await axios.put(`${API_URL}/posts/like/${postId}`, {}, config);
      const finalPosts = [...userPosts];
      finalPosts[index] = { ...finalPosts[index], likes: response.data.likes };
      setUserPosts(finalPosts);
    } catch (error) { fetchProfile(); }
    finally { setLikingItems(prev => ({ ...prev, [postId]: false })); }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await axios.delete(`${API_URL}/posts/${postId}`, config);
          setUserPosts(prev => prev.filter(post => post._id !== postId));
      }}
    ]);
  };

  const renderButton = () => {
    if (isOwnProfile) {
      return (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.editGradient}>
              <Ionicons name="create-outline" size={16} color="#f9c349" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#f9c349" />
          </TouchableOpacity>
        </View>
      );
    }
    switch (connectionStatus) {
      case "connected":
        return (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.connectedBtn} onPress={handleDisconnect}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.btnGradient}>
                <Ionicons name="checkmark-circle" size={16} color="#1a1a1a" />
                <Text style={styles.connectedBtnText}>Connected</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
              <Ionicons name="chatbubble-outline" size={16} color="#1a1a1a" />
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        );
      case "pending":
        return (
          <TouchableOpacity style={styles.pendingBtn} onPress={handleCancelRequest}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.btnGradientFull}>
              <Ionicons name="time-outline" size={16} color="#1a1a1a" />
              <Text style={styles.connectedBtnText}>Pending</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      case "received":
        return (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRequest}>
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.btnGradient}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectRequest}>
              <Ionicons name="close" size={16} color="#666" />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.btnGradient}>
                <Ionicons name="person-add" size={16} color="#1a1a1a" />
                <Text style={styles.connectedBtnText}>Connect</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn} onPress={handleMessagePress}>
              <Ionicons name="chatbubble-outline" size={16} color="#1a1a1a" />
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // ✅ Complete About Tab with all data
  const renderAboutTab = () => (
    <View style={styles.tabContentContainer}>
      {profileData?.bio ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="person-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Bio</Text>
            <Text style={styles.aboutText}>{profileData.bio}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.headline ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="briefcase-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Headline</Text>
            <Text style={styles.aboutText}>{profileData.headline}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.phone ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="call-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Phone</Text>
            <Text style={styles.aboutText}>{profileData.phone}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.email ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="mail-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Email</Text>
            <Text style={styles.aboutText}>{profileData.email}</Text>
          </View>
        </View>
      ) : null}

      {(profileData?.university?.name || profileData?.education?.[0]?.school) ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="school-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>University</Text>
            <Text style={styles.aboutText}>{profileData?.university?.name || profileData?.education?.[0]?.school}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.location ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="location-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Location</Text>
            <Text style={styles.aboutText}>{profileData.location}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.rollNo ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="id-card-outline" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Roll Number</Text>
            <Text style={styles.aboutText}>{profileData.rollNo}</Text>
          </View>
        </View>
      ) : null}

      {profileData?.instagram ? (
        <View style={styles.aboutSection}>
          <View style={styles.aboutIcon}>
            <Ionicons name="logo-instagram" size={20} color="#f9c349" />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>Instagram</Text>
            <Text style={styles.aboutText}>@{profileData.instagram}</Text>
          </View>
        </View>
      ) : null}

      {(!profileData?.bio && !profileData?.headline && !profileData?.phone && !profileData?.email && !profileData?.university?.name && !profileData?.location && !profileData?.rollNo && !profileData?.instagram) && (
        <View style={styles.emptyAbout}>
          <Ionicons name="information-circle-outline" size={50} color="#ccc" />
          <Text style={styles.emptyAboutText}>No information available</Text>
        </View>
      )}
    </View>
  );

  // ✅ Complete Education Tab with all data
  const renderEducationTab = () => (
    <View style={styles.tabContentContainer}>
      {profileData?.education && profileData.education.length > 0 ? (
        profileData.education.map((edu, index) => (
          <View key={index} style={styles.eduCard}>
            <View style={styles.eduHeader}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.eduIconGradient}>
                <Ionicons name="school" size={22} color="#fff" />
              </LinearGradient>
              <View style={styles.eduInfo}>
                <Text style={styles.eduSchool}>{edu.school || "University"}</Text>
                <Text style={styles.eduDegree}>{edu.degree || "Degree Program"}</Text>
              </View>
            </View>
            {(edu.field || edu.major) && (
              <View style={styles.eduDetail}>
                <Text style={styles.eduDetailLabel}>Field of Study</Text>
                <Text style={styles.eduDetailText}>{edu.field || edu.major}</Text>
              </View>
            )}
            {(edu.startDate || edu.endDate) && (
              <View style={styles.eduDetail}>
                <Text style={styles.eduDetailLabel}>Duration</Text>
                <Text style={styles.eduDetailText}>
                  {edu.startDate || 'N/A'} - {edu.endDate || 'Present'}
                </Text>
              </View>
            )}
            {edu.grade && (
              <View style={styles.eduDetail}>
                <Text style={styles.eduDetailLabel}>Grade/CGPA</Text>
                <Text style={styles.eduDetailText}>{edu.grade}</Text>
              </View>
            )}
            {edu.description && (
              <View style={styles.eduDetail}>
                <Text style={styles.eduDetailLabel}>Description</Text>
                <Text style={styles.eduDetailText}>{edu.description}</Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyAbout}>
          <Ionicons name="school-outline" size={50} color="#ccc" />
          <Text style={styles.emptyAboutText}>No education information</Text>
        </View>
      )}
    </View>
  );

  const renderPost = ({ item, index }) => {
    const isLiked = item.likes?.some(like => (like._id || like) === currentUser._id);
    const likeCount = Array.isArray(item.likes) ? item.likes.length : (typeof item.likes === 'number' ? item.likes : 0);
    
    return (
      <Animated.View style={[styles.postCard, { opacity: fadeAnim }]}>
        <View style={styles.postHeader}>
          {profileData?.profileImage ? (
            <Image source={{ uri: profileData.profileImage }} style={styles.postAvatar} />
          ) : (
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.postAvatarPlaceholder}>
              <Text style={styles.postAvatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={styles.postInfo}>
            <Text style={styles.postName}>{profileData?.name}</Text>
            <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          {isOwnProfile && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#f9c349" />
            </TouchableOpacity>
          )}
        </View>

        {item.content && <Text style={styles.postText}>{item.content}</Text>}
        {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLikePost(item._id, index)}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#f9c349" : "#666"} />
            <Text style={[styles.actionText, isLiked && {color: "#f9c349"}]}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <FlatList
        data={activeTab === 'Posts' ? userPosts : []}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListEmptyComponent={activeTab === 'About' ? renderAboutTab : activeTab === 'Education' ? renderEducationTab : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="newspaper-outline" size={50} color="#ccc" />
            </View>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
        ListHeaderComponent={
          <>
            <View style={styles.coverPhoto}>
              <LinearGradient colors={['#1a1a1a', '#333']} style={styles.coverGradient}>
                <View style={styles.coverOverlay}>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </TouchableOpacity>
                  {!isOwnProfile && (
                    <TouchableOpacity onPress={handleShare} style={styles.backCircle}>
                      <Ionicons name="share-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>

            <Animated.View style={[styles.profileMeta, { opacity: fadeAnim }]}>
              <View style={styles.avatarWrapper}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarRing}>
                  {profileData?.profileImage ? (
                    <Image source={{ uri: profileData.profileImage }} style={styles.largeAvatar} />
                  ) : (
                    <View style={styles.largeAvatarPlaceholder}>
                      <Text style={styles.largeAvatarText}>{profileData?.name?.charAt(0)?.toUpperCase()}</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              <Text style={styles.fullName}>{profileData?.name}</Text>
              <Text style={styles.headline}>{profileData?.headline || "TDC Member"}</Text>
              
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#999" />
                <Text style={styles.locationText}>{profileData?.location || "Location not set"}</Text>
              </View>

              <TouchableOpacity onPress={handleViewConnections}>
                <Text style={styles.connectionCount}>{profileData?.connections?.length || 0} connections</Text>
              </TouchableOpacity>

              {renderButton()}
            </Animated.View>

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

            <View style={styles.tabBar}>
              {['Posts', 'About', 'Education'].map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab && styles.activeTab]}>
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Connections Modal */}
      <Modal visible={showConnectionsModal} transparent animationType="slide" onRequestClose={() => setShowConnectionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowConnectionsModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connections</Text>
              <TouchableOpacity onPress={() => setShowConnectionsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.connectionItem} onPress={() => { setShowConnectionsModal(false); navigation.push('UserProfile', { userId: item._id }); }}>
                  <Image source={{ uri: item.profileImage || 'https://via.placeholder.com/150' }} style={styles.connectionAvatar} />
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{item.name}</Text>
                    <Text style={styles.connectionHeadline}>{item.headline || "Member"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyConnections}>No connections yet</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  skeletonContainer: { flex: 1, backgroundColor: '#fff' },
  skeletonCover: { width: '100%', height: 120, backgroundColor: '#e8e8e8' },
  skeletonAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e8e8e8', borderWidth: 4, borderColor: '#fff' },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  skeletonBtn: { width: '100%', height: 44, borderRadius: 14, backgroundColor: '#e8e8e8' },
  
  coverPhoto: { height: 130 },
  coverGradient: { flex: 1 },
  coverOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10 },
  backCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  
  profileMeta: { paddingHorizontal: 16, marginTop: -45, alignItems: 'center' },
  avatarWrapper: { marginBottom: 10 },
  avatarRing: { width: 95, height: 95, borderRadius: 48, padding: 3, justifyContent: 'center', alignItems: 'center' },
  largeAvatar: { width: 87, height: 87, borderRadius: 44, borderWidth: 3, borderColor: '#fff' },
  largeAvatarPlaceholder: { width: 87, height: 87, borderRadius: 44, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  largeAvatarText: { fontSize: 36, fontWeight: '900', color: '#f9c349' },
  
  fullName: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginTop: 4 },
  headline: { fontSize: 14, color: '#666', marginTop: 2, fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  locationText: { fontSize: 12, color: '#999', fontWeight: '500' },
  connectionCount: { fontSize: 13, color: '#f9c349', fontWeight: '700', marginTop: 8 },
  
  btnRow: { flexDirection: 'row', marginTop: 15, gap: 10, width: '100%', paddingHorizontal: 10 },
  editBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  editGradient: { flexDirection: 'row', height: 44, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14 },
  editBtnText: { color: '#f9c349', fontWeight: '800', fontSize: 14 },
  shareBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0' },
  
  connectBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  connectedBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  pendingBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginHorizontal: 10 },
  acceptBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', height: 44, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14 },
  btnGradientFull: { flexDirection: 'row', height: 44, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, width: '100%' },
  connectedBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  msgBtn: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#f8f8f8', borderWidth: 2, borderColor: '#f0f0f0' },
  msgBtnText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#f8f8f8', borderWidth: 2, borderColor: '#f0f0f0' },
  rejectBtnText: { color: '#666', fontWeight: '700', fontSize: 14 },
  
  statsContainer: { flexDirection: 'row', paddingVertical: 16, marginHorizontal: 16, marginTop: 20, backgroundColor: '#f8f8f8', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  statLabel: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: '#e0e0e0', height: '60%', alignSelf: 'center' },
  
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 4, borderBottomWidth: 2, borderBottomColor: '#f0f0f0' },
  tabItem: { paddingVertical: 14, marginRight: 28 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#f9c349', marginBottom: -2 },
  tabText: { color: '#999', fontWeight: '700', fontSize: 14 },
  activeTabText: { color: '#1a1a1a' },
  
  // About Tab
  tabContentContainer: { padding: 16 },
  aboutSection: { flexDirection: 'row', marginBottom: 18, alignItems: 'flex-start' },
  aboutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  aboutContent: { flex: 1 },
  aboutLabel: { fontSize: 11, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  aboutText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22, fontWeight: '500' },
  emptyAbout: { alignItems: 'center', paddingVertical: 40 },
  emptyAboutText: { color: '#999', fontSize: 14, marginTop: 10, fontWeight: '500' },
  
  // Education Tab
  eduCard: { backgroundColor: '#f8f8f8', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: '#f0f0f0' },
  eduHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eduIconGradient: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eduInfo: { flex: 1 },
  eduSchool: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  eduDegree: { fontSize: 13, color: '#666', fontWeight: '500', marginTop: 2 },
  eduDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e8e8e8' },
  eduDetailLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  eduDetailText: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  
  // Posts
  postCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', backgroundColor: '#fff' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAvatar: { width: 42, height: 42, borderRadius: 14 },
  postAvatarPlaceholder: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  postAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  postInfo: { flex: 1, marginLeft: 10 },
  postName: { fontWeight: '800', fontSize: 14, color: '#1a1a1a' },
  postDate: { fontSize: 10, color: '#999', fontWeight: '500', marginTop: 1 },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  postText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22, marginBottom: 8, fontWeight: '500' },
  postImage: { width: '100%', height: 250, borderRadius: 14, backgroundColor: '#f8f8f8' },
  postActions: { flexDirection: 'row', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f5f5f5', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 5 },
  actionText: { fontSize: 13, color: '#666', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16 },
  emptyText: { color: '#999', fontSize: 15, fontWeight: '700' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: '40%' },
  dragHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  connectionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  connectionAvatar: { width: 44, height: 44, borderRadius: 14, marginRight: 12 },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  connectionHeadline: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
  emptyConnections: { textAlign: 'center', color: '#999', padding: 40, fontWeight: '500' },
});

