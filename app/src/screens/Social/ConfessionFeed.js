// app/src/screens/Social/ConfessionFeed.js
// The confession feed list: scope tabs (everyone / my campus), pull to refresh, the empty states (moved verbatim from
// ConfessionScreen.js, P4-6 split-only). The screen keeps the state, polling, cache and handlers.
import React from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { soundTap } from "../../lib/tdcSounds";
import { color as T } from "../../theme/tokens";
import styles from "./confessionStyles";

export default function ConfessionFeed({ flatListRef, listData, highlightId, scope, renderConfession, switchScope, myUniName, refreshing, setRefreshing, fetchConfessions, firstLoad, navigation, handleFabPress }) {
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
