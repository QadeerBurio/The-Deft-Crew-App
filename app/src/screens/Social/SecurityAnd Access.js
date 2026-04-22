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

const SecurityItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconBackground}>
      <Ionicons name={icon} size={22} color="#0F1419" />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CFD9DE" />
  </TouchableOpacity>
);

export default function SecurityAndAccess({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0F1419" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & Access</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#1D9BF0" />
          </View>
          <Text style={styles.description}>
            Manage your account's security and keep track of your usage, including connected apps and active sessions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Security Settings</Text>
          <View style={styles.card}>
            <SecurityItem 
              icon="key-outline" 
              title="Security" 
              subtitle="Two-factor authentication and extra protection."
              onPress={() => {}} 
            />
            <SecurityItem 
              icon="phone-portrait-outline" 
              title="Active Sessions" 
              subtitle="See where you are currently logged in."
              onPress={() => {}} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Apps and Sessions</Text>
          <View style={styles.card}>
            <SecurityItem 
              icon="apps-outline" 
              title="Connected Apps" 
              subtitle="Apps linked to your TDC account."
              onPress={() => {}} 
            />
            <SecurityItem 
              icon="log-out-outline" 
              title="Login History" 
              subtitle="Review your recent login activity."
              onPress={() => {}} 
            />
          </View>
        </View>

        <Text style={styles.footerNote}>
          If you notice suspicious activity, we recommend changing your password immediately.
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
    paddingHorizontal: 10
  },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#536471', 
    marginBottom: 8, 
    marginLeft: 4, 
    textTransform: 'uppercase' 
  },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFF3F4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFF',
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
  textContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#0F1419' },
  menuSubtitle: { fontSize: 13, color: '#536471', marginTop: 2 },
  
  footerNote: {
    padding: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#536471',
    lineHeight: 18
  }
});