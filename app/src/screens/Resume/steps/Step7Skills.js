// app/src/screens/Resume/steps/Step7Skills.js
// Step 7 of the resume builder (skills), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import resumeApi from '../../../api/resumeApi';
import { styles } from './builderShared';

export default function renderStep7(ctx) {
  const { addSkill, aiSkills, confirmRemove, currentResume, ensureResume, getTargetRoleFallback, removeItem, requireAccount, setSkillInput, skillInput, updateResume } = ctx;
    const items = currentResume?.skills || [];

    const handleAddSkill = () => {
      const name = skillInput.trim();
      if (!name) return;
      addSkill.run(async () => {
        const resume = await ensureResume();
        if (!resume?._id) return;
        await updateResume(resume._id, (latest) => {
          const list = latest?.skills || [];
          if (list.some(s => s.name.toLowerCase() === name.toLowerCase())) return null; // already there
          return { skills: [...list, { name, level: 'Advanced' }] };
        });
        setSkillInput('');
      });
    };

    return (
      <View style={styles.formContainer}>
        <View style={styles.skillInputWrapper}>
          <TextInput
            style={styles.skillTextInput}
            placeholder="Type a skill and press Enter or comma..."
            placeholderTextColor={T.textFaint}
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={handleAddSkill}
          />
          <TouchableOpacity style={styles.skillAddBtn} onPress={handleAddSkill} disabled={addSkill.running} accessibilityRole="button" accessibilityLabel="add skill" accessibilityState={{ busy: addSkill.running }}>
            {addSkill.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="add" size={22} color={T.ink} />}
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCardBody}>
            <Text style={styles.emptyCardText}>No skills added yet — type above or use AI Suggestions</Text>
          </View>
        ) : (
          <View style={styles.skillsTagRow}>
            {items.map((skill, index) => (
              <View key={skill?._id || skill.name || index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill.name}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`remove ${skill.name}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('skills', skill, 'skill')}>
                  <Ionicons name="close" size={14} color={T.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 24 }]}
          disabled={aiSkills.running}
          accessibilityRole="button"
          accessibilityLabel="ai skill suggestions"
          accessibilityState={{ busy: aiSkills.running }}
          onPress={() => {
            if (!requireAccount()) return;
            aiSkills.run(async () => {
              const resume = await ensureResume();
              if (!resume?._id) return;
              const targetRole = getTargetRoleFallback();
              const result = await resumeApi.suggestSkills((resume.skills || []).map(s => s.name), targetRole);
              if (!(result?.suggestions && result.suggestions.length > 0)) {
                Alert.alert('No Suggestions', 'Could not generate suggestions. Try adding a target role in the Target step.');
                return;
              }
              let added = 0;
              // added to the latest list (skills added meanwhile are kept, none twice)
              await updateResume(resume._id, (latest) => {
                const list = latest?.skills || [];
                const existingNames = new Set(list.map(s => s.name.toLowerCase()));
                const newSkills = [...new Set(result.suggestions)]
                  .filter(s => !existingNames.has(String(s).toLowerCase()))
                  .map(s => ({ name: s, level: 'Intermediate' }));
                added = newSkills.length;
                return newSkills.length ? { skills: [...list, ...newSkills] } : null;
              });
              if (added > 0) Alert.alert('Skills Added ✨', `${added} new skills added based on your target role.`);
              else Alert.alert('All Caught Up ✓', 'No new skills to suggest — you already have them!');
            });
          }}
        >
          {aiSkills.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>✨ AI Skill Suggestions</Text>}
        </TouchableOpacity>
        <Text style={styles.skillTipText}>💡 Press Enter or , to add a skill quickly</Text>
      </View>
    );
  
}
