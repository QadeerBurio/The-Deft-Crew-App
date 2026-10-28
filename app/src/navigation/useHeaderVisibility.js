// app/src/navigation/useHeaderVisibility.js
// Is the TDC header hidden (Social, or a full-screen screen)? For HomeTabsScreen.
// Tab focus and nested route events arrive on every tap; they are kept in refs and only a
// change of the answer causes a render. Before, two useState values were set on every event,
// so the drawer, the header and the tab navigator re-rendered during each tap.
import { useCallback, useRef, useState } from "react";

export function useHeaderVisibility(fullscreenScreens) {
  const tabRef = useRef("Home");
  const routeRef = useRef("Home");
  const listRef = useRef(fullscreenScreens);
  listRef.current = fullscreenScreens;
  const [hidden, setHidden] = useState(false);

  // same answer → React keeps the state and skips the render
  const recompute = useCallback(() => {
    const route = routeRef.current;
    setHidden(tabRef.current === "Social" || (!!route && listRef.current.includes(route)));
  }, []);

  const onTabChange = useCallback((name) => {
    tabRef.current = name;
    recompute();
  }, [recompute]);

  const onRouteChange = useCallback((name) => {
    routeRef.current = name;
    recompute();
  }, [recompute]);

  return { hidden, onTabChange, onRouteChange };
}

export default useHeaderVisibility;
