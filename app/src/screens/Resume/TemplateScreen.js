import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
 
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { resumeAPI } from '../../api/api';

const TemplateSelection = ({ navigation, route }) => {
  const { resumeData, mode = 'pdf' } = route.params || {};
  const [selectedTemplate, setSelectedTemplate] = useState('modern_001');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      setError(null);
      const response = await resumeAPI.getAllTemplates();
      
      if (response.data && response.data.templates) {
        setTemplates(response.data.templates);
        setFilteredTemplates(response.data.templates);
        
        // Extract unique categories
        const uniqueCategories = ['all', ...new Set(response.data.templates.map(t => t.category))];
        setCategories(uniqueCategories);
        
        // Set first template as selected if available
        if (response.data.templates.length > 0) {
          setSelectedTemplate(response.data.templates[0].id);
        }
      } else {
        // Fallback templates if API fails
        setTemplates(getFallbackTemplates());
        setFilteredTemplates(getFallbackTemplates());
        setCategories(['all', 'modern', 'classic', 'creative', 'professional', 'minimal']);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Use fallback templates
      const fallbackTemplates = getFallbackTemplates();
      setTemplates(fallbackTemplates);
      setFilteredTemplates(fallbackTemplates);
      setCategories(['all', 'modern', 'classic', 'creative', 'professional', 'minimal']);
      Alert.alert('Notice', 'Using default templates. Some features may be limited.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const getFallbackTemplates = () => {
    return [
      { id: 'modern_001', name: 'Modern', category: 'modern', description: 'Clean modern design', colors: ['#4f46e5'], bestFor: ['Tech', 'Creative'], industries: ['IT', 'Design'] },
      { id: 'classic_001', name: 'Classic', category: 'classic', description: 'Traditional layout', colors: ['#1e293b'], bestFor: ['Corporate'], industries: ['Finance'] },
      { id: 'creative_001', name: 'Creative', category: 'creative', description: 'Artistic design', colors: ['#ec4899'], bestFor: ['Creative'], industries: ['Art'] },
      { id: 'professional_001', name: 'Professional', category: 'professional', description: 'Corporate style', colors: ['#1e3a8a'], bestFor: ['Executive'], industries: ['Business'] },
      { id: 'minimal_001', name: 'Minimal', category: 'minimal', description: 'Clean and simple', colors: ['#64748b'], bestFor: ['All'], industries: ['All'] },
    ];
  };

  const fetchRecommendations = async () => {
    try {
      const response = await resumeAPI.getTemplateRecommendations();
      if (response.data && response.data.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Don't show alert for recommendations, it's not critical
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.name && t.name.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.industries && t.industries.some(i => i && i.toLowerCase().includes(query)))
      );
    }
    
    setFilteredTemplates(filtered);
  };

  const handleGeneratePDF = async () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template first');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Generating PDF with template:', selectedTemplate);
      
      const response = await resumeAPI.generatePDFWithTemplate(selectedTemplate);
      
      console.log('PDF generation response:', response.data);
      
      if (response.data && response.data.pdfUrl) {
        navigation.navigate('PDFViewer', { 
          pdfUrl: response.data.pdfUrl,
          filename: response.data.filename || `resume_${Date.now()}.pdf`,
          resumeData: resumeData 
        });
      } else {
        throw new Error('No PDF URL received');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      
      let errorMessage = 'Failed to generate PDF. Please try again.';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      await resumeAPI.saveTemplatePreference(selectedTemplate);
      Alert.alert('Success', 'Template preference saved');
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template preference');
    }
  };

  const renderTemplateCard = ({ item: template }) => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.templateCard,
        selectedTemplate === template.id && styles.selectedCard
      ]}
      onPress={() => setSelectedTemplate(template.id)}
    >
      <View style={styles.templateHeader}>
        <View style={[styles.templateIcon, { backgroundColor: (template.colors && template.colors[0]) ? template.colors[0] + '15' : '#4f46e515' }]}>
          <MaterialCommunityIcons 
            name={getCategoryIcon(template.category)} 
            size={28} 
            color={(template.colors && template.colors[0]) || '#4f46e5'} 
          />
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name || 'Untitled'}</Text>
          <Text style={styles.templateDescription} numberOfLines={2}>
            {template.description || 'No description available'}
          </Text>
        </View>
        {selectedTemplate === template.id && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color="#4f46e5" />
          </View>
        )}
      </View>
      
      <View style={styles.templateMeta}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{(template.category || 'general').toUpperCase()}</Text>
        </View>
        <View style={styles.colorStrip}>
          {(template.colors || ['#4f46e5']).slice(0, 3).map((color, idx) => (
            <View key={idx} style={[styles.colorDot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
      
      <View style={styles.bestForContainer}>
        {(template.bestFor || ['General']).slice(0, 2).map((item, idx) => (
          <View key={idx} style={styles.bestForTag}>
            <Text style={styles.bestForText}>{item}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const getCategoryIcon = (category) => {
    const icons = {
      'modern': 'brush',
      'classic': 'book',
      'creative': 'palette',
      'professional': 'briefcase',
      'minimal': 'shape',
      'executive': 'crown',
      'tech': 'code-tags',
      'academic': 'school'
    };
    return icons[category] || 'file-document';
  };

  if (loadingTemplates) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Template</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Feather name="filter" size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              selectedCategory === category && styles.categoryPillActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryPillText,
              selectedCategory === category && styles.categoryPillTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>Recommended for You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendations.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recommendationCard}
                onPress={() => setSelectedTemplate(rec.id)}
              >
                <View style={[styles.recommendationIcon, { backgroundColor: (rec.colors && rec.colors[0]) ? rec.colors[0] + '15' : '#4f46e515' }]}>
                  <MaterialCommunityIcons name="star" size={20} color={(rec.colors && rec.colors[0]) || '#4f46e5'} />
                </View>
                <Text style={styles.recommendationName}>{rec.name}</Text>
                <Text style={styles.recommendationMatch}>AI Recommended</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Templates Grid */}
      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.templatesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-search" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No templates found</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchTemplates}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Generate Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveTemplate}
        >
          <Feather name="bookmark" size={18} color="#4f46e5" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGeneratePDF}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>
                {mode === 'pdf' ? 'Generate PDF' : 'Preview'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Templates</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <Text style={styles.filterLabel}>Experience Level</Text>
              <View style={styles.filterOptions}>
                {['entry', 'mid', 'senior', 'executive'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedCategory(level);
                      setShowFilters(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.filterLabel}>Industries</Text>
              <View style={styles.filterOptions}>
                {['Tech', 'Finance', 'Healthcare', 'Education', 'Creative', 'Corporate'].map((industry) => (
                  <TouchableOpacity
                    key={industry}
                    style={styles.filterOption}
                    onPress={() => {
                      setSearchQuery(industry);
                      setShowFilters(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{industry}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfdfe' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  filterButton: { padding: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  categoriesContainer: { maxHeight: 44, marginBottom: 16 },
  categoriesContent: { paddingHorizontal: 20, gap: 8 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  categoryPillActive: { backgroundColor: '#4f46e5' },
  categoryPillText: { fontSize: 13, color: '#64748b' },
  categoryPillTextActive: { color: '#fff' },
  recommendationsSection: { marginBottom: 20, paddingHorizontal: 20 },
  recommendationsTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  recommendationCard: { width: 100, marginRight: 12, alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  recommendationIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  recommendationName: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  recommendationMatch: { fontSize: 10, color: '#4f46e5', marginTop: 4 },
  templatesList: { padding: 20, paddingBottom: 100 },
  templateCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  selectedCard: { borderColor: '#4f46e5', backgroundColor: '#f5f3ff' },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  templateIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  templateDescription: { fontSize: 12, color: '#64748b', lineHeight: 16 },
  checkmark: { marginLeft: 8 },
  templateMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  categoryBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  colorStrip: { flexDirection: 'row', gap: 6 },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  bestForContainer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  bestForTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bestForText: { fontSize: 10, color: '#64748b' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saveButton: { flex: 0.3, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#4f46e5', backgroundColor: '#fff' },
  saveButtonText: { color: '#4f46e5', fontSize: 14, fontWeight: '600' },
  generateButton: { flex: 0.7, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4f46e5' },
  generateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 16, marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterOption: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  filterOptionText: { fontSize: 13, color: '#475569' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 12 },
  retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#4f46e5', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default TemplateSelection;