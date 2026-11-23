// app/src/screens/Resume/steps/Step5Certificates.js
// Step 5 of the resume builder (certificates), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import { indexOfKey, keyOf, styles } from './builderShared';

export default function renderStep5(ctx) {
  const { addHandlers, certExpiryDate, certIssueDate, certIssuer, certName, certUrl, confirmRemove, currentResume, editingCertIndex, removeItem, saveItem, saveListItem, setCertExpiryDate, setCertIssueDate, setCertIssuer, setCertName, setCertUrl, setEditingCertIndex } = ctx;
    const items = currentResume?.certifications || [];

    const handleAddCertification = ({ quiet } = {}) => saveItem.run(async () => {
      if (!certName.trim()) {
        if (!quiet) Alert.alert('add a certificate name', 'type the certificate or course name to add it.');
        return;
      }
      // the model's field names (date/url were silently dropped before)
      const newCert = {
        name: certName.trim(),
        organization: certIssuer.trim(),
        issueDate: certIssueDate.trim() || undefined,
        credentialUrl: certUrl.trim(),
        expiryDate: certExpiryDate.trim() || undefined
      };

      if (!(await saveListItem('certifications', newCert, editingCertIndex))) return;
      
      setCertName('');
      setCertIssuer('');
      setCertIssueDate('');
      setCertUrl('');
      setCertExpiryDate('');
      setEditingCertIndex(null);
    });
    addHandlers.current[5] = handleAddCertification;

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.name}</Text>
              <Text style={styles.itemBadgeSub}>{item.organization} • {item.date}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setCertName(item.name);
                setCertIssuer(item.organization);
                setCertIssueDate(item.date || '');
                setCertUrl(item.url || '');
                setCertExpiryDate(item.expiryDate || '');
                setEditingCertIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete certification ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('certifications', item, 'certification', (k) => {
                if (editingCertIndex === k) { setCertName(''); setCertIssuer(''); setCertIssueDate(''); setCertUrl(''); setCertExpiryDate(''); setEditingCertIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingCertIndex !== null ? `Edit Certification #${indexOfKey(items, editingCertIndex) + 1}` : `Certification #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>certification name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AWS Certified Solutions Architect"
          placeholderTextColor={T.textFaint}
          value={certName}
          onChangeText={setCertName}
        />

        <Text style={styles.inputLabel}>issuer</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Amazon Web Services"
          placeholderTextColor={T.textFaint}
          value={certIssuer}
          onChangeText={setCertIssuer}
        />

        <Text style={styles.inputLabel}>issue date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2024"
          placeholderTextColor={T.textFaint}
          value={certIssueDate}
          onChangeText={setCertIssueDate}
        />

        <Text style={styles.inputLabel}>Credential URL (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="credly.com/badges/..."
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={certUrl}
          onChangeText={setCertUrl}
        />

        <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2027"
          placeholderTextColor={T.textFaint}
          value={certExpiryDate}
          onChangeText={setCertExpiryDate}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddCertification} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingCertIndex !== null ? 'update certification' : 'add certification'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingCertIndex !== null ? 'Update Certification' : 'Add Certification'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  
}
