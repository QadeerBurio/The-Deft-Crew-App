// ConfessionCard.js: one confession in the feed (moved unchanged from ConfessionScreen.js).
import React from "react";
import { View, Text, TouchableOpacity, Animated, Share, Image } from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { Ionicons } from '@expo/vector-icons';
import { soundTap } from "../../lib/tdcSounds";
import { color as T, MAX_FONT_SCALE } from "../../theme/tokens";
import styles from "./confessionStyles";
import { MOOD_IMAGES } from "../../engagement/utils/mood";
import { avatarFor } from "./confessionV2";

// safety / onMore (plan P4-1, flag confessionSafety): a "more" button (report, mute, delete mine) and the
// "under review" chip on my held posts. Without them the card is exactly as before.
// v2 / onMeToo / tagLabel (P4a, flag confessionsV2): the handle (with its Dot avatar and a verified tick), the tag,
// the mood and "me too". Without them the card is exactly as before.
// onVote / onFollow / onSave (P4b): the poll (flag confessionPolls), the follow bell (confessionFollow) and save.
// onUpDown (r7, confessionsVoting): up / down arrows without counts, only where the feed gave myVote (not your own).
export default function ConfessionCard({ item, isExpanded, lineCount, scope, highlightId, fadeAnim, formatPostTime, handleTextLayout, toggleExpand, handleLike, openComments, safety = false, onMore = null, v2 = false, onMeToo = null, tagLabel = null, onVote = null, onFollow = null, onSave = null, onShareImage = null, onUpDown = null }) {
    const poll = v2 && onVote && item.poll && Array.isArray(item.poll.options) ? item.poll : null;
    const voted = poll && poll.myVote != null;
    const handle = v2 && item.handle ? item.handle : null;
    const av = handle ? avatarFor(handle) : null;
    const isLiked = item.likedByCurrentUser;
    const shouldShowMore = lineCount > 7 || (item.text?.length || 0) > 250;
    const isCampus = item.visibility === 'campus';
    const badge = (
          <View style={styles.confessionBadge}>
            <Ionicons name="lock-closed" size={10} color={isCampus ? T.yellow : T.onInkMuted} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.badgeText, isCampus && { color: T.yellow }]}>
              {isCampus ? 'campus only' : 'confession'}
            </Text>
          </View>
    );

    return (
      <Animated.View style={[styles.card, highlightId === String(item._id) && styles.cardHighlight, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {av ? (
              <View style={[styles.avatarCircle, { backgroundColor: av.color }]} accessibilityElementsHidden>
                <Image source={MOOD_IMAGES[av.mood]} style={{ width: 26, height: 26 }} />
              </View>
            ) : (
            <View style={styles.avatarCircle}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.avatarQ}>?</Text>
            </View>
            )}
            <View style={{ flexShrink: 1 }}>
              <View style={styles.nameRow}>
                {handle ? (
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.anonymousName} numberOfLines={1} accessibilityLabel={`@${handle}${item.handleVerified ? ", verified student" : ""}`}>@{handle}{item.handleVerified ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: T.yellow }}> ✓</Text> : null}</Text>
                ) : (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.anonymousName}>anon.</Text>
                )}
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.nameDot}>·</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.postTime, { marginTop: 0 }]}>{formatPostTime(item.createdAt)}</Text>
              </View>
              {/* University name only in the "my campus" tab */}
              {scope === 'campus' && !!item.campusName && (
                <View style={styles.campusPill}>
                  <Ionicons name="school" size={11} color={T.onInkMuted} />
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.campusPillText} numberOfLines={1}>
                    {item.campusName}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {safety && onMore ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {badge}
              <TouchableOpacity
                onPress={() => onMore(item)}
                accessibilityRole="button"
                accessibilityLabel="more options"
                hitSlop={10}
                style={{ minWidth: 36, minHeight: 36, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 4 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={T.onInkMuted} />
              </TouchableOpacity>
            </View>
          ) : badge}
        </View>

        {safety && item.status === 'pending' && (
          <View style={[styles.campusPill, { alignSelf: 'flex-start', marginBottom: 8 }]} accessibilityLabel="under review: only you can see this">
            <Ionicons name="time-outline" size={11} color={T.yellow} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.campusPillText, { color: T.yellow }]}>under review · only you can see this</Text>
          </View>
        )}

        {v2 && (tagLabel || item.mood) ? (
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 8, alignItems: "center" }}>
            {tagLabel ? <View style={styles.campusPill}><Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.campusPillText}>#{tagLabel}</Text></View> : null}
            {item.mood && MOOD_IMAGES[item.mood] ? (
              <View style={styles.campusPill} accessibilityLabel={`mood: ${item.mood}`}>
                <Image source={MOOD_IMAGES[item.mood]} style={{ width: 14, height: 14 }} />
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.campusPillText}>{item.mood}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.text && (
          <View>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.confessionText}
              numberOfLines={isExpanded ? undefined : 7}
              onTextLayout={(e) => handleTextLayout(item._id, e)}
            >
              {item.text}
            </Text>
            {shouldShowMore && (
              <TouchableOpacity onPress={() => toggleExpand(item._id)} style={styles.showMoreBtn} accessibilityRole="button" hitSlop={8}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.showMoreText}>{isExpanded ? 'show less' : 'show more'}</Text>
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

        {poll ? (
          <View style={{ marginTop: 10, gap: 8 }} accessibilityLabel={`poll, ${poll.total} ${poll.total === 1 ? "vote" : "votes"}`}>
            {poll.options.map((o, i) => {
              const pct = poll.total > 0 ? Math.round((o.votes / poll.total) * 100) : 0;
              const mine = poll.myVote === i;
              return (
                <TouchableOpacity
                  key={`${item._id}-o${i}`}
                  onPress={() => onVote(item._id, i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mine }}
                  accessibilityLabel={voted ? `${o.text}, ${pct} percent${mine ? ", your vote" : ""}` : `vote: ${o.text}`}
                  style={{ borderRadius: 12, borderWidth: 1, borderColor: mine ? T.yellow : T.onInkMuted, overflow: "hidden", minHeight: 44, justifyContent: "center" }}
                >
                  {voted ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: mine ? T.yellow : T.onInkMuted, opacity: 0.25 }} /> : null}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, gap: 8 }}>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.actionText, { color: T.white, flexShrink: 1 }]}>{o.text}</Text>
                    {voted ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.actionText, mine && { color: T.yellow }]}>{pct}%</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.postTime, { marginTop: 0 }]}>{poll.total} {poll.total === 1 ? "vote" : "votes"} · anonymous{voted ? " · tap to change" : ""}</Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            hitSlop={6}
            style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
            onPress={() => handleLike(item._id)}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? `liked, ${item.likes || 0}` : `like, ${item.likes || 0}`}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? T.yellow : T.onInkMuted} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.actionText, isLiked && { color: T.yellow }]}>
              {item.likes > 0 ? item.likes : 'like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={6}
            style={styles.actionBtn}
            onPress={() => openComments(item)}
            accessibilityRole="button"
            accessibilityLabel="comments"
          >
            <Ionicons name="chatbubble-outline" size={18} color={T.onInkMuted} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actionText}>
              {item.comments?.length > 0 ? item.comments.length : 'comment'}
            </Text>
          </TouchableOpacity>

          {v2 && onMeToo ? (
            <TouchableOpacity
              hitSlop={6}
              style={[styles.actionBtn, item.meTooByCurrentUser && styles.actionBtnLiked]}
              onPress={() => onMeToo(item._id)}
              accessibilityRole="button"
              accessibilityLabel={item.meTooByCurrentUser ? `me too, ${item.meTooCount || 0}, tap to undo` : `me too, ${item.meTooCount || 0}`}
            >
              <Ionicons name={item.meTooByCurrentUser ? "hand-left" : "hand-left-outline"} size={18} color={item.meTooByCurrentUser ? T.yellow : T.onInkMuted} />
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.actionText, item.meTooByCurrentUser && { color: T.yellow }]}>{item.meTooCount > 0 ? `me too ${item.meTooCount}` : "me too"}</Text>
            </TouchableOpacity>
          ) : null}

          {/* r7 (confessionsVoting): up / down, no counts (used only for auto-hide); never on your own post (no myVote) */}
          {v2 && onUpDown && "myVote" in item ? (
              ["up", "down"].map((dir) => {
                const on = item.myVote === dir;
                return (
                  <TouchableOpacity
                    key={dir}
                    hitSlop={6}
                    style={styles.actionBtn}
                    onPress={() => onUpDown(item._id, item.myVote ?? null, on ? null : dir)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={on ? `voted ${dir}, tap to undo` : dir === "up" ? "vote up" : "vote down"}
                  >
                    <Ionicons name={on ? `arrow-${dir}-circle` : `arrow-${dir}-circle-outline`} size={18} color={on ? T.yellow : T.onInkMuted} />
                  </TouchableOpacity>
                );
              })
          ) : null}
          {v2 && onFollow && typeof item.following === "boolean" ? (
            <TouchableOpacity
              hitSlop={6}
              style={styles.actionBtn}
              onPress={() => onFollow(item._id, !item.following)}
              accessibilityRole="button"
              accessibilityLabel={item.following ? "following replies, tap to mute" : "follow replies"}
            >
              <Ionicons name={item.following ? "notifications" : "notifications-outline"} size={18} color={item.following ? T.yellow : T.onInkMuted} />
            </TouchableOpacity>
          ) : null}
          {v2 && onSave && typeof item.saved === "boolean" ? (
            <TouchableOpacity
              hitSlop={6}
              style={styles.actionBtn}
              onPress={() => onSave(item._id, !item.saved)}
              accessibilityRole="button"
              accessibilityLabel={item.saved ? "saved, tap to unsave" : "save"}
            >
              <Ionicons name={item.saved ? "bookmark" : "bookmark-outline"} size={18} color={item.saved ? T.yellow : T.onInkMuted} />
            </TouchableOpacity>
          ) : null}

          {/* P4c (confessionShare): share as an image card, only when the server says it may be (public, live, no open
              report); then the plain-text share below is not offered */}
          {v2 && onShareImage && item.shareable === true ? (
            <TouchableOpacity hitSlop={6} style={styles.actionBtn} onPress={() => onShareImage(item)} accessibilityRole="button" accessibilityLabel="share as an image">
              <Ionicons name="share-social-outline" size={18} color={T.onInkMuted} />
            </TouchableOpacity>
          ) : null}

          {/* No share on campus posts: it would leak them outside the campus */}
          {!isCampus && !(v2 && onShareImage) && (
            <TouchableOpacity
              hitSlop={6}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="share"
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
