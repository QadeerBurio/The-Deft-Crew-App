import React, { useContext, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Alert,
  Animated,
  Image
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';

const SettingItem = ({ icon, label, subLabel, color = "#1a1a1a", isLast = false, onPress, danger = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.settingIconCircle, { backgroundColor: danger ? '#FFEBEE' : color + '15' }]}>
          <Ionicons name={icon} size={20} color={danger ? '#F44336' : color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingLabel, danger && { color: '#F44336' }]}>{label}</Text>
          {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>@{user?.name?.toLowerCase()?.replace(/\s/g, '') || 'user'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Profile Card */}
          <TouchableOpacity 
            style={styles.profileCard} 
            onPress={() => navigation.navigate("YourAccount")}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.profileAvatarRing}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#999" />
            <Text style={styles.searchText}>Search settings</Text>
          </View>

          {/* Section: Account */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Account
          </Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="person-outline" 
              label="Your Account" 
              subLabel="Manage your account information and preferences" 
              onPress={() => navigation.navigate("YourAccount")}
            />
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Security & Access" 
              subLabel="Keep your account secure and monitored" 
              onPress={() => navigation.navigate("SecurityAndAccess")}
            />
            <SettingItem 
              icon="key-outline" 
              label="Change Password" 
              subLabel="Update your login credentials" 
              isLast
              onPress={() => navigation.navigate("ChangePassword")}
            />
          </View>

          {/* Section: Preferences */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Preferences
          </Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="notifications-outline" 
              label="Notifications" 
              subLabel="Manage your alert preferences" 
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <SettingItem 
              icon="eye-off-outline" 
              label="Privacy & Safety" 
              subLabel="Control your visibility and data" 
              onPress={() => navigation.navigate("PrivacyAndSafety")}
            />
            <SettingItem 
              icon="color-palette-outline" 
              label="Appearance" 
              subLabel="Customize your visual experience" 
              isLast
              onPress={() => navigation.navigate("Appearance")}
            />
          </View>

          {/* Section: Support */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Support
          </Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="help-circle-outline" 
              label="Help Center" 
              subLabel="Get help and learn about TDC" 
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <SettingItem 
              icon="information-circle-outline" 
              label="About TDC" 
              subLabel="Version information and legal" 
              isLast
              onPress={() => navigation.navigate("About")}
            />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.footerVersion}>tdc<Text style={{color:'#f9c349'}}>.</Text> for Mobile v1.0.2</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 11, color: '#999', fontWeight: '500', marginTop: 1 },
  
  content: { flex: 1 },
  
  // Profile Card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0', gap: 12
  },
  profileAvatarRing: { width: 50, height: 50, borderRadius: 14, padding: 2, justifyContent: 'center', alignItems: 'center' },
  profileAvatar: { width: 44, height: 44, borderRadius: 12 },
  profileAvatarPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 20, fontWeight: '900', color: '#f9c349' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  profileEmail: { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 2 },
  
  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8',
    marginHorizontal: 16, marginVertical: 16, padding: 12, borderRadius: 14,
    borderWidth: 2, borderColor: '#f0f0f0'
  },
  searchText: { color: '#999', marginLeft: 10, fontSize: 14, fontWeight: '500' },
  
  // Section
  sectionTitle: { 
    fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginTop: 10, marginBottom: 12, 
    marginLeft: 20, flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  // Section Card
  sectionCard: { 
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, 
    borderWidth: 2, borderColor: '#f0f0f0', overflow: 'hidden', marginBottom: 4 
  },
  
  // Setting Row
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5'
  },
  settingIconCircle: { 
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  textContainer: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingSubLabel: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
  
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 24, padding: 14,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#FFEBEE', gap: 8
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#F44336' },
  
  footerVersion: { textAlign: 'center', color: '#ccc', fontSize: 11, fontWeight: '500', paddingVertical: 20, letterSpacing: 0.5 }
});

