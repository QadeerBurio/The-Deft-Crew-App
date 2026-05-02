import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SecurityItem = ({ icon, title, subtitle, onPress, isLast = false, color = "#f9c349" }) => {
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
        <View style={styles.textContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SecurityAndAccess({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const shieldScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(shieldScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
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
        <Text style={styles.headerTitle}>Security & Access</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View style={{ transform: [{ scale: shieldScale }] }}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.shieldCircle}>
                <Ionicons name="shield-checkmark" size={45} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.heroTitle}>Account Security</Text>
            <Text style={styles.heroDescription}>
              Manage your account's security, keep track of your usage, and monitor connected apps and active sessions.
            </Text>
          </View>

          {/* Security Score */}
          <View style={styles.securityScoreCard}>
            <View style={styles.scoreHeader}>
              <Ionicons name="shield" size={20} color="#4CAF50" />
              <Text style={styles.scoreTitle}>Security Status</Text>
              <View style={styles.secureBadge}>
                <View style={styles.secureDot} />
                <Text style={styles.secureText}>Protected</Text>
              </View>
            </View>
            <View style={styles.scoreBar}>
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={[styles.scoreFill, { width: '85%' }]} />
            </View>
            <Text style={styles.scoreHint}>Your account security is strong</Text>
          </View>

          {/* Security Settings */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Security Settings
          </Text>
          <View style={styles.card}>
            <SecurityItem 
              icon="key-outline" 
              title="Two-Factor Authentication" 
              subtitle="Add an extra layer of security to your account"
              color="#f9c349"
              onPress={() => Alert.alert("2FA", "Setup two-factor authentication")} 
            />
            <SecurityItem 
              icon="lock-closed-outline" 
              title="Change Password" 
              subtitle="Update your login credentials regularly"
              color="#2196F3"
              onPress={() => navigation.navigate("ChangePassword")} 
            />
            <SecurityItem 
              icon="finger-print-outline" 
              title="Biometric Login" 
              subtitle="Use fingerprint or face ID to login"
              color="#4CAF50"
              isLast
              onPress={() => Alert.alert("Biometric", "Setup biometric authentication")} 
            />
          </View>

          {/* Apps and Sessions */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Apps & Sessions
          </Text>
          <View style={styles.card}>
            <SecurityItem 
              icon="phone-portrait-outline" 
              title="Active Sessions" 
              subtitle="See where you're currently logged in"
              color="#FF9800"
              onPress={() => Alert.alert("Sessions", "View active sessions")} 
            />
            <SecurityItem 
              icon="apps-outline" 
              title="Connected Apps" 
              subtitle="Manage apps linked to your TDC account"
              color="#9C27B0"
              onPress={() => Alert.alert("Apps", "View connected applications")} 
            />
            <SecurityItem 
              icon="time-outline" 
              title="Login History" 
              subtitle="Review your recent login activity"
              color="#607D8B"
              isLast
              onPress={() => Alert.alert("History", "View login history")} 
            />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => Alert.alert("Sign Out", "Sign out of all devices?")} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="log-out-outline" size={20} color="#F44336" />
              </View>
              <Text style={styles.quickActionText}>Sign Out All Devices</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickActionBtn, { borderBottomWidth: 0 }]} onPress={() => Alert.alert("Report", "Report suspicious activity")} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="warning-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.quickActionText}>Report Suspicious Activity</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={14} color="#f9c349" />
            {" "}If you notice suspicious activity, change your password immediately.
          </Text>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  content: { flex: 1 },
  
  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  shieldCircle: { width: 90, height: 90, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginBottom: 8 },
  heroDescription: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 21, fontWeight: '500', paddingHorizontal: 10 },
  
  // Security Score
  securityScoreCard: { 
    marginHorizontal: 16, marginTop: 20, padding: 16, 
    backgroundColor: '#f8f8f8', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0' 
  },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  scoreTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  secureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  secureText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  scoreBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  scoreFill: { height: '100%', borderRadius: 3 },
  scoreHint: { fontSize: 11, color: '#999', fontWeight: '500' },
  
  // Section
  sectionTitle: { 
    fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginTop: 24, marginBottom: 12, 
    marginLeft: 20, flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  // Cards
  card: { 
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, 
    borderWidth: 2, borderColor: '#f0f0f0', overflow: 'hidden' 
  },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' 
  },
  iconBackground: { 
    width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  textContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  menuSubtitle: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
  
  // Quick Actions
  quickActions: { 
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, 
    borderWidth: 2, borderColor: '#f0f0f0', overflow: 'hidden' 
  },
  quickActionBtn: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, 
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 
  },
  quickActionIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickActionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  
  footerNote: { padding: 20, textAlign: 'center', fontSize: 12, color: '#999', lineHeight: 18, fontWeight: '500' }
});

