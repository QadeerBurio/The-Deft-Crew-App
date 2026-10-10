# Home screen spec (approved "balanced" design)

Design source: `reference/home-design.html` (390 pt wide phone; `px` in the HTML = `dp`/`pt` in React Native). Where this file and the HTML differ, **this file wins**, because it has been adjusted to the data the app really has.

Personality: light and professional, with one fun moment. Lowercase voice. Headings end with a yellow full stop. Yellow is used only where an action or a reward is.

---

## 1. Design tokens

Put these in `app/src/theme/tokens.js` and use them in all new Home code. No other colours on Home.

### Colours
| Token | Hex | Use |
|---|---|---|
| `yellow` | `#F9C349` | brand accent: full stops, active tab dot, selected vote fill, badges (max ~10% of the screen) |
| `yellowSoft` | `#FFF1CC` | today's drop card background |
| `ink` | `#111111` | main text, black pills, social button |
| `paper` | `#FAF8F3` | screen background |
| `card` | `#FFFFFF` | cards |
| `sand` | `#F5F2EA` | vote bar background, neutral wells |
| `line` | `#ECE7DB` | card borders (1 px) |
| `lineSoft` | `#F0ECE2` | dividers inside cards |
| `textMuted` | `#6B675E` | secondary text (5.3:1 contrast on paper) |
| `textFaint` | `#736E65` | inactive tab icons/labels, chevrons (4.8:1) |

Rule: 60% paper, 30% white cards + ink, 10% yellow.

### Type
- Headings: **Outfit** (`Outfit_700Bold`, `Outfit_800ExtraBold`). Body: **DM Sans** (`DMSans_400Regular`, `DMSans_500Medium`, `DMSans_600SemiBold`, `DMSans_700Bold`). See FONTS.md.
- In React Native use the specific family per weight (e.g. `fontFamily: 'Outfit_800ExtraBold'`), not `fontWeight` with a generic family.
- Only three main sizes on Home: **26** (headline), **19** (section titles), **14** (content). Small text: 13, 12, 11.5, 10.5.
- Respect the user's system font size (don't set `allowFontScaling={false}`), but cap with `maxFontSizeMultiplier={1.3}` on headings and pills so the layout doesn't break.

### Spacing and shape
- Screen side padding **16**. Section titles and the greeting sit at **20** (16 + 4 inner).
- **24** between sections. **12** between a section title and its card.
- Card radius **22**, deal card radius **20**, buttons/options radius **12**, pills fully round.
- Card border: 1 px `line`. No heavy shadows; deal cards get a very soft one (`shadowOpacity 0.05`, `shadowRadius 7`, `elevation 1`).
- Tap feedback: scale to 0.96 on press (use `Pressable` + `Animated` or the existing `TouchableOpacity activeOpacity` pattern), plus the existing light haptic where the app already uses one.

---

## 2. Layout, top to bottom

Home renders inside the existing `SafeAreaView` + `ScrollView` with the existing `RefreshControl` (keep `refetch` of `['engagement','home', userId]`, and make it also refetch the confession and deals data used below). Background `paper`. The global header from the drawer stays as it is (see CLAUDE_TASK Q1).

### 2.1 Banner slider (keep)
- `<Slider userId={userId} isGuest={isGuest} />` stays first, exactly as now. Only change: wrap it so it has 16 side padding and 16 top padding if it doesn't already; don't change Slider.js.

### 2.2 Greeting + headline
- Padding: 18 top, 20 sides.
- Line 1 (DM Sans 14, `textMuted`): greeting + name, then a 3×3 dot (`textFaint`), then the streak (DM Sans 600, 14, `ink`) with a small flame icon (Ionicons `flame`, 13, colour `yellow`).
  - Name: first word of the same display name the app already uses (AuthContext `user.name || user.fullName || user.username`). Guests: no name ("hey there").
  - Streak: from `useStreak()` `count`. Text depends on the unit (CLAUDE_TASK Q3), e.g. `12-day streak`. **Hide the dot and streak** when count is 0, the user is a guest, or the streak flag is off. Tapping it opens the existing `StreakSheet`.
