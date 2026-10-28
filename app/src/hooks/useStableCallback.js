// app/src/hooks/useStableCallback.js
// A callback with one identity for the component's lifetime that always calls the latest `fn`.
// For list rows wrapped in React.memo: a new inline function per render re-rendered every
// visible row on each parent render.
import { useCallback, useRef } from "react";

export function useStableCallback(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args) => ref.current?.(...args), []);
}

export default useStableCallback;
