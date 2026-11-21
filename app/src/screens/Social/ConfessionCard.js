// ConfessionCard.js: one confession in the feed (moved unchanged from ConfessionScreen.js).
import React from "react";
import { View, Text, TouchableOpacity, Animated, Share } from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { Ionicons } from '@expo/vector-icons';
import { soundTap } from "../../lib/tdcSounds";
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";

export default function ConfessionCard({ item, isExpanded, lineCount, scope, highlightId, fadeAnim, formatPostTime, handleTextLayout, toggleExpand, handleLike, openComments }) {
    const isLiked = item.likedByCurrentUser;
    const shouldShowMore = lineCount > 7 || (item.text?.length || 0) > 250;
    const isCampus = item.visibility === 'campus';

    return (
      <Animated.View style={[styles.card, highlightId === String(item._id) && styles.cardHighlight, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarQ}>?</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.anonymousName}>anon.</Text>
                <Text style={styles.nameDot}>·</Text>
                <Text style={[styles.postTime, { marginTop: 0 }]}>{formatPostTime(item.createdAt)}</Text>
              </View>
              {/* University name only in the "my campus" tab */}
              {scope === 'campus' && !!item.campusName && (
                <View style={styles.campusPill}>
                  <Ionicons name="school" size={11} color={T.onInkMuted} />
                  <Text style={styles.campusPillText} numberOfLines={1}>
                    {item.campusName}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.confessionBadge}>
            <Ionicons name="lock-closed" size={10} color={isCampus ? T.yellow : T.onInkMuted} />
            <Text style={[styles.badgeText, isCampus && { color: T.yellow }]}>
              {isCampus ? 'campus only' : 'confession'}
            </Text>
          </View>
        </View>

        {item.text && (
          <View>
            <Text
              style={styles.confessionText}
              numberOfLines={isExpanded ? undefined : 7}
              onTextLayout={(e) => handleTextLayout(item._id, e)}
            >
              {item.text}
            </Text>
            {shouldShowMore && (
              <TouchableOpacity onPress={() => toggleExpand(item._id)} style={styles.showMoreBtn}>
                <Text style={styles.showMoreText}>{isExpanded ? 'show less' : 'show more'}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.yellow} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.image && (
          <View style={styles.imageContainer}>
            <RemoteImage source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" size="banner" />
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
            onPress={() => handleLike(item._id)}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? `liked, ${item.likes || 0}` : `like, ${item.likes || 0}`}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? T.yellow : T.onInkMuted} />
            <Text style={[styles.actionText, isLiked && { color: T.yellow }]}>
              {item.likes > 0 ? item.likes : 'like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openComments(item)}
            accessibilityRole="button"
            accessibilityLabel="comments"
          >
            <Ionicons name="chatbubble-outline" size={18} color={T.onInkMuted} />
            <Text style={styles.actionText}>
              {item.comments?.length > 0 ? item.comments.length : 'comment'}
            </Text>
          </TouchableOpacity>

          {/* No share on campus posts: it would leak them outside the campus */}
          {!isCampus && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                soundTap();   // 🔔 tap before share
                Share.share({
                  message: `💭 Anonymous Confession: "${item.text}"\n\nShared via TDC`
                });
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={T.onInkMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
}