- Line 2, headline (Outfit 800, 26, letter-spacing -0.7, line-height 29, `ink`), ends with a yellow `?`.
- Copy by local time (device clock):
  | Time | Greeting | Headline |
  |---|---|---|
  | 05:00 – 11:59 | `morning, [name]` | `first class or first coffee?` |
  | 12:00 – 19:59 | `hey [name]` | `what are we sorting today?` |
  | 20:00 – 04:59 | `still up, [name]` | `so is the crew?` |

### 2.3 Today's drop
- Use the existing `DailyDropCard`, rendered as `<DailyDropCard variant="home" />`, only when `flags.dailyDrop` is on (as now). If there's no drop today it already returns nothing; keep that.
- Section padding: 16 top, 16 sides.
- `variant="home"` styles:
  - Card: background `yellowSoft`, radius 22, padding 16, no border, no shadow.
  - Top row: left `today's drop` (DM Sans 700, 13). Right side: **nothing** (the design's "2 of 3 today · next 9 pm" needs data the backend doesn't have, so it is removed). Keep the existing small `Dot` mood face if the card shows one; place it before the label at 18 px.
  - Question: `drop.title` (Outfit 700, 18, line-height 22.5), 6 below the top row. `drop.body` if present: DM Sans 14, `textMuted`, 4 below.
  - Options: the existing `drop.action.options`, side by side in one row (flex: 1 each, gap 6), 12 below the question. Each option: height 44, radius 12, white background, 1 px `line` border, label DM Sans 700 13 `ink`, centred, 1 line, ellipsized. If there are more than 3 options, wrap to a second row.
  - After voting (existing `myChoice` / `counts` logic): each option shows a fill bar from the left with width = its existing computed percentage; the chosen option's fill is `yellow` with a 1 px `ink` border, others `sand`. Label becomes `label 46%`. Keep the existing animation.
  - Helper line under options (DM Sans 12, `textMuted`, 10 top): before voting `vote to see what campus thinks.`; after voting `you and [n] others picked this.` where n = the chosen option's count − 1 from `drop.counts`; if n ≤ 0, `you picked this.` Do **not** show "+5 points" unless the existing code already receives a points value for the vote; if it does, append ` +[that value] points.`
  - The existing "open" CTA (target link) stays, restyled as a text link: DM Sans 600 13 `ink`, underlined, right-aligned on the helper line.
  - Keep all existing celebration, haptics, sounds and refresh behaviour.

### 2.4 On campus (latest confession)
- Section padding: 24 top, 16 sides.
- Title row (padding 0 4): left `on campus` + yellow `.` (Outfit 800, 19). Right: `open feed` (DM Sans 600, 13, `textMuted`) → navigates to the confessions feed (see 3.3).
- Card (12 below title): white, 1 px `line`, radius 22, overflow hidden.
  - Inside padding 16:
    - Label: `latest confession · anonymous` (DM Sans 600, 12, `textMuted`). Then a relative time on the right (`2h`), using the same formatting the confession screen uses if it's exported, otherwise a small local helper.
    - Text: the confession `text` (DM Sans 600, 16, line-height 22.4, `ink`), max 4 lines, ellipsized.
    - Stats row, 12 below: two read-only pills (height 32, radius 16, background `paper`, 1 px `line`, DM Sans 600 12.5): `♥ [likes]` and `[comments] comments`. Hide a pill when its count is 0. These are **not** buttons; the whole card opens the post.
  - Footer row (border-top 1 px `lineSoft`, padding 12 16): left `see what campus is saying` (DM Sans 700, 13.5), right chevron (Ionicons `chevron-forward`, 16, `textFaint`). Opens the feed. (The design's "[N] new posts" count doesn't exist in the backend, so it is not shown.)
- Tapping the card opens that exact confession (see 3.3).
- If there are no confessions, or the request fails, hide the whole section. Guests: hide the section (the feed needs a token).

