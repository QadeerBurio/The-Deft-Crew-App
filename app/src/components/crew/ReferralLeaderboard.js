// components/crew/ReferralLeaderboard.js: "top inviters" on the crew screen (P1-4, flag growthV2).
// This month / all time, everyone / my campus. First names only, the counts are verified friends (joined with the code
// and started using tdc). Shows my rank and "invite N more to pass <name>" when the server says so. Real numbers only:
// nothing is shown until the list has loaded, and an empty month says so.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { engagementApi } from "../../engagement/api/engagementApi";
import { color as T, font as F } from "../../theme/tokens";

const Pill = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
    style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: "center", backgroundColor: active ? T.ink : T.sand, marginRight: 6, marginBottom: 6 }}
  >
    <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: active ? T.yellow : T.ink }} maxFontSizeMultiplier={1.3}>{label}</Text>
  </TouchableOpacity>
);

export default function ReferralLeaderboard({ universityId = null }) {
  const [period, setPeriod] = useState("month");
  const [campus, setCampus] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null); setError(false);
    const params = { period, ...(campus && universityId ? { university: String(universityId) } : {}) };
    engagementApi.getReferralLeaderboard(params)
      .then((d) => { if (live) setData(d || { leaderboard: [] }); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [period, campus, universityId]);

  const list = data?.leaderboard || [];
  return (
    <View style={{ backgroundColor: T.card, borderRadius: 22, padding: 16, marginTop: 14, borderWidth: 1, borderColor: T.line }} accessibilityLabel="top inviters">
      <Text style={{ fontFamily: F.headingBold, fontSize: 18, color: T.ink }} maxFontSizeMultiplier={1.3}>top inviters<Text style={{ color: T.yellow }}>.</Text></Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: T.textMuted, marginBottom: 10 }} maxFontSizeMultiplier={1.3}>friends who joined with a code and started using tdc.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Pill label="this month" active={period === "month"} onPress={() => setPeriod("month")} />
        <Pill label="all time" active={period === "all"} onPress={() => setPeriod("all")} />
        {!!universityId && <Pill label="my campus" active={campus} onPress={() => setCampus((v) => !v)} />}
      </View>

      {error ? (
        <Text style={{ fontFamily: F.body, fontSize: 14, color: T.textMuted, marginTop: 8 }}>couldn't load the list. pull down to try again.</Text>
      ) : !data ? (
        <ActivityIndicator style={{ marginVertical: 14 }} color={T.ink} />
      ) : list.length === 0 ? (
        <Text style={{ fontFamily: F.body, fontSize: 14, color: T.textMuted, marginTop: 8 }} maxFontSizeMultiplier={1.3}>
          {period === "month" ? "no one yet this month. be the first." : "no one yet. be the first."}
        </Text>
      ) : (
        <View style={{ marginTop: 4 }}>
          {list.map((r) => (
            <View key={`${r.rank}-${r.userId}`} style={{ flexDirection: "row", alignItems: "center", minHeight: 40, borderTopWidth: r.rank === 1 ? 0 : 1, borderTopColor: T.line }}>
              <Text style={{ width: 32, fontFamily: F.bodyBold, fontSize: 15, color: r.rank <= 3 ? T.ink : T.textMuted }}>{r.rank}</Text>
              <Text style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 15, color: T.ink }} numberOfLines={1} maxFontSizeMultiplier={1.3}>{String(r.name).toLowerCase()}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>{r.verifiedCount}</Text>
            </View>
          ))}
        </View>
      )}

      {data && (data.me || data.next) && (
        <View style={{ marginTop: 10, backgroundColor: T.yellowSoft, borderRadius: 14, padding: 10 }}>
          {data.me && <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.ink }} maxFontSizeMultiplier={1.3}>you're #{data.me.rank} with {data.me.count}</Text>}
          {data.next && <Text style={{ fontFamily: F.body, fontSize: 13, color: T.ink }} maxFontSizeMultiplier={1.3}>invite {data.next.more} more to pass {String(data.next.name).toLowerCase()}</Text>}
        </View>
      )}
    </View>
  );
}
