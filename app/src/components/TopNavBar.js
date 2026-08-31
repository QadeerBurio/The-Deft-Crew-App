// components/TopNavBar.js
// Two shared pieces used on EVERY screen so navigation only ever lives at the
// top of the screen (no bottom tab bar anywhere in the app):
//
// 1) <TopNavBar /> — the simple header row: back button, title, right actions.
// 2) <TopTabBar />  — the SkillShare tab strip (Home / Explore / Post / Chats / Profile)
//    rendered directly under the header, replacing the old bottom tab bar.
//
// The Explore tab always uses the magnifier-with-person icon (MaterialCommunityIcons
// "account-search") to match the provided logo/icon reference.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const BRAND = '#f9c349';
const BRAND_DARK = '#f5a623';
const INK = '#1C1C1E';
const MUTED = '#8E8E93';
const BORDER = '#F0F0F0';

// ---------- Header ----------
export function TopNavBar({
  title,
  showBack = true,
  onBack,
  rightIcon,        // e.g. 'bell', 'bookmark', 'menu' (Feather names) — optional
  onRightPress,
  rightBadge,        // optional number/dot badge on the right icon
  transparent = false,
}) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.header, transparent && { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <TouchableOpacity style={styles.iconButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="handshake" size={16} color="#000" />
            </View>
          </View>
        )}
      </View>

      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

      <View style={styles.headerRight}>
        {rightIcon ? (
          <TouchableOpacity style={styles.iconButton} onPress={onRightPress} activeOpacity={0.7}>
            <Feather name={rightIcon} size={20} color={INK} />
            {!!rightBadge && (
              <View style={styles.badgeDot}>
                {typeof rightBadge === 'number' && rightBadge > 0 && (
                  <Text style={styles.badgeDotText}>{rightBadge > 9 ? '9+' : rightBadge}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButtonPlaceholder} />
        )}
      </View>
    </View>
  );
}

// ---------- Top Tab Strip (replaces bottom tab bar) ----------
// IMPORTANT: these `key` values must match the actual route names registered
// in DashboardStackNavigator (navigation/DrawerNavigator.js), since TopTabBar
// navigates within that same stack — not to top-level Drawer screens.
const TABS = [
  { key: 'DashboardMain', label: 'Home', icon: 'home', family: 'ion' },
  { key: 'SkillExplore', label: 'Explore', icon: 'account-search', family: 'mci' }, // magnifier + person
  { key: 'SelectListingTypeScreen', label: 'Post', icon: 'add-circle', family: 'ion' },
  { key: 'MyMatches', label: 'Chats', icon: 'chatbubbles', family: 'ion' },
  { key: 'SkillProfile', label: 'Profile', icon: 'person', family: 'ion' },
];

export function TopTabBar({ activeKey }) {
  const navigation = useNavigation();

  return (
    <View style={styles.tabStrip}>
      {TABS.map((tab) => {
        const isActive = activeKey === tab.key;
        const color = isActive ? BRAND : MUTED;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive) navigation.navigate(tab.key);
            }}
          >
            {tab.family === 'mci' ? (
              <MaterialCommunityIcons name={tab.icon} size={20} color={color} />
            ) : (
              <Ionicons name={tab.icon} size={20} color={color} />
            )}
            <Text style={[styles.tabLabel, isActive && { color: BRAND, fontWeight: '700' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.tabActiveBar} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Convenience wrapper: header + tab strip together, for screens that are one
// of the 5 primary destinations.
export function TopNav({ title, activeKey, rightIcon, onRightPress, rightBadge }) {
  return (
    <View>
      <TopNavBar
        title={title}
        showBack={false}
        rightIcon={rightIcon}
        onRightPress={onRightPress}
        rightBadge={rightBadge}
      />
      <TopTabBar activeKey={activeKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerLeft: { width: 40, alignItems: 'flex-start' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  iconButtonPlaceholder: { width: 36, height: 36 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tabStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '500',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 28,
    borderRadius: 1,
    backgroundColor: BRAND,
  },
});