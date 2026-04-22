import React, { useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const InfoTile = ({ icon, label, value, color = "#0F1419" }) => (
  <View style={styles.tile}>
    <View style={styles.iconContainer}>
      {/* Icon color now dynamically matches text color for status, or defaults to grey */}
      <Ionicons 
        name={icon} 
        size={20} 
        color={color !== "#0F1419" ? color : "#536471"} 
      />
    </View>
    <View style={styles.tileText}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value || "Not set"}</Text>
    </View>
  </View>
);

export default function YourAccount({ navigation }) {
  const { user } = useContext(AuthContext);

  // Determine status color and icon
  const isVerified = user?.status === 'Verified';
  const statusColor = isVerified ? '#00BA7C' : '#F59E0B';
  const statusIcon = isVerified ? "shield-checkmark" : "shield-outline";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#0F1419" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Info</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            {user?.profileImage ? (
              <Image 
                source={{ uri: user.profileImage }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {isVerified && (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={24} color="#1D9BF0" />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase() || 'MEMBER'}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          <View style={styles.card}>
            <InfoTile 
              icon="person-outline" 
              label="Full Name" 
              value={user?.name} 
            />
            <InfoTile 
              icon="mail-outline" 
              label="Email Address" 
              value={user?.email} 
            />
            <InfoTile 
              icon="business-outline" 
              label="University" 
              value={user?.university?.name || "Not Specified"} 
            />
            <InfoTile 
              icon="card-outline" 
              label="Roll Number" 
              value={user?.rollNo || "N/A"} 
            />
            <InfoTile 
              icon={statusIcon} 
              label="Verification Status" 
              value={user?.status} 
              color={statusColor}
            />
          </View>

          <Text style={styles.footerNote}>
            Your information is encrypted and managed according to TDC privacy policies.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F9' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFF3F4',
    paddingTop: 40 // Adjusted for notch area
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F1419' },
  backButton: { padding: 4 },
  
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1D9BF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EFF3F4', // Placeholder color while loading
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  badge: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#FFF', 
    borderRadius: 12,
    padding: 2
  },
  userName: { fontSize: 22, fontWeight: '800', color: '#0F1419' },
  userRole: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#536471', 
    marginTop: 4, 
    letterSpacing: 1.5 
  },

  content: { padding: 16 },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#536471', 
    marginBottom: 12, 
    marginLeft: 4, 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFF3F4'
  },
  tile: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14 
  },
  iconContainer: { 
    width: 42, 
    height: 42, 
    borderRadius: 12, 
    backgroundColor: '#F7F9F9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 14
  },
  tileText: { 
    flex: 1, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#F7F9F9', 
    paddingBottom: 8 
  },
  label: { fontSize: 12, color: '#536471', fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  
  footerNote: { 
    textAlign: 'center', 
    fontSize: 12, 
    color: '#536471', 
    marginTop: 32, 
    lineHeight: 18,
    paddingHorizontal: 30
  }
});