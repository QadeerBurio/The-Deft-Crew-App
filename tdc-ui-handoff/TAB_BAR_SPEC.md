# Bottom tab bar spec

File: `app/src/navigation/TabNavigator.js`, component `CustomTabBar`. **Change the visuals only.**

## Must not change
- The 5 tabs, their order and their `onPress` navigation (`Home` → `navigate("Home", { screen: "HomeStackMain" })`, `Explore`, `Social`, `Campus`, `Profile`).
- The tour refs: `homeRef`, `exploreRef`, `socialRef`, `campusRef` on `View`s with `collapsable={false}`, registered with `registerTarget` as today (`tab_home`, `tab_explore`, `tab_social`, `tab_campus`). The ref'd view must still wrap the visible icon so the tour highlight lands in the right place.
- `TAB_HEIGHT` (55) and the wrapper height formula `TAB_HEIGHT + insets.bottom + 10`. `TourOverlay.js` uses 55 too; if you need more height for labels, **ask first**, because the tour sheet offset depends on it.
- `HIDE_TAB_BAR_SCREENS`, `getDeepestRouteName`, the hide-on-Social logic, the `Tab.Navigator` config and screens.

## New look
- Background white, top border 1 px `#ECE7DB`, no shadow.
- Side tabs (home, explore, campus, profile), each a column, centred: icon 23, then label, then a 5×5 dot.
  - Label: lowercase `home`, `explore`, `campus`, `profile`. DM Sans 11; active `DMSans_700Bold`, inactive `DMSans_500Medium`. 3 gap between icon, label and dot.
  - Colours: active icon and label `#111111`, inactive `#736E65`. Active dot `#F9C349`, inactive dot transparent (keep its space so nothing shifts).
  - Icons: keep the current icon families and names (Octicons `home`, MaterialIcons `explore`, MaterialCommunityIcons `school-outline`, MaterialCommunityIcons `account-circle`). If labels don't fit in TAB_HEIGHT 55 at icon 23, reduce the icon to 22 before asking for more height.
- Centre social button:
  - 58×58 circle, background `#111111`, 4 px white border, shadow `0 6 16 rgba(17,17,17,0.2)` / Android `elevation 6`, raised so its centre sits about 24 above the bar's top edge (as the current design already does; keep the existing offset if it's close).
  - Icon: the current `Foundation social-skillshare` in `#F9C349`, size 28.
  - Label under it: `social`, DM Sans 700 11, `#111111`.
  - Badge (only if the owner says yes to CLAUDE_TASK Q2): top-right of the circle, min 20×20, radius 10, padding 0 5, background `#F9C349`, 2 px white border, DM Sans 800 10.5 `#111111`, `99+` cap, hidden at 0. Count = sum of `unreadCount` from the same `GET /inbox` call `Social.js` makes, refreshed when the tab bar gains focus (no new polling interval).
- Accessibility: each tab `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, labels `home`, `explore`, `social` (or `social, 3 unread`), `campus`, `profile`. Touch targets at least 44×44.
- Press feedback: keep `activeOpacity` 0.7 on side tabs; centre button scales to 0.95 on press.

## Check
- The tour still highlights each tab correctly.
- Tab bar hides on Social and on every screen in `HIDE_TAB_BAR_SCREENS`.
- Looks right with and without a home indicator (iPhone X+ and Android gesture nav and 3-button nav).
