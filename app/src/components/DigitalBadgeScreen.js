// ==================== DigitalBadgeScreen.js ====================
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Share,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
import ScreenHeader from "../ui/ScreenHeader";
const DigitalBadgeScreen = () => {
  const navigation = useNavigation();
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const badgeScale = badgeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.2, 1],
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: "I earned the DEFT ROOKIE Digital Badge! 🏅 Join The Deft Crew and start your journey too!",
        title: "My TDC Digital Badge",
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleGoBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      
      <ScreenHeader title="digital badge" onBack={handleGoBack} />

      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.badgeContainer,
            {
              transform: [{ scale: badgeScale }],
            }
          ]}
        >
          <Animated.View
            style={[
              styles.orbRing,
              {
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          />
          
          <Animated.View
            style={[
              styles.badgeInner,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="shield-star" size={80} color={T.white} />
              <Text style={styles.badgeTitle}>deft rookie</Text>
              <Text style={styles.badgeSubtitle}>digital badge</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>badge details</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={T.ink} />
            <Text style={styles.infoText}>verified digital achievement</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={T.ink} />
            <Text style={styles.infoText}>exclusive community access</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={T.ink} />
            <Text style={styles.infoText}>partner brand vip access</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <LinearGradient
            colors={[T.ink, T.ink]}
            style={styles.shareGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={20} color={T.white} />
            <Text style={styles.shareBtnText}>share your badge</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.card,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  badgeContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  orbRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(108,99,255,0.2)",
    borderStyle: "dashed",
  },
  badgeInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: "hidden",
    backgroundColor: T.ink,
  },
  badgeGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  badgeTitle: {
    color: T.white,
    fontSize: 14,
    fontFamily: F.bodyBold,
    letterSpacing: 1,
    marginTop: 8,
  },
  badgeSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontFamily: F.bodySemi,
  },
  infoContainer: {
    width: "100%",
    marginTop: 30,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: T.line,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  shareBtn: {
    width: "100%",
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  shareGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  shareBtnText: {
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
});

export default DigitalBadgeScreen;