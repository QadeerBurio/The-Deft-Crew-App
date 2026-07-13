// context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import api, { injectLogout, setGuestMode } from "../api/api";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  const clearAllData = useCallback(async () => {
    setUser(null);
    setToken(null);
    setUnreadCount(0);
    setIsGuest(false);
    setGuestMode(false);
    await AsyncStorage.multiRemove(["user", "token", "isGuest"]);
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearAllData();
    } catch (e) {
      console.error("Logout Error:", e);
    }
  }, [clearAllData]);

  const loginAsGuest = useCallback(async () => {
    try {
      if (user || token) {
        await clearAllData();
      }
      setIsGuest(true);
      setGuestMode(true);
      await AsyncStorage.setItem("isGuest", "true");
    } catch (e) {
      console.error("Guest Login Error:", e);
    }
  }, [user, token, clearAllData]);

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (e) {
      return true;
    }
  };

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

  const verifyToken = async (activeToken) => {
    try {
      await axios.get('https://the-deft-crew-production.up.railway.app/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
    } catch (e) {
      if (e.response && e.response.status === 401) {
        await clearAllData();
      }
    }
  };

  const updateUnreadCount = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken || isTokenExpired(activeToken) || isGuest) return;

    try {
      const res = await axios.get('https://the-deft-crew-production.up.railway.app/api/notification/my-notifications', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const unread = res.data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      return unread;
    } catch (e) {
      console.log("Error updating unread count:", e);
      return 0;
    }
  };

  useEffect(() => {
    injectLogout(logout);
    loadStorage();
  }, [logout]);

  useEffect(() => {
    const save = async () => {
      if (user && token) {
        setIsGuest(false);
        setGuestMode(false);
        await AsyncStorage.multiRemove(["isGuest"]);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("token", token);
      }
    };
    save();
  }, [user, token]);

  useEffect(() => {
    if (token && user && !isGuest) {
      updateUnreadCount(token);
    }
  }, [token, user, isGuest]);

  // FIXED: Helper function to get current user ID
  const getCurrentUserId = useCallback(() => {
    if (isGuest) return 'guest-user';
    if (!user) return null;
    return user._id || user.id || user.userId || null;
  }, [user, isGuest]);

  const isAuthenticated = useCallback(() => {
    return !!(user && !isGuest && token);
  }, [user, isGuest, token]);

  const getUserEmail = useCallback(() => {
    if (isGuest) return 'guest@example.com';
    if (!user) return null;
    return user.email || null;
  }, [user, isGuest]);

  const getUserName = useCallback(() => {
    if (isGuest) return 'Guest User';
    if (!user) return null;
    return user.name || user.fullName || user.username || 'User';
  }, [user, isGuest]);

  // NEW: Get full user object with all fields
  const getUser = useCallback(() => {
    return user;
  }, [user]);

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
        getUser, // NEW
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;