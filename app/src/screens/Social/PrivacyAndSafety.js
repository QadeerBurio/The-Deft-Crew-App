import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 

  TouchableOpacity, 
  ScrollView, 
  StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PrivacyItem = ({ icon, label, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconBackground}>
      <Ionicons name={icon} size={22} color="#0F1419" />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuSubLabel}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CFD9DE" />
  </TouchableOpacity>
);

export default function PrivacyAndSafety({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0F1419" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy and safety</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="eye-off-outline" size={40} color="#1D9BF0" />
          </View>
          <Text style={styles.description}>
            Manage what information you see and share on TDC.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your TDC Activity</Text>
          <View style={styles.card}>
            <PrivacyItem 
              icon="people-outline"
              label="Audience and tagging"
              subtitle="Manage what information you allow others to see."
              onPress={() => {}}
            />
            <PrivacyItem 
              icon="document-text-outline"
              label="Content you see"
              subtitle="Decide what shows up in your feed based on interests."
              onPress={() => {}}
            />
            <PrivacyItem 
              icon="volume-mute-outline"
              label="Mute and block"
              subtitle="Manage accounts and notifications you've restricted."
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <View style={styles.card}>
            <PrivacyItem 
              icon="location-outline"
              label="Location information"
              subtitle="Manage how TDC uses your device location."
              onPress={() => {}}
            />
            <PrivacyItem 
              icon="share-social-outline"
              label="Off-TDC activity"
              subtitle="Manage how we personalize based on external links."
              onPress={() => {}}
            />
          </View>
        </View>

        <Text style={styles.footerNote}>
          Learn more about our Privacy Policy and how we handle your data in the Help Center.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F9" },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFF3F4',
    paddingTop: 40 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F1419' },
  
  content: { flex: 1 },
  introSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFF3F4',
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  description: { 
    textAlign: 'center',
    color: '#536471', 
    fontSize: 14, 
    lineHeight: 20,
  },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { 
    paddingLeft: 4,
    fontSize: 13, 
    fontWeight: '800', 
    color: '#536471', 
    marginBottom: 8, 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFF3F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#F7F9F9' 
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F7F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#0F1419' },
  menuSubLabel: { fontSize: 13, color: '#536471', marginTop: 2, lineHeight: 18 },
  
  footerNote: {
    padding: 30,
    textAlign: 'center',
    fontSize: 12,
    color: '#536471',
    lineHeight: 18
  }
});