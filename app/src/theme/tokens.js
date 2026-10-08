// app/src/theme/tokens.js
// Design tokens for the new Home + tab bar (see tdc-ui-handoff/HOME_SPEC.md §1).
// Only Home and the tab bar use these for now.

export const color = {
  yellow: "#F9C349",
  yellowSoft: "#FFF1CC",
  ink: "#111111",
  paper: "#FAF8F3",
  card: "#FFFFFF",
  sand: "#F5F2EA",
  line: "#ECE7DB",
  lineSoft: "#F0ECE2",
  textMuted: "#6B675E",
  textFaint: "#736E65",
  white: "#FFFFFF",
};

// The weight lives in the family name: never combine with fontWeight.
export const font = {
  heading: "Outfit_800ExtraBold",
  headingBold: "Outfit_700Bold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
};

export const space = {
  screen: 16, // screen side padding
  inner: 4, // titles sit at screen + inner
  section: 24, // between sections
  titleGap: 12, // section title → card
};

export const radius = {
  card: 22,
  deal: 20,
  button: 12,
};

// Cap for headings and pills so big system fonts don't break the layout
export const MAX_FONT_SCALE = 1.3;
