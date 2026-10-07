// app/src/engagement/hooks/useDailyDrop.js
// Today's drop for the home screen. Stays fresh on its own:
//   • refetches every 60s while the app is open
//   • refetches when the home screen is focused / app comes back (Home.js)
//   • the vote / publish state updates without reopening the app
import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import engagementApi from '../api/engagementApi';

export const DAILY_DROP_KEY = ['engagement', 'drop'];

export function useDailyDrop() {
  const { token, isGuest, user } = useContext(AuthContext);
  const enabled = !!token && !isGuest;
  const userId = user?._id || user?.id || 'me';

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...DAILY_DROP_KEY, userId],
    queryFn: engagementApi.getHome,
    enabled,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });

  return {
    drop: data?.drop || null,
    missions: data?.missions || null,
    streak: data?.streak || null,
    isLoading: enabled && isLoading,
    isFetching,
    refresh: refetch,
  };
}

export default useDailyDrop;
