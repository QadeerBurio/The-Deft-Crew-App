import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext'; 
import api from "../api/api";

const ExchangeScreen = ({ navigation }) => {
  const { token, isGuest, logout } = useContext(AuthContext);
  
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState('Bachelors');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Details Modal State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const degrees = ['Bachelors', 'Masters', 'PhD'];

  const getDegreeStyle = (degree) => {
    switch (degree) {
      case 'Masters': return { color: '#C0392B' };
      case 'PhD': return { color: '#D4AF37' };
      default: return { color: '#1B1B1B' }; 
    }
  };

  // FIX: Show guest alert for actions
  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and explore study abroad opportunities!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Sign Up', 
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  const fetchPrograms = async () => {
    try {
      // FIX: Guest users can see programs too
      const response = await api.get('/admin/exchange/all');
      const activePrograms = response.data.filter(p => p.active === true);
      setPrograms(activePrograms);
    } catch (err) {
      // FIX: Don't logout guest users
      if (err.response?.status === 401 && !isGuest) {
        Alert.alert("Session Expired", "Please login again to continue.");
        logout();
      } else if (!isGuest) {
        console.log('Error fetching programs:', err.message);
      }
      // Guest users just see empty list on error
      setPrograms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // FIX: Fetch programs even for guest users
  useEffect(() => { 
    fetchPrograms(); 
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrograms();
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const matchesDegree = p.degree === selectedDegree;
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        p.title.toLowerCase().includes(query) ||
        p.university.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query);
      return matchesDegree && matchesSearch;
    });
  }, [selectedDegree, searchQuery, programs]);

  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setDetailsVisible(true);
  };

  // FIX: Handle Apply Now for guest users
  const handleApplyNow = (program) => {
    if (isGuest) {
      showGuestAlert('apply for programs');
      return;
    }
    navigation.navigate('ApplicationForm', { program });
  };

  // FIX: Handle Profile for guest users
  const handleProfile = () => {
    if (isGuest) {
      showGuestAlert('view profile');
      return;
    }
    navigation.navigate('Profile');
  };

  const renderItem = ({ item }) => {
    const { color } = getDegreeStyle(item.degree);

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: color }]} />
        
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.titleArea}>
              <Text style={styles.programTitle}>{item.title}</Text>
              <Text style={styles.universityName}>{item.university}</Text>
              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" size={10} color="#7F8C8D" />
                <Text style={styles.locationText}>{item.location}</Text>
                <View style={styles.dotSeparator} />
                <FontAwesome5 name="clock" size={10} color="#7F8C8D" />
                <Text style={styles.locationText}>{item.duration}</Text>
              </View>
            </View>
            <View style={[styles.degreeBadge, { borderColor: color }]}>
              <Text style={[styles.degreeText, { color: color }]}>{item.degree}</Text>
            </View>
          </View>

          <View style={styles.dateContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>APP OPENS</Text>
              <Text style={styles.dateValue}>{item.appStart}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>DEADLINE</Text>
              <Text style={[styles.dateValue, { color: '#E35B5B' }]}>{item.deadline}</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
                style={[styles.detailsBtn]} 
                onPress={() => handleViewDetails(item)}
            >
                <Text style={styles.detailsBtnText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: color, flex: 1.5 }]} 
                onPress={() => handleApplyNow(item)}
            >
                <Text style={styles.applyButtonText}>
                  {isGuest ? 'Sign Up' : 'Apply Now'}
                </Text>
                <FontAwesome5 name="arrow-right" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>International Hub</Text>
            <Text style={styles.headerTitle}>Study Abroad</Text>
          </View>
          <TouchableOpacity style={styles.avatarCircle} onPress={handleProfile}>
             <FontAwesome5 name="user-graduate" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <FontAwesome5 name="search" size={16} color="#9DA8B7" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search university or country..."
            placeholderTextColor="#9DA8B7"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* FIX: Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <FontAwesome5 name="info-circle" size={16} color="#1a1a1a" />
          <Text style={styles.guestBannerText}>
            Browsing as guest. Sign in to apply for programs!
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.filterWrapper}>
          <Text style={styles.filterLabel}>Degree Levels</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {degrees.map((degree) => (
              <TouchableOpacity 
                key={degree}
                onPress={() => setSelectedDegree(degree)}
                style={[styles.chip, selectedDegree === degree && styles.activeChip]}>
                <Text style={[styles.chipText, selectedDegree === degree && styles.activeChipText]}>{degree}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredPrograms}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="search-location" size={50} color="#DCE1E8" />
                <Text style={styles.emptyText}>No programs found.</Text>
                {isGuest && (
                  <TouchableOpacity 
                    style={styles.signUpButton}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text style={styles.signUpButtonText}>Sign Up to Explore More</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsVisible}
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Program Details</Text>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                    <FontAwesome5 name="times" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailHeading}>University Website</Text>
                <TouchableOpacity 
                    onPress={() => selectedProgram?.link && Linking.openURL(selectedProgram.link)}
                    style={styles.linkContainer}
                >
                    <Text style={styles.linkText}>{selectedProgram?.link || 'No link provided'}</Text>
                    <FontAwesome5 name="external-link-alt" size={12} color="#2563EB" />
                </TouchableOpacity>

                <Text style={[styles.detailHeading, { marginTop: 20 }]}>Requirements</Text>
                {selectedProgram?.requirements && selectedProgram.requirements.length > 0 ? (
                    selectedProgram.requirements.map((req, index) => (
                        <View key={index} style={styles.reqItem}>
                            <FontAwesome5 name="check-circle" size={14} color="#10B981" />
                            <Text style={styles.reqText}>{req}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyTextSmall}>No specific requirements listed.</Text>
                )}
            </ScrollView>

            {/* FIX: Apply button in modal for guests */}
            <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => {
                  setDetailsVisible(false);
                  if (selectedProgram) {
                    handleApplyNow(selectedProgram);
                  }
                }}
            >
                <Text style={styles.closeModalBtnText}>
                  {isGuest ? 'Sign Up to Apply' : 'Apply Now'}
                </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  // FIX: Guest banner style
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9c34930',
    gap: 8
  },
  guestBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '500'
  },
  header: { backgroundColor: '#000000', paddingHorizontal: 25, paddingTop: 50, paddingBottom: 25, borderBottomLeftRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#C5CAE9', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchBarContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 10, alignItems: 'center' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1C1E' },
  content: { flex: 1, paddingHorizontal: 20 },
  filterWrapper: { marginTop: 25, marginBottom: 15 },
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#9DA8B7', marginBottom: 12, textTransform: 'uppercase' },
  chip: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWeight: 1, borderColor: '#DCE1E8' },
  activeChip: { backgroundColor: '#000000', borderColor: '#000' },
  chipText: { color: '#546E7A', fontWeight: '700', fontSize: 13 },
  activeChipText: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, overflow: 'hidden' },
  cardAccent: { height: 4, width: '100%' },
  cardBody: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  titleArea: { flex: 1 },
  programTitle: { fontSize: 17, fontWeight: '800', color: '#1A1C1E' },
  universityName: { fontSize: 14, color: '#687684', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: { fontSize: 12, color: '#7F8C8D', marginLeft: 5 },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#BDC3C7', marginHorizontal: 8 },
  degreeBadge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, height: 25 },
  degreeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  dateContainer: { flexDirection: 'row', backgroundColor: '#F8FAFB', borderRadius: 16, padding: 15, marginVertical: 15 },
  dateBox: { flex: 1, alignItems: 'center' },
  dateDivider: { width: 1, height: 25, backgroundColor: '#DCE1E8' },
  dateLabel: { fontSize: 9, fontWeight: '900', color: '#9DA8B7', marginBottom: 4 },
  dateValue: { fontSize: 13, fontWeight: '700', color: '#2D3436' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  detailsBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#F1F3F5', alignItems: 'center', justifyContent: 'center' },
  detailsBtnText: { color: '#495057', fontWeight: '700', fontSize: 14 },
  applyButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 16 },
  applyButtonText: { color: '#FFF', fontWeight: '800', marginRight: 10, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#9DA8B7', fontSize: 14 },
  // FIX: Sign up button for empty state
  signUpButton: {
    marginTop: 20,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  signUpButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  detailHeading: { fontSize: 12, fontWeight: '900', color: '#9DA8B7', textTransform: 'uppercase', letterSpacing: 1 },
  linkContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  linkText: { color: '#2563EB', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  reqItem: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  reqText: { fontSize: 15, color: '#2D3436', fontWeight: '500' },
  emptyTextSmall: { fontSize: 14, color: '#9DA8B7', marginTop: 10 },
  closeModalBtn: { backgroundColor: '#000', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  closeModalBtnText: { color: '#FFF', fontWeight: '800' }
});

export default ExchangeScreen;