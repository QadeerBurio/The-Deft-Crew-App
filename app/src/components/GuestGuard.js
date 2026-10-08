// components/GuestGuard.js
import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { color as T, font as F } from "../theme/tokens";

export default function GuestGuard({ title, message, children, navigation: propNav }) {
  const { user, isGuest, setIsGuest } = useContext(AuthContext);
  const navigation = propNav || useNavigation();

  // If user is logged in or not a guest, show children
  if (user && !isGuest) return children;
  
  // If user is logged in as guest and this is a protected action
  if (isGuest && !user) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={48} color={T.yellow} />
        </View>
        <Text style={styles.title}>{title || "Sign In Required"}</Text>
        <Text style={styles.message}>
          {message || "Please sign in to access this feature. It's free and gives you access to exclusive student benefits!"}
        </Text>
        
        <TouchableOpacity 
          style={styles.signInBtn}
          onPress={() => {
            setIsGuest(false);
            navigation.navigate('Login');
          }}
        >
          <Ionicons name="log-in-outline" size={20} color={T.yellow} style={{marginRight: 8}} />
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => {
            setIsGuest(false);
            navigation.navigate('Signup');
          }}
        >
          <Text style={styles.createText}>Create Free Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.continueGuestBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueGuestText}>Continue Browsing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: T.card, 
    padding: 32 
  },
  iconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: T.sand, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 2, 
    borderColor: T.yellow 
  },
  title: { 
    fontSize: 22, 
    fontFamily: F.heading, 
    color: T.ink, 
    marginBottom: 8 
  },
  message: { 
    fontSize: 14, 
    color: T.textMuted, 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 28 
  },
  signInBtn: { 
    flexDirection: 'row', 
    backgroundColor: T.ink, 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center'
  },
  signInText: { 
    color: T.yellow, 
    fontFamily: F.bodyBold, 
    fontSize: 16 
  },
  createBtn: { 
    paddingVertical: 10,
    marginBottom: 8
  },
  createText: { 
    color: T.ink, 
    fontFamily: F.bodySemi, 
    fontSize: 14, 
    textDecorationLine: 'underline' 
  },
  continueGuestBtn: {
    paddingVertical: 10,
    marginTop: 8
  },
  continueGuestText: {
    color: T.textMuted,
    fontFamily: F.bodyMedium,
    fontSize: 14
  }
});