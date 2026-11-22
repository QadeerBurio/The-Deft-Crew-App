// ConfessionComments.js: the comments sheet (moved unchanged from ConfessionScreen.js).
import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, TouchableWithoutFeedback,
} from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { soundTap } from "../../lib/tdcSounds";
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";

export default function ConfessionComments({
  commentModalVisible, closeComments, commentSlide, keyboardHeight, selectedPost, commentFlatListRef, organizedComments,
  renderComment, replyTo, setReplyTo, setCommentText, setSelectedMentions, showMentionSuggestions, mentionResults,
  handleMentionSelect, commentInputRef, commentText, handleCommentTextChange, handlePostComment, commentLoading,
}) {
  return (
      <Modal
        visible={commentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeComments}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeComments}>
          <View style={styles.commentModalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[
                styles.commentSheet,
                {
                  transform: [{ translateY: commentSlide }],
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
                }
              ]}>
                <View style={styles.dragHandle} />
                <View style={styles.commentHeader}>
                  <View style={styles.commentHeaderLeft}>
                    <Ionicons name="chatbubbles" size={20} color={T.yellow} />
                    <Text style={styles.commentTitle}>comments</Text>
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountBadgeText}>{selectedPost?.comments?.length || 0}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeComments} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="close comments" hitSlop={8}>
                    <Ionicons name="close" size={22} color={T.ink} />
                  </TouchableOpacity>
                </View>

                <View style={styles.commentSheetContent}>
                  <FlatList
                    ref={commentFlatListRef}
                    data={organizedComments}
                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                    renderItem={renderComment}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <Ionicons name="chatbubble-outline" size={50} color={T.textFaint} />
                        <Text style={styles.emptyCommentTitle}>no comments yet</Text>
                        <Text style={styles.emptyCommentSub}>be the first to comment!</Text>
                      </View>
                    }
                    contentContainerStyle={styles.commentListContent}
                    showsVerticalScrollIndicator={true}
                  />
                </View>

                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={styles.keyboardAvoidingView}
                >
                  <View style={styles.commentInputWrapper}>
                    {replyTo && (
                      <View style={styles.replyNotifier}>
                        <View style={styles.replyNotifierLeft}>
                          <Ionicons name="return-down-forward" size={14} color={T.yellow} />
                          <Text style={styles.replyNotifierText}>
                            replying to <Text style={styles.replyNotifierName}>{replyTo.userName}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                          soundTap();
                          setReplyTo(null);
                          setCommentText("");
                          setSelectedMentions([]);
                        }} accessibilityRole="button" accessibilityLabel="cancel reply" hitSlop={8}>
                          <Ionicons name="close-circle" size={18} color={T.textFaint} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {showMentionSuggestions && mentionResults.length > 0 && (
                      <View style={styles.mentionSuggestions}>
                        <FlatList
                          data={mentionResults}
                          keyExtractor={(u) => u._id}
                          keyboardShouldPersistTaps="always"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.mentionItem}
                              onPress={() => handleMentionSelect(item)}
                            >
                              {item.profileImage ? (
                                <RemoteImage source={{ uri: item.profileImage }} style={styles.mentionAvatar} size="avatar" />
                              ) : (
                                <LinearGradient colors={[T.yellow, '#e6b800']} style={styles.mentionAvatarPlaceholder}>
                                  <Text style={styles.mentionAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                                </LinearGradient>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mentionName}>{item.name}</Text>
                                {item.username && <Text style={styles.mentionUsername}>@{item.username}</Text>}
                              </View>
                              <Ionicons name="at" size={18} color={T.ink} />
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}

                    <View style={styles.inputArea}>
                      <TextInput
                        ref={commentInputRef}
                        style={styles.commentInput}
                        placeholder="Write an anonymous comment... Use @ to mention"
                        placeholderTextColor={T.textFaint}
                        value={commentText}
                        onChangeText={handleCommentTextChange}
                        multiline
                        maxHeight={100}
                      />
                      <TouchableOpacity
                        onPress={handlePostComment}
                        disabled={commentLoading || !commentText.trim()}
                        style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                      >
                        <LinearGradient
                          colors={commentText.trim() ? [T.yellow, '#e6b800'] : [T.textFaint, T.sand]}
                          style={styles.postBtnGradient}
                        >
                          {commentLoading ? (
                            <ActivityIndicator size="small" color={T.white} />
                          ) : (
                            <Ionicons name="send" size={18} color={T.white} />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
  );
}
