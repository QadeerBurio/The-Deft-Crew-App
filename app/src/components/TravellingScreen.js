import React, { useState, useMemo, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  TextInput, ImageBackground, Dimensions, StatusBar, FlatList, 
  Modal, ActivityIndicator, Alert, BackHandler, Animated,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; 
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/auth/packages/public'; 

const CATEGORIES = [
  'All', 'International Tours', 'Pakistan Tours',
  'Flights', 'Hotels', 'Visa Services', 'Study Abroad', 'Travel Insurance',
  'Transport Services', 'Adventure Tourism', 'Honeymoon Packages', 'Family Tours',
  'Group Tours', 'Corporate Travel', 'Cruise Tours', 'Events & Conferences',
  'Student Tours', 'Luxury Travel'
];

// Optimized Skeleton Loader with TDC design
const SkeletonLoader = ({ style, width: w, height: h }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#E8ECF1', borderRadius: 12 }]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
};

// TDC Branded Skeleton Card
const SkeletonCard = React.memo(({ index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.mainCard,
      {
        opacity: fadeAnim,
        transform: [{ 
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })
        }]
      }
    ]}>
      <SkeletonLoader style={styles.cardImg} />
      <View style={styles.cardInfo}>
        <SkeletonLoader style={{ width: '85%', height: 16, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonLoader style={{ width: '60%', height: 12, borderRadius: 4, marginBottom: 10 }} />
        <View style={styles.cardFooter}>
          <SkeletonLoader style={{ width: 60, height: 18, borderRadius: 4 }} />
          <SkeletonLoader style={{ width: 50, height: 18, borderRadius: 6 }} />
        </View>
      </View>
    </Animated.View>
  );
});

