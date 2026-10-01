// app/src/engagement/hooks/useMissions.js
import { useMemo } from 'react';
import { useEngagement } from './useEngagement';

export function useMissions() {
  const { me, isLoading } = useEngagement();

  const missions = useMemo(() => {
    return me?.missions || {
      sortedCount: 0,
      total: 8,
      cards: [],
      next: null,
    };
  }, [me?.missions]);

  return {
    missions,
    sortedCount: missions.sortedCount,
    total: missions.total,
    isFullySorted: missions.sortedCount === 8,
    nextCard: missions.next,
    isLoading,
  };
}

export default useMissions;