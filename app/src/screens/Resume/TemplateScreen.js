import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { resumeAPI } from '../../api/api';

const { width, height } = Dimensions.get("window");

const DEFAULT_GRADIENT_COLORS = ['#f9c349', '#1a1a1a'];

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
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const generateScale = useRef(new Animated.Value(1)).current;
  const previewScale = useRef(new Animated.Value(0.9)).current;
  const cardStagger = useRef([...Array(10)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    fetchTemplates();
    fetchRecommendations();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => { filterTemplates(); }, [templates, selectedCategory, searchQuery]);

  useEffect(() => {
    cardStagger.forEach((anim, i) => {
      anim.setValue(0);
      if (i < filteredTemplates.length) {
        Animated.spring(anim, { toValue: 1, friction: 6, tension: 40, delay: i * 80, useNativeDriver: true }).start();
      }
    });
  }, [filteredTemplates]);

  const getGradientColors = (colors) => {
    if (!colors || !Array.isArray(colors) || colors.length < 2) return DEFAULT_GRADIENT_COLORS;
    return colors.slice(0, 2);
  };

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await resumeAPI.getAllTemplates();
      
      if (response.data && response.data.templates && response.data.templates.length > 0) {
        setTemplates(response.data.templates);
        setFilteredTemplates(response.data.templates);
        const uniqueCategories = ['all', ...new Set(response.data.templates.map(t => t.category))];
        setCategories(uniqueCategories);
        setSelectedTemplate(response.data.templates[0].id);
      } else {
        useFallbackTemplates();
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      useFallbackTemplates();
    } finally {
      setLoadingTemplates(false);
    }
  };

  const useFallbackTemplates = () => {
    const fallback = getFallbackTemplates();
    setTemplates(fallback);
    setFilteredTemplates(fallback);
    setCategories(['all', 'modern', 'classic', 'creative', 'professional', 'minimal', 'executive', 'tech', 'academic']);
  };

  const getFallbackTemplates = () => {
    return [
      { id: 'modern_001', name: 'Modern Pro', category: 'modern', description: 'Clean modern design with bold header and professional layout', colors: ['#f9c349', '#1a1a1a'], bestFor: ['Tech', 'Creative'], industries: ['IT', 'Design'], popularity: 100 },
      { id: 'classic_001', name: 'Classic Elite', category: 'classic', description: 'Traditional layout perfect for corporate roles', colors: ['#1a1a1a', '#f9c349'], bestFor: ['Corporate', 'Finance'], industries: ['Finance', 'Legal'], popularity: 90 },
      { id: 'creative_001', name: 'Creative Edge', category: 'creative', description: 'Artistic design with decorative elements to stand out', colors: ['#f9c349', '#333333'], bestFor: ['Design', 'Media'], industries: ['Art', 'Media'], popularity: 80 },
      { id: 'professional_001', name: 'Executive Pro', category: 'professional', description: 'Two-column corporate style for executives', colors: ['#1a1a1a', '#f9c349'], bestFor: ['Executive', 'Management'], industries: ['Business', 'Consulting'], popularity: 95 },
      { id: 'minimal_001', name: 'Minimal Clean', category: 'minimal', description: 'Clean typography-focused design', colors: ['#f9c349', '#ffffff'], bestFor: ['All Industries'], industries: ['All'], popularity: 85 },
      { id: 'executive_001', name: 'Executive Suite', category: 'executive', description: 'Premium dark theme for senior leadership roles', colors: ['#1a1a1a', '#333333'], bestFor: ['C-Suite', 'Director'], industries: ['Corporate'], popularity: 75 },
      { id: 'tech_001', name: 'Tech Innovator', category: 'tech', description: 'Modern tech-focused layout with skills grid', colors: ['#f9c349', '#1a1a1a'], bestFor: ['Engineering', 'Development'], industries: ['IT', 'Software'], popularity: 88 },
      { id: 'academic_001', name: 'Academic Scholar', category: 'academic', description: 'Formal academic CV style with research focus', colors: ['#1a1a1a', '#f9c349'], bestFor: ['Research', 'Education'], industries: ['Education', 'Research'], popularity: 70 },
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
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];
    if (selectedCategory !== 'all') filtered = filtered.filter(t => t.category === selectedCategory);
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

  const handlePreviewTemplate = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
    previewScale.setValue(0.9);
    Animated.spring(previewScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
  };

  const handleGeneratePDF = async () => {
    Animated.sequence([
      Animated.timing(generateScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(generateScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template first');
      return;
    }
    
    setLoading(true);
    try {
      const response = await resumeAPI.generatePDFWithTemplate(selectedTemplate);
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      await resumeAPI.saveTemplatePreference(selectedTemplate);
      Alert.alert('Success', 'Template preference saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save template preference');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'modern': 'brush', 'classic': 'book-open-variant', 'creative': 'palette-swatch',
      'professional': 'briefcase', 'minimal': 'vector-square', 'executive': 'crown',
      'tech': 'code-tags', 'academic': 'school'
    };
    return icons[category] || 'file-document';
  };

  // Preview mock based on template category
  const renderPreviewMock = (template) => {
    if (!template) return null;
    const colors = getGradientColors(template.colors);
    const primaryColor = colors[0];
    const secondaryColor = colors[1];
    const category = template.category || 'modern';

    switch(category) {
      case 'modern':
        return (
          <View style={styles.previewMockFull}>
            <View style={[styles.modernHeader, { backgroundColor: primaryColor }]}>
              <View style={styles.modernNameMock} />
              <View style={styles.modernSubMock} />
            </View>
            <View style={styles.modernBody}>
              <View style={[styles.modernSectionTitle, { backgroundColor: primaryColor + '30' }]} />
              <View style={styles.modernLineLong} />
              <View style={styles.modernLineMedium} />
              <View style={styles.modernLineLong} />
              <View style={[styles.modernSectionTitle, { backgroundColor: primaryColor + '30', marginTop: 12 }]} />
              <View style={styles.modernLineMedium} />
              <View style={styles.modernLineShort} />
            </View>
          </View>
        );
      case 'classic':
        return (
          <View style={styles.previewMockFull}>
            <View style={styles.classicCenter}>
              <View style={[styles.classicNameMock, { backgroundColor: primaryColor }]} />
              <View style={[styles.classicLine, { backgroundColor: primaryColor }]} />
            </View>
            <View style={styles.classicBody}>
              <View style={[styles.classicSectionMock, { backgroundColor: primaryColor }]} />
              <View style={styles.classicTextLine} />
              <View style={styles.classicTextLine} />
              <View style={[styles.classicSectionMock, { backgroundColor: primaryColor, marginTop: 10 }]} />
              <View style={styles.classicTextLine} />
              <View style={styles.classicTextLineShort} />
            </View>
          </View>
        );
      case 'creative':
        return (
          <View style={styles.previewMockFull}>
            <View style={[styles.creativeBg, { backgroundColor: primaryColor }]}>
              <View style={[styles.creativeCircle, { backgroundColor: secondaryColor }]} />
              <View style={[styles.creativeCircle2, { backgroundColor: secondaryColor }]} />
              <View style={styles.creativeNameMock} />
              <View style={styles.creativeSubMock} />
            </View>
            <View style={styles.creativeBody}>
              <View style={styles.creativeDotRow}>
                <View style={[styles.creativeDot, { backgroundColor: primaryColor }]} />
                <View style={[styles.creativeDotLine, { backgroundColor: primaryColor + '30' }]} />
              </View>
              <View style={styles.creativeDotRow}>
                <View style={[styles.creativeDot, { backgroundColor: primaryColor }]} />
                <View style={[styles.creativeDotLine, { backgroundColor: primaryColor + '30' }]} />
              </View>
            </View>
          </View>
        );
      case 'professional':
        return (
          <View style={styles.previewMockFull}>
            <View style={styles.proLayout}>
              <View style={[styles.proSidebar, { backgroundColor: primaryColor + '10' }]}>
                <View style={[styles.proSidebarItem, { backgroundColor: primaryColor }]} />
                <View style={[styles.proSidebarLine, { backgroundColor: primaryColor + '30' }]} />
                <View style={[styles.proSidebarLine, { backgroundColor: primaryColor + '30' }]} />
                <View style={[styles.proSidebarItem, { backgroundColor: primaryColor, marginTop: 15 }]} />
                <View style={[styles.proSidebarLine, { backgroundColor: primaryColor + '30' }]} />
              </View>
              <View style={styles.proMain}>
                <View style={[styles.proNameMock, { backgroundColor: primaryColor }]} />
                <View style={[styles.proSectionMock, { backgroundColor: primaryColor + '30' }]} />
                <View style={styles.proLine} />
                <View style={styles.proLine} />
                <View style={[styles.proSectionMock, { backgroundColor: primaryColor + '30', marginTop: 10 }]} />
                <View style={styles.proLine} />
              </View>
            </View>
          </View>
        );
      case 'minimal':
        return (
          <View style={styles.previewMockFull}>
            <View style={styles.minimalContent}>
              <View style={[styles.minimalNameMock, { backgroundColor: primaryColor }]} />
              <View style={[styles.minimalLine, { backgroundColor: primaryColor + '40' }]} />
              <View style={styles.minimalLine} />
              <View style={styles.minimalLine} />
              <View style={[styles.minimalLine, { backgroundColor: primaryColor + '40', width: '60%', marginTop: 15 }]} />
              <View style={styles.minimalLine} />
              <View style={styles.minimalLine} />
            </View>
          </View>
        );
      case 'executive':
        return (
          <View style={styles.previewMockFull}>
            <View style={[styles.execHeader, { backgroundColor: primaryColor }]}>
              <View style={styles.execNameMock} />
              <View style={styles.execSubMock} />
            </View>
            <View style={[styles.execBar, { backgroundColor: secondaryColor }]} />
            <View style={styles.execBody}>
              <View style={[styles.execSectionMock, { backgroundColor: primaryColor }]} />
              <View style={styles.execLine} />
              <View style={styles.execLine} />
              <View style={[styles.execSectionMock, { backgroundColor: primaryColor, marginTop: 10 }]} />
              <View style={styles.execLine} />
            </View>
          </View>
        );
      case 'tech':
        return (
          <View style={styles.previewMockFull}>
            <View style={[styles.techHeader, { backgroundColor: primaryColor }]}>
              <View style={styles.techNameMock} />
              <View style={styles.techSubMock} />
            </View>
            <View style={styles.techGrid}>
              {[1,2,3,4,5,6].map(i => (
                <View key={i} style={[styles.techGridItem, { backgroundColor: primaryColor + '20', borderColor: primaryColor + '40' }]} />
              ))}
            </View>
          </View>
        );
      case 'academic':
        return (
          <View style={styles.previewMockFull}>
            <View style={styles.academicCenter}>
              <View style={[styles.academicNameMock, { backgroundColor: primaryColor }]} />
              <View style={[styles.academicLine, { backgroundColor: primaryColor }]} />
            </View>
            <View style={styles.academicBody}>
              <View style={[styles.academicSectionMock, { backgroundColor: primaryColor }]} />
              <View style={styles.academicTextLine} />
              <View style={styles.academicTextLine} />
              <View style={[styles.academicSectionMock, { backgroundColor: primaryColor, marginTop: 10 }]} />
              <View style={styles.academicTextLine} />
              <View style={styles.academicTextLine} />
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.previewMockFull}>
            <View style={[styles.modernHeader, { backgroundColor: primaryColor }]}>
              <View style={styles.modernNameMock} />
            </View>
          </View>
        );
    }
  };

  const TemplatePreviewModal = () => {
    if (!previewTemplate) return null;
    const previewColors = getGradientColors(previewTemplate.colors);
    
    return (
      <Modal visible={showPreview} animationType="fade" transparent={true} onRequestClose={() => setShowPreview(false)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setShowPreview(false)}>
          <Animated.View style={[styles.previewContainer, { transform: [{ scale: previewScale }] }]}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>{previewTemplate.name}</Text>
                <Text style={styles.previewCategory}>{(previewTemplate.category || 'General').toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.previewCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewContent}>
              <LinearGradient colors={previewColors} style={styles.previewGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {renderPreviewMock(previewTemplate)}
              </LinearGradient>
            </View>
            
            <View style={styles.previewInfo}>
              <View style={styles.previewInfoRow}>
                <Ionicons name="information-circle-outline" size={18} color="#f9c349" />
                <Text style={styles.previewInfoText}>{previewTemplate.description}</Text>
              </View>
              <View style={styles.previewTags}>
                {(previewTemplate.bestFor || []).map((tag, idx) => (
                  <View key={idx} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.previewSelectBtn}
              onPress={() => { setSelectedTemplate(previewTemplate.id); setShowPreview(false); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={DEFAULT_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.previewSelectGradient}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.previewSelectText}>Select This Template</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderTemplateCard = ({ item: template, index }) => {
    const cardAnim = cardStagger[index] || new Animated.Value(0);
    
    return (
      <Animated.View style={{
        opacity: cardAnim,
        transform: [{ 
          translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] })
        }, {
          scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
        }],
      }}>
        <TouchableOpacity
          style={[styles.templateCard, selectedTemplate === template.id && styles.selectedCard]}
          onPress={() => setSelectedTemplate(template.id)}
          activeOpacity={0.8}
        >
          {/* Mini preview thumbnail */}
          <View style={styles.miniPreview}>
            <LinearGradient colors={getGradientColors(template.colors)} style={styles.miniPreviewGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.miniMockHeader}>
                <View style={styles.miniMockDot} />
                <View style={styles.miniMockLine1} />
              </View>
              <View style={styles.miniMockLines}>
                <View style={styles.miniMockLine2} />
                <View style={styles.miniMockLine3} />
                <View style={styles.miniMockLine2} />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.templateHeader}>
            <View style={styles.templateIcon}>
              <MaterialCommunityIcons name={getCategoryIcon(template.category)} size={24} color="#f9c349" />
            </View>
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name || 'Untitled'}</Text>
              <Text style={styles.templateDescription} numberOfLines={2}>
                {template.description || 'No description available'}
              </Text>
            </View>
            {selectedTemplate === template.id && (
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark-circle" size={28} color="#f9c349" />
              </View>
            )}
          </View>
          
          <View style={styles.templateMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{(template.category || 'general').toUpperCase()}</Text>
            </View>
            <View style={styles.colorStrip}>
              {getGradientColors(template.colors).map((color, idx) => (
                <View key={idx} style={[styles.colorDot, { backgroundColor: color }]} />
              ))}
            </View>
          </View>
          
          <View style={styles.templateActions}>
            <TouchableOpacity style={styles.previewButton} onPress={() => handlePreviewTemplate(template)} activeOpacity={0.7}>
              <Ionicons name="eye-outline" size={16} color="#f9c349" />
              <Text style={styles.previewButtonText}>Preview Design</Text>
            </TouchableOpacity>
            
            <View style={styles.bestForContainer}>
              {(template.bestFor || ['General']).slice(0, 2).map((item, idx) => (
                <View key={idx} style={styles.bestForTag}>
                  <Text style={styles.bestForText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loadingTemplates) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Template</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton} activeOpacity={0.7}>
          <Feather name="filter" size={20} color="#f9c349" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Search templates..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer} contentContainerStyle={styles.categoriesContent}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryPill, selectedCategory === category && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryPillText, selectedCategory === category && styles.categoryPillTextActive]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>✨ AI Recommended for You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.map((rec, index) => (
                <TouchableOpacity key={rec.id || index} style={styles.recommendationCard} onPress={() => setSelectedTemplate(rec.id)} activeOpacity={0.7}>
                  <LinearGradient colors={DEFAULT_GRADIENT_COLORS} style={styles.recommendationIconGradient}>
                    <MaterialCommunityIcons name="star" size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.recommendationName}>{rec.name}</Text>
                  <Text style={styles.recommendationMatch}>Best Match</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.templatesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No templates found</Text>
              <TouchableOpacity style={styles.clearFilterBtn} onPress={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveTemplate} activeOpacity={0.7}>
          <Feather name="bookmark" size={18} color="#f9c349" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        
        <Animated.View style={{ flex: 0.7, transform: [{ scale: generateScale }] }}>
          <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePDF} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={DEFAULT_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.generateButtonGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>{mode === 'pdf' ? 'Generate PDF' : 'Preview'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <TemplatePreviewModal />

      <Modal visible={showFilters} animationType="fade" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <Animated.View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Templates</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.filterLabel}>Experience Level</Text>
              <View style={styles.filterOptions}>
                {['entry', 'mid', 'senior', 'executive'].map((level) => (
                  <TouchableOpacity key={level} style={styles.filterOption} onPress={() => { setSelectedCategory(level); setShowFilters(false); }}>
                    <Text style={styles.filterOptionText}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.filterLabel}>Industries</Text>
              <View style={styles.filterOptions}>
                {['Tech', 'Finance', 'Healthcare', 'Education', 'Creative', 'Corporate'].map((industry) => (
                  <TouchableOpacity key={industry} style={styles.filterOption} onPress={() => { setSearchQuery(industry); setShowFilters(false); }}>
                    <Text style={styles.filterOptionText}>{industry}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  filterButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14, backgroundColor: '#f8f8f8', borderRadius: 14, borderWidth: 2, borderColor: '#f0f0f0', gap: 10, height: 48 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  
  categoriesContainer: { maxHeight: 44, marginBottom: 12 },
  categoriesContent: { paddingHorizontal: 16, gap: 8 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8f8f8', borderWidth: 2, borderColor: '#f0f0f0' },
  categoryPillActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  categoryPillText: { fontSize: 13, color: '#999', fontWeight: '600' },
  categoryPillTextActive: { color: '#f9c349' },
  
  recommendationsSection: { marginBottom: 16, paddingHorizontal: 16 },
  recommendationsTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  recommendationCard: { width: 95, marginRight: 12, alignItems: 'center', padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0' },
  recommendationIconGradient: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  recommendationName: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  recommendationMatch: { fontSize: 10, color: '#f9c349', marginTop: 4, fontWeight: '600' },
  
  templatesList: { padding: 16, paddingBottom: 100 },
  
  templateCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: '#f0f0f0' },
  selectedCard: { borderColor: '#f9c349', backgroundColor: '#fffbf0', shadowColor: "#f9c349", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  
  // Mini Preview
  miniPreview: { height: 60, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  miniPreviewGradient: { flex: 1, padding: 10, justifyContent: 'center' },
  miniMockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  miniMockDot: { width: 14, height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  miniMockLine1: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  miniMockLines: { gap: 4 },
  miniMockLine2: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', width: '100%' },
  miniMockLine3: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', width: '60%' },
  
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  templateIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  templateDescription: { fontSize: 11, color: '#666', lineHeight: 16, fontWeight: '500' },
  checkmarkContainer: { marginLeft: 8 },
  
  templateMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  categoryBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#f9c349', letterSpacing: 0.5 },
  colorStrip: { flexDirection: 'row', gap: 6 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff' },
  
  templateActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  previewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbf0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#f9c34930' },
  previewButtonText: { fontSize: 12, color: '#f9c349', fontWeight: '700' },
  bestForContainer: { flexDirection: 'row', gap: 6 },
  bestForTag: { backgroundColor: '#f8f8f8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  bestForText: { fontSize: 10, color: '#666', fontWeight: '600' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveButton: { flex: 0.3, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: '#f0f0f0', backgroundColor: '#f8f8f8' },
  saveButtonText: { color: '#f9c349', fontSize: 14, fontWeight: '700' },
  generateButton: { borderRadius: 14, overflow: 'hidden', elevation: 8 },
  generateButtonGradient: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateButtonText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  
  // Preview Modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewContainer: { backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  previewCategory: { fontSize: 11, color: '#f9c349', fontWeight: '600', marginTop: 2 },
  previewCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  previewContent: { padding: 16 },
  previewGradient: { borderRadius: 16, padding: 2 },
  previewMockFull: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', minHeight: 200 },
  
  // Modern mock
  modernHeader: { padding: 20, paddingBottom: 15 },
  modernNameMock: { width: '50%', height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 6 },
  modernSubMock: { width: '35%', height: 8, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  modernBody: { padding: 16 },
  modernSectionTitle: { width: '40%', height: 10, borderRadius: 3, marginBottom: 10 },
  modernLineLong: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 6, width: '100%' },
  modernLineMedium: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 6, width: '75%' },
  modernLineShort: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', width: '50%' },
  
  // Classic mock
  classicCenter: { alignItems: 'center', padding: 20, paddingBottom: 10 },
  classicNameMock: { width: '45%', height: 14, borderRadius: 4, marginBottom: 10 },
  classicLine: { width: '30%', height: 2, borderRadius: 1 },
  classicBody: { padding: 16, paddingTop: 8 },
  classicSectionMock: { width: '35%', height: 10, borderRadius: 3, marginBottom: 10 },
  classicTextLine: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 6, width: '90%' },
  classicTextLineShort: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', width: '60%' },
  
  // Creative mock
  creativeBg: { padding: 20, position: 'relative', overflow: 'hidden' },
  creativeCircle: { position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: 25, opacity: 0.3 },
  creativeCircle2: { position: 'absolute', bottom: -5, left: 15, width: 30, height: 30, borderRadius: 15, opacity: 0.3 },
  creativeNameMock: { width: '50%', height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 6 },
  creativeSubMock: { width: '35%', height: 8, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  creativeBody: { padding: 16, gap: 10 },
  creativeDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creativeDot: { width: 10, height: 10, borderRadius: 5 },
  creativeDotLine: { flex: 1, height: 6, borderRadius: 3 },
  
  // Professional mock
  proLayout: { flexDirection: 'row', flex: 1, minHeight: 200 },
  proSidebar: { width: '30%', padding: 10, gap: 8 },
  proSidebarItem: { height: 10, borderRadius: 3, width: '80%' },
  proSidebarLine: { height: 5, borderRadius: 2, width: '70%' },
  proMain: { flex: 1, padding: 10, gap: 8 },
  proNameMock: { height: 16, borderRadius: 4, width: '60%', marginBottom: 4 },
  proSectionMock: { height: 10, borderRadius: 3, width: '40%' },
  proLine: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', width: '85%' },
  
  // Minimal mock
  minimalContent: { padding: 20, gap: 6 },
  minimalNameMock: { width: '45%', height: 16, borderRadius: 4, marginBottom: 8 },
  minimalLine: { height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', width: '80%' },
  
  // Executive mock
  execHeader: { padding: 18 },
  execNameMock: { width: '50%', height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 4 },
  execSubMock: { width: '35%', height: 8, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  execBar: { height: 8 },
  execBody: { padding: 16 },
  execSectionMock: { width: '35%', height: 10, borderRadius: 3, marginBottom: 10 },
  execLine: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 6, width: '85%' },
  
  // Tech mock
  techHeader: { padding: 16 },
  techNameMock: { width: '45%', height: 12, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 4 },
  techSubMock: { width: '60%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 6 },
  techGridItem: { width: '30%', height: 28, borderRadius: 6, borderWidth: 1 },
  
  // Academic mock
  academicCenter: { alignItems: 'center', padding: 18 },
  academicNameMock: { width: '50%', height: 14, borderRadius: 4, marginBottom: 10 },
  academicLine: { width: '35%', height: 2, borderRadius: 1 },
  academicBody: { padding: 16, paddingTop: 4 },
  academicSectionMock: { width: '40%', height: 10, borderRadius: 3, marginBottom: 10 },
  academicTextLine: { height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 6, width: '90%' },
  
  previewInfo: { padding: 20 },
  previewInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  previewInfoText: { flex: 1, fontSize: 13, color: '#666', fontWeight: '500', lineHeight: 19 },
  previewTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  previewTag: { backgroundColor: '#f8f8f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  previewTagText: { fontSize: 11, color: '#1a1a1a', fontWeight: '600' },
  previewSelectBtn: { margin: 20, borderRadius: 14, overflow: 'hidden', elevation: 8 },
  previewSelectGradient: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewSelectText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  filterLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 16, marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterOption: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8f8f8', borderRadius: 12, borderWidth: 2, borderColor: '#f0f0f0' },
  filterOptionText: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 12, fontWeight: '500' },
  clearFilterBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1a1a1a', borderRadius: 12 },
  clearFilterText: { color: '#f9c349', fontSize: 14, fontWeight: '700' },
});

export default TemplateSelection;