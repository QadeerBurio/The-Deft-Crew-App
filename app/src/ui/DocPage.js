// app/src/ui/DocPage.js
// Layout for text pages (legal, about, help): ScreenHeader, an ink hero, a
// section title and one card per point. Text is passed through as written —
// legal copy keeps its own sentence case.
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "./ScreenHeader";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export function DocScreen({ title, onBack, right, children, scrollRef, contentStyle }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [fade]);
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={color.paper} />
      <ScreenHeader title={title} onBack={onBack} right={right} dot={false} />
      <Animated.ScrollView
        ref={scrollRef}
        style={{ opacity: fade }}
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

export function DocHero({ kicker, title, line, children }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroSun} />
      {!!kicker && <Text style={styles.heroKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>{kicker}</Text>}
      {!!title && (
        <Text style={styles.heroTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
      )}
      {!!line && <Text style={styles.heroLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>{line}</Text>}
      {children}
    </View>
  );
}

export function DocSection({ title, right, style }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export function DocCard({ icon, iconNode, title, body, children, style, tone = "soft" }) {
  return (
    <View style={[styles.card, style]}>
      {(icon || iconNode) ? (
        <View style={[styles.iconTile, tone === "dark" && { backgroundColor: color.ink }]}>
          {iconNode || <MaterialCommunityIcons name={icon} size={19} color={tone === "dark" ? color.yellow : color.ink} />}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {!!title && <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>}
        {!!body && <Text style={styles.cardBody} maxFontSizeMultiplier={MAX_FONT_SCALE}>{body}</Text>}
        {children}
      </View>
    </View>
  );
}

export function DocNote({ icon = "information-outline", text }) {
  return (
    <View style={styles.note}>
      <MaterialCommunityIcons name={icon} size={18} color={color.ink} />
      <Text style={styles.noteText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{text}</Text>
    </View>
  );
}

export function DocFooter({ lines = [] }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerLogo}>
        tdc<Text style={{ color: color.yellow }}>.</Text>
      </Text>
      {lines.map((l, i) => (
        <Text key={i} style={styles.footerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {l}
        </Text>
      ))}
    </View>
  );
}

export const docStyles = StyleSheet.create({
  // shared bits for pages that need a custom row inside a DocCard
  link: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink, textDecorationLine: "underline" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  hero: {
    borderRadius: 28,
    backgroundColor: color.ink,
    padding: 20,
    overflow: "hidden",
  },
  heroSun: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: color.yellow,
  },
  heroKicker: { fontFamily: font.bodyBold, fontSize: 12, color: color.onInkMuted, marginBottom: 6 },
  heroTitle: { fontFamily: font.heading, fontSize: 24, lineHeight: 29, color: color.white, marginRight: 70 },
  heroLine: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.onInkMuted, marginTop: 8 },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12, paddingHorizontal: 4 },
  section: { fontFamily: font.heading, fontSize: 19, color: color.ink },

  card: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    borderRadius: 22,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: 16,
    marginBottom: 10,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: color.yellowSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: font.headingBold, fontSize: 16, color: color.ink },
  cardBody: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.textMuted, marginTop: 4 },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: color.yellowSoft,
  },
  noteText: { flex: 1, fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: color.ink },

  footer: { alignItems: "center", marginTop: 28, gap: 4 },
  footerLogo: { fontFamily: font.heading, fontSize: 22, color: color.ink },
  footerText: { fontFamily: font.body, fontSize: 12.5, color: color.textMuted, textAlign: "center" },
});
