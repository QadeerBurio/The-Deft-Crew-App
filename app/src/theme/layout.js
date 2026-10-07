// app/src/theme/layout.js
// Spacing, corner radius and shadow tokens.

// 4-point spacing scale
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// page gutter used by every screen
export const gutter = 16;

export const radius = {
  sm: 12, // small tiles, logo wells
  md: 16, // inputs, list icon boxes
  lg: 20, // list rows, small cards
  xl: 24, // cards
  xxl: 28, // hero cards
  pill: 999, // buttons, chips, pills
};

// minimum touch target
export const touch = 44;

export const shadow = {
  none: {},
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  lift: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
};
