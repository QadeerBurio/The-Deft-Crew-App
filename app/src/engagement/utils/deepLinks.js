// app/src/engagement/utils/deepLinks.js
// Deep link handler — connects push data.route → navigation.navigate()
// Fixes B4. Uses the navigationRef exported from App.js.

// app/src/engagement/utils/deepLinks.js
import { navigationRef } from '../../navigation/navigationRef';
export const openRoute = (routeKey, params = {}) => {
  if (!routeKey) return false;

  const nav = navigationRef?.current;
  if (!nav) return false;

  const go = () => {
    try {
      nav.navigate(routeKey, params);
      return true;
    } catch (e) {
      console.log(`[deepLinks] unknown route "${routeKey}":`, e?.message);
      try {
        nav.navigate('HomeTabs', { screen: 'HomeStackMain' });
      } catch {}
      return false;
    }
  };

  if (nav.isReady && nav.isReady()) return go();

  // Wait for nav to be ready (cold start case)
  let attempts = 0;
  const id = setInterval(() => {
    attempts += 1;
    if (navigationRef.current?.isReady?.()) {
      clearInterval(id);
      go();
    } else if (attempts > 20) {
      clearInterval(id);
    }
  }, 100);
  return true;
};

// Route keys mapped to nested navigation
export const ROUTE_MAP = {
  Home: { screen: 'HomeTabs', params: { screen: 'HomeStackMain' } },
  Career: { screen: 'HomeTabs', params: { screen: 'Career' } },
  Events: { screen: 'HomeTabs', params: { screen: 'Events' } },
  Rewards: { screen: 'HomeTabs', params: { screen: 'Rewards' } },
  Badges: { screen: 'HomeTabs', params: { screen: 'Badges' } },
  NotificationSettings: { screen: 'HomeTabs', params: { screen: 'NotificationSettings' } },
  Points: { screen: 'Points' },
  Card: { screen: 'HomeTabs', params: { screen: 'Card' } },
  Travelling: { screen: 'Travelling' },
  Exchange: { screen: 'HomeTabs', params: { screen: 'Exchange' } },
  Brands: { screen: 'HomeTabs', params: { screen: 'Brands' } },
  Dashboard: { screen: 'Dashboard' },
};