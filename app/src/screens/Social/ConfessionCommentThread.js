// ConfessionCommentThread.js: one anonymous comment and its replies (moved unchanged from ConfessionScreen.js).
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";

export default function ConfessionCommentThread({ item, collapsedThreads, formatPostTime, onReplyPress, handleDeleteComment, toggleThread }) {
    const isCollapsed = collapsedThreads[item._id] === true;
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const visibleReplies = isCollapsed ? [] : replies;

    return (
      <View style={styles.threadContainer}>
        <View style={styles.parentRow}>
          <View style={styles.avatarLg}>
            <Ionicons name="person" size={16} color={T.yellow} />
          </View>
          <View style={styles.parentContent}>
            <View style={styles.bubbleLg}>
              <Text style={styles.authorNameLg}>anonymous</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
            <View style={styles.metaRowLg}>
              <Text style={styles.metaText}>{formatPostTime(item.createdAt)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => onReplyPress(item, item._id)}>
                <Text style={styles.replyBtn}>reply</Text>
              </TouchableOpacity>
              {item.isMyComment && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                    <Text style={[styles.replyBtn, styles.deleteBtnText]}>delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {hasReplies && (
          <View style={styles.treeWrapper}>
            <View style={styles.verticalLine} />

            <TouchableOpacity
              style={styles.viewRepliesBtn}
              onPress={() => toggleThread(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={T.ink}
              />
              <Text style={styles.viewRepliesText}>
                {isCollapsed
                  ? `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                  : `Hide ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>

            {visibleReplies.map((reply, index) => {
              const mentionMatch = reply.text?.match(/^@(\S+)\s/);
              const mention = mentionMatch ? mentionMatch[1] : null;
              const displayText = mention ? reply.text.replace(/^@\S+\s/, '') : reply.text;
              const isLast = index === visibleReplies.length - 1;

              return (
                <View key={reply._id} style={styles.treeBranch}>
                  <View style={[
                    styles.branchConnector,
                    isLast && styles.branchConnectorLast,
                  ]} />
                  <View style={styles.avatarSm}>
                    <Ionicons name="person" size={12} color={T.yellow} />
                  </View>
                  <View style={styles.replyContent}>
                    <View style={styles.bubbleSm}>
                      <Text style={styles.authorNameSm}>anonymous</Text>
                      <Text style={styles.replyTextContent}>
                        {mention && <Text style={styles.mentionText}>@{mention} </Text>}
                        {displayText}
                      </Text>
                    </View>
                    <View style={styles.metaRowSm}>
                      <Text style={styles.metaTextSm}>{formatPostTime(reply.createdAt)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <TouchableOpacity onPress={() => onReplyPress(reply, item._id)}>
                        <Text style={styles.replyBtnSm}>reply</Text>
                      </TouchableOpacity>
                      {reply.isMyComment && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <TouchableOpacity onPress={() => handleDeleteComment(reply)}>
                            <Text style={[styles.replyBtnSm, styles.deleteBtnText]}>delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
}
