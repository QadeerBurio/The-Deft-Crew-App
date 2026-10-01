// app/src/engagement/hooks/useReferrals.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import engagementApi from '../api/engagementApi';
import { engagementBus, ENGAGEMENT_EVENTS } from '../engagementBus';

export function useReferrals() {
  const { token, isGuest, user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const enabled = !!token && !isGuest && !!userId;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['engagement', 'referrals', 'me', userId || 'anon'],
    queryFn: async () => {
      // Pass userId through so React Query can't mix caches
      return await engagementApi.getMyReferrals();
    },
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,       // 5 min garbage collection
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: (failureCount, err) => {
      // Don't retry on 401/403/404
      const status = err?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

  // Silent error log (React Query handles the rest)
  useEffect(() => {
    if (isError) {
      console.log(
        '[useReferrals] error:',
        error?.response?.status,
        error?.message
      );
    }
  }, [isError, error]);

  // Refresh on engagement bus events
  useEffect(() => {
    const off = engagementBus.on(
      ENGAGEMENT_EVENTS.PROFILE_REFRESH,
      () => {
        queryClient.invalidateQueries({
          queryKey: ['engagement', 'referrals'],
        });
      }
    );
    return off;
  }, [queryClient]);

  // Refresh when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabled) {
        queryClient.invalidateQueries({
          queryKey: ['engagement', 'referrals'],
        });
      }
    });
    return () => sub.remove();
  }, [enabled, queryClient]);

  // Optional: poll every 60s while foregrounded
  const pollRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    pollRef.current = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['engagement', 'referrals'],
      });
    }, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, queryClient]);

  return {
    referrals: data || {
      referralCode: '',
      rawCount: 0,
      verifiedCount: 0,
      pendingCount: 0,
      lifetimeReferral: 0,
      canApplyForTdcCard: false,
      level: 'member',
      tiersIssued: [],
      referees: [],
    },
    referralCode: data?.referralCode || '',
    rawCount: data?.rawCount || 0,
    verifiedCount: data?.verifiedCount || 0,
    pendingCount: data?.pendingCount || 0,
    lifetimeReferral: data?.lifetimeReferral || 0,
    referees: data?.referees || [],
    isLoading,
    isError,
    error,
    refresh: refetch,
  };
}

export default useReferrals;