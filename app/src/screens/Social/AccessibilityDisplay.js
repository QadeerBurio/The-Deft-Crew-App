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

const DisplayItem = ({ icon, label, subtitle, onPress }) => (
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

export default function AccessibilityDisplay({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0F1419" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Display & Languages</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="color-palette-outline" size={40} color="#1D9BF0" />
          </View>
          <Text style={styles.description}>
            Manage how TDC looks to you and select your preferred language settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <DisplayItem 
              icon="moon-outline"
              label="Display"
              subtitle="Manage Dark Mode, Light Mode, and contrast."
              onPress={() => {}}
            />
            <DisplayItem 
              icon="text-outline"
              label="Text Size"
              subtitle="Adjust the font size for better readability."
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localization</Text>
          <View style={styles.card}>
            <DisplayItem 
              icon="language-outline"
              label="Languages"
              subtitle="Choose your primary language for TDC."
              onPress={() => {}}
            />
            <DisplayItem 
              icon="globe-outline"
              label="Region"
              subtitle="Set your preferred regional formats."
              onPress={() => {}}
            />
          </View>
        </View>

        <Text style={styles.footerNote}>
          These settings affect your experience on this device only.
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