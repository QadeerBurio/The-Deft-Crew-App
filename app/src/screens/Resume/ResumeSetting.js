import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ResumeSettingsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { user, isGuest } = useContext(AuthContext);
  const { resumes, currentResume, updateResume, loading } = useContext(ResumeContext);

  const [settings, setSettings] = useState({
    visibility: 'public',
    allowDownload: true,
    allowSharing: true,
    showContactInfo: true,
    showSocialLinks: true,
    showSkills: true,
    showExperience: true,
    showEducation: true,
    showCertifications: true,
    showProjects: true,
    showLanguages: true,
    showInterests: true,
    showReferences: true,
    fontSize: 'medium',
    colorScheme: 'blue',
    language: 'en',
    autoSave: true,
    saveInterval: 30,
    maxResumes: 5,
    defaultTemplate: 'modern',
  });

  const [resume, setResume] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (resumeId) {
      const found = resumes.find(r => r._id === resumeId);
      if (found) {
        setResume(found);
        // Load saved settings if any
        loadSettings(found._id);
      }
    } else if (resumes.length > 0) {
      setResume(resumes[0]);
      loadSettings(resumes[0]._id);
    }
  }, [resumeId, resumes]);

  const loadSettings = async (id) => {
    try {
      const savedSettings = await AsyncStorage.getItem(`resume_settings_${id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      if (resume) {
        await AsyncStorage.setItem(
          `resume_settings_${resume._id}`,
          JSON.stringify(settings)
        );
        
        // Update resume with settings
        await updateResume(resume._id, {
          settings: settings
        });
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Settings saved successfully', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Settings saved successfully');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              visibility: 'public',
              allowDownload: true,
              allowSharing: true,
              showContactInfo: true,
              showSocialLinks: true,
              showSkills: true,
              showExperience: true,
              showEducation: true,
              showCertifications: true,
              showProjects: true,
              showLanguages: true,
              showInterests: true,
              showReferences: true,
              fontSize: 'medium',
              colorScheme: 'blue',
              language: 'en',
              autoSave: true,
              saveInterval: 30,
              maxResumes: 5,
              defaultTemplate: 'modern',
            });
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  };

  const SettingSection = ({ title, icon, children }) => (
    <View style={styles.settingSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#4A90D9" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({ label, description, value, onValueChange, type = 'switch', options = [] }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingRowLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#d1d5db', true: '#4A90D9' }}
          thumbColor={value ? '#fff' : '#fff'}
        />
      ) : type === 'select' ? (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => {
            Alert.alert(
              'Select Option',
              'Choose an option',
              options.map(opt => ({
                text: opt.label,
                onPress: () => onValueChange(opt.value),
              })),
              { cancelable: true }
            );
          }}
        >
          <Text style={styles.selectText}>
            {options.find(o => o.value === value)?.label || value}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Resume Settings</Text>
            <Text style={styles.headerSubtitle}>
              Customize your resume preferences
            </Text>
          </View>
        </View>

        {/* Visibility Settings */}
        <SettingSection title="Visibility & Privacy" icon="eye-outline">
          <SettingRow
            label="Resume Visibility"
            description="Who can view your resume"
            value={settings.visibility}
            onValueChange={(val) => setSettings({ ...settings, visibility: val })}
            type="select"
            options={[
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' },
              { label: 'Unlisted', value: 'unlisted' },
            ]}
          />
          <SettingRow
            label="Allow Download"
            description="Allow others to download your resume"
            value={settings.allowDownload}
            onValueChange={(val) => setSettings({ ...settings, allowDownload: val })}
          />
          <SettingRow
            label="Allow Sharing"
            description="Allow others to share your resume"
            value={settings.allowSharing}
            onValueChange={(val) => setSettings({ ...settings, allowSharing: val })}
          />
        </SettingSection>

        {/* Display Settings */}
        <SettingSection title="Display Options" icon="options-outline">
          <SettingRow
            label="Show Contact Info"
            value={settings.showContactInfo}
            onValueChange={(val) => setSettings({ ...settings, showContactInfo: val })}
          />
          <SettingRow
            label="Show Social Links"
            value={settings.showSocialLinks}
            onValueChange={(val) => setSettings({ ...settings, showSocialLinks: val })}
          />
          <SettingRow
            label="Show Skills"
            value={settings.showSkills}
            onValueChange={(val) => setSettings({ ...settings, showSkills: val })}
          />
          <SettingRow
            label="Show Experience"
            value={settings.showExperience}
            onValueChange={(val) => setSettings({ ...settings, showExperience: val })}
          />
          <SettingRow
            label="Show Education"
            value={settings.showEducation}
            onValueChange={(val) => setSettings({ ...settings, showEducation: val })}
          />
          <SettingRow
            label="Show Certifications"
            value={settings.showCertifications}
            onValueChange={(val) => setSettings({ ...settings, showCertifications: val })}
          />
          <SettingRow
            label="Show Projects"
            value={settings.showProjects}
            onValueChange={(val) => setSettings({ ...settings, showProjects: val })}
          />
          <SettingRow
            label="Show Languages"
            value={settings.showLanguages}
            onValueChange={(val) => setSettings({ ...settings, showLanguages: val })}
          />
          <SettingRow
            label="Show Interests"
            value={settings.showInterests}
            onValueChange={(val) => setSettings({ ...settings, showInterests: val })}
          />
          <SettingRow
            label="Show References"
            value={settings.showReferences}
            onValueChange={(val) => setSettings({ ...settings, showReferences: val })}
          />
        </SettingSection>

        {/* Appearance Settings */}
        <SettingSection title="Appearance" icon="color-palette-outline">
          <SettingRow
            label="Font Size"
            value={settings.fontSize}
            onValueChange={(val) => setSettings({ ...settings, fontSize: val })}
            type="select"
            options={[
              { label: 'Small', value: 'small' },
              { label: 'Medium', value: 'medium' },
              { label: 'Large', value: 'large' },
            ]}
          />
          <SettingRow
            label="Color Scheme"
            value={settings.colorScheme}
            onValueChange={(val) => setSettings({ ...settings, colorScheme: val })}
            type="select"
            options={[
              { label: 'Blue', value: 'blue' },
              { label: 'Green', value: 'green' },
              { label: 'Purple', value: 'purple' },
              { label: 'Red', value: 'red' },
              { label: 'Orange', value: 'orange' },
            ]}
          />
          <SettingRow
            label="Default Template"
            value={settings.defaultTemplate}
            onValueChange={(val) => setSettings({ ...settings, defaultTemplate: val })}
            type="select"
            options={[
              { label: 'Modern', value: 'modern' },
              { label: 'Classic', value: 'classic' },
              { label: 'Creative', value: 'creative' },
              { label: 'Minimal', value: 'minimal' },
              { label: 'Professional', value: 'professional' },
            ]}
          />
          <SettingRow
            label="Language"
            value={settings.language}
            onValueChange={(val) => setSettings({ ...settings, language: val })}
            type="select"
            options={[
              { label: 'English', value: 'en' },
              { label: 'Spanish', value: 'es' },
              { label: 'French', value: 'fr' },
              { label: 'German', value: 'de' },
            ]}
          />
        </SettingSection>

        {/* Auto-save Settings */}
        <SettingSection title="Auto-Save" icon="save-outline">
          <SettingRow
            label="Auto-Save"
            description="Automatically save changes"
            value={settings.autoSave}
            onValueChange={(val) => setSettings({ ...settings, autoSave: val })}
          />
          {settings.autoSave && (
            <SettingRow
              label="Save Interval (seconds)"
              value={settings.saveInterval}
              onValueChange={(val) => setSettings({ ...settings, saveInterval: val })}
              type="select"
              options={[
                { label: '15 seconds', value: 15 },
                { label: '30 seconds', value: 30 },
                { label: '60 seconds', value: 60 },
                { label: '120 seconds', value: 120 },
              ]}
            />
          )}
        </SettingSection>

        {/* Account Settings */}
        <SettingSection title="Account" icon="person-outline">
          <SettingRow
            label="Maximum Resumes"
            value={settings.maxResumes}
            onValueChange={(val) => setSettings({ ...settings, maxResumes: val })}
            type="select"
            options={[
              { label: '3', value: 3 },
              { label: '5', value: 5 },
              { label: '10', value: 10 },
              { label: 'Unlimited', value: -1 },
            ]}
          />
          {!isGuest && (
            <TouchableOpacity style={styles.dangerButton}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              <Text style={styles.dangerButtonText}>Delete All Resumes</Text>
            </TouchableOpacity>
          )}
        </SettingSection>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetDefaults}
          >
            <Ionicons name="refresh-outline" size={20} color="#E74C3C" />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
          >
            <Ionicons name="checkmark-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Resume settings are saved locally and synced to your account
          </Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingRowLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: '#2c3e50',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f2f5',
    borderRadius: 6,
  },
  selectText: {
    fontSize: 14,
    color: '#2c3e50',
    marginRight: 4,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionContainer: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
    marginRight: 6,
  },
  resetButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    marginLeft: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  footerVersion: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 8,
  },
});

export default ResumeSettingsScreen;