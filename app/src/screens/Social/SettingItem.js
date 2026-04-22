import React, { useContext } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  
  StatusBar,
  Platform
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext'; // Path to your context
import { Alert } from "react-native";

const SettingItem = ({ icon, label, subLabel, color = "#0F1419", isLast = false, onPress }) => (
  <TouchableOpacity 
    style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingContent}>
      <Ionicons name={icon} size={22} color={color} style={styles.settingIcon} />
      <View style={styles.textContainer}>
        <Text style={[styles.settingLabel, { color }]}>{label}</Text>
        {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CFD9DE" />
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  // Inside the component:
const { logout , user} = useContext(AuthContext);

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
          // Navigation is handled automatically by the Stack.Navigator 
          // if you check for 'token' as shown in step 1.
        }
      }
    ]
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F1419" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>@{user?.name.toLowerCase().replace(/\s/g, '')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Search Bar Placeholder */}
        <TouchableOpacity style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#536471" />
          <Text style={styles.searchText}>Search settings</Text>
        </TouchableOpacity>

        {/* Section: Account */}
        <SettingItem 
          icon="person-outline" 
          label="Your account" 
          subLabel="See information about your account, download an archive of your data, or learn about deactivation options." 
          onPress={() => navigation.navigate("YourAccount")}
        />
        <SettingItem 
          icon="shield-checkmark-outline" 
          label="Security and account access" 
          subLabel="Manage your account's security and keep track of your account's usage." 
          onPress={() => navigation.navigate("SecurityAndAccess")}
        />
       

        <View style={styles.divider} />

        {/* Section: Preferences */}
        
        <SettingItem 
          icon="eye-off-outline" 
          label="Privacy and safety" 
          onPress={() => navigation.navigate("PrivacyAndSafety")}
        />
        <SettingItem 
          icon="accessibility-outline" 
          label="Accessibility, display, and languages" 
          onPress={() => navigation.navigate("AccessibilityDisplay")}
        />
        
        <View style={styles.divider} />

        {/* Section: Support */}
        <SettingItem 
          icon="help-circle-outline" 
          label="Help Center" 
          onPress={() => navigation.navigate("HelpCenter")}
        />
        <SettingItem 
          icon="log-out-outline" 
          label="Log out" 
          color="#F4212E" 
          isLast={true} 
          onPress={handleLogout}
        />

        <Text style={styles.footerVersion}>TDC for Mobile v1.0.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFF3F4',
    paddingTop: Platform.OS === 'ios' ? 40 : 20
    , paddingTop:40
  },
  backBtn: { marginRight: 30, padding: 5 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#0F1419' },
  headerSubtitle: { fontSize: 13, color: '#536471', fontWeight: '400' },
  
  content: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF3F4',
    margin: 16,
    padding: 12,
    borderRadius: 25,
  },
  searchText: { color: '#536471', marginLeft: 10, fontSize: 16 },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFF3F4',
  },
  settingContent: { flexDirection: 'row', alignItems: 'flex-start', flex: 0.95 },
  settingIcon: { marginTop: 2, marginRight: 15 },
  textContainer: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  settingSubLabel: { fontSize: 14, color: '#536471', marginTop: 4, lineHeight: 20 },
  
  divider: { height: 8, backgroundColor: '#F7F9F9', width: '100%' },
  footerVersion: { textAlign: 'center', color: '#536471', fontSize: 12, paddingVertical: 20 }
});