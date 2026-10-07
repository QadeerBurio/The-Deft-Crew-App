// app/src/engagement/components/StreakSheet.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Pressable,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Dot from './Dot';
import { useStreak } from '../hooks/useStreak';
import { STREAK_HEALTH_TO_MOOD } from '../utils/mood';
import { pop, success as hapticSuccess, warn as hapticWarn } from '../utils/haptics';
import { colors } from '../../theme';

const GOLD = colors.yellow;
const DARK = '#1a1a1a';
const MUTED = '#888';
const LIGHT = '#fafafa';
const BORDER = '#f0f0f0';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(lastActionDay) {
  const today = new Date();
  const todayDay = today.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const isActive = (date) => {
    if (!lastActionDay) return false;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}` === lastActionDay;
  };

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    days.push({
      label: DAY_LABELS[i],
      active: isActive(d),
      isToday,
    });
  }
  return days;
}

export default function StreakSheet({ visible, onClose }) {
  const {
    count,
    best,
    freezesLeft,
    health,
    lastActionDay,
    examModeUntil,
    examModeActive,
    examModeRemaining,
    enabled,
    setExamMode,
    clearExamMode,
  } = useStreak();

  const [busy, setBusy] = useState(false);
  const [exam, setExam] = useState(!!examModeActive);

  // Sync toggle when data changes
  useEffect(() => {
    setExam(!!examModeActive);
  }, [examModeActive]);

  const weekDays = useMemo(
    () => getWeekDays(lastActionDay),
    [lastActionDay, visible]
  );

  const mood = STREAK_HEALTH_TO_MOOD[health] || 'sorted';

  const onToggleExam = useCallback(
    async (val) => {
      console.log('[StreakSheet] onToggleExam', val);
      if (busy) return;
      setBusy(true);
      pop();

      // Optimistic update
      setExam(val);

      try {
        if (val) {
          const res = await setExamMode(7);
          hapticSuccess();
          const rem = res?.remaining;
          if (rem !== undefined) {
            Alert.alert(
              'Exam Mode On',
              `Your streak is safe for 7 days. ${rem} use${
                rem === 1 ? '' : 's'
              } left this semester.`
            );
          }
        } else {
          await clearExamMode();
          hapticWarn();
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message || 'Could not update exam mode.';
        console.log('[StreakSheet] toggle error:', msg);
        Alert.alert('Exam Mode', msg);
        // Revert on error
        setExam(!val);
      } finally {
        setBusy(false);
      }
    },
    [busy, setExamMode, clearExamMode]
  );

  if (!enabled) {
    // Show a friendly message instead of silently returning
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.headerTitle}>Streak</Text>
            <Text style={{ marginTop: 12, color: MUTED }}>
              Streaks aren't available right now.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerDot} />
              <Text style={styles.headerTitle}>Streak</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.countRow}>
            <Dot mood={mood} size={52} animated={false} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.bigCount}>
                {count} {count === 1 ? 'day' : 'days'}.
              </Text>
              <Text style={styles.subCount}>
                best {best}. {freezesLeft}{' '}
                {freezesLeft === 1 ? 'freeze' : 'freezes'} left.
              </Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((d) => (
              <View key={d.label} style={styles.dayCol}>
                <Text style={styles.dayLabel}>{d.label}</Text>
                <View
                  style={[
                    styles.dayDot,
                    d.active && styles.dayDotActive,
                    d.isToday && styles.dayDotToday,
                  ]}
                >
                  {d.isToday && d.active && <View style={styles.dayDotInner} />}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.examRow}>
            <View style={styles.examLeft}>
              <View style={styles.examIconBox}>
                <MaterialCommunityIcons name="school-outline" size={20} color={DARK} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.examTitle}>Exam Mode</Text>
                <Text style={styles.examSub}>
                  {exam
                    ? examModeUntil
                      ? `On until ${examModeUntil}. Your streak waits.`
                      : 'Your streak is safe.'
                    : 'Your streak waits while you study.'}
                </Text>
              </View>
            </View>

            {busy ? (
              <ActivityIndicator size="small" color={GOLD} />
            ) : (
              <Switch
                value={exam}
                onValueChange={onToggleExam}
                trackColor={{ false: '#e5e5e5', true: GOLD }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5e5"
              />
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={13} color={MUTED} />
            <Text style={styles.infoText}>
              max 2 uses per semester · {examModeRemaining} left
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DARK, letterSpacing: -0.3 },
  countRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  bigCount: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5 },
  subCount: { fontSize: 13, color: MUTED, marginTop: 2 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  dayCol: { alignItems: 'center', gap: 8, flex: 1 },
  dayLabel: { fontSize: 11, fontWeight: '600', color: MUTED },
  dayDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },
  dayDotActive: { backgroundColor: GOLD + '55' },
  dayDotToday: { backgroundColor: DARK },
  dayDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  examRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, marginTop: 6, paddingHorizontal: 14,
    borderRadius: 16, backgroundColor: LIGHT,
    borderWidth: 1, borderColor: BORDER, gap: 10,
  },
  examLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  examIconBox: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  examTitle: { fontSize: 15, fontWeight: '800', color: DARK, letterSpacing: -0.2 },
  examSub: { fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 15 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14,
  },
  infoText: { fontSize: 11, color: MUTED },
});