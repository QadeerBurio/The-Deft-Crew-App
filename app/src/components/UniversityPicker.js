// app/src/components/UniversityPicker.js — one university dropdown for signup and profile edit (the shared list,
// api/universitiesApi.js). It opens on the FULL list, A–Z (name, short name, city), with a search box on top that
// filters as you type (name, short name like "IoBM", other names, city). The list is never empty: the app's bundled
// list shows at once and offline; the server's list replaces it when it loads (an admin's addition shows up).
// Students can't add universities: "can't find your university? contact support" opens help & support.
//   <UniversityPicker value={{ id, name, shortName, city }} onChange={(u) => …} error="…" label="University" />
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { bundledUniversities, loadUniversities, filterUniversities, universityLabel } from "../api/universitiesApi";
import { SUPPORT_WHATSAPP } from "./ContactUs";
import { color as T, font as F, MAX_FONT_SCALE as M } from "../theme/tokens";

export default function UniversityPicker({ value, onChange, error, label = "University", disabled = false, placeholder = "select university" }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [list, setList] = useState(bundledUniversities);

  // every open: the server's list (when it answers with one), else what we have (the bundled list)
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    loadUniversities().then((l) => { if (live && Array.isArray(l) && l.length) setList(l); });
    return () => { live = false; };
  }, [open]);

  const shown = useMemo(() => filterUniversities(list, query), [list, query]);
  const close = () => { setOpen(false); setQuery(""); };
  const pick = (u) => { onChange?.(u); close(); };
  // help & support: the app's screen when it's reachable from here, else the same WhatsApp support it lists
  const contactSupport = () => {
    close();
    const names = navigation?.getState?.()?.routeNames || [];
    if (names.includes("ContactUs")) navigation.navigate("ContactUs");
    else Linking.openURL(SUPPORT_WHATSAPP).catch(() => {});
  };

  const text = universityLabel(value);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label} maxFontSizeMultiplier={M}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[s.field, !!text && s.fieldOn, !!error && s.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={text ? `${label}: ${text}. change` : `${label}: ${placeholder}`}
        testID="university-field"
      >
        <Ionicons name="school-outline" size={18} color={text ? T.ink : T.textMuted} />
        <Text style={[s.fieldText, !text && s.placeholder]} numberOfLines={2} maxFontSizeMultiplier={M}>{text || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={T.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={s.error} accessibilityRole="alert" maxFontSizeMultiplier={M}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={s.backdrop} onPress={close} accessibilityLabel="close" />
          <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.head}>
              <Text style={s.title} accessibilityRole="header" maxFontSizeMultiplier={M}>select university</Text>
              <TouchableOpacity onPress={close} hitSlop={10} style={s.close} accessibilityRole="button" accessibilityLabel="close">
                <Ionicons name="close" size={20} color={T.ink} />
              </TouchableOpacity>
            </View>
            <View style={s.search}>
              <Ionicons name="search" size={17} color={T.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="search: name, short name (IoBM) or city"
                placeholderTextColor={T.textFaint}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="search universities"
                maxFontSizeMultiplier={M}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="clear search">
                  <Ionicons name="close-circle" size={17} color={T.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={s.count} maxFontSizeMultiplier={M} testID="university-count">{query ? `${shown.length} of ${list.length}` : `${list.length} universities, A–Z`}</Text>
            <FlatList
              data={shown}
              keyExtractor={(u) => u.id || u.name}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={25}
              style={{ flex: 1 }}
              ListEmptyComponent={<Text style={s.empty} maxFontSizeMultiplier={M}>no match. try the short name or the city.</Text>}
              renderItem={({ item }) => {
                const on = value && (item.id ? item.id === value.id : item.name === value.name);
                return (
                  <TouchableOpacity onPress={() => pick(item)} style={[s.row, on && s.rowOn]} accessibilityRole="button" accessibilityLabel={universityLabel(item)} testID={`university-${item.name}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName} numberOfLines={2} maxFontSizeMultiplier={M}>{item.name}</Text>
                      <Text style={s.rowSub} maxFontSizeMultiplier={M}>{[item.shortName, item.city].filter(Boolean).join(" · ")}</Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={20} color={T.ink} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={contactSupport} style={s.support} accessibilityRole="link" accessibilityLabel="can't find your university? contact support" testID="university-support">
              <Text style={s.supportText} maxFontSizeMultiplier={M}>can't find your university? <Text style={s.supportLink}>contact support</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginBottom: 6, marginTop: 4 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, paddingHorizontal: 14 },
  fieldOn: { borderColor: T.ink },
  fieldError: { borderColor: T.danger },
  fieldText: { flex: 1, fontFamily: F.body, fontSize: 15, color: T.ink },
  placeholder: { color: T.textFaint },
  error: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.danger, marginTop: 6 },
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: T.overlay },
  sheet: { height: "85%", backgroundColor: T.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: T.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, backgroundColor: T.card },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: T.ink, minHeight: 44 },
  count: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.lineSoft, minHeight: 56 },
  rowOn: { backgroundColor: T.yellowSoft },
  rowName: { fontFamily: F.bodySemi, fontSize: 14.5, color: T.ink },
  rowSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  empty: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, padding: 16, textAlign: "center" },
  support: { minHeight: 48, justifyContent: "center", borderTopWidth: 1, borderTopColor: T.line, paddingTop: 8 },
  supportText: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, textAlign: "center" },
  supportLink: { fontFamily: F.bodyBold, color: T.ink, textDecorationLine: "underline" },
});
