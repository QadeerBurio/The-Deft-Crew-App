// ConfessionComposer.js: the 'share confession' sheet (moved unchanged from ConfessionScreen.js).
import React from "react";
import {
  View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Animated, Keyboard, TouchableWithoutFeedback, ScrollView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { soundTap } from "../../lib/tdcSounds";
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";

export default function ConfessionComposer({
  modalVisible, resetForm, modalSlide, myUniName, postVisibility, setPostVisibility, confessionInputRef,
  newConfession, setNewConfession, selectedImage, setSelectedImage, handlePost, posting,
  // plan P4-1 (flag confessionSafety): why the pre-post check asked for an edit; empty = nothing shown
  issues = [],
}) {
  return (
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={resetForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <Animated.View 
                style={[
                  styles.modalContent, 
                  { 
                    transform: [{ translateY: modalSlide }],
                    opacity: modalSlide.interpolate({
                      inputRange: [0, 300],
                      outputRange: [1, 0.3],
                    })
                  }
                ]}
              >
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>share confession</Text>
                  <TouchableOpacity onPress={resetForm} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="close" hitSlop={8}>
                    <Ionicons name="close" size={22} color={T.ink} />
                  </TouchableOpacity>
                </View>
                <View style={styles.anonymityBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={T.yellow} />
                  <Text style={styles.anonymityText}>Your identity is 100% anonymous</Text>
                </View>
                <View style={styles.visibilityRow}>
                  <Text style={styles.visibilityLabel}>who sees this?</Text>
                  <View style={styles.visibilityChips}>
                    {[
                      { key: 'public', label: 'everyone', icon: 'earth-outline' },
                      { key: 'campus', label: 'my campus', icon: 'school-outline' },
                    ].map((c) => {
                      const active = postVisibility === c.key;
                      const disabled = c.key === 'campus' && !myUniName;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          disabled={disabled}
                          onPress={() => { soundTap(); setPostVisibility(c.key); }}
                          style={[
                            styles.visibilityChip,
                            active && styles.visibilityChipActive,
                            disabled && styles.visibilityChipDisabled,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={c.icon} size={13} color={active ? T.yellow : T.textMuted} />
                          <Text style={[styles.visibilityChipText, active && styles.visibilityChipTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!myUniName ? (
                    <Text style={styles.visibilityHint}>add your university first to post to your campus</Text>
                  ) : postVisibility === 'campus' ? (
                    <Text style={styles.visibilityHint}>only {myUniName} students will see this</Text>
                  ) : null}
                </View>
                <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                  {issues.length > 0 && (
                    <View
                      style={{ backgroundColor: T.yellowSoft, borderRadius: 14, padding: 12, marginBottom: 10 }}
                      accessibilityRole="alert"
                      accessibilityLabel={`edit to post: ${issues.map((x) => x.message).join(' ')}`}
                    >
                      {issues.map((x, i) => (
                        <View key={`${x.code}-${i}`} style={{ flexDirection: 'row', gap: 8, marginBottom: i === issues.length - 1 ? 0 : 6 }}>
                          <Ionicons name="alert-circle-outline" size={16} color={T.ink} style={{ marginTop: 1 }} />
                          <Text style={{ flex: 1, color: T.ink, fontSize: 13 }} maxFontSizeMultiplier={1.3}>
                            {x.message}{x.span ? <Text style={{ fontWeight: '700' }}>{` ("${x.span}")`}</Text> : null}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <TextInput
                    ref={confessionInputRef}
                    style={styles.input}
                    placeholder="What's on your mind? 🤔"
                    placeholderTextColor={T.textFaint}
                    multiline
                    value={newConfession}
                    onChangeText={setNewConfession}
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{newConfession.length}/1000</Text>
                  {selectedImage && (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImage}
                        onPress={() => { soundTap(); setSelectedImage(null); }}
                      >
                        <View style={styles.removeImageBtn}>
                          <Ionicons name="close-circle" size={28} color={T.white} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity style={styles.submitBtn} onPress={handlePost} disabled={posting}>
                    <LinearGradient colors={[T.ink, T.ink]} style={styles.submitGradient}>
                      {posting ? <ActivityIndicator color={T.yellow} /> : (
                        <>
                          <Text style={styles.submitText}>post confession</Text>
                          <Ionicons name="send" size={18} color={T.yellow} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={{ height: Platform.OS === 'ios' ? 20 : 40 }} />
                </ScrollView>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
  );
}
