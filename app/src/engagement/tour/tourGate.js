// app/src/engagement/tour/tourGate.js
// Anything that puts a popup or a system prompt on screen holds the tour while it shows:
//   celebration popups, app alerts, the push / location permission prompts.
// The tour only auto-starts when nothing is holding it.

const holds = new Set();
const listeners = new Set();

const emit = () => listeners.forEach((fn) => {
  try { fn(holds.size > 0); } catch {}
});

export function holdTour(key) {
  if (holds.has(key)) return;
  holds.add(key);
  emit();
}

export function releaseTour(key) {
  if (!holds.delete(key)) return;
  emit();
}

export const isTourHeld = () => holds.size > 0;

export function onTourGateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
