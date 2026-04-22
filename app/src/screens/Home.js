import React, { useState, useCallback } from "react"; // Added useCallback
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Modal, 
  Text, 
  ActivityIndicator,
  RefreshControl // 1. Import RefreshControl
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import Slider from "../screens/Slider";
import BrandsScreen from "../screens/Brands";
import ChatBotInterface from "./ChatBotInterface"; 
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';

export default function Home() {
  const [isChatVisible, setChatVisible] = useState(false);

  // 2. Destructure 'refetch' and 'isRefetching' from useQuery
  const { data: homeData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['homeData'],
    queryFn: async () => {
      const response = await api.get('/home-endpoint');
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // 3. Create the refresh handler
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // if (isLoading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#000" />
  //     </View>
  //   );
  // }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        // 4. Add the RefreshControl component here
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            colors={["#000"]} // Android spinner color
            tintColor="#000"  // iOS spinner color
          />
        }
      >
        <Slider data={homeData?.sliders} />
        <BrandsScreen limit={6} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => setChatVisible(true)}
      >
        <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={isChatVisible} animationType="slide"  onRequestClose={() => setChatVisible(false)}>
        <View style={styles.modalContainer}>
          {/* <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View> */}
          <ChatBotInterface /> 
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" }, // Added missing style
  scrollContent: { paddingBottom: 80 },
  floatingButton: { 
    position: "absolute", bottom: 70, right: 20, 
    backgroundColor: "#000", width: 60, height: 60, 
    borderRadius: 30, justifyContent: "center", alignItems: "center",
    elevation: 5, // Adds shadow for Android
    shadowColor: "#000", // Adds shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom:10
  },
  modalContainer: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: { 
    height: 60, backgroundColor: "#000", flexDirection: "row", 
    alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, 
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});