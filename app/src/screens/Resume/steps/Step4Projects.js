// app/src/screens/Resume/steps/Step4Projects.js
// Step 4 of the resume builder (projects), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as T } from '../../../theme/tokens';
import { indexOfKey, keyOf, styles } from './builderShared';
import resumeApi from '../../../api/resumeApi';

export default function renderStep4(ctx) {
  const { addHandlers, aiProj, confirmRemove, currentResume, editingProjIndex, projDesc, projGithub, projLive, projName, projTech, removeItem, requireAccount, saveItem, saveListItem, setEditingProjIndex, setProjDesc, setProjGithub, setProjLive, setProjName, setProjTech } = ctx;
    const items = currentResume?.projects || [];

    const handleAddProj = ({ quiet } = {}) => saveItem.run(async () => {
      if (!projName.trim()) {
        if (!quiet) Alert.alert('add a project name', 'give your project a short name to add it.');
        return;
      }
      const newItem = {
        name: projName.trim(),
        technologies: projTech.split(',').map(s => s.trim()).filter(Boolean),
        githubUrl: projGithub.trim(),
        url: projLive.trim(),
        description: projDesc.trim()
      };

      if (!(await saveListItem('projects', newItem, editingProjIndex))) return;
      
      setProjName('');
      setProjTech('');
      setProjGithub('');
      setProjLive('');
      setProjDesc('');
      setEditingProjIndex(null);
    });
    addHandlers.current[4] = handleAddProj;

    const handleAIEnhanceProj = () => {
      if (!requireAccount()) return;
      if (!projDesc.trim()) {
        Alert.alert('Empty', 'Please describe your project first.');
        return;
      }
      aiProj.run(async () => {
        const result = await resumeApi.enhanceText(
          projDesc,
          `Project description for ${projName || 'a software project'} using ${projTech || 'various technologies'}`
        );
        if (result?.enhanced) setProjDesc(result.enhanced);
      });
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.name}</Text>
              <Text style={styles.itemBadgeSub}>{Array.isArray(item.technologies) ? item.technologies.join(', ') : item.technologies}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setProjName(item.name);
                setProjTech(Array.isArray(item.technologies) ? item.technologies.join(', ') : item.technologies || '');
                setProjGithub(item.githubUrl || '');
                setProjLive(item.url || '');
                setProjDesc(item.description || '');
                setEditingProjIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete project ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('projects', item, 'project', (k) => {
                if (editingProjIndex === k) { setProjName(''); setProjTech(''); setProjGithub(''); setProjLive(''); setProjDesc(''); setEditingProjIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingProjIndex !== null ? `Edit Project #${indexOfKey(items, editingProjIndex) + 1}` : `Project #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>project name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AI Resume Builder"
          placeholderTextColor={T.textFaint}
          value={projName}
          onChangeText={setProjName}
        />

        <Text style={styles.inputLabel}>tech stack</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. React, Next.js, OpenAI, TailwindCSS, PostgreSQL"
          placeholderTextColor={T.textFaint}
          value={projTech}
          onChangeText={setProjTech}
        />

        <Text style={styles.inputLabel}>GitHub url</Text>
        <TextInput
          style={styles.textInput}
          placeholder="github.com/user/project"
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={projGithub}
          onChangeText={setProjGithub}
        />

        <Text style={styles.inputLabel}>live url</Text>
        <TextInput
          style={styles.textInput}
          placeholder="project.vercel.app"
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={projLive}
          onChangeText={setProjLive}
        />

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>description</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceProj} disabled={aiProj.running} accessibilityRole="button" accessibilityLabel="ai enhance project" accessibilityState={{ busy: aiProj.running }}>
            {aiProj.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="sparkles" size={14} color={T.ink} />}
            <Text style={styles.aiEnhanceMiniBtnText}>ai enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="What did you build? What problem did it solve? What was the impact?"
          placeholderTextColor={T.textFaint}
          value={projDesc}
          onChangeText={setProjDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddProj} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingProjIndex !== null ? 'update project' : 'add project'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingProjIndex !== null ? 'Update Project' : 'Add Project'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  
}
