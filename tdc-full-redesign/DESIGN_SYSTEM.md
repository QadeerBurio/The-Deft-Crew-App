# tdc design system (applies to every screen)

The tokens already exist in `app/src/theme/tokens.js` (from the Home redesign). Extend that file; don't create a second one. Fonts (Outfit + DM Sans) are already loaded in `App.js`.

## 1. Colours
| Token | Hex | Use |
|---|---|---|
| `yellow` | `#F9C349` | the accent: primary buttons on dark, full stops, active states, badges, selected chips. Max ~10% of a screen. |
| `yellowSoft` | `#FFF1CC` | highlight cards, selected rows, info banners |
| `ink` | `#111111` | text, primary buttons, dark surfaces |
| `paper` | `#FAF8F3` | every screen background |
| `card` | `#FFFFFF` | cards, sheets, inputs |
| `sand` | `#F5F2EA` | neutral wells, placeholders, secondary buttons |
| `line` | `#ECE7DB` | 1 px borders |
| `lineSoft` | `#F0ECE2` | dividers inside cards |
| `textMuted` | `#6B675E` | secondary text |
| `textFaint` | `#736E65` | tertiary text, icons on light (never on yellowSoft) |
| `success` | `#1E6B3A` (text) / `#E3F3E8` (bg) | success states |
| `danger` | `#B42318` (text) / `#FDECEA` (bg) | errors, destructive actions |

Rules:
- Replace hard-coded `#f9c349`, `#FFD700`, `#1a1a1a`, `#888`, `#999`, `#666`, pure `#000`/`#fff` backgrounds, gradients and glows with tokens.
- No `LinearGradient` decoration, no coloured glows, no heavy shadows. Allowed shadow: `shadowOpacity 0.06, radius 8, offset 0/4, elevation 2`.
- Feature colours (the 8 tool wells/strokes from Home) may be used only to identify that feature (its icon circle or a small tag), never as big backgrounds.
- No dark mode.

## 2. Type
- Headings: `Outfit_800ExtraBold` (screen titles, big numbers) and `Outfit_700Bold` (card titles). Body: `DMSans_400Regular`, `DMSans_500Medium`, `DMSans_600SemiBold`, `DMSans_700Bold`.
- Scale: screen title 26, section title 19, card title 16-18, body 14-15, meta 12-13, smallest 11. Line height ~1.4 for body.
- Screen titles and section titles end with a yellow `.` (or `?` for a question).
- Lowercase voice for titles, labels, buttons and chips ("see all", "claim", "save"). Keep proper nouns (brand names, cities, universities, people) as written. Legal text (Terms, Privacy) keeps normal sentence case.
- `maxFontSizeMultiplier={1.3}` on titles, pills and buttons. Never disable font scaling.

## 3. Components (create once in `app/src/ui/`, reuse everywhere)
- `Screen`: SafeArea + `paper` background + status bar dark-content.
- `ScreenHeader`: back button (40 circle, white, 1 px `line`, chevron-back 19 `ink`) + title (Outfit 800, 22) + optional right action. Height 56, side padding 16.
- `Button`:
  - primary: height 52, radius 26, `ink` bg, white DM Sans 700 15.
  - secondary: height 52, radius 26, white bg, 1.5 px `ink` border, `ink` text.
  - accent (rewards/claim only): `yellow` bg, `ink` text.
  - small: height 36, radius 18, DM Sans 700 13.
  - disabled: `sand` bg, `textFaint` text. Loading: small spinner in the text colour.
- `Card`: white, radius 22 (20 for small cards), 1 px `line`, padding 16.
- `Chip`: height 34, radius 17, padding 0 14, DM Sans 600 13. Off: white + 1 px `line`. On: `ink` bg, white text.
- `Input`: height 52, radius 16, white, 1 px `line`, DM Sans 15, label above (DM Sans 600 13 `textMuted`). Focus: 1.5 px `ink` border. Error: 1.5 px `danger` border + message below in `danger` 12.5.
- `ListRow`: 56 min height, icon in a 36 `sand` circle, title DM Sans 600 15, meta 12.5 `textMuted`, chevron `textFaint`. Divider `lineSoft`.
- `SectionTitle`: already exists in `app/src/screens/home/SectionTitle.js`; move it to `app/src/ui/` and update Home's import.
- `PressScale`: already exists in `app/src/screens/home/`; move it to `app/src/ui/` too.
- `EmptyState`: a `Dot` mood face (existing component) 56, title Outfit 700 18, one line DM Sans 14 `textMuted`, optional secondary button. No emoji.
- `Skeleton`: `sand` blocks with the same shapes as the content. No spinners for page loads.
- `Sheet`/modal: white, top radius 24, overlay `rgba(17,17,17,0.5)`, handle `#E2DCCF`, close = 36 white circle with 1 px `line`.
- `Toast`/alerts: keep existing `Alert.alert` calls working; restyle only custom in-app banners.

## 4. Spacing and shape
16 side padding, 24 between sections, 12 between a title and its content. Radii: cards 22/20, inputs 16, buttons and chips fully round, images 18. Touch targets ≥ 44.

## 5. Behaviour and copy
- Every number shown is real or hidden. No fake counts, timers or "N online".
- Keep all existing sounds, haptics, celebrations and the `Dot` mood faces.
- Tap feedback: `PressScale` (0.96).
- Respect reduce motion for entrance animations.
- Accessibility: roles, labels, contrast as on Home.
