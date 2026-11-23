// app/src/screens/Resume/steps/Step6Summary.js
// Step 6 of the resume builder (summary), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { INDUSTRIES, styles } from './builderShared';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import resumeApi from '../../../api/resumeApi';

export default function renderStep6(ctx) {
  const { aiSummary, currentResume, ensureResume, expandedIndustry, getTargetRoleFallback, handleSaveStep6, lastSummaryRef, requireAccount, roleSearchQuery, saveStep6, saveSummaryQuietly, setExpandedIndustry, setRoleSearchQuery, setTargetSummary, targetSummary, toggleRole, updateResume } = ctx;
    const selectedRoles = currentResume?.targetJobs || [];

    // roles: toggled on the latest saved list
    const handleSelectRole = (role) => toggleRole.run(async () => {
      const resume = await ensureResume();
      if (!resume?._id) return;
      const industry = expandedIndustry || '';
      await updateResume(resume._id, (latest) => {
        const list = latest?.targetJobs || [];
        const exist = list.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
        const updated = exist
          ? list.filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase())
          : [...list, { jobTitle: role, industry, jobType: 'Full-time' }];
        return { targetJobs: updated, targetJob: updated[0] || { jobTitle: role, industry, jobType: 'Full-time' } };
      });
    });

    const handleClearRole = (role) => toggleRole.run(async () => {
      if (!currentResume?._id) return;
      await updateResume(currentResume._id, (latest) => {
        const updated = (latest?.targetJobs || []).filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase());
        return { targetJobs: updated, targetJob: updated[0] || {} };
      });
    });

    const handleAIGenerateSummary = () => {
      if (!requireAccount()) return;
      const jobTitle = getTargetRoleFallback();
      if (!jobTitle || selectedRoles.length === 0) {
        Alert.alert('Required', 'Please select at least one target role first.');
        return;
      }
      aiSummary.run(async () => {
        const skillNames = (currentResume?.skills || []).map(s => s.name).join(', ');
        const expSummary = (currentResume?.workExperience || []).map(w => `${w.position} at ${w.company}`).join(', ');
        const prompt = `Write a concise, powerful 3-4 sentence professional summary for a ${jobTitle} resume. Skills: ${skillNames || 'not specified'}. Experience: ${expSummary || 'not specified'}. Make it ATS-optimized.`;
        const result = await resumeApi.enhanceText(prompt, `professional summary for ${jobTitle}`);
        if (result?.enhanced) {
          setTargetSummary(result.enhanced);
          await updateResume(currentResume._id, { professionalSummary: { summary: result.enhanced } });
          lastSummaryRef.current = result.enhanced;
        }
      });
    };

    return (
      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Search roles or type a custom role & press Enter...</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Search roles..."
          placeholderTextColor={T.textFaint}
          value={roleSearchQuery}
          onChangeText={setRoleSearchQuery}
        />

        {selectedRoles.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>selected:</Text>
            <View style={styles.skillsTagRow}>
              {selectedRoles.map((role, idx) => (
                <View key={idx} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{role.jobTitle}</Text>
                  <TouchableOpacity onPress={() => handleClearRole(role.jobTitle)}>
                    <Text style={{ marginLeft: 6, color: T.danger, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.rolesListContainer}>
          {INDUSTRIES.map(ind => {
            const matched = ind.roles.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()));
            if (matched.length === 0) return null;

            return (
              <View key={ind.name} style={styles.industryBlock}>
                <TouchableOpacity 
                  style={styles.industryHeader}
                  onPress={() => setExpandedIndustry(expandedIndustry === ind.name ? null : ind.name)}
                >
                  <Text style={styles.industryHeaderTitle}>{ind.name}</Text>
                  <Ionicons 
                    name={expandedIndustry === ind.name ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={T.textMuted} 
                  />
                </TouchableOpacity>

                {expandedIndustry === ind.name && (
                  <View style={styles.industryRolesGrid}>
                    {matched.map(role => {
                      const isActive = selectedRoles.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={role} 
                          style={[styles.roleSelectBtn, isActive && styles.roleSelectBtnActive]}
                          onPress={() => handleSelectRole(role)}
                          disabled={toggleRole.running}
                        >
                          <Text style={[styles.roleSelectText, isActive && styles.roleSelectTextActive]}>
                            {role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 24 }]}>professional summary</Text>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Your professional summary will appear here after generation, or type manually..."
          placeholderTextColor={T.textFaint}
          value={targetSummary}
          onChangeText={setTargetSummary}
          onBlur={saveSummaryQuietly}
        />

        <TouchableOpacity 
          style={styles.yellowButton} 
          onPress={handleAIGenerateSummary}
          disabled={aiSummary.running}
          accessibilityRole="button"
          accessibilityLabel="generate summary with ai"
          accessibilityState={{ busy: aiSummary.running }}
        >
          {aiSummary.running ? (
            <ActivityIndicator color={T.ink} size="small" />
          ) : (
            <Text style={styles.yellowButtonText}>⚡ Generate with AI</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 12, backgroundColor: T.ink }]} 
          onPress={handleSaveStep6}
          disabled={saveStep6.running}
          accessibilityRole="button"
          accessibilityLabel="save target job and summary"
          accessibilityState={{ busy: saveStep6.running }}
        >
          {saveStep6.running ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={[styles.yellowButtonText, { color: T.white }]}>💾 Save Target Job & Summary</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  
}
