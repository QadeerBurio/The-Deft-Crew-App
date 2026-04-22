import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';

const { width } = Dimensions.get('window');

const CareerHub = ({ navigation }) => {
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviewData = async () => {
      try {
        const jobRes = await axios.get("https://the-deft-crew-production.up.railway.app/api/admin/jobs/public");
        // Only taking the top 3 for a clean vertical look
        setRecentJobs(jobRes.data.slice(0, 3)); 
      } catch (err) {
        console.log("Error fetching preview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreviewData();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 1. Minimalist Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to TDC</Text>
          <Text style={styles.mainTitle}>Career Hub</Text>
        </View>

        {/* 2. Main Navigation Grid */}
        <View style={styles.navGrid}>
          <TouchableOpacity 
            style={[styles.bigCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }]} 
            onPress={() => navigation.navigate('Career')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#1e3a8a' }]}>
              <MaterialCommunityIcons name="briefcase-search" size={24} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Find Jobs</Text>
            <Text style={styles.cardSub}>Browse 50+ Roles</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bigCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }]} 
            onPress={() => navigation.navigate('Exchange')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#000' }]}>
              <FontAwesome5 name="globe-americas" size={20} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Study Abroad</Text>
            <Text style={styles.cardSub}>Global Study Program</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Featured Exchange (High-Impact Banner) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Program</Text>
        </View>
        <TouchableOpacity style={styles.featuredBanner} onPress={() => navigation.navigate('Exchange')}>
          <View style={styles.bannerContent}>
            <View style={styles.tag}><Text style={styles.tagText}>GLOBAL</Text></View>
            <Text style={styles.bannerTitle}>Erasmus</Text>
            <Text style={styles.bannerSub}>Study in Europe with full scholarship.</Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={32} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* 4. Recent 3 Opportunities (Vertical List) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Opportunities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Career')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1e3a8a" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.recentList}>
            {recentJobs.map((job, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.recentJobCard}
                onPress={() => navigation.navigate('Career')}
              >
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitleText}>{job.title}</Text>
                  <Text style={styles.jobMetaText}>{job.department} • {job.location}</Text>
                </View>
                <View style={styles.jobAction}>
                  <Text style={styles.salaryText}>{job.salary || "Competitive"}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#1e3a8a" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingBottom:50 },
  header: { marginTop: 25, marginBottom: 50 },
  welcomeText: { fontSize: 14, color: '#000000', fontWeight: '600', letterSpacing: 0.5 },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A' },

  navGrid: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  bigCard: { flex: 1, borderRadius: 24, padding: 20, justifyContent: 'space-between' },
  iconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  seeAll: { color: '#000000', fontWeight: '700', fontSize: 14 },

  featuredBanner: { 
    backgroundColor: '#000000', 
    borderRadius: 24, 
    padding: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 30,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8
  },
  bannerContent: { flex: 1 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  tagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  bannerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  recentList: { gap: 12, paddingBottom:40 },
  recentJobCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1
  },
  jobInfo: { flex: 1 },
  jobTitleText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  jobMetaText: { fontSize: 13, color: '#94A3B8', marginTop: 3 },
  jobAction: { alignItems: 'flex-end' },
  salaryText: { fontSize: 12, fontWeight: '700', color: '#000000', marginBottom: 5 }
});

export default CareerHub;