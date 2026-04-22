import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, 
  StatusBar, Modal, Dimensions, Alert, Platform, ToastAndroid, 
  ScrollView, ActivityIndicator, RefreshControl, TouchableWithoutFeedback, 
  Keyboard, Share, Linking 
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';

const { height } = Dimensions.get('window');

const API_URL = "https://the-deft-crew-production.up.railway.app/api/admin/jobs/public"; 

const Career = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    setError(false);
    try {
      const response = await axios.get(API_URL, { timeout: 10000 });
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(true);
      setJobs([]); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const filteredData = jobs.filter(job => 
    job.title?.toLowerCase().includes(search.toLowerCase()) ||
    job.department?.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = async (email) => {
    if(!email) return;
    await Clipboard.setStringAsync(email);
    if (Platform.OS === 'android') {
      ToastAndroid.show("HR Email Copied!", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", "HR Email address copied to clipboard.");
    }
  };

  const handleApply = (email, title) => {
    const subject = `Application for ${title}`;
    const body = `Hi TDC Team,\n\nI am interested in applying for the ${title} position. Please find my resume attached.\n\nSent from TDC App`;
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareJob = async (job) => {
    try {
      await Share.share({
        message: `Join the Crew! 🚀\nPosition: ${job.title}\nDepartment: ${job.department}\nApply at: ${job.email}`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const renderJobCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => { 
        Keyboard.dismiss();
        setSelectedJob(item); 
        setModalVisible(true); 
      }}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.departmentText}>{item.department}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-sharp" size={14} color="#64748B" />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>{item.salary || "Competitive"}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsLabel}>View Details</Text>
        <Ionicons name="arrow-forward-circle" size={24} color="#000000" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>TDC Careers</Text>
          <Text style={styles.headerSub}>Join The Deft Crew</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerSection}>
          <ActivityIndicator size="large" color="#08634f" />
        </View>
      ) : error ? (
        <View style={styles.centerSection}>
          <MaterialCommunityIcons name="wifi-off" size={50} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchJobs}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderJobCard}
          keyExtractor={item => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#000000"]} />}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={70} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>No opportunities found</Text>
            </View>
          }
        />
      )}

      {/* Job Details Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.blurContainer}>
               <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            </View>
          </TouchableWithoutFeedback>
          
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIconBg}>
                  <MaterialCommunityIcons name="rocket-launch" size={32} color="#FFF" />
                </View>
                <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
                <Text style={styles.modalJobMeta}>{selectedJob?.department} • {selectedJob?.location}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionHeading}>About the Role</Text>
                <Text style={styles.descriptionText}>{selectedJob?.description}</Text>
              </View>

              {selectedJob?.requirements?.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionHeading}>Requirements</Text>
                  {selectedJob.requirements.map((req, i) => (
                    <View key={i} style={styles.reqRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#000000" />
                      <Text style={styles.reqText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Apply & Copy Section */}
              <View style={styles.applySection}>
                <Text style={styles.sectionHeading}>Apply Now</Text>
                
                <TouchableOpacity 
                  style={styles.mainApplyBtn} 
                  onPress={() => handleApply(selectedJob?.email, selectedJob?.title)}
                >
                  <Text style={styles.mainApplyBtnText}>Send Application</Text>
                  <Ionicons name="paper-plane" size={18} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.copyEmailBtn} onPress={() => copyToClipboard(selectedJob?.email)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.copyLabel}>OR COPY HR EMAIL</Text>
                    <Text style={styles.emailText} numberOfLines={1}>{selectedJob?.email || 'hr@thedeftcrew.com'}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={20} color="#000000" />
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => shareJob(selectedJob)}>
                    <Ionicons name="share-social-outline" size={20} color="#0F172A" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  searchWrapper: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1E293B' },
  listContainer: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, borderLeftWidth: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  jobTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  departmentText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  typeBadge: { backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, color: '#000000', fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
  viewDetailsLabel: { fontSize: 13, fontWeight: '700', color: '#000000' },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorTitle: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#64748B' },
  retryBtn: { marginTop: 20, backgroundColor: '#000000', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyView: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 15 },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  blurContainer: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: height * 0.85, paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  modalScrollContent: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 30 },
  modalDragHandle: { width: 45, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginVertical: 15 },
  modalHeader: { alignItems: 'center', marginBottom: 25 },
  modalIconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalJobTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  modalJobMeta: { fontSize: 14, color: '#64748B', fontWeight: '600', marginTop: 5 },
  modalSection: { marginBottom: 25 },
  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  descriptionText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  reqRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  reqText: { fontSize: 15, color: '#475569', flex: 1, lineHeight: 20 },
  applySection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  mainApplyBtn: { backgroundColor: '#000000', height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12, elevation: 2 },
  mainApplyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  copyEmailBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  copyLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 2 },
  emailText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  shareBtnText: { fontWeight: '700', color: '#0F172A' },
  closeBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontWeight: '700', color: '#64748B' },
});

export default Career;