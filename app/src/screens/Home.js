import React, { useState, useCallback, useRef, useEffect, useContext } from "react";
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Modal, 
  Text, 
  ActivityIndicator,
  RefreshControl,
  Animated,
  StatusBar
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import Slider from "../screens/Slider";
import BrandsScreen from "../screens/Brands";
import ChatBotInterface from "./ChatBotInterface"; 
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';

export default function Home() {
  const [isChatVisible, setChatVisible] = useState(false);
  const { isGuest } = useContext(AuthContext);
  // Animations for floating button
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Sparkle animation
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Badge animation
    Animated.timing(badgeAnim, {
      toValue: 1,
      duration: 800,
      delay: 2000,
      useNativeDriver: true,
    }).start();
    
    floatAnimation.start();
    pulseAnimation.start();
    sparkleAnimation.start();
    
    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
      sparkleAnimation.stop();
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleChatOpen = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    setChatVisible(true);
  };

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const { data: homeData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['homeData'],
    queryFn: async () => {
      const response = await api.get('/home-endpoint');
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            colors={["#f9c349"]}
            tintColor="#f9c349"
            progressBackgroundColor="#ffffff"
          />
        }
      >
        <Slider data={homeData?.sliders} />
        
        <BrandsScreen limit={6} />
      </ScrollView>

      {/* Floating Action Button with Animations */}
      <Animated.View style={[
        styles.floatingButtonContainer,
        {
          transform: [
            { translateY: floatY },
            { scale: pulseAnim },
          ],
        }
      ]}>
        {/* Sparkle effects */}
        <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkleOpacity }]}>
          <MaterialCommunityIcons name="star-four-points" size={8} color="#f9c349" />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkleOpacity }]}>
          <MaterialCommunityIcons name="star-four-points" size={6} color="#f9c349" />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkleOpacity }]}>
          <MaterialCommunityIcons name="star-four-points" size={10} color="#f9c349" />
        </Animated.View>
        
        {/* Pulse rings */}
        <View style={styles.pulseRing1} />
        <View style={styles.pulseRing2} />
        
        {/* Main button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={styles.floatingButton} 
            onPress={handleChatOpen}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <View style={styles.buttonGradient}>
              <MaterialCommunityIcons name="robot-outline" size={28} color="#f9c349" />
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Online badge */}
        <Animated.View style={[
          styles.onlineBadge,
          {
            opacity: badgeAnim,
            transform: [{ scale: badgeAnim }],
          }
        ]}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>AI</Text>
        </Animated.View>
      </Animated.View>

      {/* Chat Modal */}
      <Modal 
        visible={isChatVisible} 
        animationType="slide" 
        onRequestClose={() => setChatVisible(false)}
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ChatBotInterface onClose={() => setChatVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  scrollContent: { 
    paddingBottom: 80,
  },
  
  // Floating Button Container
  floatingButtonContainer: { 
    position: "absolute", 
    bottom: 80, 
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Sparkle Effects
  sparkle: {
    position: 'absolute',
    zIndex: 1,
  },
  sparkle1: {
    top: -15,
    right: 5,
  },
  sparkle2: {
    top: 10,
    left: -10,
  },
  sparkle3: {
    bottom: -5,
    right: -8,
  },
  
  // Pulse Rings
  pulseRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 195, 73, 0.1)',
  },
  pulseRing2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(249, 195, 73, 0.05)',
  },
  
  // Main Button
  floatingButton: { 
    width: 60, 
    height: 60, 
    borderRadius: 30,
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(26, 26, 26, 0.1)',
  },
  
  // Online Badge
  onlineBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  
  // Modal
  modalContainer: { 
    flex: 1, 
    backgroundColor: "#ffffff",
  },
});