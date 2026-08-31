// hooks/useMyProfessionalProfile.js
import { useState, useEffect, useContext, useCallback } from 'react';
import { getMyProfessionalProfile } from '../api/api';
import { AuthContext } from '../context/AuthContext';

// Fetches the logged-in user's own professional profile (name + photo)
// so screens can show "You" + your professional avatar consistently.
export default function useMyProfessionalProfile() {
  const { isGuest } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isGuest) { setLoading(false); return; }
    try {
      const res = await getMyProfessionalProfile();
      setProfile(res?.profile || null);
    } catch (err) {
      console.error('Error loading my professional profile:', err);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => { load(); }, [load]);

  return {
    profile,
    loading,
    photoUrl: profile?.photoUrl || null,
    fullName: profile?.fullName || null,
    refresh: load,
  };
}