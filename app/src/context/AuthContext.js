// The-Deft-Crew-App/app/src/context/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, {
  injectLogout,
  setGuestMode,
  notifyUserChanged,
} from "../api/api";
import { jwtDecode } from "jwt-decode";
import { resetNotificationBaseline } from "../hooks/useNotifications";
import { clearClaimedRegistry } from "../screens/OfferScreen";

export const AuthContext = createContext();

// Legacy key from pre-per-user builds — remove on any clear
const LEGACY_CLAIM_KEY = "@tdc_claimed_offer_ids";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  // Prevents the save() effect from re-persisting during logout
  const isLoggingOutRef = useRef(false);

  // Refs to avoid dependency churn in callbacks
  const userRef = useRef(null);
  const tokenRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // ─────────────────────────────────────────────────────────
  // CLEAR ALL DATA (used by logout + guest login)
  // ─────────────────────────────────────────────────────────
  const clearAllData = useCallback(async () => {
    isLoggingOutRef.current = true;

    // Capture the outgoing user BEFORE nulling state
    const outgoing = userRef.current;
    const outgoingUserId =
      outgoing?._id || outgoing?.id || outgoing?.userId || null;

    // Reset auth state
    setUser(null);
    setToken(null);
    setUnreadCount(0);
    setIsGuest(false);
    setGuestMode(false);

    // Non-fatal: notification baseline
    try {
      resetNotificationBaseline();
    } catch (e) {
      console.warn("Notification reset warning (non-fatal):", e?.message);
    }

    // ✅ Clear the outgoing user's claim registry (memory + AsyncStorage)
    if (outgoingUserId) {
      try {
        await clearClaimedRegistry(outgoingUserId);
      } catch (e) {
        console.warn("clearClaimedRegistry warning (non-fatal):", e?.message);
      }
    }

    // ✅ Remove legacy unscoped key (pre-per-user builds)
    try {
      await AsyncStorage.removeItem(LEGACY_CLAIM_KEY);
    } catch (e) {}

    // Persisted auth storage
    try {
      await AsyncStorage.multiRemove(["user", "token", "isGuest"]);
    } catch (e) {
      console.error("Storage clear error:", e?.message);
    }

    isLoggingOutRef.current = false;
  }, []); // ✅ stable

  // ─────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await clearAllData();
    } catch (e) {
      console.error("Logout Error:", e);
      setUser(null);
      setToken(null);
      setUnreadCount(0);
      setIsGuest(false);
      setGuestMode(false);
      try {
        await AsyncStorage.multiRemove(["user", "token", "isGuest"]);
      } catch (_) {}
      isLoggingOutRef.current = false;
    }
  }, [clearAllData]);

  // ─────────────────────────────────────────────────────────
  // GUEST LOGIN
  // ─────────────────────────────────────────────────────────
  const loginAsGuest = useCallback(async () => {
    try {
      // Always reset — safe even if no auth state existed
      await clearAllData();
      setIsGuest(true);
      setGuestMode(true);
      await AsyncStorage.setItem("isGuest", "true");
    } catch (e) {
      console.error("Guest Login Error:", e);
    }
  }, [clearAllData]);

  // ─────────────────────────────────────────────────────────
  // TOKEN HELPERS
  // ─────────────────────────────────────────────────────────
  const isTokenExpired = (tk) => {
    try {
      const decoded = jwtDecode(tk);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (e) {
      return true;
    }
  };

  const verifyToken = async (activeToken) => {
    try {
      await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
    } catch (e) {
      if (e.response && e.response.status === 401) {
        // ✅ Only clear if we still hold the same token
        if (tokenRef.current === activeToken) {
          await clearAllData();
        }
      }
    }
  };

  // ─────────────────────────────────────────────────────────
  // LOAD FROM STORAGE ON BOOT
  // ─────────────────────────────────────────────────────────
  const loadStorage = async () => {
    try {
      const wasGuest = await AsyncStorage.getItem("isGuest");
      if (wasGuest === "true") {
        setIsGuest(true);
        setGuestMode(true);
        setLoading(false);
        return;
      }

      const storedUser = await AsyncStorage.getItem("user");
      const storedToken = await AsyncStorage.getItem("token");

      if (storedUser && storedToken) {
        if (isTokenExpired(storedToken)) {
          console.log("Token expired, logging out...");
          await clearAllData();
        } else {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setGuestMode(false);
          verifyToken(storedToken);
        }
      }
    } catch (error) {
      console.log("Storage Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // UNREAD COUNT
  // ─────────────────────────────────────────────────────────
  const updateUnreadCount = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken || isTokenExpired(activeToken) || isGuest) return 0;

    try {
      const res = await api.get("/notification/my-notifications", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const unread = res.data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
      return unread;
    } catch (e) {
      console.log("Error updating unread count:", e);
      return 0;
    }
  };

  // ─────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    injectLogout(logout);
    loadStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout]);

  // ─────────────────────────────────────────────────────────
  // PERSIST USER + TOKEN
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const save = async () => {
      if (isLoggingOutRef.current) return;
      if (user && token) {
        setIsGuest(false);
        setGuestMode(false);
        try {
          await AsyncStorage.multiRemove(["isGuest"]);
          await AsyncStorage.setItem("user", JSON.stringify(user));
          await AsyncStorage.setItem("token", token);
        } catch (e) {
          console.log("Storage save error:", e);
        }
      }
    };
    save();
  }, [user, token]);

  // ─────────────────────────────────────────────────────────
  // UNREAD REFRESH
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (token && user && !isGuest) {
      updateUnreadCount(token);
    }
  }, [token, user, isGuest]);

  // ─────────────────────────────────────────────────────────
  // ✅ BROADCAST "user:changed" ON IDENTITY SWITCH
  // Screens (Brands, OfferScreen, MyDiscountScreen) listen for this
  // and drop their module-level caches.
  // ─────────────────────────────────────────────────────────
  const lastUserIdRef = useRef(undefined); // undefined = "never set"

  useEffect(() => {
    if (loading) return; // wait until storage load completes

    const currentId = isGuest
      ? "__guest__"
      : user?._id || user?.id || user?.userId || null;

    if (lastUserIdRef.current === undefined) {
      lastUserIdRef.current = currentId;
      return;
    }

    if (lastUserIdRef.current === currentId) return;

    lastUserIdRef.current = currentId;
    try {
      notifyUserChanged(currentId);
    } catch (e) {
      console.log("notifyUserChanged error:", e);
    }
  }, [user, isGuest, loading]);

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  const getCurrentUserId = useCallback(() => {
    if (isGuest) return "guest-user";
    if (!user) return null;
    return user._id || user.id || user.userId || null;
  }, [user, isGuest]);

  const isAuthenticated = useCallback(() => {
    return !!(user && !isGuest && token);
  }, [user, isGuest, token]);

  const getUserEmail = useCallback(() => {
    if (isGuest) return "guest@example.com";
    if (!user) return null;
    return user.email || null;
  }, [user, isGuest]);

  const getUserName = useCallback(() => {
    if (isGuest) return "Guest User";
    if (!user) return null;
    return user.name || user.fullName || user.username || "User";
  }, [user, isGuest]);

  const getUser = useCallback(() => user, [user]);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        loading,
        logout,
        unreadCount,
        setUnreadCount,
        updateUnreadCount,
        isGuest,
        setIsGuest,
        loginAsGuest,
        getCurrentUserId,
        isAuthenticated,
        getUserEmail,
        getUserName,
        getUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;