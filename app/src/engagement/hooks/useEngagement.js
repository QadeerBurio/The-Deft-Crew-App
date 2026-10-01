// app/src/engagement/hooks/useEngagement.js
import { useEngagementContext } from '../EngagementProvider';

export function useEngagement() {
  return useEngagementContext();
}

export default useEngagement;