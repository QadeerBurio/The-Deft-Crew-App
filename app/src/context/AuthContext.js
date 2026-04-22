import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import api, { injectLogout } from "../api/api";
import { jwtDecode } from "jwt-decode"; // Install this: npm install jwt-decode

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Improved Logout Function
  const logout = useCallback(async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove(["user", "token"]);
    } catch (e) {
      console.error("Logout Error:", e);
    }
  }, []);

  // 2. Function to check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000; // In seconds
      return decoded.exp < currentTime;
    } catch (e) {
      return true; // If error decoding, treat as expired
    }
  };

  // 3. Load and Validate Storage
  const loadStorage = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const storedToken = await AsyncStorage.getItem("token");

      if (storedUser && storedToken) {
        // Check if the saved token is still valid
        if (isTokenExpired(storedToken)) {
          console.log("Token expired, logging out...");
          await logout();
        } else {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Optional: Verify with backend to ensure user wasn't banned/deleted
          verifyToken(storedToken);
        }
      }
    } catch (error) {
      console.log("Storage Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. Backend verification (Double check)
  const verifyToken = async (activeToken) => {
    try {
      // Call a "profile" or "me" endpoint
      await axios.get('https://the-deft-crew-production.up.railway.app/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
    } catch (e) {
      // If server says 401 Unauthorized, log out
      if (e.response && e.response.status === 401) {
        logout();
      }
    }
  };

  const updateUnreadCount = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken || isTokenExpired(activeToken)) return;

    try {
      const res = await axios.get('https://the-deft-crew-production.up.railway.app/api/notification/my-notifications', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const unread = res.data.filter(n => n.unread).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log("Error updating unread count:", e);
    }
  };

  useEffect(() => {
    injectLogout(logout);
    loadStorage();
  }, [logout]);

  // Save to storage whenever user/token changes
  useEffect(() => {
    const save = async () => {
      if (user && token) {
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("token", token);
      }
    };
    save();
  }, [user, token]);

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
        updateUnreadCount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}