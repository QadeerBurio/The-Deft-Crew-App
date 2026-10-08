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
import { color as T, font as F } from "../../theme/tokens";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)

const SecurityItem = ({ icon, title, subtitle, onPress, isLast = false, color = T.yellow }) => {
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
        <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
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
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>security & access</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View style={{ transform: [{ scale: shieldScale }] }}>
              <LinearGradient colors={[T.yellow, T.ink]} style={styles.shieldCircle}>
                <Ionicons name="shield-checkmark" size={45} color={T.white} />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.heroTitle}>account security</Text>
            <Text style={styles.heroDescription}>
              Manage your account's security, keep track of your usage, and monitor connected apps and active sessions.
            </Text>
          </View>

          {/* Security Score */}
          <View style={styles.securityScoreCard}>
            <View style={styles.scoreHeader}>
              <Ionicons name="shield" size={20} color={T.success} />
              <Text style={styles.scoreTitle}>security status</Text>
              <View style={styles.secureBadge}>
                <View style={styles.secureDot} />
                <Text style={styles.secureText}>protected</Text>
              </View>
            </View>
            <View style={styles.scoreBar}>
              <LinearGradient colors={[T.success, '#2E7D32']} style={[styles.scoreFill, { width: '85%' }]} />
            </View>
            <Text style={styles.scoreHint}>your account security is strong</Text>
          </View>

          {/* Security Settings */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            security settings
          </Text>
          <View style={styles.card}>
            <SecurityItem 
              icon="key-outline" 
              title="Two-Factor Authentication" 
              subtitle="Add an extra layer of security to your account"
              color={T.yellow}
              onPress={() => Alert.alert("2FA", "Setup two-factor authentication")} 
            />
            <SecurityItem 
              icon="lock-closed-outline" 
              title="Change Password" 
              subtitle="Update your login credentials regularly"
              color={T.ink}
              onPress={() => navigation.navigate("ChangePassword")} 
            />
            <SecurityItem 
              icon="finger-print-outline" 
              title="Biometric Login" 
              subtitle="Use fingerprint or face ID to login"
              color={T.success}
              isLast
              onPress={() => Alert.alert("Biometric", "Setup biometric authentication")} 
            />
          </View>

          {/* Apps and Sessions */}
          <Text style={styles.sectionTitle}>
            <View style={styles.sectionDot} />
            apps & sessions
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
            quick actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => Alert.alert("Sign Out", "Sign out of all devices?")} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: T.dangerBg }]}>
                <Ionicons name="log-out-outline" size={20} color={T.danger} />
              </View>
              <Text style={styles.quickActionText}>sign out all devices</Text>
              <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickActionBtn, { borderBottomWidth: 0 }]} onPress={() => Alert.alert("Report", "Report suspicious activity")} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: T.yellowSoft }]}>
                <Ionicons name="warning-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.quickActionText}>report suspicious activity</Text>
              <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={14} color={T.yellow} />
            {" "}If you notice suspicious activity, change your password immediately.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.card },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.line, backgroundColor: T.card
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink, letterSpacing: 0.5 },
  
  content: { flex: 1 },
  
  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 24, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line },
  shieldCircle: { width: 90, height: 90, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontFamily: F.heading, color: T.ink, marginBottom: 8 },
  heroDescription: { textAlign: 'center', color: T.textMuted, fontSize: 14, lineHeight: 21, fontFamily: F.bodyMedium, paddingHorizontal: 10 },
  
  // Security Score
  securityScoreCard: { 
    marginHorizontal: 16, marginTop: 20, padding: 16, 
    backgroundColor: T.sand, borderRadius: 16, borderWidth: 2, borderColor: T.line 
  },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  scoreTitle: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink, flex: 1 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  secureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.success },
  secureText: { fontSize: 11, fontFamily: F.bodyBold, color: T.success },
  scoreBar: { height: 6, backgroundColor: T.sand, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  scoreFill: { height: '100%', borderRadius: 3 },
  scoreHint: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyMedium },
  
  // Section
  sectionTitle: { 
    fontSize: 13, fontFamily: F.bodyBold, color: T.ink, marginTop: 24, marginBottom: 12, 
    marginLeft: 20, flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.yellow, marginRight: 10 },
  
  // Cards
  card: { 
    marginHorizontal: 16, backgroundColor: T.card, borderRadius: 16, 
    borderWidth: 2, borderColor: T.line, overflow: 'hidden' 
  },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.line 
  },
  iconBackground: { 
    width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  textContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: F.bodyBold, color: T.ink },
  menuSubtitle: { fontSize: 12, color: T.textFaint, marginTop: 2, fontFamily: F.bodyMedium },
  
  // Quick Actions
  quickActions: { 
    marginHorizontal: 16, backgroundColor: T.card, borderRadius: 16, 
    borderWidth: 2, borderColor: T.line, overflow: 'hidden' 
  },
  quickActionBtn: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, 
    borderBottomWidth: 1, borderBottomColor: T.line, gap: 12 
  },
  quickActionIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickActionText: { flex: 1, fontSize: 15, fontFamily: F.bodySemi, color: T.ink },
  
  footerNote: { padding: 20, textAlign: 'center', fontSize: 12, color: T.textFaint, lineHeight: 18, fontFamily: F.bodyMedium }
});

