// app/src/theme/tokens.js
// tdc design tokens (tdc-full-redesign/DESIGN_SYSTEM.md). One file for the whole app.

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
  handle: "#E2DCCF", // sheet handles, inactive dots
  success: "#1E6B3A",
  successBg: "#E3F3E8",
  danger: "#B42318",
  dangerBg: "#FDECEA",
  overlay: "rgba(17,17,17,0.5)",
  // Dark surfaces (sign in / confessions)
  inkSoft: "#1C1B19", // cards on ink
  inkLine: "#2A2925", // borders on ink
  onInkMuted: "#B8B2A5", // secondary text on ink (≥ 7:1)
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

export const type = {
  screenTitle: 26,
  headerTitle: 22,
  sectionTitle: 19,
  cardTitle: 17,
  body: 15,
  content: 14,
  meta: 12.5,
  small: 11,
};

export const space = {
  screen: 16, // screen side padding
  inner: 4, // titles sit at screen + inner
  section: 24, // between sections
  titleGap: 12, // section title → card
};

export const radius = {
  card: 22,
  cardSmall: 20,
  deal: 20,
  button: 12, // Home drop options
  input: 16,
  image: 18,
  sheet: 24,
  pill: 999,
};

// The only allowed shadow
export const shadow = {
  shadowColor: "#111111",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

// Cap for headings and pills so big system fonts don't break the layout
export const MAX_FONT_SCALE = 1.3;
