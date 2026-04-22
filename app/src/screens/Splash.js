import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    id: "1",
    title: "Global Reach",
    tagline: "EXCHANGE PROGRAMS",
    description:
      "Connect with international universities and broaden your horizons through curated exchange opportunities.",
    offer: "STUDY ABROAD",
    color: ["#141E30", "#243B55"],
    icon: "globe-outline",
  },
  {
    id: "2",
    title: "Career Growth",
    tagline: "PROFESSIONAL PATHWAYS",
    description:
      "Get exclusive access to internships, mentorship sessions, and career workshops designed for the elite.",
    offer: "HIRED FAST",
    color: ["#42275a", "#734b6d"],
    icon: "briefcase-outline",
  },
  {
    id: "3",
    title: "Wanderlust",
    tagline: "TRAVEL & ADVENTURE",
    description:
      "Explore the world with TDC-exclusive travel packages and student-friendly transport discounts.",
    offer: "EXPLORE MORE",
    color: ["#134E5E", "#71B280"],
    icon: "airplane-outline",
  },
  {
    id: "4",
    title: "Unmatched Savings",
    tagline: "LIFESTYLE DISCOUNTS",
    description:
      "Enjoy up to 50% off at your favorite Karachi hubs, from fine dining to essential tech.",
    offer: "Exclusive Discount Offer",
    color: ["#000000", "#434343"],
    icon: "pricetags-outline",
  },
];

export default function TDCFlow({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("alreadyLaunched");

      setTimeout(() => {
        if (hasLaunched === null) {
          setLoading(false);
        } else {
          navigation.replace("Login");
        }
      }, 2500);
    } catch (e) {
      navigation.replace("Login");
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem("alreadyLaunched", "true");
    navigation.replace("Login");
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // Splash Screen

  const SplashScreen = () => (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#000000", "#000000", "#000000"]}
        style={styles.center}
      >
        <Animated.View
          style={[
            styles.splashLogoCircle,
            { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
          ]}
        >
          <Text style={styles.splashLogoText}>tdc.</Text>
        </Animated.View>

        <Animated.Text style={[styles.splashTitle, { opacity: fadeAnim }]}>
          THE DEFT CREW
        </Animated.Text>

        <View style={styles.splashFooter}>
          <Text style={styles.footerBrandText}>EST. 2026 | KARACHI</Text>
        </View>
      </LinearGradient>
    </View>
  );

  // Premium Card

  const DiscountCard = ({ item }) => (
    <Animated.View style={styles.cardContainer}>
      <LinearGradient
        colors={item.color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumCard}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardBrand}>TDC PRIVILEGE</Text>
            <Text style={styles.cardTag}>{item.tagline}</Text>
          </View>

          <Ionicons name={item.icon} size={30} color="#fff" />
        </View>

        <View>
          <Text style={styles.cardOfferText}>{item.offer}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCode}>MEMBER ID: #2026</Text>

          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (loading) return <SplashScreen />;

  return (
    <SafeAreaView style={styles.onboardWrapper}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <DiscountCard item={item} />

            <View style={styles.textSection}>
              <Text style={styles.onboardTitle}>{item.title}</Text>
              <Text style={styles.onboardDesc}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dotRow}>
          {ONBOARDING_DATA.map((_, i) => {
            const widthAnim = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: widthAnim }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.mainBtn,
            currentIndex === 3 ? styles.finishBtn : {},
          ]}
          onPress={handleNext}
        >
          <Text style={styles.mainBtnText}>
            {currentIndex === 3 ? "Get Started" : "Continue"}
          </Text>

          <Ionicons
            name={currentIndex === 3 ? "checkmark-circle" : "arrow-forward"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // splashLogoCircle: {
  //   width: 120,
  //   height: 120,
  //   borderRadius: 60,
  //   backgroundColor: "#ffffff",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   elevation: 10,
  // },

  splashLogoText: {
    fontSize: 58,
    fontWeight: "900",
    color: "#ffffff",
  },

  splashTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    letterSpacing: 4,
  },

  splashFooter: {
    position: "absolute",
    bottom: 40,
  },

  footerBrandText: {
    color: "#888",
    fontSize: 12,
  },

  onboardWrapper: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  page: {
    width,
    alignItems: "center",
    paddingTop: height * 0.08,
  },

  cardContainer: {
    width: width * 0.88,
    height: 240,
    borderRadius: 25,
    overflow: "hidden",
    elevation: 8,
  },

  premiumCard: {
    flex: 1,
    padding: 28,
    justifyContent: "space-between",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardBrand: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  cardTag: {
    color: "#ddd",
    fontSize: 10,
    marginTop: 4,
  },

  cardOfferText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardCode: {
    color: "#fff",
    fontSize: 12,
  },

  activeBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },

  activeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  textSection: {
    paddingHorizontal: 40,
    paddingTop: 45,
    alignItems: "center",
  },

  onboardTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },

  onboardDesc: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },

  dotRow: {
    flexDirection: "row",
    marginBottom: 30,
  },

  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#333",
    marginHorizontal: 4,
  },

  mainBtn: {
    backgroundColor: "#111",
    flexDirection: "row",
    paddingHorizontal: 45,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
  },

  finishBtn: {
    backgroundColor: "#000000",
  },

  mainBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
});