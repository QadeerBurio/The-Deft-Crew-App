// app/src/screens/Resume/steps/Step2Education.js
// Step 2 of the resume builder (education), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import { indexOfKey, keyOf, styles } from './builderShared';

export default function renderStep2(ctx) {
  const { addHandlers, confirmRemove, currentResume, editingEduIndex, eduCurrent, eduDegree, eduEndDate, eduField, eduGpa, eduInstitution, eduSemester, eduStartDate, formatDateForInput, removeItem, saveItem, saveListItem, setEditingEduIndex, setEduCurrent, setEduDegree, setEduEndDate, setEduField, setEduGpa, setEduInstitution, setEduSemester, setEduStartDate } = ctx;
    const items = currentResume?.education || [];

    const handleAddEducation = ({ quiet } = {}) => saveItem.run(async () => {
      if (!eduDegree.trim() && !eduInstitution.trim()) {
        if (!quiet) Alert.alert('add a school or degree', 'type your school, college or university (or your degree) to add it.');
        return;
      }
      const gradeText = eduGpa.trim();
      const gpaNum = Number((gradeText.match(/^(\d(?:\.\d{1,2})?)(?:\s*\/\s*\d(?:\.\d{1,2})?)?$/) || [])[1]);
      const newItem = {
        degree: eduDegree.trim(),
        fieldOfStudy: eduField.trim(),
        institution: eduInstitution.trim(),
        // the grade as typed ("3.5/4", "A", "First Division"); a plain number also as gpa
        grade: gradeText,
        gpa: gpaNum > 0 && gpaNum <= 5 ? gpaNum : undefined,
        currentSemester: eduSemester.trim(),
        startDate: eduStartDate.trim(),
        endDate: eduCurrent ? '' : eduEndDate.trim(),
        current: eduCurrent
      };
      
      if (!(await saveListItem('education', newItem, editingEduIndex))) return;
      
      setEduDegree('');
      setEduField('');
      setEduInstitution('');
      setEduGpa('');
      setEduSemester('');
      setEduStartDate('');
      setEduEndDate('');
      setEduCurrent(false);
      setEditingEduIndex(null);
    });
    addHandlers.current[2] = handleAddEducation;

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.degree} in {item.fieldOfStudy}</Text>
              <Text style={styles.itemBadgeSub}>{item.institution} • {item.startDate} - {item.current ? 'Currently studying' : item.endDate}</Text>
              {item.gpa ? <Text style={styles.itemBadgeSub}>GPA: {item.gpa}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setEduDegree(item.degree);
                setEduField(item.fieldOfStudy);
                setEduInstitution(item.institution);
                setEduGpa(item.gpa || '');
                setEduSemester(item.currentSemester || '');
                setEduStartDate(formatDateForInput(item.startDate));
                setEduEndDate(formatDateForInput(item.endDate));
                setEduCurrent(item.current || false);
                setEditingEduIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete education ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('education', item, 'education', (k) => {
                if (editingEduIndex === k) { setEduDegree(''); setEduField(''); setEduInstitution(''); setEduGpa(''); setEduSemester(''); setEduStartDate(''); setEduEndDate(''); setEduCurrent(false); setEditingEduIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingEduIndex !== null ? `Edit Education #${indexOfKey(items, editingEduIndex) + 1}` : `Education #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>degree</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Bachelor of Science"
          placeholderTextColor={T.textFaint}
          value={eduDegree}
          onChangeText={setEduDegree}
        />

        <Text style={styles.inputLabel}>field of study</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Computer Science"
          placeholderTextColor={T.textFaint}
          value={eduField}
          onChangeText={setEduField}
        />

        <Text style={styles.inputLabel}>University / Institution</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Massachusetts Institute of Technology"
          placeholderTextColor={T.textFaint}
          value={eduInstitution}
          onChangeText={setEduInstitution}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>CGPA / GPA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 3.8 / 4.0"
              placeholderTextColor={T.textFaint}
              value={eduGpa}
              onChangeText={setEduGpa}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Current Semester (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 6th Semester"
              placeholderTextColor={T.textFaint}
              value={eduSemester}
              onChangeText={setEduSemester}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>start date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Sep 2020"
          placeholderTextColor={T.textFaint}
          value={eduStartDate}
          onChangeText={setEduStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>currently studying here</Text>
          <Switch
            value={eduCurrent}
            onValueChange={setEduCurrent}
            trackColor={{ false: T.line, true: T.yellow }}
            thumbColor={eduCurrent ? T.white : T.sand}
          />
        </View>

        {!eduCurrent && (
          <>
            <Text style={styles.inputLabel}>end date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. May 2024"
              placeholderTextColor={T.textFaint}
              value={eduEndDate}
              onChangeText={setEduEndDate}
            />
          </>
        )}

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddEducation} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingEduIndex !== null ? 'update education' : 'add education'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingEduIndex !== null ? 'Update Education' : 'Add Education'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  
}
