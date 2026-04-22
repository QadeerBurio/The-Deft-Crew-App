import React, { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  TextInput, ImageBackground, Dimensions, StatusBar, FlatList, 
  Modal,  ActivityIndicator, Alert, BackHandler 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; 

const { width, height } = Dimensions.get('window');

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/auth/packages/public'; 

const CATEGORIES = [
  'All', 'International Tours', 'Pakistan Tours',
  'Flights', 'Hotels', 'Visa Services', 'Study Abroad', 'Travel Insurance',
  'Transport Services', 'Adventure Tourism', 'Honeymoon Packages', 'Family Tours',
  'Group Tours', 'Corporate Travel', 'Cruise Tours', 'Events & Conferences',
  'Student Tours', 'Luxury Travel'
];

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
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // --- BACK BUTTON HANDLING ---
  useEffect(() => {
    const backAction = () => {
      if (selectedDestination) {
        setSelectedDestination(null);
        return true; 
      }
      return false; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [selectedDestination]);

  useEffect(() => {
    if (token) {
      fetchPackages();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchPackages = async (isLoadMore = false) => {
    if (!token) return;
    try {
      if (isLoadMore) setIsFetchingMore(true);
      else setLoading(true);

      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // If your API supports pagination, you would append data here.
      // For now, we simulate the fetch.
      setPackages(response.data || []);
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
      Alert.alert("Connection Error", "Could not fetch packages.");
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  const handleLoadMore = () => {
    // Only trigger if not already loading and you have more pages to fetch
    if (!isFetchingMore) {
        // fetchPackages(true); // Call this when you have actual paginated API
    }
  };

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

  const renderCard = ({ item }) => (
    <TouchableOpacity style={styles.mainCard} onPress={() => setSelectedDestination(item)}>
      <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.cardImg} />
      <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardLocRow}>
          <Ionicons name="location-sharp" size={12} color="#007AFF" />
          <Text style={styles.cardLocText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{item.price}</Text>
          <View style={styles.ratingBox}>
            <FontAwesome5 name="star" size={8} color="#FFD700" solid />
            <Text style={styles.ratingText}>4.8</Text> 
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      <ImageBackground source={require('../../../assets/tdcaq.png')} style={styles.topHero}>
        <SafeAreaView style={styles.heroContent}>
          <Text style={styles.heroMainText}>Find Your Next{'\n'}Adventure</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput 
                placeholder="Where to go?" 
                style={styles.searchInput} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
            />
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.catWrapper}>
        <View style={styles.catHeaderRow}>
          <Text style={styles.catHeaderTitle}>Explore Categories</Text>
          <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
            <Text style={styles.viewAllText}>{showAllCategories ? "Show Less" : "View All"}</Text>
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
            contentContainerStyle={showAllCategories && styles.catGrid}
            renderItem={({item}) => (
                <TouchableOpacity 
                    onPress={() => setActiveCategory(item)} 
                    style={[styles.catBtn, activeCategory === item && styles.activeCatBtn]}
                >
                    <Text style={[styles.catBtnText, activeCategory === item && styles.activeCatBtnText]}>{item}</Text>
                </TouchableOpacity>
            )}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{activeCategory}</Text>
        <Text style={styles.countText}>{filteredData.length} Found</Text>
      </View>
    </>
  );

  const renderFooter = () => {
    if (!isFetchingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />
      
      {loading ? (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderCard}
          keyExtractor={item => item._id}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          columnWrapperStyle={styles.flatListRow}
          contentContainerStyle={styles.mainListContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={styles.emptyText}>No packages found.</Text>}
        />
      )}

      {/* --- DETAILS MODAL --- */}
      <Modal 
        visible={!!selectedDestination} 
        animationType="slide" 
        onRequestClose={() => setSelectedDestination(null)}
      >
        <SafeAreaView style={styles.modalSafeContainer}>
          {selectedDestination && (
            <View style={styles.modalContent}>
              <FlatList
                data={[]} // Using FlatList as a container for better performance
                ListHeaderComponent={
                  <>
                    <View>
                      <Image source={{ uri: selectedDestination.image }} style={styles.modalImg} />
                      <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDestination(null)}>
                        <Ionicons name="chevron-back" size={24} color="#000" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.detailsSheet}>
                      <View style={styles.detailHeaderRow}>
                         <View style={styles.categoryBadge}>
                            <Text style={styles.detailCat}>{selectedDestination.category}</Text>
                         </View>
                         <View style={styles.ratingRow}>
                            <FontAwesome5 name="star" size={12} color="#FFD700" solid />
                            <Text style={styles.ratingTextMain}> 4.8</Text>
                         </View>
                      </View>

                      <Text style={styles.detailTitle}>{selectedDestination.name}</Text>
                      
                      <View style={styles.locationRow}>
                         <Ionicons name="location-outline" size={16} color="#007AFF" />
                         <Text style={styles.locationText}>{selectedDestination.location}</Text>
                      </View>

                      {selectedDestination.description && (
                        <View style={styles.detailSection}>
                          <Text style={styles.sectionTitle}>Description</Text>
                          <Text style={styles.detailDesc}>{selectedDestination.description}</Text>
                        </View>
                      )}

                      {selectedDestination.requirements?.map((req, index) => (
                        <View key={index} style={styles.listItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.listItemText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{height: 120}} />
                  </>
                }
              />

              <View style={styles.stickyFooter}>
                <View>
                  <Text style={styles.totalLabel}>Price per person</Text>
                  <Text style={styles.totalPrice}>{selectedDestination.price} </Text>
                </View>
                <TouchableOpacity 
                  style={styles.bookNowBtn} 
                  onPress={() => { 
                      const item = selectedDestination;
                      setSelectedDestination(null); 
                      navigation.navigate('Booking', { item }); 
                  }}
                >
                  <Text style={styles.bookNowText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  modalSafeContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: { flex: 1, backgroundColor: '#F8F9FA', },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHero: { height: 260, width: '100%' },
  heroContent: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 20, paddingTop: 30 },
  heroMainText: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 70 },
  searchBar: { flexDirection: 'row', backgroundColor: '#FFF', height: 50, borderRadius: 12, marginTop: 20, alignItems: 'center', paddingLeft: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  catWrapper: { marginTop: 20, paddingHorizontal: 20 },
  catHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  catHeaderTitle: { fontSize: 16, fontWeight: 'bold' },
  viewAllText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
  catGrid: { justifyContent: 'center' },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFF', borderRadius: 10, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  activeCatBtn: { backgroundColor: '#000', borderColor: '#000' },
  catBtnText: { fontSize: 12, color: '#666' },
  activeCatBtnText: { color: '#FFF', fontWeight: 'bold' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 25, marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: 'bold' },
  countText: { color: '#999', fontSize: 12 },
  mainListContent: { paddingBottom: 20 },
  flatListRow: { justifyContent: 'space-between', paddingHorizontal: 20 },
  mainCard: { backgroundColor: '#FFF', width: (width - 50) / 2, borderRadius: 15, marginBottom: 15, elevation: 2, padding: 8 },
  cardImg: { width: '100%', height: 110, borderRadius: 12 },
  badge: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  cardInfo: { paddingVertical: 8 },
  cardTitle: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardLocText: { fontSize: 10, color: '#888', marginLeft: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: '#000' },
  ratingBox: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 10, marginLeft: 2, color: '#444' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },

  // Modal Styles
  modalContent: { flex: 1, backgroundColor: '#FFF' },
  modalImg: { width: '100%', height: height * 0.4, resizeMode: 'cover' },
  closeBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFF', borderRadius: 12, padding: 8, elevation: 5 },
  detailsSheet: { padding: 24, marginTop: -30, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { backgroundColor: '#E1EFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  detailCat: { color: '#007AFF', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTextMain: { fontSize: 12, fontWeight: 'bold', color: '#FFA500' },
  detailTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 10, color: '#1A202C' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { color: '#718096', marginLeft: 5, fontSize: 14 },
  detailSection: { marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
  detailDesc: { color: '#4A5568', lineHeight: 22, fontSize: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12 },
  listItemText: { marginLeft: 10, color: '#166534', fontSize: 14 },
  stickyFooter: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 35, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#FFF' },
  totalLabel: { color: '#718096', fontSize: 12 },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  bookNowBtn: { backgroundColor: '#000', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  bookNowText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default TravelingScreen;