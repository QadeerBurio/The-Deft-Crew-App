// app/src/theme/typography.js
// Type scale. Headings are heavy and lowercase; body is calm.
//
// Brand fonts: Outfit (display) and DM Sans (body).
// They are not bundled yet. Until they are, everything falls back to the
// system font at the same size and weight, so nothing breaks.
// To switch them on:
//   1. npx expo install @expo-google-fonts/outfit @expo-google-fonts/dm-sans
//   2. Load them in App.js inside prepare(), before SplashScreen.hideAsync():
//        import { useFonts } ...  or  await Font.loadAsync({ ...Outfit_800ExtraBold, ... })
//   3. Fill in the family names below (e.g. display: 'Outfit_800ExtraBold').

export const fontFamilies = {
  display: undefined, // -> 'Outfit_800ExtraBold'
  displaySemi: undefined, // -> 'Outfit_600SemiBold'
  body: undefined, // -> 'DMSans_400Regular'
  bodyMedium: undefined, // -> 'DMSans_500Medium'
  bodySemi: undefined, // -> 'DMSans_600SemiBold'
  bodyBold: undefined, // -> 'DMSans_700Bold'
};

const f = (family) => (family ? { fontFamily: family } : null);

export const type = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1, ...f(fontFamilies.display) },
  title: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6, ...f(fontFamilies.display) },
  heading: { fontSize: 18, lineHeight: 23, fontWeight: '800', letterSpacing: -0.2, ...f(fontFamilies.display) },
  subheading: { fontSize: 16, lineHeight: 21, fontWeight: '700', ...f(fontFamilies.bodyBold) },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', ...f(fontFamilies.body) },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '700', ...f(fontFamilies.bodyBold) },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600', ...f(fontFamilies.bodySemi) },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', ...f(fontFamilies.bodyMedium) },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', ...f(fontFamilies.bodyBold) },
  button: { fontSize: 15, lineHeight: 19, fontWeight: '700', ...f(fontFamilies.bodyBold) },
  number: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, ...f(fontFamilies.display) },
};

export default type;