### 2.5 Your tdc (the 8 tools)
- Section padding: 24 top, 16 sides.
- Title row (padding 0 4): `your tdc` + yellow `.` (Outfit 800, 19). Right: `[sorted] of 8 sorted` (DM Sans 600, 13, `textMuted`), from `useMissions()` (count of features in `sortedFeatureIds`). Hide it for guests or when the missions flag is off.
- Grid card: white, 1 px `line`, radius 22, padding 18 vertical / 8 horizontal. 4 columns × 2 rows, row gap 16, column gap 4. Each cell is centred.
- Each tool:
  - Circle: 50×50, radius 25, background = `well`, Ionicons icon (the existing icon names from `FEATURES`) size 23, colour = `stroke`.
  - Mood face: the existing `<FeatureDot missionKey={...} sorted={...} />` on the circle's top-right (it is already absolutely positioned; the circle needs `position: 'relative'` and must not clip it). It already shows the problem mood before and the sorted face after. Don't change FeatureDot.
  - Label below (7 gap): DM Sans 600, 11.5, `ink`, centred, 1 line.
  - When sorted: a small black pill under the label (margin-top -3 → just use 4 gap): height 18, padding 0 7, radius 9, background `ink`, text `sorted` DM Sans 700 10 white followed by a yellow `.`. Keep the existing pill pop-in animation if there is one.
  - Tap: the existing `handleFeaturePress(feat.screen)` with the existing routes. Keep the existing tour target refs if any feature has one.
- Order, labels and colours (the `id`s and screens stay as in the current `FEATURES` array):
  | id | label | icon (existing) | well | stroke |
  |---|---|---|---|---|
  | discount | `discounts` | `pricetag-outline` | `#FDE3E1` | `#D9443F` |
  | traveling | `travel` | `airplane` | `#DDF0F8` | `#1F86C4` |
  | dashboard | `skillsshare` | `people-circle` | `#E2F3E4` | `#2E8B3E` |
  | events | `events` | `calendar` | `#F1E6F5` | `#8E44AD` |
  | resume | `resume` | `document-text-outline` | `#FFF0DC` | `#C77700` |
  | jobs | `jobs` | `briefcase` | `#FDE6E2` | `#D1383D` |
  | scholar | `scholarships` | `school-outline` | `#E1F1FA` | `#2B7FC0` |
  | social | `social` | `globe` | `#FCE4EC` | `#C2185B` |
- Remove the old "Explore Features" section header and the old feature cards' descriptions.

