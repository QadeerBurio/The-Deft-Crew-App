// app/src/ui/Text.js
// Text with the tdc type scale.
//   <Text variant="body" tone="muted">hello</Text>
//   <Heading>today's drop</Heading>   -> "today's drop." with the yellow dot

import React from 'react';
import { Text as RNText } from 'react-native';
import { colors, type } from '../theme';

const TONES = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  inverse: colors.white,
  inverseMuted: colors.inkMuted,
  accent: colors.yellow,
  danger: colors.danger,
  success: colors.successText,
};

export function Text({ variant = 'body', tone = 'default', color, style, children, ...rest }) {
  return (
    <RNText
      style={[type[variant] || type.body, { color: color || TONES[tone] || TONES.default }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

// A heading that ends with the brand's yellow full stop.
// Pass `mark="?"` for a question, or `mark={null}` for none.
export function Heading({ variant = 'heading', tone = 'default', mark = '.', style, children, ...rest }) {
  return (
    <Text variant={variant} tone={tone} style={style} accessibilityRole="header" {...rest}>
      {children}
      {mark ? <RNText style={{ color: colors.yellow }}>{mark}</RNText> : null}
    </Text>
  );
}

export default Text;
