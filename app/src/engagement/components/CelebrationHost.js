// app/src/engagement/components/CelebrationHost.js
// Renders ONE celebration at a time.
// Prevents double-popup stacking by keeping activePopup mounted
// until the queue is empty AND a short exit delay elapses.

import React, { useState, useEffect, useRef } from 'react';
import CelebrationPopup from './CelebrationPopup';
import FullySortedCelebration from './FullySortedCelebration';
import { useCelebrationQueue } from '../hooks/useCelebrationQueue';
import { navigationRef } from '../../navigation/navigationRef';

const EXIT_DELAY_MS = 400;   // delay before allowing the next popup to mount

export default function CelebrationHost() {
  const { current, onClose, notNow } = useCelebrationQueue();

  // Local buffer so we control when the next popup appears
  const [activePopup, setActivePopup] = useState(null);

  // Prevent queue changes from instantly swapping popups mid-animation
  const lockedRef = useRef(false);

  useEffect(() => {
    // No popup queued → clear after exit delay
    if (!current) {
      if (!activePopup) return;
      const t = setTimeout(() => {
        setActivePopup(null);
        lockedRef.current = false;
      }, EXIT_DELAY_MS);
      return () => clearTimeout(t);
    }

    // Currently showing a popup → ignore queue changes until exit delay finishes
    if (lockedRef.current || activePopup) return;

    // Lock + show the new popup
    lockedRef.current = true;
    setActivePopup(current);
  }, [current, activePopup]);

  if (!activePopup) return null;

  const routeTo = () => {
    try {
      if (activePopup.cta?.route && navigationRef.isReady?.()) {
        navigationRef.navigate(
          activePopup.cta.route,
          activePopup.cta.params || {}
        );
      }
    } catch (e) {
      console.log('[CelebrationHost] navigate error:', e?.message);
    }
  };

  const handleClose = () => {
    // Unlock, ack, and let the queue advance
    setActivePopup(null);
    lockedRef.current = false;
    onClose();
  };

  const handleNotNow = () => {
    setActivePopup(null);
    lockedRef.current = false;
    notNow();
  };

  if (activePopup.kind === 'fully_sorted') {
    return (
      <FullySortedCelebration
        popup={activePopup}
        onClose={handleClose}
      />
    );
  }

  return (
    <CelebrationPopup
      popup={activePopup}
      onClose={handleClose}
      onNotNow={handleNotNow}
    />
  );
}