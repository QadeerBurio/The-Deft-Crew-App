// SignupVerifyScreen.js
// Step 2 of student signup: enter the 6-digit code sent to the email.
// On success the backend returns { token, user } and the app logs in.

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function SignupVerifyScreen({ route, navigation }) {
  const { userId, email, maskedEmail, emailSent = true, retryAfter = 0, fromLogin = false } =
    route.params || {};
  const { setUser, setToken } = useContext(AuthContext);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(retryAfter || (emailSent ? RESEND_SECONDS : 0));
  const [message, setMessage] = useState(
    emailSent
      ? null
      : { type: "error", text: "We couldn't send the email. Tap resend." }
  );
  const inputRef = useRef(null);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const verify = async (value = code) => {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length !== CODE_LENGTH || verifying) return;

    Keyboard.dismiss();
    setVerifying(true);
    setMessage(null);

    try {
      const res = await api.post(
        "/auth/signup/verify-otp",
        { userId, otp: digits },
        { timeout: 20000 }
      );
      const { token, user } = res.data || {};
      if (!token || !user) throw new Error("Invalid response from server");

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setMessage({ type: "success", text: "Email verified. Welcome to the crew! 🎉" });

      // Logging in switches the app to the main screens
      setTimeout(() => {
        setToken(token);
        setUser(user);
      }, 800);
    } catch (err) {
      setCode("");
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          (err?.code === "ECONNABORTED"
            ? "The server took too long. Please try again."
            : "Couldn't verify the code. Please try again."),
      });
      setTimeout(() => inputRef.current?.focus(), 200);
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setMessage(null);
    try {
      const res = await api.post(
        "/auth/signup/resend-otp",
        { userId, email },
        { timeout: 25000 }
      );
      setCode("");
      setCooldown(RESEND_SECONDS);
      setMessage({ type: "success", text: res.data?.message || "New code sent." });
    } catch (err) {
      if (err?.response?.status === 429) {
        setCooldown(err.response.data?.retryAfter || RESEND_SECONDS);
      }
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Couldn't resend the code. Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  const onChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (message?.type === "error") setMessage(null);
    if (digits.length === CODE_LENGTH) verify(digits); // auto-submit
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={34} color="#f9c349" />
          </View>

          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            {fromLogin ? "Your email isn't verified yet. " : ""}
            Enter the 6-digit code we sent to{"\n"}
            <Text style={styles.email}>{maskedEmail || email || "your email"}</Text>
          </Text>

          {/* Code boxes (one hidden input behind them) */}
          <Pressable style={styles.codeRow} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const filled = i < code.length;
              const active = i === code.length && !verifying;
              return (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    filled && styles.codeBoxFilled,
                    active && styles.codeBoxActive,
                    message?.type === "error" && styles.codeBoxError,
                  ]}
                >
                  <Text style={styles.codeDigit}>{code[i] || ""}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            caretHidden
          />

          {message && (
            <View
              style={[
                styles.messageBox,
                message.type === "error" ? styles.messageError : styles.messageSuccess,
              ]}
            >
              <Ionicons
                name={message.type === "error" ? "alert-circle" : "checkmark-circle"}
                size={16}
                color={message.type === "error" ? "#d93025" : "#0f9d58"}
              />
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (code.length !== CODE_LENGTH || verifying) && styles.buttonDisabled]}
            onPress={() => verify()}
            disabled={code.length !== CODE_LENGTH || verifying}
            activeOpacity={0.9}
          >
            {verifying ? (
              <ActivityIndicator color="#f9c349" />
            ) : (
              <Text style={styles.buttonText}>VERIFY & CONTINUE</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't get it? Check spam, or </Text>
            <TouchableOpacity onPress={resend} disabled={cooldown > 0 || resending}>
              <Text style={[styles.resendLink, (cooldown > 0 || resending) && styles.resendDisabled]}>
                {resending ? "sending…" : cooldown > 0 ? `resend in ${cooldown}s` : "resend code"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Signup")} style={styles.changeEmail}>
            <Text style={styles.changeEmailText}>Wrong email? Sign up again</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  backButton: {
    marginTop: 8,
    marginLeft: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
    justifyContent: "center",
  },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 24 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 28 },
  email: { color: "#1a1a1a", fontWeight: "700" },
  codeRow: { flexDirection: "row", justifyContent: "center", marginBottom: 16 },
  codeBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  codeBoxFilled: { backgroundColor: "#fffbf0", borderColor: "#f9c34960" },
  codeBoxActive: { borderColor: "#f9c349", backgroundColor: "#fff" },
  codeBoxError: { borderColor: "#ff4444", backgroundColor: "#fff5f5" },
  codeDigit: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    alignSelf: "stretch",
  },
  messageError: { backgroundColor: "#fdecea" },
  messageSuccess: { backgroundColor: "#e6f4ea" },
  messageText: { marginLeft: 8, fontSize: 13, color: "#1a1a1a", flex: 1 },
  button: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#f9c349", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  resendRow: { flexDirection: "row", alignItems: "center", marginTop: 20, flexWrap: "wrap", justifyContent: "center" },
  resendText: { color: "#666", fontSize: 13 },
  resendLink: { color: "#1a1a1a", fontWeight: "800", fontSize: 13, textDecorationLine: "underline" },
  resendDisabled: { color: "#aaa", textDecorationLine: "none" },
  changeEmail: { marginTop: 16 },
  changeEmailText: { color: "#999", fontSize: 12 },
});
