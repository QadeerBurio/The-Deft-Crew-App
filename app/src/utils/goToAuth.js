// app/src/utils/goToAuth.js
// Opens Sign In / Sign Up from anywhere in the app, including guest mode.
//
// Why: in guest mode the root navigator only has the app screens, so
// navigation.navigate('Login') did nothing. We leave guest mode first; the
// root then mounts the sign-in screens, and we jump straight to the one asked
// for (no splash video in between).
//
// usage:
//   const { setIsGuest } = useContext(AuthContext);
//   goToAuth(setIsGuest);            // Sign In
//   goToAuth(setIsGuest, 'Signup');  // Sign Up

import { navigationRef } from '../navigation/navigationRef';

export function goToAuth(setIsGuest, screen = 'Login') {
  // already on the sign-in stack (not a guest): plain navigate works
  try {
    const names = navigationRef.isReady() ? navigationRef.getRootState()?.routeNames || [] : [];
    if (names.includes(screen)) {
      navigationRef.navigate(screen);
      return;
    }
  } catch (e) {}

  if (typeof setIsGuest === 'function') setIsGuest(false);

  let tries = 0;
  const tick = () => {
    tries += 1;
    try {
      const names = navigationRef.isReady() ? navigationRef.getRootState()?.routeNames || [] : [];
      if (names.includes(screen)) {
        navigationRef.reset({ index: 0, routes: [{ name: screen }] });
        return;
      }
    } catch (e) {}
    if (tries < 40) setTimeout(tick, 50);
  };
  setTimeout(tick, 0);
}

export default goToAuth;
