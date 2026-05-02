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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const InfoTile = ({ icon, label, value, color = "#1a1a1a", isLast = false }) => (
  <View style={[styles.tile, !isLast && styles.tileBorder]}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.tileText}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value || "Not set"}</Text>
    </View>
  </View>
);

export default function YourAccount({ navigation }) {
  const { user } = useContext(AuthContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const isVerified = user?.status === 'Verified';
  const statusColor = isVerified ? '#4CAF50' : '#f9c349';
  const statusIcon = isVerified ? "shield-checkmark" : "shield-outline";

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Info</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: avatarScale }] }]}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarRing}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </LinearGradient>
              
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.verifiedBadgeGradient}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </LinearGradient>
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.roleContainer}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.roleGradient}>
                <Text style={styles.userRole}>{user?.role?.toUpperCase() || 'MEMBER'}</Text>
              </LinearGradient>
            </View>
            
            {/* Status Badge */}
            <View style={[styles.statusPill, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {user?.status || 'Not Verified'}
              </Text>
            </View>
          </View>

          {/* Info Cards */}
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Personal Details
            </Text>
            
            <View style={styles.card}>
              <InfoTile icon="person-outline" label="Full Name" value={user?.name} />
              <InfoTile icon="mail-outline" label="Email Address" value={user?.email} />
              <InfoTile icon="call-outline" label="Phone Number" value={user?.phone || "Not set"} />
              <InfoTile icon="school-outline" label="University" value={user?.university?.name || "Not Specified"} />
              <InfoTile icon="id-card-outline" label="Roll Number" value={user?.rollNo || "N/A"} />
              <InfoTile icon={statusIcon} label="Verification Status" value={user?.status} color={statusColor} isLast />
            </View>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Ionicons name="lock-closed" size={18} color="#f9c349" />
              <Text style={styles.securityText}>
                Your information is encrypted and managed according to TDC privacy policies.
              </Text>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Quick Actions
            </Text>
            
            <View style={styles.actionsCard}>
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
                <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="create-outline" size={20} color="#2196F3" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSub}>Update your personal information</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.7}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="key-outline" size={20} color="#FF9800" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Change Password</Text>
                  <Text style={styles.actionSub}>Update your account security</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('PrivacySettings')} activeOpacity={0.7}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="shield-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Privacy Settings</Text>
                  <Text style={styles.actionSub}>Manage your data preferences</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  // Profile Header
  profileHeader: { alignItems: 'center', paddingVertical: 25, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarText: { fontSize: 38, fontWeight: '900', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  verifiedBadgeGradient: { width: 22, height: 22, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  userName: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginTop: 4 },
  roleContainer: { borderRadius: 8, overflow: 'hidden', marginTop: 6 },
  roleGradient: { paddingHorizontal: 14, paddingVertical: 5 },
  userRole: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12, borderWidth: 1, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  
  // Content
  content: { padding: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  // Info Card
  card: { 
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 4,
    borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16
  },
  tile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  tileBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  iconContainer: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tileText: { flex: 1 },
  label: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600' },
  
  // Security Note
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#f8f8f8', borderRadius: 14, marginBottom: 24, borderWidth: 2, borderColor: '#f0f0f0' },
  securityText: { flex: 1, fontSize: 12, color: '#999', lineHeight: 18, fontWeight: '500' },
  
  // Actions Card
  actionsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0', overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  actionIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  actionSub: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
});

