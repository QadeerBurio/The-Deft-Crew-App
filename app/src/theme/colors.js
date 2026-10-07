// app/src/theme/colors.js
// tdc colour tokens. One place for every colour in the app.
// Use these instead of hex literals:  import { colors } from '../theme';

export const colors = {
  // brand
  yellow: '#F9C349', // the dot. primary accent
  yellowSoft: '#FFF1CC', // tinted fills, selected states
  yellowTint: '#FFF6DC', // very light highlight backgrounds

  // ink (dark surfaces and primary text)
  ink: '#111111',
  inkRaised: '#1A1916', // cards on dark screens
  inkLine: '#2A2925', // borders on dark screens
  inkMuted: '#A39E92', // secondary text on dark
  inkSoft: '#CFCAC0', // body text on dark

  // paper (light surfaces)
  paper: '#FAF8F3', // app background
  card: '#FFFFFF',
  sand: '#F5F2EA', // subtle fills, icon wells
  line: '#ECE7DB', // borders, dividers
  lineSoft: '#F0ECE2', // segmented track, inner dividers

  // text on light
  text: '#111111',
  textMuted: '#6B675E', // secondary text (passes 4.5:1 on paper)
  textFaint: '#8C877C', // inactive icons, hints (large text / icons only)

  // feedback
  success: '#1E9E52',
  successText: '#1E6B3A',
  successSoft: '#E8F5EC',
  danger: '#B42318',
  dangerSoft: '#FDECEA',

  // basics
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export default colors;
