// app/src/engagement/hooks/useStreak.js
import { useCallback } from 'react';
import { useEngagement } from './useEngagement';
import engagementApi from '../api/engagementApi';

export function useStreak() {
  const { me, flags, refresh } = useEngagement();

  const streak = flags?.soloStreak ? me?.streak || null : null;

  const setExamMode = useCallback(
    async (days = 7) => {
      console.log('[useStreak] setExamMode called', days);
      const res = await engagementApi.setExamMode(days);
      console.log('[useStreak] setExamMode response:', res);
      await refresh();
      return res;
    },
    [refresh]
  );

  const clearExamMode = useCallback(async () => {
    console.log('[useStreak] clearExamMode called');
    const res = await engagementApi.clearExamMode();
    console.log('[useStreak] clearExamMode response:', res);
    await refresh();
    return res;
  }, [refresh]);

  // Prefer server-computed examModeActive (per timezone-safe backend)
  const examModeActive =
    streak?.examModeActive !== undefined
      ? streak.examModeActive
      : false;

  console.log('[useStreak] state:', {
    count: streak?.count,
    examModeActive,
    examModeUntil: streak?.examModeUntil,
    flagsSoloStreak: flags?.soloStreak,
  });

  return {
    streak,
    count: streak?.count || 0,
    best: streak?.best || 0,
    health: streak?.health || 'none',
    freezesLeft: streak?.freezesLeft ?? 1,
    lastActionDay: streak?.lastActionDay || null,
    examModeUntil: streak?.examModeUntil || null,
    examModeActive,
    examModeUsesThisSemester: streak?.examModeUsesThisSemester || 0,
    examModeRemaining:
      streak?.examModeRemaining !== undefined ? streak.examModeRemaining : 2,
    enabled: !!flags?.soloStreak,
    setExamMode,
    clearExamMode,
  };
}

export default useStreak;