### 2.6 Deals near you
- Section padding: 24 top, 24 bottom. Title row padding 0 20: `deals near you` + yellow `.` (Outfit 800, 19). Right: `rs [X] saved · see all` (DM Sans 600, 13, `textMuted`) where X is `me.stats.totalSaved` formatted like `SavingsCounter` does (`toLocaleString`); if 0 or missing, just `see all`. Tap → `handleFeaturePress('Brands')`.
- Horizontal `FlatList` (showsHorizontalScrollIndicator false, `snapToInterval` 212, `decelerationRate="fast"`), content padding 12 top, 20 sides, 6 bottom, gap 12.
- Card: width 200, radius 20, white, 1 px `line`, soft shadow, overflow hidden.
  - Image: height 120, `brand.displayImage` (already an absolute URL from `getBrandsFast`), `resizeMode="cover"`. If the image fails, show `sand` background with the brand logo centred at 48.
  - Discount pill on the image (top-left 10): height 26, padding 0 10, radius 13, background `yellow`, text `[discount]% off` DM Sans 800 12.5 `ink`. Hide if discount is 0.
  - Body padding 10 12 12: brand name (DM Sans 700, 15, 1 line), then a meta line (DM Sans 12.5, `textMuted`, 1 line, 2 top): `[category] · online` / `[category] · in store` / just `[category]`, from `isOnline` / `isInStore`. **No distances** (the app doesn't have them).
  - Tap → `navigation.navigate('OfferScreen', { brand })`, same as Brands.js does.
- Data: brands with `hasOffer === true`, first 6 (order per CLAUDE_TASK Q6).
- Hide the whole section while there are 0 such brands, and for guests unless Q5 says otherwise. While loading, show 2 grey placeholder cards (`sand`, same size), no spinner.

### 2.7 Removed from Home
- `MissionStack` and the "fully sorted" card: no longer rendered on Home (files stay).
- "Explore Features" header and feature descriptions.
- Any decorative sparkles/rings around the AI button (see 2.8).

### 2.8 AI button (keep, smaller)
- Floating, bottom-right: `right: 16`, `bottom: 16` above the tab bar (use the same offset the current FAB uses relative to the tab bar so it never covers it).
- 48×48 circle, background `ink`, icon `MaterialCommunityIcons robot-outline` 22 in `yellow`, shadow `0 4 10 rgba(17,17,17,0.2)` / `elevation 4`.
- No pulsing rings, no sparkles, no "AI" badge, no floating loop animation. Keep a press scale (0.94) and the existing haptic.
- Opens the existing `ChatBotInterface` modal exactly as now. `accessibilityLabel="ask tdc ai"`.
- Add bottom padding to the ScrollView content so the last deal row isn't hidden behind the button (at least 72).

### 2.9 Entrance animation
Sections fade up once on first mount: opacity 0 → 1, translateY 10 → 0, 450 ms ease-out, staggered 50 ms (greeting, drop, campus, tools, deals). Reuse the existing `FadeInView`. No animation on refresh. Respect "reduce motion" (`AccessibilityInfo.isReduceMotionEnabled`) by skipping it.

---

## 3. Data mapping (existing sources only)

| Section | Source (already in the app) | Notes |
|---|---|---|
| Greeting name | `AuthContext` `user` | first word of the display name |
| Streak | `useStreak()` → `count` (+ `flags.soloStreak`) | hide at 0 / guest / flag off |
| Today's drop | `DailyDropCard` (uses `useDailyDrop` → `GET /engagement/home`) | 1 drop per day; no slot/next-time text |
| Latest confession | `GET {social API}/confessions/feed`, same URL, headers and token as `ConfessionScreen.js` | take `[0]`; fields `_id`, `text`, `likes`, `comments`, `createdAt` |
| Sorted tools | `useMissions()` → `missions.cards[].sorted/.feature`, `FEATURE_ID_TO_MISSION` | as Home does today |
| Deals | `optimizedAPI.getBrandsFast(token, userId)` from `api/brandApi.js` | uses its built-in cache; pass `{ forceRefresh: true }` on pull-to-refresh |
| Savings | `useEngagement()` → `me.stats.totalSaved` | hide at 0 |

### 3.1 Fetching rules
- Use `useQuery` for the confession and deals data with keys `['home','latestConfession', userId]` and `['home','deals', userId]`, `staleTime` 60 s, `enabled: !isGuest && !!token`. Don't poll.
- Don't add polling, sockets or new endpoints. Don't change the API files; if `ConfessionScreen` hard-codes the social API URL in the file, reuse the same constant value in a small local helper on Home (ask the owner if you'd rather export it).
- All failures are silent: hide the section, `console.log` once in dev only.

### 3.2 Feature routes
Unchanged: `handleFeaturePress(screen)` as in the current `Home.js`.

### 3.3 Opening confessions
- Specific post: the Daily Drop already does this with `navigationRef.navigate('FeedScreen', { postId })` (FeedScreen listens via `useOpenFromParams('postId')`). Use the same route and param. Verify the exact route name and nesting in the navigators before using it; if it's nested under Social, navigate the way `DailyDropCard`'s `target` does.
- Feed only: same route with `{ tab: 'Confession' }`.

---

## 4. Accessibility
- Every tappable element: `accessibilityRole="button"` and a clear `accessibilityLabel` (e.g. `discounts, sorted`, `vote food`, `open latest confession`).
- Minimum touch target 44×44 (use `hitSlop` on small pills/links).
- Text contrast: only use the colours above; never put `textFaint` text on `yellowSoft`.
- Headline and section titles: `accessibilityRole="header"`.

## 5. States to check before reporting done
1. First load (data loading): greeting + headline show instantly; drop/confession/deals sections appear when ready, without layout jumps of more than one section.
2. Guest: no name, no streak, no sorted count, no confession, deals per Q5; tools grid works.
3. No drop today: drop section absent, spacing still 24 between sections.
4. Voted: bars and percentages; helper text updates.
5. No confessions / API error: campus section hidden.
6. No deals: deals section hidden.
7. 0 of 8 and 8 of 8 sorted.
8. Small phone (360 wide) and large phone (430 wide); Android and iOS.
9. System font size at largest: no clipped text in the grid (labels ellipsize).
10. Pull to refresh updates all sections.
11. Tour still points at the right tab bar items.
12. Dark mode on the phone: the app stays light (as it is today); don't add dark mode.
