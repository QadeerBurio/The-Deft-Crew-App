// app/src/theme/index.js
// The tdc design system tokens.
//   import { colors, type, space, radius, shadow, gutter } from '../theme';

import { colors } from './colors';
import { type, fontFamilies } from './typography';
import { space, radius, shadow, gutter, touch } from './layout';

export { colors, type, fontFamilies, space, radius, shadow, gutter, touch };

const theme = { colors, type, fontFamilies, space, radius, shadow, gutter, touch };
export default theme;
