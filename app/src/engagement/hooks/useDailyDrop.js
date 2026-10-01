// app/src/engagement/hooks/useDailyDrop.js
import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import engagementApi from '../api/engagementApi';

export function useDailyDrop() {
  const { token, isGuest } = useContext(AuthContext);
  const enabled = !!token && !isGuest;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['engagement', 'home'],
    queryFn: engagementApi.getHome,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    drop: data?.drop || null,
    missions: data?.missions || null,
    streak: data?.streak || null,
    isLoading,
    refresh: refetch,
  };
}

export default useDailyDrop;