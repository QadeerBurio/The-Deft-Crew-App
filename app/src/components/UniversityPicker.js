// app/src/components/UniversityPicker.js — one university picker for signup and profile edit (the shared list,
// api/universitiesApi.js). A field that opens a sheet: type to filter (name, short name like "IoBM", city), pick one.
// At the bottom, "my university isn't listed": name + city -> a request. If it's already on the list the student
// sees "did you mean …?"; else it is added as "pending review" and the student continues with it.
//   <UniversityPicker value={{ id, name, shortName, city, status }} onChange={(u) => …} error="…" label="University" />
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { universitiesApi, universityLabel } from "../api/universitiesApi";
import { color as T, font as F, MAX_FONT_SCALE as M } from "../theme/tokens";

export default function UniversityPicker({ value, onChange, error, label = "University", disabled = false, placeholder = "select university" }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | failed
  const [form, setForm] = useState(null); // null | { name, city, busy, message, match }
  const seq = useRef(0);
  const [retry, setRetry] = useState(0);

  // search as the student types (a short pause first); an older answer never replaces a newer one
  useEffect(() => {
    if (!open || form) return undefined;
    const n = ++seq.current;
    setState("loading");
    const t = setTimeout(() => {
      universitiesApi.search(query)
        .then((rows) => { if (n === seq.current) { setList(rows || []); setState("ready"); } })
        .catch(() => { if (n === seq.current) setState("failed"); });
    }, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, query, form, retry]);

  const close = () => { setOpen(false); setQuery(""); setForm(null); };
  const pick = (u) => { onChange?.(u); close(); };

  const sendRequest = async () => {
    const name = (form?.name || "").trim();
    const city = (form?.city || "").trim();
    if (name.length < 3 || !city) return setForm({ ...form, message: "add your university's full name and its city" });
    setForm({ ...form, busy: true, message: "" });
    try {
      const r = await universitiesApi.request({ name, city });
      if (r?.match) return setForm({ ...form, busy: false, match: r.match, message: r.message || `did you mean ${r.match.name}?` });
      if (r?.university) return pick({ ...r.university, status: r.university.status || "pending" });
      setForm({ ...form, busy: false, message: "couldn't send it, please try again" });
    } catch (e) {
      setForm({ ...form, busy: false, message: e.message || "couldn't send it, please try again" });
    }
  };

  const shown = universityLabel(value);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label} maxFontSizeMultiplier={M}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[s.field, !!shown && s.fieldOn, !!error && s.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={shown ? `${label}: ${shown}. change` : `${label}: ${placeholder}`}
        testID="university-field"
      >
        <Ionicons name="school-outline" size={18} color={shown ? T.ink : T.textMuted} />
        <Text style={[s.fieldText, !shown && s.placeholder]} numberOfLines={2} maxFontSizeMultiplier={M}>{shown || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={T.textMuted} />
      </TouchableOpacity>
      {value?.status === "pending" ? <Text style={s.hint} maxFontSizeMultiplier={M}>we're checking this university; you can use the app meanwhile.</Text> : null}
      {error ? <Text style={s.error} accessibilityRole="alert" maxFontSizeMultiplier={M}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        {/* the request form's fields stay above the keyboard */}
        <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={s.backdrop} onPress={close} accessibilityLabel="close" />
          <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.head}>
              <Text style={s.title} accessibilityRole="header" maxFontSizeMultiplier={M}>{form ? "add your university" : "select university"}</Text>
              <TouchableOpacity onPress={close} hitSlop={10} style={s.close} accessibilityRole="button" accessibilityLabel="close">
                <Ionicons name="close" size={20} color={T.ink} />
              </TouchableOpacity>
            </View>

            {!form ? (
              <>
                <View style={s.search}>
                  <Ionicons name="search" size={17} color={T.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="name, short name (IoBM) or city"
                    placeholderTextColor={T.textFaint}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    accessibilityLabel="search universities"
                    maxFontSizeMultiplier={M}
                  />
                  {state === "loading" ? <ActivityIndicator size="small" color={T.ink} /> : null}
                </View>
                {state === "failed" ? (
                  <View style={s.empty}>
                    <Text style={s.emptyText} maxFontSizeMultiplier={M}>couldn't load the list. check your connection.</Text>
                    <TouchableOpacity onPress={() => setRetry((n) => n + 1)} style={s.linkBtn} accessibilityRole="button" accessibilityLabel="try again"><Text style={s.link} maxFontSizeMultiplier={M}>try again</Text></TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={list}
                    keyExtractor={(u) => u.id}
                    keyboardShouldPersistTaps="handled"
                    style={{ flex: 1 }}
                    ListEmptyComponent={state === "ready" ? <Text style={s.emptyText} maxFontSizeMultiplier={M}>no match. try the short name, or add it below.</Text> : null}
                    renderItem={({ item }) => {
                      const on = item.id === value?.id;
                      return (
                        <TouchableOpacity onPress={() => pick(item)} style={[s.row, on && s.rowOn]} accessibilityRole="button" accessibilityLabel={universityLabel(item)} testID={`university-${item.id}`}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.rowName} numberOfLines={2} maxFontSizeMultiplier={M}>{item.name}</Text>
                            <Text style={s.rowSub} maxFontSizeMultiplier={M}>{[item.shortName, item.city].filter(Boolean).join(" · ")}</Text>
                          </View>
                          {on ? <Ionicons name="checkmark-circle" size={20} color={T.ink} /> : null}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
                <TouchableOpacity onPress={() => setForm({ name: query, city: "" })} style={s.notListed} accessibilityRole="button" accessibilityLabel="my university isn't listed" testID="university-not-listed">
                  <Ionicons name="add-circle-outline" size={18} color={T.ink} />
                  <Text style={s.notListedText} maxFontSizeMultiplier={M}>my university isn't listed</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                <Text style={s.label} maxFontSizeMultiplier={M}>university name</Text>
                <TextInput style={s.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t, match: null, message: "" })} placeholder="its full name" placeholderTextColor={T.textFaint} accessibilityLabel="university name" maxFontSizeMultiplier={M} />
                <Text style={s.label} maxFontSizeMultiplier={M}>city</Text>
                <TextInput style={s.input} value={form.city} onChangeText={(t) => setForm({ ...form, city: t, match: null, message: "" })} placeholder="e.g. Karachi" placeholderTextColor={T.textFaint} accessibilityLabel="city" maxFontSizeMultiplier={M} />
                {form.message ? <Text style={form.match ? s.hint : s.error} accessibilityRole="alert" maxFontSizeMultiplier={M}>{form.message}</Text> : null}
                {form.match ? (
                  <TouchableOpacity onPress={() => pick(form.match)} style={s.primary} accessibilityRole="button" accessibilityLabel={`use ${form.match.name}`}>
                    <Text style={s.primaryText} maxFontSizeMultiplier={M}>yes, use {form.match.shortName || form.match.name}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={sendRequest} disabled={form.busy} style={[s.primary, form.busy && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="add my university" accessibilityState={{ busy: !!form.busy }}>
                    {form.busy ? <ActivityIndicator color={T.ink} /> : <Text style={s.primaryText} maxFontSizeMultiplier={M}>add my university</Text>}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setForm(null)} style={s.linkBtn} accessibilityRole="button" accessibilityLabel="back to the list">
                  <Text style={s.link} maxFontSizeMultiplier={M}>back to the list</Text>
                </TouchableOpacity>
                <Text style={s.hint} maxFontSizeMultiplier={M}>we'll check it. you can continue right away; it shows as "pending review" until then.</Text>
              </View>
            )}
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
  hint: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 6 },
  error: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.danger, marginTop: 6 },
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: T.overlay },
  sheet: { height: "85%", backgroundColor: T.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: T.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, backgroundColor: T.card, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: T.ink, minHeight: 44 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.lineSoft, minHeight: 56 },
  rowOn: { backgroundColor: T.yellowSoft },
  rowName: { fontFamily: F.bodySemi, fontSize: 14.5, color: T.ink },
  rowSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  empty: { alignItems: "center", padding: 16 },
  emptyText: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, padding: 16, textAlign: "center" },
  notListed: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 8 },
  notListedText: { fontFamily: F.bodyBold, fontSize: 14.5, color: T.ink, textDecorationLine: "underline" },
  input: { minHeight: 48, borderWidth: 1, borderColor: T.line, borderRadius: 12, paddingHorizontal: 12, fontFamily: F.body, fontSize: 15, color: T.ink, backgroundColor: T.card },
  primary: { backgroundColor: T.yellow, borderRadius: 14, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 14 },
  primaryText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  linkBtn: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  link: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink, textDecorationLine: "underline" },
});
