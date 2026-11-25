// screens/home/NextActionCard.js — P5-2 "next best action" (flag homeNextAction, off by default).
// One card at the top of Home: the server picks the first that applies (finish your resume · claim a deal · today's
// drop · invite a friend) from what it knows (GET /api/engagement/next-action); nothing applies → nothing shown.
// It looks like a mission card (engagement/components/MissionCard). Refreshes with Home (query key "engagement").
import React from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import useFlag from "../../hooks/useFlag";
import MissionCard from "../../engagement/components/MissionCard";

export const NEXT_ACTION_KEY = ["engagement", "nextAction"];
// the mission card's icon for each kind
export const FEATURE_FOR = { finish_resume: "resume", claim_deal: "discounts", daily_drop: "events", invite_friend: "social" };

export default function NextActionCard({ signedIn }) {
  const on = useFlag("homeNextAction") === true && !!signedIn;
  const { data } = useQuery({
    queryKey: NEXT_ACTION_KEY,
    queryFn: async () => (await api.get("/engagement/next-action")).data?.action || null,
    enabled: on,
    staleTime: 60_000,
    retry: 0,
  });
  if (!on || !data || !data.line) return null;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12 }} accessibilityLabel="your next step">
      <MissionCard
        feature={FEATURE_FOR[data.kind] || "discounts"}
        mood={data.mood || "sorted"}
        line={data.line}
        ctaLabel={data.cta?.label || "go"}
        ctaRoute={data.cta?.route}
        ctaParams={data.cta?.params || {}}
      />
    </View>
  );
}
