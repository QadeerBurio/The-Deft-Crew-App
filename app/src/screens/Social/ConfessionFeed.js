// app/src/screens/Social/ConfessionFeed.js
// The confession feed list: scope tabs (everyone / my campus), pull to refresh, the empty states (moved verbatim from
// ConfessionScreen.js, P4-6 split-only). The screen keeps the state, polling, cache and handlers.
import React from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { soundTap } from "../../lib/tdcSounds";
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";
import { SORTS } from "./confessionV2";
import useFlag from "../../hooks/useFlag";
// P5-4 (polishEmptyStates): the design system's EmptyState, loaded only when the flag is on (off: nothing new loads)
const EmptyState = (props) => React.createElement(require("../../ui").EmptyState, props);

// v2 (P4a, flag confessionsV2): sort chips (hot · new · top this week) and tag filter chips under the scope tabs.
// Without it the header is exactly as before.
export default function ConfessionFeed({ flatListRef, listData, highlightId, scope, renderConfession, switchScope, myUniName, refreshing, setRefreshing, fetchConfessions, firstLoad, navigation, handleFabPress, v2 = false, sort = "hot", onSort = () => {}, tags = [], tagFilter = null, onTag = () => {}, savedOnly = false, onSaved = null }) {
  const polishEmpty = useFlag("polishEmptyStates") === true; // P5-4
  return (
      <FlatList
        ref={flatListRef}
        data={listData}
        extraData={`${highlightId}-${scope}`}
        renderItem={renderConfession}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={
          v2 ? (
            <View>
              <View style={styles.scopeTabs}>
                {[
                  { key: 'all', label: 'everyone', icon: 'earth-outline' },
                  { key: 'campus', label: 'my campus', icon: 'school-outline' },
                ].map((t) => {
                  const active = scope === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.scopeTab, active && styles.scopeTabActive]}
                      onPress={() => switchScope(t.key)}
                      activeOpacity={0.8}
                    hitSlop={{ top: 2, bottom: 2 }}>
                      <Ionicons name={t.icon} size={14} color={active ? T.ink : T.onInkMuted} />
                      <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]} numberOfLines={1}>
                        {t.key === 'campus' && myUniName && active ? myUniName : t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.scopeTabs, { marginTop: 0 }]}>
                {SORTS.map((o) => (
                  <TouchableOpacity key={o.key} style={[styles.scopeTab, sort === o.key && styles.scopeTabActive]} onPress={() => onSort(o.key)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: sort === o.key }} accessibilityLabel={`sort: ${o.label}`}>
                    <Ionicons name={o.icon} size={14} color={sort === o.key ? T.ink : T.onInkMuted} />
                    <Text style={[styles.scopeTabText, sort === o.key && styles.scopeTabTextActive]} numberOfLines={1}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {onSaved ? (
                <View style={[styles.scopeTabs, { marginTop: 0 }]}>
                  <TouchableOpacity style={[styles.scopeTab, savedOnly && styles.scopeTabActive]} onPress={() => onSaved(!savedOnly)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: savedOnly }} accessibilityLabel={savedOnly ? "showing saved, tap for all" : "show saved"}>
                    <Ionicons name={savedOnly ? "bookmark" : "bookmark-outline"} size={14} color={savedOnly ? T.ink : T.onInkMuted} />
                    <Text style={[styles.scopeTabText, savedOnly && styles.scopeTabTextActive]}>saved</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {tags.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
                  {tags.map((t) => (
                    <TouchableOpacity key={t.id} style={[styles.scopeTab, { flex: 0, paddingHorizontal: 12 }, tagFilter === t.id && styles.scopeTabActive]} onPress={() => onTag(tagFilter === t.id ? null : t.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: tagFilter === t.id }} accessibilityLabel={`show #${t.label}`}>
                      <Text style={[styles.scopeTabText, tagFilter === t.id && styles.scopeTabTextActive]}>#{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={styles.scopeTabs}>
              {[
                { key: 'all', label: 'everyone', icon: 'earth-outline' },
                { key: 'campus', label: 'my campus', icon: 'school-outline' },
              ].map((t) => {
                const active = scope === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => switchScope(t.key)}
                    activeOpacity={0.8}
                  hitSlop={{ top: 2, bottom: 2 }}>
                    <Ionicons name={t.icon} size={14} color={active ? T.ink : T.onInkMuted} />
                    <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]} numberOfLines={1}>
                      {t.key === 'campus' && myUniName && active ? myUniName : t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchConfessions(false); }}
            tintColor={T.yellow}
            colors={[T.ink]}
          />
        }
        ListEmptyComponent={
          firstLoad ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator size="small" color={T.yellow} />
            </View>
          ) : polishEmpty ? (
            // P5-4 (polishEmptyStates): the design system's empty state (Dot face, one line, one action), same words
            scope === 'campus' && !myUniName ? (
              <EmptyState mood="sus" title="add your university" line="add your university in your profile to see your campus." actionLabel="edit profile" onAction={() => { soundTap(); navigation?.navigate?.('EditProfileScreen'); }} />
            ) : (
              <EmptyState mood="sleepy" title={scope === 'campus' ? 'nothing from your campus yet' : 'no confessions yet'} line={scope === 'campus' ? `be the first from ${myUniName || 'your campus'}.` : "confess. nobody will know it's you."} actionLabel="create confession" onAction={handleFabPress} />
            )
          ) : scope === 'campus' && !myUniName ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="school-outline" size={40} color={T.yellow} />
              </View>
              <Text style={styles.emptyTitle}>add your university</Text>
              <Text style={styles.emptySubtitle}>
                add your university in your profile to see your campus
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { soundTap(); navigation?.navigate?.('EditProfileScreen'); }}
              >
                <LinearGradient colors={[T.yellow]} style={styles.emptyBtnGradient}>
                  <Text style={styles.emptyBtnText}>edit profile</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.ink} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={T.yellow} />
            </View>
            <Text style={styles.emptyTitle}>
              {scope === 'campus' ? 'nothing from your campus yet' : 'no confessions yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {scope === 'campus' ? `be the first from ${myUniName || 'your campus'}.` : "confess. nobody will know it's you."}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleFabPress}>
              <LinearGradient colors={[T.yellow]} style={styles.emptyBtnGradient}>
                <Text style={styles.emptyBtnText}>create confession</Text>
                <Ionicons name="arrow-forward" size={18} color={T.ink} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          )
        }
      />
  );
}
