// context/AuthContext.js - Updated with setGuestMode
import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import api, { injectLogout, setGuestMode } from "../api/api";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
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
    setGuestMode(false); // FIXED: Update API instance
    await AsyncStorage.multiRemove(["user", "token", "isGuest"]);
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearAllData();
    } catch (e) {
      console.error("Logout Error:", e);
    }
  }, [clearAllData]);

  // FIXED: Guest login function
  const loginAsGuest = useCallback(async () => {
    try {
      if (user || token) {
        await clearAllData();
      }
      setIsGuest(true);
      setGuestMode(true); // FIXED: Tell API about guest mode
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
        setGuestMode(true); // FIXED: Set guest mode on load
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
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setGuestMode(false); // FIXED: Not guest mode
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
        setGuestMode(false); // FIXED: Clear guest mode
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}