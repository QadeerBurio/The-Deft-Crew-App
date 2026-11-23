// app/src/screens/Resume/steps/Step3Experience.js
// Step 3 of the resume builder (experience), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import { indexOfKey, keyOf, styles } from './builderShared';
import resumeApi from '../../../api/resumeApi';

export default function renderStep3(ctx) {
  const { addHandlers, aiWork, confirmRemove, currentResume, editingWorkIndex, formatDateForInput, removeItem, requireAccount, saveItem, saveListItem, setEditingWorkIndex, setWorkCompany, setWorkCurrent, setWorkDesc, setWorkEndDate, setWorkLocation, setWorkPosition, setWorkStartDate, workCompany, workCurrent, workDesc, workEndDate, workLocation, workPosition, workStartDate } = ctx;
    const items = currentResume?.workExperience || [];

    const handleAddWork = ({ quiet } = {}) => saveItem.run(async () => {
      if (!workCompany.trim() && !workPosition.trim()) {
        if (!quiet) Alert.alert('add a company or role', 'type where you worked (or your role) to add it.');
        return;
      }
      const newItem = {
        company: workCompany.trim(),
        position: workPosition.trim(),
        location: workLocation.trim(),
        startDate: workStartDate.trim(),
        endDate: workCurrent ? '' : workEndDate.trim(),
        current: workCurrent,
        description: workDesc.trim(),
        achievements: [] // bullets from an upload are in the description box now
      };

      if (!(await saveListItem('workExperience', newItem, editingWorkIndex))) return;
      
      setWorkCompany('');
      setWorkPosition('');
      setWorkLocation('');
      setWorkStartDate('');
      setWorkEndDate('');
      setWorkCurrent(false);
      setWorkDesc('');
      setEditingWorkIndex(null);
    });
    addHandlers.current[3] = handleAddWork;

    const handleAIEnhanceWork = () => {
      if (!requireAccount()) return;
      if (!workDesc.trim()) {
        Alert.alert('Empty', 'Please type in your responsibilities first before enhancing.');
        return;
      }
      aiWork.run(async () => {
        const result = await resumeApi.enhanceText(
          workDesc,
          `Work experience as ${workPosition || 'professional'} at ${workCompany || 'a company'}`
        );
        if (result?.enhanced) setWorkDesc(result.enhanced);
      });
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.position} at {item.company}</Text>
              <Text style={styles.itemBadgeSub}>{item.location} • {item.startDate} - {item.current ? 'Present' : item.endDate}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setWorkCompany(item.company);
                setWorkPosition(item.position);
                setWorkLocation(item.location || '');
                setWorkStartDate(formatDateForInput(item.startDate));
                setWorkEndDate(formatDateForInput(item.endDate));
                setWorkCurrent(item.current || false);
                setWorkDesc([item.description || '', ...(item.achievements || []).map((b) => `• ${b}`)].filter(Boolean).join('\n'));
                setEditingWorkIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete experience ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('workExperience', item, 'experience', (k) => {
                if (editingWorkIndex === k) { setWorkCompany(''); setWorkPosition(''); setWorkLocation(''); setWorkStartDate(''); setWorkEndDate(''); setWorkCurrent(false); setWorkDesc(''); setEditingWorkIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingWorkIndex !== null ? `Edit Experience #${indexOfKey(items, editingWorkIndex) + 1}` : `Experience #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>company name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Google"
          placeholderTextColor={T.textFaint}
          value={workCompany}
          onChangeText={setWorkCompany}
        />

        <Text style={styles.inputLabel}>Job Title / Role</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Software Engineer"
          placeholderTextColor={T.textFaint}
          value={workPosition}
          onChangeText={setWorkPosition}
        />

        <Text style={styles.inputLabel}>location</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Mountain View, CA"
          placeholderTextColor={T.textFaint}
          value={workLocation}
          onChangeText={setWorkLocation}
        />

        <Text style={styles.inputLabel}>start date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Jan 2022"
          placeholderTextColor={T.textFaint}
          value={workStartDate}
          onChangeText={setWorkStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>currently working here</Text>
          <Switch
            value={workCurrent}
            onValueChange={setWorkCurrent}
            trackColor={{ false: T.line, true: T.yellow }}
            thumbColor={workCurrent ? T.white : T.sand}
          />
        </View>

        {!workCurrent && (
          <>
            <Text style={styles.inputLabel}>end date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dec 2023"
              placeholderTextColor={T.textFaint}
              value={workEndDate}
              onChangeText={setWorkEndDate}
            />
          </>
        )}

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>responsibilities & achievements</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceWork} disabled={aiWork.running} accessibilityRole="button" accessibilityLabel="ai enhance experience" accessibilityState={{ busy: aiWork.running }}>
            {aiWork.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="sparkles" size={14} color={T.ink} />}
            <Text style={styles.aiEnhanceMiniBtnText}>ai enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Describe your key responsibilities and achievements. The AI can convert these into polished ATS-friendly bullet points."
          placeholderTextColor={T.textFaint}
          value={workDesc}
          onChangeText={setWorkDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddWork} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingWorkIndex !== null ? 'update experience' : 'add experience'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingWorkIndex !== null ? 'Update Experience' : 'Add Experience'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  
}
