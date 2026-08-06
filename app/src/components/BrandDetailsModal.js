// components/BrandDetailModal.js - BRAND DETAIL MODAL COMPONENT
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const BrandDetailModal = ({
  visible,
  selectedBrand,
  currentOffer,
  activeTab,
  setActiveTab,
  onClose,
  onClaim,
  onOpenMap,
  isGuest,
  navigation,
}) => {
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  const myDiscountScale = useRef(new Animated.Value(1)).current;
  const myDiscountRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      modalSlideAnim.setValue(height);
      Animated.spring(modalSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(modalSlideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      onClose();
    });
  };

  const navigateToMyDiscount = () => {
    Animated.parallel([
      Animated.spring(myDiscountScale, {
        toValue: 2,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(myDiscountRotate, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      handleClose();
      setTimeout(() => {
        navigation.navigate('MyDiscountScreen');
        setTimeout(() => {
          myDiscountScale.setValue(1);
          myDiscountRotate.setValue(0);
        }, 100);
      }, 300);
    });
  };

  if (!selectedBrand) return null;

  return (
    <Modal 
      visible={visible} 
      transparent
      onRequestClose={handleClose}
      animationType="none"
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Animated.View 
          style={[
            styles.modalContainerFixed,
            { transform: [{ translateY: modalSlideAnim }] },
          ]}
        >
          <Pressable style={styles.modalContentWrapper} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIndicator} />
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <View style={styles.brandDetailHeader}>
                <View style={styles.modalLogoCircle}>
                  <Image
                    source={{ uri: currentOffer?.image || selectedBrand.displayImage }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.modalTitle}>{selectedBrand.name}</Text>
                <View style={styles.modalCategoryBadge}>
                  <MaterialIcons name="category" size={14} color="black" />
                  <Text style={styles.modalCategoryText}>
                    {selectedBrand.category}
                  </Text>
                </View>
              </View>

              <View style={styles.tabContainer}>
                {["gift", "redeem", "location"].map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tabItem, activeTab === tab && styles.activeTabCard]}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab === "gift" ? "Details" : tab === "redeem" ? "Redeem" : "Locate"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {activeTab === "gift" && (
                <View style={styles.tabContentWrapper}>
                  <Text style={styles.tabContentTitle}>Offer Details</Text>
                  <Text style={styles.tabContentText}>
                    {currentOffer?.description || "Explore this iconic destination. Get exclusive student discounts on your favorite products and services."}
                  </Text>
                  
                  {isGuest && (
                    <TouchableOpacity 
                      style={styles.guestPromptCard}
                      onPress={() => {
                        handleClose();
                        setTimeout(() => navigation.navigate('Login'), 300);
                      }}
                    >
                      <MaterialCommunityIcons name="account-plus" size={24} color="#f9c349" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.guestPromptTitle}>Unlock Full Benefits</Text>
                        <Text style={styles.guestPromptText}>Sign in to claim offers and get student discounts!</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-forward" size={20} color="#f9c349" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {activeTab === "redeem" && (
                <View style={styles.tabContentWrapper}>
                  <View style={styles.instructionHeader}>
                    <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color="#000000" />
                    <Text style={styles.instructionTitle}>How to Redeem</Text>
                  </View>
                  <Text style={styles.tabContentText}>
                    {currentOffer?.redeemInstructions ||
                      "1. Show your valid student ID at the counter\n2. Mention you're a Crew Privilege member\n3. Enjoy your discount!"}
                  </Text>
                </View>
              )}

              {activeTab === "location" && (
                <View style={styles.tabContentWrapper}>
                  <View style={styles.locationInfoRow}>
                    <MaterialCommunityIcons name="map-marker-radius" size={24} color="#000000" />
                    <Text style={styles.locationAddressText}>
                      {currentOffer?.location || "Address not specified"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => onOpenMap(currentOffer?.location || selectedBrand.name)}
                  >
                    <MaterialCommunityIcons name="directions" size={18} color="#fff" />
                    <Text style={styles.mapButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Modal Action Row */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
              {currentOffer ? (
                <TouchableOpacity
                  style={[
                    styles.buyBtn,
                    currentOffer.isClaimed && styles.claimedBtn,
                    styles.diagonalClaimBtn
                  ]}
                  disabled={currentOffer.isClaimed}
                  onPress={() => onClaim(currentOffer._id)}
                >
                  <LinearGradient
                    colors={currentOffer.isClaimed ? ['#ccc', '#bbb'] : ['#f9c349', '#f5a623']}
                    style={styles.claimGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons 
                      name={currentOffer.isClaimed ? "check-circle" : "gift"} 
                      size={20} 
                      color="#fff" 
                      style={styles.claimIcon}
                    />
                    <Text style={styles.buyBtnText}>
                      {currentOffer.isClaimed ? "✓ Claimed" : "Claim Discount"}
                    </Text>
                    {!currentOffer.isClaimed && (
                      <View style={styles.claimArrowContainer}>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.buyBtn, styles.claimedBtn]}
                  disabled={true}
                >
                  <Text style={styles.buyBtnText}>
                    No Offers Available
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* My Discount Indicator */}
            {!isGuest && (
              <Animated.View
                style={[
                  styles.myDiscountIndicator,
                  {
                    transform: [
                      { scale: myDiscountScale },
                      { rotate: myDiscountRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })}
                    ]
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={navigateToMyDiscount}
                  activeOpacity={0.7}
                  style={styles.myDiscountTouchable}
                >
                  <MaterialCommunityIcons name="ticket-percent" size={20} color="#f9c349" />
                  <Text style={styles.myDiscountIndicatorText}>My Discounts</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "flex-end" 
  },
  modalContainerFixed: { 
    height: "88%", 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35,
  },
  modalContentWrapper: { 
    flex: 1,
    padding: 25,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalIndicator: { 
    width: 45, 
    height: 5, 
    backgroundColor: "#E0E0E0", 
    borderRadius: 10, 
    alignSelf: "center", 
    marginBottom: 25 
  },
  brandDetailHeader: { 
    alignItems: "center", 
    marginBottom: 10 
  },
  modalLogoCircle: { 
    width: "100%", 
    height: 150, 
    borderRadius: 20, 
    backgroundColor: "#F7F9F8", 
    overflow: "hidden", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  modalImage: { 
    width: "80%", 
    height: "80%", 
    resizeMode: "contain" 
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: "900", 
    color: "#000000", 
    marginTop: 15, 
    textAlign: "center" 
  },
  modalCategoryBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f5f5f5", 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 20, 
    marginTop: 8 
  },
  modalCategoryText: { 
    fontSize: 10, 
    color: "#000000", 
    fontWeight: "700", 
    textTransform: "uppercase", 
    letterSpacing: 1.2, 
    marginLeft: 6 
  },
  tabContainer: { 
    flexDirection: "row", 
    backgroundColor: "#F0F2F1", 
    borderRadius: 18, 
    padding: 6, 
    marginBottom: 10, 
    marginTop: 10 
  },
  tabItem: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: "center", 
    borderRadius: 14 
  },
  activeTabCard: { 
    backgroundColor: "#fff", 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  tabText: { 
    fontSize: 13, 
    color: "#999", 
    fontWeight: "700", 
    textTransform: "uppercase", 
    letterSpacing: 0.5 
  },
  activeTabText: { 
    color: "#000000" 
  },
  tabContentWrapper: {
    marginTop: 15,
    paddingHorizontal: 5,
  },
  tabContentTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#000000", 
    marginBottom: 10 
  },
  tabContentText: { 
    fontSize: 14, 
    color: "#666", 
    lineHeight: 20 
  },
  instructionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12, 
    gap: 10 
  },
  instructionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#000000" 
  },
  locationInfoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20 
  },
  locationAddressText: { 
    fontSize: 15, 
    color: "#333", 
    marginLeft: 10, 
    flexShrink: 1 
  },
  mapButton: { 
    flexDirection: "row", 
    backgroundColor: "#000000", 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 15, 
    alignItems: "center", 
    justifyContent: "center", 
    alignSelf: "flex-start" 
  },
  mapButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    marginLeft: 8, 
    fontSize: 14 
  },
  modalActionRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 20, 
    gap: 15, 
    paddingBottom: 10 
  },
  closeBtn: { 
    flex: 0.4, 
    paddingVertical: 16, 
    borderRadius: 20, 
    backgroundColor: "#F2F2F2", 
    alignItems: "center" 
  },
  closeBtnText: { 
    color: "#777", 
    fontWeight: "700" 
  },
  buyBtn: { 
    flex: 0.6, 
    borderRadius: 20, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  diagonalClaimBtn: {
    transform: [{ rotate: '0deg' }],
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  claimIcon: {
    marginRight: 4,
  },
  claimArrowContainer: {
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 2,
  },
  claimedBtn: { 
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  buyBtnText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 14 
  },
  guestPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  guestPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2
  },
  guestPromptText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  },
  myDiscountIndicator: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 195, 73, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 195, 73, 0.3)',
    zIndex: 10,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  myDiscountTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myDiscountIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f9c349',
    marginLeft: 4,
  },
});

export default BrandDetailModal;