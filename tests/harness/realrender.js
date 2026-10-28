// tests/harness/realrender.js
// Minimal in-memory React renderer on react-reconciler (already installed through Skia), so a test
// can run real hooks, effects and React.memo. createRoot().render(element); root.tree = host nodes.
module.exports = function makeRealRenderer(reqApp) {
  const React = reqApp("react");
  const Reconciler = reqApp("react-reconciler");
  const { DefaultEventPriority } = reqApp("react-reconciler/constants");
  let priority = DefaultEventPriority;
  const host = {
    supportsMutation: true, supportsPersistence: false, supportsHydration: false, isPrimaryRenderer: true,
    createInstance: (type, props) => ({ type, props, children: [] }),
    createTextInstance: (text) => ({ type: "#text", text }),
    appendInitialChild: (p, c) => p.children.push(c), appendChild: (p, c) => p.children.push(c), appendChildToContainer: (r, c) => r.children.push(c),
    insertBefore: (p, c, b) => p.children.splice(p.children.indexOf(b), 0, c), insertInContainerBefore: (r, c, b) => r.children.splice(r.children.indexOf(b), 0, c),
    removeChild: (p, c) => p.children.splice(p.children.indexOf(c), 1), removeChildFromContainer: (r, c) => r.children.splice(r.children.indexOf(c), 1),
    finalizeInitialChildren: () => false, shouldSetTextContent: () => false,
    getRootHostContext: () => ({}), getChildHostContext: (c) => c, getPublicInstance: (i) => i,
    prepareForCommit: () => null, resetAfterCommit: () => {}, preparePortalMount: () => {},
    commitUpdate: (i, type, oldP, newP) => { i.props = newP; }, commitTextUpdate: (t, o, n) => { t.text = n; },
    clearContainer: (r) => { r.children.length = 0; }, resetTextContent: () => {}, hideInstance: () => {}, unhideInstance: () => {}, hideTextInstance: () => {}, unhideTextInstance: () => {},
    scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, supportsMicrotasks: true, scheduleMicrotask: queueMicrotask,
    setCurrentUpdatePriority: (p) => { priority = p; }, getCurrentUpdatePriority: () => priority, resolveUpdatePriority: () => priority || DefaultEventPriority,
    getCurrentEventPriority: () => DefaultEventPriority, getInstanceFromNode: () => null, beforeActiveInstanceBlur: () => {}, afterActiveInstanceBlur: () => {},
    prepareScopeUpdate: () => {}, getInstanceFromScope: () => null, detachDeletedInstance: () => {}, requestPostPaintCallback: () => {},
    maySuspendCommit: () => false, preloadInstance: () => true, startSuspendingCommit: () => {}, suspendInstance: () => {}, waitForCommitToBeReady: () => null,
    NotPendingTransition: null, HostTransitionContext: React.createContext(null), resetFormInstance: () => {}, shouldAttemptEagerTransition: () => false, trackSchedulerEvent: () => {}, resolveEventType: () => null, resolveEventTimeStamp: () => -1.1,
  };
  const R = Reconciler(host);
  return {
    React,
    createRoot() {
      const container = { children: [] };
      const root = R.createContainer(container, 0, null, false, null, "", (e) => console.log("RR error", e?.message), (e) => console.log("RR caught", e?.message), (e) => {}, null);
      return { render: (el) => R.updateContainer(el, root, null, null), get tree() { return container.children; }, unmount: () => R.updateContainer(null, root, null, null) };
    },
  };
};
