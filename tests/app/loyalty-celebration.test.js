// Loyalty celebrations and stamps in the app (feat/loyalty-control):
//   - "reward unlocked at Chai Cafe: 25% off your next bill" (or the free item): the popup with confetti, once per
//     reward (a second push, the card loading, a restart, or the push and the card at the same moment: still once)
//   - "reward used at Chai Cafe, you saved PKR 400": once per reward
//   - reduce motion: no confetti; closing the popup; screen readers hear the text
//   - stamp circles: N circles, filled per counted visit, all filled with a gift when the reward is ready
//   - wiring: foreground push, a tap from the tray, in-app polling, and the popup mounted for signed-in students
//   node tests/app/loyalty-celebration.test.js
const path = require("path");
const { SRC, tick, read, counter, makeReact, loader, makeRN, textOf, findAll, byLabel } = require("./harness");
global.__DEV__ = false;
const { ok, done } = counter();

(async () => {
  // a fake phone storage that survives a "restart" (the module's memory is reset, the storage isn't)
  const store = new Map();
  const storage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); } };

  console.log("── loyalty/celebrations.js: once per reward");
  const { React, mount } = makeReact();
  const C = loader({ "@react-native-async-storage/async-storage": storage })(path.join(SRC, "loyalty/celebrations.js"));
  const shown = [];
  C.onCelebration((m) => shown.push(m));
  const push = { type: "loyalty", event: "reward_unlocked", rewardId: "rw1", brandName: "Chai Cafe", rewardLabel: "25% off", rewardKind: "percent", brandId: "b1" };
  ok(await C.fromNotificationData(push), "the 'reward unlocked' push: shown");
  ok(shown[0]?.text === "reward unlocked at Chai Cafe: 25% off your next bill" && shown[0].kind === "unlocked", "…'reward unlocked at Chai Cafe: 25% off your next bill'", JSON.stringify(shown[0]));
  ok(!(await C.fromNotificationData(push)) && shown.length === 1, "the same push again: not shown again");
  ok(!(await C.fromStamps({ available: { id: "rw1", label: "25% off", kind: "percent" } }, "Chai Cafe")) && shown.length === 1, "the card then showing that ready reward: not again");
  C._test.reset(); C.onCelebration((m) => shown.push(m));
  ok(!(await C.celebrateReward({ rewardId: "rw1", brandName: "Chai Cafe", label: "25% off", kind: "percent" })) && shown.length === 1, "after an app restart (memory gone, phone storage kept): not again");
  const both = await Promise.all([C.fromStamps({ available: { id: "rw2", label: "a free coffee", kind: "item", item: "a free coffee" } }, "Roast"), C.fromNotificationData({ ...push, rewardId: "rw2", brandName: "Roast", rewardLabel: "a free coffee", rewardKind: "item" })]);
  ok(both.filter(Boolean).length === 1 && shown.length === 2, "the push and the card at the same moment: shown once", JSON.stringify(both));
  ok(shown[1].text === "reward unlocked at Roast: a free coffee on your next visit", "a free item: 'reward unlocked at Roast: a free coffee on your next visit'", shown[1].text);
  ok(await C.fromNotificationData({ type: "loyalty", event: "reward_used", rewardId: "rw1", brandName: "Chai Cafe", savedAmount: 400 }), "the 'reward used' push: shown");
  ok(shown[2]?.kind === "used" && shown[2].text === "reward used at Chai Cafe, you saved PKR 400", "…'reward used at Chai Cafe, you saved PKR 400'", JSON.stringify(shown[2]));
  ok(!(await C.fromNotificationData({ type: "loyalty", event: "reward_used", rewardId: "rw1", savedAmount: 400 })) && shown.length === 3, "…once per reward");
  ok(!(await C.fromNotificationData({ type: "loyalty", title: "Visit 1 of 3" })) && !(await C.fromNotificationData({ type: "redemption", event: "reward_unlocked", rewardId: "x" })) && shown.length === 3, "other loyalty pushes, or another type with the same event: nothing");
  ok(!(await C.celebrateReward({ brandName: "x" })) && shown.length === 3, "no reward id: nothing");

  console.log("── components/RewardCelebration.js: the popup");
  let reduce = false;
  const announced = [];
  const { rn } = makeRN({ AccessibilityInfo: { isReduceMotionEnabled: async () => reduce, announceForAccessibility: (t) => announced.push(t) } });
  const celebListeners = new Set();
  const fakeCeleb = { onCelebration: (fn) => { celebListeners.add(fn); return () => celebListeners.delete(fn); } };
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };
  const load = loader({ react: React, "react-native": rn, ...icons, "../loyalty/celebrations": fakeCeleb });
  const RewardCelebration = load(path.join(SRC, "components/RewardCelebration.js")).default;
  let root = mount(React.createElement(RewardCelebration));
  await tick(20); root.rerender();
  ok(textOf(root.tree) === "", "nothing to celebrate: nothing on screen");
  for (const fn of celebListeners) fn({ kind: "unlocked", rewardId: "rw1", text: "reward unlocked at Chai Cafe: 25% off your next bill" });
  await tick(20); root.rerender();
  let t = textOf(root.tree);
  const confetti = findAll(root.tree, (x) => x.props?.testID === "confetti");
  ok(t.includes("reward unlocked.") && t.includes("reward unlocked at Chai Cafe: 25% off your next bill") && t.includes("nice!"), "the popup: 'reward unlocked.', the line, 'nice!'", t);
  ok(confetti.length === 1 && findAll(confetti[0], (x) => x.type === "Animated.View").length === 28, "confetti: 28 animated pieces (plain Animated, no native module)");
  ok(announced.includes("reward unlocked at Chai Cafe: 25% off your next bill") && !!byLabel(root.tree, "reward unlocked at Chai Cafe: 25% off your next bill"), "screen readers hear it");
  for (const fn of celebListeners) fn({ kind: "used", rewardId: "rw1", text: "reward used at Chai Cafe, you saved PKR 400" });
  byLabel(root.tree, "nice, close").props.onPress();
  await tick(20); root.rerender();
  t = textOf(root.tree);
  ok(t.includes("reward used.") && t.includes("reward used at Chai Cafe, you saved PKR 400") && findAll(root.tree, (x) => x.props?.testID === "confetti").length === 0, "closing it shows the next one: 'reward used, you saved PKR 400' (no confetti)", t);
  byLabel(root.tree, "ok, close").props.onPress();
  await tick(20); root.rerender();
  ok(textOf(root.tree) === "", "closed: nothing on screen");
  reduce = true;
  root = mount(React.createElement(RewardCelebration));
  await tick(20); root.rerender();
  for (const fn of celebListeners) fn({ kind: "unlocked", rewardId: "rw3", text: "reward unlocked at Roast: a free coffee on your next visit" });
  await tick(20); root.rerender();
  ok(textOf(root.tree).includes("a free coffee on your next visit") && findAll(root.tree, (x) => x.props?.testID === "confetti").length === 0, "'reduce motion' on: the popup without confetti");

  console.log("── components/StampCircles.js: stamps fill");
  const Stamps = loader({ react: React, "react-native": rn, ...icons })(path.join(SRC, "components/StampCircles.js"));
  const count = (tree, id) => findAll(tree, (x) => x.props?.testID === id).length;
  root = mount(React.createElement(Stamps.default, { needed: 5, stamps: 3 }));
  ok(count(root.tree, "stamp-on") === 3 && count(root.tree, "stamp-off") === 2, "5 circles, 3 counted visits: 3 filled, 2 empty");
  root = mount(React.createElement(Stamps.default, { needed: 5, stamps: 4 }));
  ok(count(root.tree, "stamp-on") === 4, "after a redemption (4 visits): 4 filled");
  root = mount(React.createElement(Stamps.default, { needed: 1, stamps: 0, ready: true }));
  ok(count(root.tree, "stamp-on") === 1 && findAll(root.tree, (x) => x.type === "Icon" && x.props?.name === "gift").length === 1, "a 1-visit card, reward ready: filled, with a gift");
  root = mount(React.createElement(Stamps.default, { needed: 10, stamps: 12 }));
  ok(count(root.tree, "stamp-on") === 10 && count(root.tree, "stamp-off") === 0, "a 10-visit card never shows more than 10");
  ok(Stamps.filledOf({ needed: 3, stamps: 1, ready: true }) === 3 && Stamps.filledOf({ needed: 3, stamps: -1 }) === 0, "filledOf: ready = all; never negative");

  console.log("── wiring");
  const gnl = read("app/src/components/GlobalNotificationLayer.js");
  ok(/loyaltyMoment\(data\)\.catch/.test(gnl.split("addNotificationReceivedListener")[1] || ""), "a foreground push: the moment is checked");
  ok(/claimNotificationResponse\(response\)\) return;\s*onRedemptionPush\(data\);\s*loyaltyMoment\(data\)/.test(gnl), "a tap from the tray: the moment is checked");
  ok(/if \(notification\?\.metadata\?\.event\) loyaltyMoment\(notification\.metadata\)/.test(gnl), "an in-app notification found by polling: the moment is checked");
  ok(gnl.includes("{!!token && !isGuest && <RewardCelebration />}"), "the popup is mounted for signed-in students only");
  ok(read("app/src/components/LoyaltyVisits.js").includes("<StampCircles") && read("app/src/components/LoyaltyCard.js").includes("<StampCircles"), "'my loyalty' and the offer screen use the same stamp card");
  ok(!/confetti/i.test(read("package.json")) && !read("app/src/components/RewardCelebration.js").includes("lottie"), "no confetti package and no native animation module (plain Animated): an eas update can ship it");
  done();
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
