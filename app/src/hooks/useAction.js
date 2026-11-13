// app/src/hooks/useAction.js
// One button = one action. Each action has its own `running` flag, so one button's spinner
// never blocks or resets another's.
//
//   const save = useAction(async ({ signal }, item) => api.put(url, item, { signal }), { errorTitle: "not saved" });
//   <ActionButton action={save} title="save" />            or   onPress={() => save.run(item)}
//
// What it guarantees:
//   - a second tap while it runs does nothing (ref guard, works before the next render)
//   - `running` is reset in finally: success, error, timeout
//   - no state updates after the screen is gone; the AbortSignal is aborted on unmount
//   - a safety timer (above the longest request limit) so nothing spins forever
//   - errors show one short message (TOO_LONG for timeouts); `silent` actions only log
//   - `group`: actions with the same group run one after another (e.g. saves of one resume)
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { plainError } from "../utils/plainError";
import { TIMEOUT, TOO_LONG, isTimeout, timeoutError } from "../config/timeouts";

// longest named request limit + a margin: requests time out first and say why
export const ACTION_SAFETY_MS = TIMEOUT.UPLOAD + 10000;

const groups = new Map(); // group name -> tail of its queue

/** Run `task` after every earlier task of the same group has settled. */
export function runInGroup(group, task) {
  if (!group) return Promise.resolve().then(task);
  const prev = groups.get(group) || Promise.resolve();
  const next = prev.then(task, task);
  const tail = next.then(() => {}, () => {});
  groups.set(group, tail);
  tail.then(() => {
    if (groups.get(group) === tail) groups.delete(group);
  });
  return next;
}

function abortedError() {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

export function errorMessage(err, fallback) {
  return isTimeout(err) ? TOO_LONG : plainError(err, fallback);
}

export default function useAction(fn, options = {}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const controllers = useRef(new Set());
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const optRef = useRef(options);
  optRef.current = options;

  useEffect(() => {
    mounted.current = true;
    const live = controllers.current;
    return () => {
      mounted.current = false;
      live.forEach((c) => c.abort());
      live.clear();
    };
  }, []);

  const run = useCallback(async (...args) => {
    if (busy.current) return undefined;
    busy.current = true;
    const opts = optRef.current;
    const limit = opts.timeoutMs === undefined ? ACTION_SAFETY_MS : opts.timeoutMs;
    const controller = new AbortController();
    controllers.current.add(controller);
    if (mounted.current) {
      setRunning(true);
      setError(null);
    }
    let timer;
    try {
      const work = runInGroup(opts.group, () => {
        if (controller.signal.aborted) throw abortedError();
        return fnRef.current({ signal: controller.signal }, ...args);
      });
      const guarded = limit
        ? Promise.race([
            work,
            new Promise((_, reject) => {
              timer = setTimeout(() => {
                reject(timeoutError(limit, "action"));
                controller.abort();
              }, limit);
            }),
          ])
        : work;
      const value = await guarded;
      if (mounted.current) opts.onSuccess?.(value);
      return value;
    } catch (err) {
      // the screen closed: nothing to show, nothing to update
      if (!mounted.current) return undefined;
      if (err?.name === "AbortError" && !isTimeout(err)) return undefined;
      setError(err);
      if (opts.onError) opts.onError(err);
      if (opts.silent) {
        console.warn(`[action] ${opts.name || "background action"} failed:`, err?.message || err);
      } else {
        Alert.alert(opts.errorTitle || "something went wrong", errorMessage(err, opts.fallback));
      }
      return undefined;
    } finally {
      clearTimeout(timer);
      controllers.current.delete(controller);
      busy.current = false;
      if (mounted.current) setRunning(false);
    }
  }, []);

  return { run, running, error };
}
