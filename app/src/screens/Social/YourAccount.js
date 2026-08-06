import React, { useContext, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Modern Info Tile Component
const InfoTile = ({ icon, label, value, color = "#1a1a1a", isLast = false }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.tile, 
      !isLast && styles.tileBorder,
      {
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }]
      }
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value || "Not set"}</Text>
      </View>
    </Animated.View>
  );
};

export default function YourAccount({ navigation }) {
  const { user } = useContext(AuthContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const isVerified = user?.status === 'Verified';
  const statusColor = isVerified ? '#4CAF50' : '#f9c349';
  const statusIcon = isVerified ? "checkmark-circle" : "time-outline";

  // Get user initials
  const getInitials = () => {
    if (!user?.name) return '?';
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity 
          style={styles.headerEditBtn}
          onPress={() => navigation.navigate('EditProfileScreen')}
        >
          <Ionicons name="create-outline" size={22} color="#f9c349" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ 
          opacity: fadeAnim, 
          transform: [{ translateY: slideUpAnim }] 
        }}>
          
          {/* Profile Header - Left/Right Layout */}
          <View style={styles.profileHeader}>
            <View style={styles.profileRow}>
              <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: avatarScale }] }]}>
                <LinearGradient 
                  colors={['#f9c349', '#e6b800']} 
                  style={styles.avatarRing}
                >
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{getInitials()}</Text>
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                
                <View style={styles.userMeta}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'STUDENT'}</Text>
                  </View>
                </View>

                <View style={styles.userDetails}>
                  {user?.university?.name && (
                    <View style={styles.detailItem}>
                      <Ionicons name="school-outline" size={14} color="#666" />
                      <Text style={styles.detailText}>{user.university.name}</Text>
                    </View>
                  )}
                  {user?.location && (
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={14} color="#666" />
                      <Text style={styles.detailText}>{user.location}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusContainer}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {isVerified ? 'Verified Account' : 'Pending Verification'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user?.connections?.length || 0}</Text>
                <Text style={styles.statLabel}>Connections</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user?.posts?.length || 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user?.referralCount || 0}</Text>
                <Text style={styles.statLabel}>Referrals</Text>
              </View>
            </View>
          </View>

          {/* Info Cards */}
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.sectionLine} />
            </View>
            
            <View style={styles.card}>
              <InfoTile 
                icon="person-outline" 
                label="Full Name" 
                value={user?.name} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon="mail-outline" 
                label="Email Address" 
                value={user?.email} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon="call-outline" 
                label="Phone Number" 
                value={user?.phone || "Not set"} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon="school-outline" 
                label="University" 
                value={user?.university?.name || "Not Specified"} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon="id-card-outline" 
                label="Roll Number" 
                value={user?.rollNo || "N/A"} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon="location-outline" 
                label="Location" 
                value={user?.location || "Not set"} 
                color="#1a1a1a"
              />
              <InfoTile 
                icon={statusIcon} 
                label="Verification Status" 
                value={isVerified ? "Verified" : "Pending"} 
                color={statusColor}
                isLast
              />
            </View>

            {/* Security Note - Modern */}
            <View style={styles.securityNote}>
              <LinearGradient colors={['#f9c349', '#e6b800']} style={styles.securityIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#1a1a1a" />
              </LinearGradient>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Secure & Encrypted</Text>
                <Text style={styles.securityText}>
                  Your information is encrypted and managed according to TDC privacy policies.
                </Text>
              </View>
            </View>

            {/* Edit Profile Button - Modern */}
            <TouchableOpacity 
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate('EditProfileScreen')}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#f9c349', '#e6b800']} 
                style={styles.editProfileGradient}
              >
                <Ionicons name="create-outline" size={20} color="#1a1a1a" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fc' 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    backgroundColor: '#fff'
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f5f6f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    letterSpacing: 0.3 
  },
  headerEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Profile Header - Left/Right Layout
  profileHeader: { 
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: { 
    position: 'relative',
  },
  avatarRing: { 
    width: 80, 
    height: 80, 
    borderRadius: 80, 
    padding: 2, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarImage: { 
    width: 74, 
    height: 74, 
    borderRadius: 74, 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  avatarPlaceholder: { 
    width: 74, 
    height: 74, 
    borderRadius: 74, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  avatarText: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#f9c349' 
  },
  
  profileInfo: {
    flex: 1,
  },
  userName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  userDetails: {
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 10, 
    gap: 4,
  },
  statusDot: { 
    width: 5, 
    height: 5, 
    borderRadius: 2.5,
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '600',
  },
  
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
  },
  
  // Content
  content: { 
    padding: 16, 
    paddingTop: 20 
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#888', 
    marginHorizontal: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  
  // Info Card
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    paddingVertical: 4,
    borderWidth: 1, 
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tile: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14 
  },
  tileBorder: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#f5f5f5' 
  },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  tileText: { 
    flex: 1 
  },
  label: { 
    fontSize: 10, 
    color: '#999', 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 2 
  },
  value: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  
  // Security Note - Modern
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  securityText: {
    fontSize: 11,
    color: '#999',
    lineHeight: 16,
    fontWeight: '400',
    marginTop: 1,
  },
  
  // Edit Profile Button - Modern
  editProfileBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});