// TDC Animated Card Component
const AnimatedCard = React.memo(({ item, index, onPress }) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 80,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  return (
    <Animated.View style={[
      styles.mainCard,
      {
        opacity: cardAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: cardAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0]
          })}
        ]
      }
    ]}>
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(item);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/300' }} 
          style={styles.cardImg} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardGradient}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>
        <TouchableOpacity style={styles.cardFavoriteBtn}>
          <Ionicons name="heart-outline" size={18} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardLocRow}>
            <Ionicons name="location-sharp" size={12} color="#f9c349" />
            <Text style={styles.cardLocText} numberOfLines={1}>{item.location || 'Pakistan'}</Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>{item.price}</Text>
            <View style={styles.ratingBox}>
              <FontAwesome5 name="star" size={8} color="#f9c349" solid />
              <Text style={styles.ratingText}>4.8</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const TravelingScreen = () => {
  const { token } = useContext(AuthContext); 
  const navigation = useNavigation();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  const skeletonsFadeOut = useRef(new Animated.Value(1)).current;

  // Fetch packages with optimized loading
  useEffect(() => {
    if (token) {
      fetchPackages();
    } else {
      setTimeout(() => {
        setLoading(false);
        animateContent();
      }, 100);
    }
  }, [token]);

  const animateContent = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(heroAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(categoriesAnim, {
        toValue: 1,
        delay: 200,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(searchAnim, {
        toValue: 1,
        delay: 100,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPackages(response.data || []);
      
      // Animate content after data loads
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(heroAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(categoriesAnim, {
            toValue: 1,
            delay: 100,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(searchAnim, {
            toValue: 1,
            delay: 50,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonsFadeOut, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setLoading(false);
        });
      }, 500);
      
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
      Alert.alert("Connection Error", "Could not fetch packages.");
      setLoading(false);
      skeletonsFadeOut.setValue(0);
      animateContent();
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages().finally(() => setRefreshing(false));
  }, [token]);

  const openModal = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDestination(item);
    setModalVisible(true);
    
    modalScaleAnim.setValue(0);
    modalSlideAnim.setValue(height);
    
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(modalSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedDestination(null);
    });
  }, []);

  // Back button handling
  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        closeModal();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [modalVisible]);

  const handleCategoryPress = useCallback((category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(category);
  }, []);

  const filteredData = useMemo(() => {
    let list = [...packages];
    if (searchQuery) {
      list = list.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeCategory !== 'All') {
      list = list.filter(item => item.category === activeCategory);
    }
    return list;
  }, [searchQuery, activeCategory, packages]);

  const renderCard = useCallback(({ item, index }) => (
    <AnimatedCard item={item} index={index} onPress={openModal} />
  ), [openModal]);

  // Animated Header
  const renderHeader = () => (
    <>
      <Animated.View style={[
        styles.heroContainer,
        {
          opacity: heroAnim,
          transform: [{ 
            scale: heroAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1]
            })
          }]
        }
      ]}>
        <ImageBackground 
          source={require('../../../assets/tdcaq.png')} 
          style={styles.heroImage}
          imageStyle={styles.heroImageStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.2)']}
            style={styles.heroGradient}
          >
            <SafeAreaView style={styles.heroContent}>
              <Animated.Text style={[
                styles.heroMainText,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}>
                Find Your Next{'\n'}Adventure
              </Animated.Text>
              
              <Animated.View style={[
                styles.searchBar,
                {
                  opacity: searchAnim,
                  transform: [
                    { scale: searchAnim },
                    { translateY: searchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}
                  ]
                }
              ]}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput 
                  placeholder="Where to go?" 
                  placeholderTextColor="#999"
                  style={styles.searchInput} 
                  value={searchQuery} 
                  onChangeText={setSearchQuery} 
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </Animated.View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      <Animated.View style={[
        styles.categoriesWrapper,
        {
          opacity: categoriesAnim,
          transform: [{ translateY: categoriesAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0]
          })}]
        }
      ]}>
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>Explore Categories</Text>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAllCategories(!showAllCategories);
            }}
          >
            <Text style={styles.viewAllText}>
              {showAllCategories ? "Show Less" : "View All"}
            </Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          horizontal={!showAllCategories}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          numColumns={showAllCategories ? 3 : 1}
          key={showAllCategories ? 'grid' : 'list'}
          scrollEnabled={!showAllCategories}
          contentContainerStyle={showAllCategories && styles.categoriesGrid}
          renderItem={({item}) => {
            const isActive = activeCategory === item;
            return (
              <TouchableOpacity 
                onPress={() => handleCategoryPress(item)} 
                style={[styles.categoryButton, isActive && styles.activeCategoryButton]}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryButtonText, isActive && styles.activeCategoryButtonText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>

      <Animated.View style={[
        styles.listHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <Text style={styles.listTitle}>
          {activeCategory === 'All' ? 'All Packages' : activeCategory}
        </Text>
        <Text style={styles.countText}>{filteredData.length} packages</Text>
      </Animated.View>
    </>
  );

  // Skeleton Loader View
  const renderSkeletonLoader = () => (
    <Animated.View style={[styles.container, { opacity: skeletonsFadeOut }]}>
      <FlatList
        data={[1, 2, 3, 4, 5, 6]}
        numColumns={2}
        keyExtractor={(item) => item.toString()}
        renderItem={({ index }) => <SkeletonCard index={index} />}
        columnWrapperStyle={styles.flatListRow}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Skeleton Hero */}
            <View style={styles.heroContainer}>
              <View style={[styles.heroImage, { backgroundColor: '#E8ECF1' }]}>
                <View style={styles.heroContent}>
                  <SkeletonLoader style={{ width: '70%', height: 36, borderRadius: 8, marginBottom: 16 }} />
                  <SkeletonLoader style={{ width: '85%', height: 36, borderRadius: 8, marginBottom: 24 }} />
                  <SkeletonLoader style={{ width: '100%', height: 55, borderRadius: 15 }} />
                </View>
              </View>
            </View>

            {/* Skeleton Categories */}
            <View style={styles.categoriesWrapper}>
              <View style={styles.categoriesHeader}>
                <SkeletonLoader style={{ width: 140, height: 20, borderRadius: 4 }} />
                <SkeletonLoader style={{ width: 60, height: 16, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <SkeletonLoader 
                    key={item}
                    style={{ width: 90, height: 38, borderRadius: 12, marginRight: 10 }} 
                  />
                ))}
              </View>
            </View>

            {/* Skeleton List Header */}
            <View style={styles.listHeader}>
              <SkeletonLoader style={{ width: 120, height: 24, borderRadius: 4 }} />
              <SkeletonLoader style={{ width: 70, height: 16, borderRadius: 4 }} />
            </View>
          </>
        }
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {loading ? (
        renderSkeletonLoader()
      ) : (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <FlatList
            data={filteredData}
            renderItem={renderCard}
            keyExtractor={(item) => item._id}
            numColumns={2}
            ListHeaderComponent={renderHeader}
            columnWrapperStyle={styles.flatListRow}
            contentContainerStyle={styles.listContentContainer}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Animated.View style={[
                styles.emptyState,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}>
                <MaterialCommunityIcons name="bag-suitcase-off" size={60} color="#CCC" />
                <Text style={styles.emptyText}>No packages found.</Text>
                <Text style={styles.emptySubText}>Try adjusting your search or category</Text>
              </Animated.View>
            }
          />
        </Animated.View>
      )}

      {/* TDC Complete Modal with All Requirements */}
      <Modal 
        visible={modalVisible} 
        transparent
        animationType="none" 
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Animated.View style={[
          styles.modalOverlay,
          { opacity: modalScaleAnim }
        ]}>
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: modalSlideAnim }] }
          ]}>
            {selectedDestination && (
              <>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.modalImageContainer}>
                    <Image 
                      source={{ uri: selectedDestination.image }} 
                      style={styles.modalImage}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.modalImageGradient}
                    />
                    <TouchableOpacity 
                      style={styles.modalCloseButton} 
                      onPress={closeModal}
                      activeOpacity={0.8}
                    >
                      <BlurView intensity={80} style={styles.modalCloseBlur}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                      </BlurView>
                    </TouchableOpacity>
                    
                    <View style={styles.modalImageContent}>
                      <View style={styles.modalCategoryBadge}>
                        <Text style={styles.modalCategoryText}>{selectedDestination.category}</Text>
                      </View>
                      <Text style={styles.modalTitle}>{selectedDestination.name}</Text>
                      <View style={styles.modalLocation}>
                        <Ionicons name="location-outline" size={16} color="#FFF" />
                        <Text style={styles.modalLocationText}>{selectedDestination.location || 'Pakistan'}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalDetails}>
                    {/* Price and Rating Section */}
                    <View style={styles.modalPriceRow}>
                      <View>
                        <Text style={styles.priceLabelText}>Price per person</Text>
                        <Text style={styles.modalPrice}>{selectedDestination.price}</Text>
                      </View>
                      <View style={styles.modalRating}>
                        <FontAwesome5 name="star" size={12} color="#f9c349" solid />
                        <Text style={styles.modalRatingText}>4.8</Text>
                        <Text style={styles.modalRatingCount}>(128 reviews)</Text>
                      </View>
                    </View>

                    

                    {/* Description */}
                    {selectedDestination.description && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <Ionicons name="information-circle-outline" size={20} color="#f9c349" />
                          <Text style={styles.modalSectionTitle}>Description</Text>
                        </View>
                        <Text style={styles.modalDescription}>{selectedDestination.description}</Text>
                      </View>
                    )}

                    

                    

                    {/* Requirements Section */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#FFA500" />
                        <Text style={styles.modalSectionTitle}>Requirements & Important Info</Text>
                      </View>
                      
                      <View style={styles.requirementsList}>
                        <View style={styles.requirementItem}>
                          <Ionicons name="document-text-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Valid passport with 6+ months validity</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="medkit-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Travel insurance mandatory</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="card-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Visa requirements as per destination</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="fitness-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Good physical health condition</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="cash-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Full payment 15 days before departure</Text>
                        </View>
                      </View>
                    </View>

                    {/* Cancellation Policy */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="alert-circle-outline" size={20} color="#FF4444" />
                        <Text style={styles.modalSectionTitle}>Cancellation Policy</Text>
                      </View>
                      <View style={styles.policyItem}>
                        <Text style={styles.policyText}>• Free cancellation up to 10 days before departure</Text>
                        <Text style={styles.policyText}>• 50% refund for cancellation 7-8 days before</Text>
                        <Text style={styles.policyText}>• No refund for cancellation within 6 days</Text>
                        <Text style={styles.policyText}>• Name changes allowed with additional fee</Text>
                      </View>
                    </View>
                    
                    <View style={{ height: 100 }} />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <BlurView intensity={100} style={styles.modalFooterBlur}>
                    <View style={styles.modalFooterContent}>
                      <View>
                        <Text style={styles.footerLabel}>Total Price</Text>
                        <Text style={styles.footerPrice}>{selectedDestination.price}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.bookButton}
                        onPress={() => { 
                          const item = selectedDestination;
                          closeModal();
                          setTimeout(() => {
                            navigation.navigate('Booking', { item });
                          }, 300);
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#1a1a1a', '#1a1a1a']}
                          style={styles.bookButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.bookButtonText}>Book Now</Text>
                          <Ionicons name="arrow-forward" size={20} color="#f9c349" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: 'transparent',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  heroContainer: { 
    width: '100%',
    height: 320,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageStyle: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroContent: { 
    paddingHorizontal: 20, 
    paddingTop: 50,
    paddingBottom: 30,
  },
  heroMainText: { 
    color: '#FFF', 
    fontSize: 34, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 20,
  },
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    height: 55, 
    borderRadius: 16, 
    alignItems: 'center', 
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 15,
    color: '#333',
  },
  categoriesWrapper: { 
    marginTop: 20, 
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoriesHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15 
  },
  categoriesTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#1A202C',
  },
  viewAllText: { 
    color: '#f9c349', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  categoriesGrid: { 
    justifyContent: 'center' 
  },
  categoryButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    marginRight: 10, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCategoryButton: { 
    backgroundColor: '#1a1a1a', 
    borderColor: '#1a1a1a',
  },
  categoryButtonText: { 
    fontSize: 13, 
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryButtonText: { 
    color: '#f9c349', 
    fontWeight: 'bold' 
  },
  listHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    marginTop: 15, 
    marginBottom: 15 
  },
  listTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#1A202C',
  },
  countText: { 
    color: '#999', 
    fontSize: 13,
    fontWeight: '500',
  },
  listContentContainer: { 
    paddingBottom: 30 
  },
  flatListRow: { 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    gap: 10,
  },
  mainCard: { 
    backgroundColor: '#FFF', 
    width: (width - 50) / 2, 
    borderRadius: 16, 
    marginBottom: 15, 
    elevation: 4, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardImg: { 
    width: '100%', 
    height: 130,
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  badge: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8,
  },
  badgeText: { 
    color: '#FFF', 
    fontSize: 9, 
    fontWeight: 'bold' 
  },
  cardFavoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { 
    padding: 12 
  },
  cardTitle: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#1A202C',
    marginBottom: 4,
  },
  cardLocRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 2,
    marginBottom: 4,
  },
  cardLocText: { 
    fontSize: 11, 
    color: '#718096', 
    marginLeft: 4 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 6,
  },
  cardPrice: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1a1a1a' 
  },
  ratingBox: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { 
    fontSize: 10, 
    marginLeft: 3, 
    color: '#f9c349',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#999', 
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    textAlign: 'center',
    color: '#CCC',
    marginTop: 8,
    fontSize: 13,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: { 
    flex: 1, 
    backgroundColor: '#FFF',
  },
  modalImageContainer: {
    height: height * 0.3,
    position: 'relative',
  },
  modalImage: { 
    width: '100%', 
    height: '100%',
    resizeMode:'cover'
  },
  modalImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCloseButton: { 
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  modalCloseBlur: {
    borderRadius: 12, 
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalImageContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  modalCategoryBadge: { 
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalCategoryText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 11, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLocationText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
    opacity: 0.9,
  },
  modalDetails: { 
    padding: 24, 
    backgroundColor: '#FFF', 
  },
  modalPriceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  priceLabelText: {
    color: '#718096',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalRating: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF9E6', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12 
  },
  modalRatingText: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#f9c349',
    marginLeft: 4,
  },
  modalRatingCount: {
    fontSize: 11,
    color: '#718096',
    marginLeft: 4,
  },
  modalSection: { 
    marginBottom: 24 
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#2D3748',
    marginLeft: 8,
  },
  modalDescription: { 
    color: '#4A5568', 
    lineHeight: 24, 
    fontSize: 15 
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  highlightItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  highlightText: {
    fontSize: 13,
    color: '#4A5568',
    marginLeft: 8,
    fontWeight: '500',
  },
  itineraryItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  itineraryDay: {
    width: 60,
    justifyContent: 'center',
  },
  itineraryDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f9c349',
  },
  itineraryContent: {
    flex: 1,
  },
  itineraryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  itineraryDesc: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 18,
  },
  includedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  includedItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  includedText: {
    fontSize: 11,
    color: '#4A5568',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  requirementText: {
    flex: 1,
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '500',
  },
  policyItem: {
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  policyText: {
    fontSize: 13,
    color: '#FF4444',
    lineHeight: 20,
  },
  modalFooter: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%',
  },
  modalFooterBlur: {
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  modalFooterContent: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingBottom: 30,
  },
  footerLabel: { 
    color: '#718096', 
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  footerPrice: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1a1a1a' 
  },
  bookButton: { 
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonGradient: { 
    paddingHorizontal: 28, 
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButtonText: { 
    color: '#f9c349', 
    fontWeight: 'bold', 
    fontSize: 16,
    letterSpacing: 0.5,
  }
});

export default TravelingScreen;