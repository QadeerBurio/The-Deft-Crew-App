// app/src/screens/Crew/AmbassadorHub.js
// Plan P2-5 (flag ambassadorV2): the approved ambassador's hub. Everything shown is the server's: friends who joined
// and verified this week / month, rank this month among ambassadors, live campaigns, credentials (the PDF opens in
// the browser through a 10-minute link), the weekly squad, and "post a campus moment" (photo + caption, checked like
// confessions, then reviewed by the crew team).
import React, { useCallback, useContext, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Linking, RefreshControl } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../ui/Screen";
import ScreenHeader from "../../ui/ScreenHeader";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import SectionTitle from "../../ui/SectionTitle";
import EmptyState from "../../ui/EmptyState";
import RemoteImage from "../../ui/RemoteImage";
import { SkeletonBlock } from "../../ui/Skeleton";
import { useEngagement } from "../../engagement/hooks/useEngagement";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { uploadImageToCloudinary } from "../../utils/cloudinaryUpload";
import SquadCard from "../../crew/SquadCard";
import { getHub, credentialLink, postMoment, nextLevel, endsIn, crewError } from "../../crew/crew";

const CRED_NAMES = { certificate: "certificate of ambassadorship", letter: "recommendation letter", recommendation: "recommendation letter", founder_card: "founder card", badge: "badge" };

export default function AmbassadorHub() {
  const { me } = useEngagement() || {};
  const [hub, setHub] = useState(undefined); // undefined: loading; null: failed
  const [err, setErr] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [momentMsg, setMomentMsg] = useState(null);
  const [opening, setOpening] = useState(null);

  const load = useCallback(async () => {
    try {
      setHub(await getHub());
      setErr(null);
    } catch (e) {
      setErr(crewError(e, "couldn't load your hub."));
      setHub(null);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCredential = async (id) => {
    setOpening(id);
    try {
      const r = await credentialLink(id);
      if (r?.url) await Linking.openURL(r.url);
    } catch (e) {
      setMomentMsg(crewError(e, "couldn't open it. try again.").message);
    } finally {
      setOpening(null);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setMomentMsg("allow photo access to add a campus moment."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8, aspect: [4, 3] });
    if (!res.canceled && res.assets?.length) { setPhoto(res.assets[0].uri); setMomentMsg(null); }
  };

  const sendMoment = async () => {
    if (!photo || caption.trim().length < 3 || posting) return;
    setPosting(true);
    setMomentMsg(null);
    try {
      let url;
      try { url = await uploadImageToCloudinary(photo); } catch { throw new Error("the photo didn't upload. check your connection and try again."); }
      await postMoment(caption.trim(), url);
      setPhoto(null);
      setCaption("");
      setMomentMsg("sent. the crew team will check it soon.");
    } catch (e) {
      setMomentMsg(e?.response ? crewError(e).message : e.message);
    } finally {
      setPosting(false);
    }
  };

  if (hub === undefined) {
    return (
      <Screen>
        <ScreenHeader title="ambassador hub" />
        <View style={s.body}><SkeletonBlock height={110} radius={22} /><SkeletonBlock height={160} radius={22} style={{ marginTop: 14 }} /></View>
      </Screen>
    );
  }
  if (!hub) {
    return (
      <Screen>
        <ScreenHeader title="ambassador hub" />
        <EmptyState mood="panic" title="couldn't load your hub." line={err?.message} actionLabel="try again" onAction={load} />
      </Screen>
    );
  }

  const nl = nextLevel(me?.level?.tiersIssued);
  return (
    <Screen>
      <ScreenHeader title="ambassador hub" />
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} colors={[T.yellow]} />}>
        <Card style={s.stats}>
          <Stat n={hub.invites?.week} label="verified friends this week" />
          <Stat n={hub.invites?.month} label="this month" />
          {hub.rank?.of > 1 && <Stat n={`#${hub.rank.position}`} label={`of ${hub.rank.of} ambassadors`} />}
        </Card>
        {!!hub.university && <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`ambassador at ${hub.university}`}</Text>}
        {!!nl && <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`next level: ${nl.name}${nl.discount ? ` (${nl.discount.pct}% off)` : ""}`}</Text>}

        <SquadCard style={{ marginTop: 14 }} />

        <SectionTitle title="campaigns" style={s.section} />
        {hub.campaigns?.length ? hub.campaigns.map((c) => (
          <Card key={c.id} small style={s.item}>
            <Text style={s.itemTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${c.brand}: ${c.followerPercent}% off for your followers`}</Text>
            <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{[c.name, endsIn(c.endsAt)].filter(Boolean).join(" · ")}</Text>
          </Card>
        )) : <Text style={s.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>no live campaigns right now.</Text>}

        <SectionTitle title="your credentials" style={s.section} />
        {hub.credentials?.length ? hub.credentials.map((c) => (
          <Card key={c.id} small style={s.item}>
            <Text style={s.itemTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{CRED_NAMES[c.type] || c.type}</Text>
            <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.status === "revoked" ? "revoked" : `issued ${String(c.issuedAt || "").slice(0, 10)}`}</Text>
            {c.pdf && c.status === "issued" && (
              <Button title="open pdf" size="small" variant="secondary" full={false} loading={opening === c.id} onPress={() => openCredential(c.id)} style={{ marginTop: 8 }} accessibilityLabel={`open the ${CRED_NAMES[c.type] || c.type} pdf`} />
            )}
          </Card>
        )) : <Text style={s.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>your certificate shows here once the crew team issues it.</Text>}

        <SectionTitle title="post a campus moment" style={s.section} />
        <Card>
          {photo ? <RemoteImage source={{ uri: photo }} style={s.photo} /> : null}
          <Button title={photo ? "change photo" : "add a photo"} variant="secondary" size="small" full={false} onPress={pickPhoto} />
          <Input label="caption" value={caption} onChangeText={setCaption} maxLength={500} placeholder="what's happening on campus?" style={{ marginTop: 12 }} />
          {!!momentMsg && <Text style={s.msg} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{momentMsg}</Text>}
          <Button title="send" variant="accent" onPress={sendMoment} loading={posting} disabled={!photo || caption.trim().length < 3} style={{ marginTop: 8 }} accessibilityLabel="send the campus moment" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Stat({ n, label }) {
  if (n == null) return null;
  return (
    <View style={s.stat} accessible accessibilityLabel={`${n} ${label}`}>
      <Text style={s.statN} maxFontSizeMultiplier={MAX_FONT_SCALE}>{String(n)}</Text>
      <Text style={s.statL} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 48 },
  stats: { flexDirection: "row", gap: 12, backgroundColor: T.ink, borderColor: T.ink },
  stat: { flex: 1 },
  statN: { fontFamily: F.heading, fontSize: 26, color: T.yellow },
  statL: { fontFamily: F.bodyMedium, fontSize: 12, color: T.onInkMuted, marginTop: 2 },
  meta: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 6 },
  section: { marginTop: 24, marginBottom: 10 },
  item: { marginBottom: 10 },
  itemTitle: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  empty: { fontFamily: F.body, fontSize: 14, color: T.textFaint },
  photo: { width: "100%", height: 180, borderRadius: 18, marginBottom: 12 },
  msg: { fontFamily: F.bodyMedium, fontSize: 13, color: T.ink, marginTop: 8 },
});
