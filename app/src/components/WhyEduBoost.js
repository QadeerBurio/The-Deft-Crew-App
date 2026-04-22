// screens/WhyEduBoostScreen.js
import React, { useRef, useEffect } from "react";
import { 
  View, Text, StyleSheet, ScrollView, Dimensions, Animated, TouchableOpacity 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, FontAwesome5, Entypo, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function WhyEduBoost() {
  const navigation = useNavigation();

  const features = [
    {
      id: 1,
      title: "Fast and Convenient",
      description: "Quick access to university-specific deals and discounts, saving you time and effort.",
      icon: <MaterialIcons name="access-time" size={30} color="#FFA500" />,
      gradient: ["#FFD580", "#FFA500"],
    },
    {
      id: 2,
      title: "Personalized Deals",
      description: "Choose from deals tailored specifically for your campus and interests.",
      icon: <Entypo name="shopping-bag" size={30} color="#32CD32" />,
      gradient: ["#98FB98", "#32CD32"],
    },
    {
      id: 3,
      title: "Secure Transactions",
      description: "Safe and reliable point tracking and redemption for all offers.",
      icon: <Ionicons name="lock-closed" size={30} color="#FF4500" />,
      gradient: ["#FFB07C", "#FF4500"],
    },
    {
      id: 4,
      title: "Premium Rewards",
      description: "Unlock exclusive rewards and benefits with your EduBoost points.",
      icon: <FontAwesome5 name="crown" size={30} color="#800080" />,
      gradient: ["#D8BFD8", "#800080"],
    },
  ];

  // Animation for cards
  const fadeAnim = useRef(features.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    fadeAnim.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <BaseScreen>
      <View style={styles.headerContainer}>
        {/* Back Arrow */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#08634f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Why EduBoost</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.introText}>
  EduBoost connects students with exclusive, university-focused deals and rewards. 
  Access personalized offers, track your points seamlessly, and elevate your campus experience.
</Text>

        {features.map((feature, index) => (
          <Animated.View
            key={feature.id}
            style={{ 
              opacity: fadeAnim[index], 
              transform: [
                { 
                  translateY: fadeAnim[index].interpolate({ inputRange: [0,1], outputRange: [30,0] }) 
                }
              ] 
            }}
          >
            <LinearGradient
              colors={feature.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.1)"]}
                  style={styles.iconBg}
                >
                  {feature.icon}
                </LinearGradient>
              </View>
              <Text style={styles.cardTitle}>{feature.title}</Text>
              <Text style={styles.cardDescription}>{feature.description}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#08634f",
  },
  container: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
  },
  introText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: width - 40,
  },
  card: {
    width: width - 30,
    padding: 22,
    borderRadius: 25,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  iconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 16,
    color: "#f5f5f5",
    lineHeight: 22,
    textAlign: "center",
  },
});
