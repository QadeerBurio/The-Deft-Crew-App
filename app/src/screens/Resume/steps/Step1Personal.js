// app/src/screens/Resume/steps/Step1Personal.js
// Step 1 of the resume builder (personal), moved unchanged out of ResumeBuilder.js (P3a split-only).
// The builder passes the state and helpers this step uses in one object.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { color as T } from '../../../theme/tokens';
import { defaultResumeName } from '../../../utils/resumeRules';
import { styles } from './builderShared';

export default function renderStep1(ctx) {
  const { buildLiveResume, currentResume, fieldError, handleAutoFillUpload, handleSaveStep1, pEmail, pGithub, pLinkedin, pLocation, pName, pPhone, pPortfolio, pTitle, resumeNameInput, savePersonalQuietly, saveResumeName, saveStep1, setPEmail, setPGithub, setPLinkedin, setPLocation, setPName, setPPhone, setPPortfolio, setPTitle, setPreviewTemplateId, setPreviewVisible, setResumeNameInput } = ctx;
    return (
      <View style={styles.formContainer}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>already have a resume?</Text>
          <Text style={styles.bannerText}>
            Upload it and AI will auto-fill all fields — no manual typing needed.
          </Text>
          <View style={styles.bannerButtons}>
            <TouchableOpacity style={styles.bannerUploadBtn} onPress={handleAutoFillUpload}>
              <Text style={styles.bannerUploadBtnText}>upload & auto-fill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerSkipBtn} onPress={() => {
              savePersonalQuietly();
              setPreviewTemplateId(currentResume?.template || 'modern_ats');
              setPreviewVisible(true);
            }}>
              <Text style={styles.bannerSkipBtnText}>skip to preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.inputLabel}>full name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. John Doe"
          placeholderTextColor={T.textFaint}
          value={pName}
          onChangeText={setPName}
          onBlur={savePersonalQuietly}
          accessibilityLabel="full name"
        />
        {fieldError('name')}

        <Text style={styles.inputLabel}>title (like "HR Intern")</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor={T.textFaint}
          value={pTitle}
          onChangeText={setPTitle}
          onBlur={savePersonalQuietly}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="john@example.com"
              placeholderTextColor={T.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={pEmail}
              onChangeText={setPEmail}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>phone</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+92 301 0000000"
              placeholderTextColor={T.textFaint}
              keyboardType="phone-pad"
              value={pPhone}
              onChangeText={setPPhone}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>
        <Text style={styles.fieldHint}>email or phone is needed so employers can reach you</Text>
        {fieldError('contact')}

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>city</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Karachi, Pakistan"
              placeholderTextColor={T.textFaint}
              value={pLocation}
              onChangeText={setPLocation}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>LinkedIn profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="linkedin.com/in/johndoe"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pLinkedin}
              onChangeText={setPLinkedin}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>GitHub profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="github.com/johndoe"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pGithub}
              onChangeText={setPGithub}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>portfolio website</Text>
            <TextInput
              style={styles.textInput}
              placeholder="johndoe.dev"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pPortfolio}
              onChangeText={setPPortfolio}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>resume name</Text>
        <TextInput
          style={styles.textInput}
          placeholder={defaultResumeName(buildLiveResume())}
          placeholderTextColor={T.textFaint}
          value={resumeNameInput}
          onChangeText={setResumeNameInput}
          onBlur={saveResumeName}
          accessibilityLabel="resume name"
        />
        <Text style={styles.fieldHint}>only you see this. leave it empty to use "{defaultResumeName(buildLiveResume())}".</Text>

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 20 }]} 
          onPress={handleSaveStep1}
          disabled={saveStep1.running}
          accessibilityRole="button"
          accessibilityLabel="save personal information"
          accessibilityState={{ busy: saveStep1.running }}
        >
          {saveStep1.running ? (
            <ActivityIndicator color={T.ink} size="small" />
          ) : (
            <Text style={styles.yellowButtonText}>💾 Save Personal Information</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  
}
