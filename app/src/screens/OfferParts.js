// screens/OfferParts.js — the offer screen's pieces (claim success sheet, branch picker, press-and-hold claim
// button), moved unchanged from OfferScreen.js (Q-a split-only, plan Q-3f).
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StatusBar, Modal, Pressable, Animated, Easing, AccessibilityInfo } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { color as T, MAX_FONT_SCALE } from "../theme/tokens";
import { Button } from "../ui";
import Dot from "../engagement/components/Dot";
import { soundTap } from "../lib/tdcSounds";
import { styles } from "./offerStyles";

// ============================================================
// CLAIM SUCCESS — the yellow "sorted." moment (BalancedDeal design)
// Shown by the same state/timer as before (claimSuccessVisible).
// ============================================================
export const ClaimSuccessModal = ({ visible, onClose, onDone, brandName, discount, isInStore }) => {
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    pop.setValue(0);
    rise.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          pop.setValue(1);
          rise.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
          Animated.timing(rise, {
            toValue: 1,
            duration: 450,
            delay: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    return () => {
      cancelled = true;
    };
  }, [visible, pop, rise]);

  if (!visible) return null;

  const fadeUp = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const what = discount > 0 ? `${discount}% off at ${brandName || "this brand"}.` : `claimed at ${brandName || "this brand"}.`;
  const where = isInStore ? " show this at the counter." : " find it in my discounts.";

  return (
    <Modal transparent={false} visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sortedRoot} accessibilityViewIsModal>
        <StatusBar barStyle="dark-content" backgroundColor={T.yellow} />
        <View style={styles.sortedCenter}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Dot mood="sorted" size={140} animated={false} />
          </Animated.View>
          <Animated.Text
            style={[styles.sortedTitle, fadeUp]}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            sorted.
          </Animated.Text>
          <Animated.Text style={[styles.sortedLine, fadeUp]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {what}
            {where}
          </Animated.Text>
        </View>
        <Animated.View style={[styles.sortedActions, fadeUp]}>
          <Button title="done" variant="secondary" onPress={onDone} style={styles.sortedDoneBtn} />
        </Animated.View>
      </View>
    </Modal>
  );
};
// ============================================================
// BRANCH DROPDOWN
// ============================================================
export const BranchDropdown = ({
  branches,
  selectedBranch,
  onSelect,
  onClearSelection,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!branches || branches.length === 0) return null;

  const handleSelect = (branch) => {
    if (selectedBranch?._id === branch._id) {
      onClearSelection();
    } else {
      onSelect(branch);
    }
    setExpanded(false);
  };

  return (
    <View style={styles.branchDropdownWrap}>
      <TouchableOpacity
        style={styles.branchDropdownHeader}
        onPress={() => {
          Haptics.selectionAsync();
          soundTap();           // 🔔 tap on dropdown toggle
          setExpanded(!expanded);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={selectedBranch ? `branch: ${selectedBranch.name}, change` : "select branch"}
      >
        <View style={styles.branchDropdownIconWrap}>
          <MaterialCommunityIcons name="store-marker-outline" size={18} color={T.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchDropdownLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {selectedBranch ? "selected branch" : "select branch"}
          </Text>
          <Text style={styles.branchDropdownValue} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {selectedBranch
              ? selectedBranch.name
              : `${branches.length} ${branches.length === 1 ? "branch" : "branches"} available`}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={T.textFaint}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.branchDropdownList}>
          <TouchableOpacity
            style={[styles.branchDropdownItem, !selectedBranch && styles.branchDropdownItemActive]}
            onPress={() => {
              Haptics.selectionAsync();
              soundTap();       // 🔔 tap on Original Offer select
              onClearSelection();
              setExpanded(false);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedBranch }}
          >
            <MaterialCommunityIcons name="tag-outline" size={16} color={T.textFaint} />
            <Text
              style={[styles.branchDropdownItemName, !selectedBranch && styles.branchDropdownItemNameActive]}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              original offer
            </Text>
            {!selectedBranch && <MaterialCommunityIcons name="check" size={18} color={T.ink} />}
          </TouchableOpacity>

          {branches.map((branch, idx) => {
            const isSelected = selectedBranch?._id === branch._id;
            return (
              <TouchableOpacity
                key={branch._id || idx}
                style={[styles.branchDropdownItem, isSelected && styles.branchDropdownItemActive]}
                onPress={() => handleSelect(branch)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${branch.name}${branch.city ? `, ${branch.city}` : ""}, ${branch.discountPercentage}% off`}
              >
                <MaterialCommunityIcons
                  name={branch.isOnline ? "earth" : "storefront-outline"}
                  size={16}
                  color={T.textFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.branchDropdownItemName, isSelected && styles.branchDropdownItemNameActive]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {branch.name}
                  </Text>
                  {branch.city ? (
                    <Text style={styles.branchDropdownItemCity} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {branch.city}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.branchDropdownPill}>
                  <Text style={styles.branchDropdownPillText}>{branch.discountPercentage}%</Text>
                </View>
                {isSelected && <MaterialCommunityIcons name="check" size={18} color={T.ink} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};
// ============================================================
// HOLD TO CLAIM (BalancedDeal): press and hold 1 s → onComplete.
// Screen readers: a double tap (activate) claims directly.
// ============================================================
export const HOLD_MS = 1000;
export const HoldToClaim = ({ label, onComplete, disabled }) => {
  const fill = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const doneRef = useRef(false);

  const start = () => {
    if (disabled) return;
    doneRef.current = false;
    setHolding(true);
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      doneRef.current = true;
      setHolding(false);
      fill.setValue(0);
      onComplete();
    });
  };

  const end = () => {
    if (doneRef.current) return;
    fill.stopAnimation();
    setHolding(false);
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const fg = holding ? T.ink : T.white;

  return (
    <Pressable
      onPressIn={start}
      onPressOut={end}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="press and hold to claim"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate" && !disabled) onComplete();
      }}
      style={[styles.holdBtn, holding && { transform: [{ scale: 0.98 }] }]}
    >
      <Animated.View style={[styles.holdFill, { width }]} />
      <View style={styles.holdInner}>
        <MaterialCommunityIcons name="gift-outline" size={20} color={fg} />
        <Text style={[styles.holdText, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {holding ? "keep holding" : label}
        </Text>
      </View>
    </Pressable>
  );
};
