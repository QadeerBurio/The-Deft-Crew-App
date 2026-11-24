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
import { MOOD_IMAGES } from "../../engagement/utils/mood";

export default function ConfessionComposer({
  modalVisible, resetForm, modalSlide, myUniName, postVisibility, setPostVisibility, confessionInputRef,
  newConfession, setNewConfession, selectedImage, setSelectedImage, handlePost, posting,
  // plan P4-1 (flag confessionSafety): why the pre-post check asked for an edit; empty = nothing shown
  issues = [],
  // P4a: onPickImage (flag confessionSafety: images are checked): the "add a photo" button. v2 (flag confessionsV2): the
  // composer config { tags, prompts, moods, maxLength, handle }; with it: prompt chips, tag, mood, post as, 500 chars.
  // Without them the sheet is exactly as before.
  onPickImage = null, v2 = null, tag = null, setTag = () => {}, mood = null, setMood = () => {}, postAs = "anon", setPostAs = () => {},
  // P4b (flag confessionPolls): pollOptions null = no poll yet ("add a poll"); an array = the 2-4 option fields
  setPollOptions = null, pollOptions = null,
}) {
  const maxLength = v2 ? (v2.maxLength || 500) : 1000;
  const chip = (active) => [styles.visibilityChip, active && styles.visibilityChipActive];
  const chipText = (active) => [styles.visibilityChipText, active && styles.visibilityChipTextActive];
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
                  {v2 && !newConfession && Array.isArray(v2.prompts) && v2.prompts.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.visibilityLabel}>not sure where to start?</Text>
                      <View style={[styles.visibilityChips, { flexWrap: 'wrap' }]}>
                        {v2.prompts.map((p) => (
                          <TouchableOpacity key={p} style={chip(false)} onPress={() => { soundTap(); setNewConfession(`${p}: `); }} accessibilityRole="button" accessibilityLabel={`start with: ${p}`}>
                            <Text style={chipText(false)}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
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
                    maxLength={maxLength}
                  />
                  {v2
                    ? <Text style={styles.charCount}>{`${newConfession.length}/${maxLength}`}</Text>
                    : <Text style={styles.charCount}>{newConfession.length}/1000</Text>}
                  {onPickImage && !selectedImage && (
                    <TouchableOpacity style={[chip(false), { alignSelf: 'flex-start', marginBottom: 10 }]} onPress={onPickImage} accessibilityRole="button" accessibilityLabel="add a photo">
                      <Ionicons name="image-outline" size={14} color={T.textMuted} />
                      <Text style={chipText(false)}>add a photo</Text>
                    </TouchableOpacity>
                  )}
                  {v2 && setPollOptions ? (
                    pollOptions ? (
                      <View style={{ marginBottom: 10 }}>
                        <Text style={styles.visibilityLabel}>poll (votes are anonymous)</Text>
                        {pollOptions.map((o, i) => (
                          <View key={`opt-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <TextInput
                              style={[styles.input, { flex: 1, minHeight: 44, marginBottom: 0 }]}
                              value={o}
                              onChangeText={(t) => setPollOptions(pollOptions.map((x, j) => (j === i ? t : x)))}
                              placeholder={`option ${i + 1}`}
                              placeholderTextColor={T.textFaint}
                              maxLength={60}
                              accessibilityLabel={`poll option ${i + 1}`}
                            />
                            {pollOptions.length > 2 ? (
                              <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`remove option ${i + 1}`} hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="close-circle-outline" size={20} color={T.textMuted} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ))}
                        <View style={styles.visibilityChips}>
                          {pollOptions.length < 4 ? (
                            <TouchableOpacity style={chip(false)} onPress={() => setPollOptions([...pollOptions, ''])} accessibilityRole="button" accessibilityLabel="add an option">
                              <Text style={chipText(false)}>+ option</Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity style={chip(false)} onPress={() => setPollOptions(null)} accessibilityRole="button" accessibilityLabel="remove the poll">
                            <Text style={chipText(false)}>remove poll</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={[chip(false), { alignSelf: 'flex-start', marginBottom: 10 }]} onPress={() => { soundTap(); setPollOptions(['', '']); }} accessibilityRole="button" accessibilityLabel="add a poll">
                        <Ionicons name="stats-chart-outline" size={14} color={T.textMuted} />
                        <Text style={chipText(false)}>add a poll</Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                  {v2 && Array.isArray(v2.tags) && v2.tags.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.visibilityLabel}>tag</Text>
                      <View style={[styles.visibilityChips, { flexWrap: 'wrap' }]}>
                        {v2.tags.map((t) => (
                          <TouchableOpacity key={t.id} style={chip(tag === t.id)} onPress={() => { soundTap(); setTag(tag === t.id ? null : t.id); }} accessibilityRole="button" accessibilityState={{ selected: tag === t.id }} accessibilityLabel={`tag ${t.label}`}>
                            <Text style={chipText(tag === t.id)}>#{t.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  {v2 && Array.isArray(v2.moods) && v2.moods.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.visibilityLabel}>mood</Text>
                      <View style={[styles.visibilityChips, { flexWrap: 'wrap' }]}>
                        {v2.moods.map((m) => (
                          <TouchableOpacity key={m} style={chip(mood === m)} onPress={() => { soundTap(); setMood(mood === m ? null : m); }} accessibilityRole="button" accessibilityState={{ selected: mood === m }} accessibilityLabel={`mood ${m}`}>
                            <Image source={MOOD_IMAGES[m]} style={{ width: 16, height: 16 }} />
                            <Text style={chipText(mood === m)}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  {v2?.handle?.enabled && v2.handle.handle ? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.visibilityLabel}>post as</Text>
                      <View style={styles.visibilityChips}>
                        {[['handle', `@${v2.handle.handle}`], ['anon', 'fully anon']].map(([k, label]) => (
                          <TouchableOpacity key={k} style={chip(postAs === k)} onPress={() => { soundTap(); setPostAs(k); }} accessibilityRole="button" accessibilityState={{ selected: postAs === k }} accessibilityLabel={`post as ${label}`}>
                            <Text style={chipText(postAs === k)}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.visibilityHint}>{postAs === 'handle' ? 'your handle, never your name. your posts as @handle can be linked to each other.' : 'no name, no handle: anon., as always.'}</Text>
                    </View>
                  ) : null}
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
