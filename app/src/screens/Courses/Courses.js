import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  
  ScrollView, 
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur'; 
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2; // Perfect spacing for 2 columns

const ModernDashboard = () => {
  const navigation = useNavigation();

  const menuItems = [
    { 
      id: 1, 
      name: 'Learning', 
      routeName: 'AiSkillsScreen', 
      icon: 'brain', 
      sub: 'AI Mastery', 
      colors: ['#6366f1', '#a855f7'],
      size: 'large'
    },
    { 
      id: 2, 
      name: 'Events', 
      routeName: 'Events', 
      icon: 'calendar-star', 
      sub: 'Meetups', 
      colors: ['#f43f5e', '#fb923c'],
      size: 'small'
    },
    { 
      id: 3, 
      name: 'Resume', 
      routeName: 'ResumeDashboard', 
      icon: 'file-document-edit', 
      sub: 'Builder', 
      colors: ['#06b6d4', '#3b82f6'],
      size: 'small'
    },
    { 
      id: 4, 
      name: 'Jobs', 
      routeName: 'CareerHub', 
      icon: 'briefcase-variant', 
      sub: 'Careers', 
      colors: ['#10b981', '#34d399'],
      size: 'large'
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brandTitle}>tdc. Hub</Text>
              <View style={styles.subBadge}>
                <Text style={styles.brandSubtitle}>DIGITAL WORKSPACE</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.avatarContainer}>
              <LinearGradient colors={['#a855f7', '#6366f1']} style={styles.avatarGlow} />
              <View style={styles.avatarInner}>
                <MaterialCommunityIcons name="face-man-profile" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Hero Highlight */}
          <View style={styles.heroWrapper}>
            <LinearGradient 
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']} 
              style={styles.heroCard}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroTag}>tdc.</Text>
                <Text style={styles.heroTitle}>The Deft{"\n"}Crew AI</Text>
                <TouchableOpacity 
                  style={styles.heroBtn}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.heroBtnText}>Explore Now</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.heroIconContainer}>
                 <MaterialCommunityIcons name="rocket-launch" size={110} color="rgba(255,255,255,0.08)" />
              </View>
            </LinearGradient>
          </View>

          {/* Attractive 2-Column Grid */}
          <Text style={styles.sectionLabel}>CORE MODULES</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              {menuItems.filter((_, i) => i % 2 === 0).map((item) => (
                <GridCard key={item.id} item={item} navigation={navigation} />
              ))}
            </View>
            <View style={[styles.gridColumn, { marginTop: 25 }]}>
              {menuItems.filter((_, i) => i % 2 !== 0).map((item) => (
                <GridCard key={item.id} item={item} navigation={navigation} />
              ))}
            </View>
          </View>

          {/* Community Footer */}
          <View style={styles.footerInfo}>
             <TouchableOpacity activeOpacity={0.9}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.footerCard}>
                  <View style={styles.footerIconBg}>
                    <MaterialCommunityIcons name="account-group" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.footerTextGroup}>
                    <Text style={styles.footerTitle}>Community Update</Text>
                    <Text style={styles.footerDesc}>12 new members joined today.</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.3)" />
                </LinearGradient>
             </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// Reusable Sub-Component for Grid Cards
const GridCard = ({ item, navigation }) => (
  <TouchableOpacity 
    activeOpacity={0.85} 
    style={[styles.gridItem, { height: item.size === 'large' ? 220 : 180 }]}
    onPress={() => navigation.navigate(item.routeName)}
  >
    <BlurView intensity={Platform.OS === 'ios' ? 30 : 100} tint="dark" style={styles.glassCard}>
      <LinearGradient 
        colors={['rgba(255,255,255,0.1)', 'transparent']} 
        style={StyleSheet.absoluteFill} 
      />
      
      <View style={styles.cardHeader}>
        <LinearGradient 
          colors={item.colors} 
          start={{x:0, y:0}} 
          end={{x:1, y:1}} 
          style={styles.iconCircle}
        >
          <MaterialCommunityIcons name={item.icon} size={26} color="#FFF" />
        </LinearGradient>
        <View style={styles.cardStatus}>
          <View style={[styles.statusDot, { backgroundColor: item.colors[0] }]} />
        </View>
      </View>
      
      <View style={styles.cardInfo}>
        <Text style={styles.cardMainText}>{item.name}</Text>
        <Text style={styles.cardSubText}>{item.sub}</Text>
      </View>

      <MaterialCommunityIcons 
        name="plus" 
        size={20} 
        color="rgba(255,255,255,0.2)" 
        style={styles.plusIcon} 
      />
    </BlurView>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  glowTop: { position: 'absolute', top: -150, right: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(22, 22, 33, 0.12)' },
  glowBottom: { position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(30, 20, 39, 0.08)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, marginBottom: 25 },
  brandTitle: { fontSize: 34, fontWeight: '900', color: '#FFF', letterSpacing: -1.5 },
  subBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  brandSubtitle: { fontSize: 10, fontWeight: '900', color: '#a855f7', letterSpacing: 2 },
  avatarContainer: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  avatarGlow: { position: 'absolute', width: 56, height: 56, borderRadius: 28, opacity: 0.6 },
  avatarInner: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  heroWrapper: { paddingHorizontal: 24, marginBottom: 35 },
  heroCard: { borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  heroContent: { zIndex: 2 },
  heroTag: { color: '#fb923c', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', lineHeight: 38, marginBottom: 20 },
  heroBtn: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  heroBtnText: { color: '#000', fontWeight: '800', fontSize: 15, marginRight: 4 },
  heroIconContainer: { position: 'absolute', right: -10, bottom: -10 },
  sectionLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginHorizontal: 24, marginBottom: 20 },
  
  // Grid Styles
  gridContainer: { flexDirection: 'row', paddingHorizontal: 20, justifyContent: 'space-between' },
  gridColumn: { width: COLUMN_WIDTH },
  gridItem: { width: '100%', marginBottom: 20 },
  glassCard: { flex: 1, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  iconCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  cardStatus: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  cardInfo: { flex: 1, justifyContent: 'flex-end' },
  cardMainText: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  cardSubText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  plusIcon: { position: 'absolute', bottom: 15, right: 15 },

  // Footer
  footerInfo: { paddingHorizontal: 24, marginTop: 10 },
  footerCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  footerIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  footerTextGroup: { flex: 1 },
  footerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footerDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }
});

export default ModernDashboard;