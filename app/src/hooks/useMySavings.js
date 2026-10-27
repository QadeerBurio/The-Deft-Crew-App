// hooks/useMySavings.js
// The student's real savings: GET /offers/my-total-savings (sum of saved amounts on
// recorded redemptions; claiming alone adds nothing). One shared query, so Profile and
// Home always show the same number. A failed request keeps the last good value
// (react-query keeps data on error); it never turns into 0.
import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { checkRedemptions } from "../analytics/metaRedemptions";

export const MY_SAVINGS_KEY = (userId) => ["offers", "myTotalSavings", userId];

export default function useMySavings({ enabled = true } = {}) {
  const { user, token, isGuest } = useContext(AuthContext);
  const userId = user?._id || user?.id || null;
  const signedIn = !!token && !isGuest && !!userId;

  return useQuery({
    queryKey: MY_SAVINGS_KEY(userId),
    queryFn: async () => {
      const res = await api.get("/offers/my-total-savings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const totalSaved = Number(res?.data?.totalSaved);
      const redemptionCount = Number(res?.data?.redemptionCount);
      if (!Number.isFinite(totalSaved)) throw new Error("bad savings response");
      checkRedemptions(); // savings refreshed: report any new redemption to Meta (never blocks this)
      return {
        totalSaved: Math.max(0, totalSaved),
        redemptionCount: Number.isFinite(redemptionCount) ? redemptionCount : 0,
      };
    },
    enabled: enabled && signedIn,
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
