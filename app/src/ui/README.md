# tdc ui kit

Every screen should be built from `app/src/theme` (tokens) and `app/src/ui` (components).
No new hex values in screens.

## Tokens

```js
import { colors, type, space, radius, shadow, gutter } from '../theme';
```

| token | value | use |
|---|---|---|
| `colors.yellow` | #F9C349 | the dot. one accent per screen |
| `colors.ink` | #111111 | primary buttons, hero cards, text |
| `colors.paper` | #FAF8F3 | app background |
| `colors.card` | #FFFFFF | cards |
| `colors.line` | #ECE7DB | borders |
| `colors.textMuted` | #6B675E | secondary text |

Full list in `theme/colors.js`. Spacing is a 4-point scale, the page gutter is 16.

## Components

```js
import { Screen, Header, SectionHeader, Card, Button, IconButton, Chip, Pill,
         Segmented, ListRow, SearchInput, ProgressBar, MoodDot, EmptyState,
         Text, Heading } from '../ui';
```

- `Heading` adds the yellow full stop: `<Heading>today's drop</Heading>` shows "today's drop."
- `Button` variants: `primary` (ink), `accent` (yellow), `outline`, `ghost`, `light`, `inverse`.
- `Card` variants: `default`, `ink`, `tint`, `accent`, `raised` (dark screens).
- `Screen tabBar` adds bottom space so content clears the tab bar. `Screen dark` for confessions and sign in.
- `MoodDot muted` greys a mood out for "not used yet" and locked badges.

See `UIKitScreen.js` for every component on one screen.

## Rules

1. Lowercase copy, few words, headings end with the yellow dot.
2. One primary action per screen (ink or yellow, never both side by side at the same weight).
3. Touch targets at least 44 pt.
4. Use `textMuted` for secondary text, `textFaint` only for icons and hints.

## Fonts

Headings are designed for Outfit and body for DM Sans. Until those are installed the kit uses the
system font at the same sizes and weights. Steps are in `theme/typography.js`.
