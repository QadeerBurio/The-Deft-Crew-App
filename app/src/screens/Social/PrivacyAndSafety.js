import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Animated,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PrivacyItem = ({ icon, label, subtitle, onPress, isLast = false, color = "#f9c349", hasToggle = false, toggleValue = false, onToggle }) => {
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
        style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBackground, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuLabel}>{label}</Text>
          <Text style={styles.menuSubLabel}>{subtitle}</Text>
        </View>
        {hasToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: '#e0e0e0', true: '#f9c349' }}
            thumbColor={toggleValue ? '#1a1a1a' : '#f4f3f4'}
          />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function PrivacyAndSafety({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  // Privacy toggle states
  const [profileVisibility, setProfileVisibility] = React.useState(true);
  const [locationSharing, setLocationSharing] = React.useState(false);
  const [dataCollection, setDataCollection] = React.useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.heroIconCircle}>
                <Ionicons name="shield-checkmark" size={45} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.heroTitle}>Privacy Controls</Text>
            <Text style={styles.heroDescription}>
              Manage what information you see and share on TDC. Your data, your control.
            </Text>
          </View>

          {/* Privacy Status Card */}
          <View style={styles.privacyStatusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="lock-closed" size={18} color="#4CAF50" />
              <Text style={styles.statusTitle}>Privacy Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>Good</Text>
              </View>
            </View>
            <View style={styles.statusBar}>
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={[styles.statusFill, { width: '75%' }]} />
            </View>
            <Text style={styles.statusHint}>Your privacy settings are well configured</Text>
          </View>

          {/* Your Activity */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Your TDC Activity
          </Text>
          <View style={styles.card}>
            <PrivacyItem 
              icon="people-outline"
              label="Audience & Tagging"
              subtitle="Manage what information you allow others to see"
              color="#f9c349"
              onPress={() => Alert.alert("Audience", "Manage audience settings")}
            />
            <PrivacyItem 
              icon="eye-outline"
              label="Content You See"
              subtitle="Decide what shows up in your feed based on interests"
              color="#2196F3"
              onPress={() => Alert.alert("Content", "Manage content preferences")}
            />
            <PrivacyItem 
              icon="volume-mute-outline"
              label="Mute & Block"
              subtitle="Manage accounts and notifications you've restricted"
              color="#FF9800"
              onPress={() => Alert.alert("Mute", "Manage muted accounts")}
            />
            <PrivacyItem 
              icon="search-outline"
              label="Search History"
              subtitle="Clear your recent searches on TDC"
              color="#9C27B0"
              isLast
              onPress={() => Alert.alert("History", "Clear search history?")}
            />
          </View>

          {/* Privacy Controls */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Privacy Controls
          </Text>
          <View style={styles.card}>
            <PrivacyItem 
              icon="globe-outline"
              label="Profile Visibility"
              subtitle="Make your profile visible to other TDC members"
              color="#4CAF50"
              hasToggle
              toggleValue={profileVisibility}
              onToggle={setProfileVisibility}
            />
            <PrivacyItem 
              icon="location-outline"
              label="Location Sharing"
              subtitle="Allow TDC to access your device location"
              color="#FF9800"
              hasToggle
              toggleValue={locationSharing}
              onToggle={setLocationSharing}
            />
            <PrivacyItem 
              icon="analytics-outline"
              label="Data Collection"
              subtitle="Help us improve TDC with usage analytics"
              color="#2196F3"
              isLast
              hasToggle
              toggleValue={dataCollection}
              onToggle={setDataCollection}
            />
          </View>

          {/* Data Sharing */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Data & Permissions
          </Text>
          <View style={styles.card}>
            <PrivacyItem 
              icon="share-social-outline"
              label="Off-TDC Activity"
              subtitle="Manage how we personalize based on external links"
              color="#607D8B"
              onPress={() => Alert.alert("Activity", "Manage external activity tracking")}
            />
            <PrivacyItem 
              icon="download-outline"
              label="Download Your Data"
              subtitle="Request a copy of your TDC data"
              color="#795548"
              onPress={() => Alert.alert("Data", "Request data download?")}
            />
            <PrivacyItem 
              icon="trash-outline"
              label="Delete Account"
              subtitle="Permanently remove your account and data"
              color="#F44336"
              isLast
              onPress={() => Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => Alert.alert("Request Sent", "Your deletion request has been submitted.") }
                ]
              )}
            />
          </View>

          <Text style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={14} color="#f9c349" />
            {" "}Learn more about our Privacy Policy and how we handle your data in the Help Center.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  content: { flex: 1 },
  
  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  heroIconCircle: { width: 90, height: 90, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginBottom: 8 },
  heroDescription: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 21, fontWeight: '500', paddingHorizontal: 10 },
  
  // Privacy Status Card
  privacyStatusCard: { 
    marginHorizontal: 16, marginTop: 20, padding: 16, 
    backgroundColor: '#f8f8f8', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0' 
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  statusBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  statusFill: { height: '100%', borderRadius: 3 },
  statusHint: { fontSize: 11, color: '#999', fontWeight: '500' },
  
  // Section
  sectionTitle: { 
    fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginTop: 24, marginBottom: 12, 
    marginLeft: 20, flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  // Card
  card: { 
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, 
    borderWidth: 2, borderColor: '#f0f0f0', overflow: 'hidden' 
  },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, 
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5' 
  },
  iconBackground: { 
    width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  menuSubLabel: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500', lineHeight: 17 },
  
  footerNote: { padding: 20, textAlign: 'center', fontSize: 12, color: '#999', lineHeight: 18, fontWeight: '500' }
});

