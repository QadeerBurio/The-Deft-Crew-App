// app/src/screens/SignupVerifyScreen.js
// Step 2 of student signup: enter the 6-digit code sent to the email.
// Same look as Verify code (components/AuthShell). Auto-verifies on the 6th digit.
// On success the backend returns { token, user } and the app logs in
// (setting the user switches the app to the main screens by itself).

import React, { useContext, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { AuthShell, AuthButton, AUTH } from "../components/AuthShell";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function SignupVerifyScreen({ route, navigation }) {
  const { userId, email, maskedEmail, emailSent = true, retryAfter = 0, fromLogin = false, resumed = false } =
    route.params || {};
  const { setUser, setToken } = useContext(AuthContext);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(retryAfter || (emailSent ? RESEND_SECONDS : 0));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); // success note after resend
  const [focused, setFocused] = useState(true);
  const inputRef = useRef(null);
  const lastTried = useRef("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length !== CODE_LENGTH) {
      setError("Enter all 6 digits");
      return;
    }
    if (verifying || verified) return;

    lastTried.current = digits;
    Keyboard.dismiss();
    setVerifying(true);
    setError("");
    setNotice("");

    try {
      const res = await api.post(
        "/auth/signup/verify-otp",
        { userId, otp: digits },
        { timeout: 20000 }
      );
      const { token, user } = res.data || {};
      if (!token || !user) throw new Error("Invalid response from server");

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setVerified(true);

      // Logging in switches the app to the main screens
      setTimeout(() => {
        setToken(token);
        setUser(user);
      }, 300);
    } catch (err) {
      if (!mounted.current) return;
      setCode("");
      setError(
        err?.response?.data?.message ||
          (err?.code === "ECONNABORTED"
            ? "The server took too long. Please try again."
            : "Couldn't verify the code. Please try again.")
      );
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      if (mounted.current) setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const res = await api.post(
        "/auth/signup/resend-otp",
        { userId, email },
        { timeout: 25000 }
      );
      setCode("");
      lastTried.current = "";
      setCooldown(RESEND_SECONDS);
      setNotice(res.data?.message || "New code sent.");
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      if (err?.response?.data?.alreadyVerified) {
        Alert.alert("Already confirmed", "Your email is confirmed. Sign in to continue.", [
          { text: "Sign in", onPress: () => navigation.replace("Login") },
        ]);
        return;
      }
      if (err?.response?.status === 429) {
        setCooldown(err.response.data?.retryAfter || RESEND_SECONDS);
      }
      setError(err?.response?.data?.message || "Couldn't resend the code. Please try again.");
    } finally {
      if (mounted.current) setResending(false);
    }
  };

  const onChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError("");
    if (digits.length === CODE_LENGTH && digits !== lastTried.current) verify(digits); // auto-submit
  };

  const target = maskedEmail || email;
  const mm = String(Math.floor(cooldown / 60));
  const ss = String(cooldown % 60).padStart(2, "0");
  const resendOff = cooldown > 0 || resending || verified;

  return (
    <AuthShell
      step={0}
      icon="mail-unread-outline"
      title="check your email"
      subtitle={
        <>
          {fromLogin ? "Your email isn't verified yet. " : resumed ? "You already started signing up. " : ""}
          We sent a 6-digit code to{" "}
          <Text style={styles.email}>{target || "your email"}</Text>. Check inbox and spam.
        </>
      }
      onBack={() => navigation.goBack()}
      footer={
        <View style={{ alignItems: "center" }}>
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>didn't get it? </Text>
            <TouchableOpacity onPress={resend} disabled={resendOff} hitSlop={8}>
              <Text style={[styles.resendLink, resendOff && styles.resendOff]}>
                {resending ? "sending…" : cooldown > 0 ? `resend in ${mm}:${ss}` : "resend code"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")} style={styles.changeEmail} hitSlop={8}>
            <Text style={styles.changeEmailText}>wrong email? sign up again</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {!emailSent ? (
        <View style={styles.note}>
          <Ionicons name="time-outline" size={18} color={AUTH.dark} />
          <Text style={styles.noteText}>
            The email may be delayed. If nothing shows up in a minute, tap resend code below.
          </Text>
        </View>
      ) : null}

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
          const ch = code[i] || "";
          const active = focused && i === Math.min(code.length, CODE_LENGTH - 1) && !verifying && !verified;
          return (
            <View
              key={i}
              style={[
                styles.box,
                ch && styles.boxFilled,
                active && styles.boxActive,
                !!error && styles.boxError,
                verified && styles.boxOk,
              ]}
            >
              <Text style={styles.boxText}>{ch}</Text>
              {active && !ch ? <View style={styles.caret} /> : null}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          maxLength={CODE_LENGTH}
          autoFocus
          editable={!verified}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.hiddenInput}
          caretHidden
        />
      </Pressable>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : verified ? (
        <Text style={styles.success}>Email verified. Welcome to the crew!</Text>
      ) : notice ? (
        <Text style={styles.success}>{notice}</Text>
      ) : (
        <View style={{ height: 18 }} />
      )}

      <AuthButton
        title={verified ? "verified" : "verify and continue"}
        icon="checkmark"
        onPress={() => verify()}
        loading={verifying || verified}
        disabled={code.length !== CODE_LENGTH}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  email: { color: AUTH.dark, fontWeight: "800" },

  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: AUTH.goldSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  noteText: { flex: 1, fontSize: 13, color: AUTH.text2, lineHeight: 19, fontWeight: "600" },

  boxes: { flexDirection: "row", justifyContent: "space-between" },
  box: {
    flex: 1,
    marginHorizontal: 4,
    height: 58,
    maxWidth: 52,
    borderRadius: 14,
    backgroundColor: AUTH.soft,
    borderWidth: 1.5,
    borderColor: AUTH.border,
    justifyContent: "center",
    alignItems: "center",
  },
  boxFilled: { backgroundColor: "#fff", borderColor: "#cfcfcf" },
  boxActive: { borderColor: AUTH.dark, backgroundColor: "#fff" },
  boxError: { borderColor: AUTH.danger },
  boxOk: { borderColor: AUTH.ok, backgroundColor: "#fff" },
  boxText: { fontSize: 22, fontWeight: "900", color: AUTH.dark },
  caret: { width: 2, height: 22, backgroundColor: AUTH.gold, borderRadius: 1 },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },

  error: { color: AUTH.danger, fontSize: 12.5, fontWeight: "600", marginTop: 10, marginBottom: 4, textAlign: "center" },
  success: { color: AUTH.ok, fontSize: 12.5, fontWeight: "700", marginTop: 10, marginBottom: 4, textAlign: "center" },

  resendRow: { flexDirection: "row", alignItems: "center" },
  resendText: { color: AUTH.muted, fontSize: 14 },
  resendLink: { color: AUTH.dark, fontSize: 14, fontWeight: "900" },
  resendOff: { color: "#b5b5b5", fontWeight: "700" },
  changeEmail: { marginTop: 14 },
  changeEmailText: { color: AUTH.muted, fontSize: 12.5, fontWeight: "600" },
});
