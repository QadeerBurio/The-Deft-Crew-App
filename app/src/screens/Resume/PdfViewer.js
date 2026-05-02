import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get("window");

const PDFViewer = ({ navigation, route }) => {
  const { pdfUrl, filename, resumeData } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useWebView, setUseWebView] = useState(true);
  const [localFileUri, setLocalFileUri] = useState(null);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(60)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pdfUrl) {
      setError('No PDF URL provided');
      setLoading(false);
      return;
    }
    
    console.log('Loading PDF from URL:', pdfUrl);
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(footerSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Simulate loading progress
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    checkUrlAccessibility();
  }, [pdfUrl]);

  const checkUrlAccessibility = async () => {
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      if (response.ok) {
        setUseWebView(true);
      } else {
        throw new Error('PDF not accessible');
      }
    } catch (error) {
      console.log('PDF URL not directly accessible, will use download method');
      setUseWebView(false);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setLoading(true);
      const downloadPath = `${FileSystem.documentDirectory}${filename || 'resume.pdf'}`;
      
      console.log('Downloading PDF from:', pdfUrl);
      console.log('Saving to:', downloadPath);
      
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, downloadPath);
      
      if (downloadResult.status === 200) {
        setLocalFileUri(downloadResult.uri);
        return downloadResult.uri;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  const handleViewPDF = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    try {
      const localUri = await downloadPDF();
      
      if (Platform.OS === 'android') {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF with'
        });
      } else {
        await Linking.openURL(localUri);
      }
    } catch (error) {
      console.error('View error:', error);
      Alert.alert('Error', 'Failed to open PDF. Please try downloading instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      setLoading(true);
      const localUri = await downloadPDF();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Resume',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      setLoading(true);
      const localUri = await downloadPDF();
      
      Alert.alert(
        'Success', 
        'PDF downloaded successfully!',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open', onPress: () => Sharing.shareAsync(localUri) }
        ]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    checkUrlAccessibility();
  };

  const handleEdit = () => {
    navigation.navigate('ResumeBuilder', { resumeData });
  };

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingIconContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#f9c349', '#1a1a1a']}
              style={styles.loadingIconGradient}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={50} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.loadingTitle}>Loading Resume</Text>
          <Text style={styles.loadingSubtitle}>Preparing your professional document...</Text>
          
          <View style={styles.loadingProgressContainer}>
            <Animated.View 
              style={[styles.loadingProgressBar, { width: progressWidthInterpolated }]}
            >
              <LinearGradient
                colors={['#f9c349', '#1a1a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
          
          <ActivityIndicator size="small" color="#f9c349" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
          <View style={styles.errorIconCircle}>
            <MaterialCommunityIcons name="file-pdf-box" size={60} color="#f9c349" />
          </View>
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <View style={styles.errorButtonRow}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
              <LinearGradient
                colors={['#f9c349', '#1a1a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryButtonGradient}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.downloadErrorButton} onPress={handleDownload} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={18} color="#1a1a1a" />
              <Text style={styles.downloadErrorText}>Download</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.backErrorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backErrorText}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="file-pdf-box" size={22} color="#f9c349" />
          <Text style={styles.headerTitle}>Resume Preview</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color="#f9c349" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownload} style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={22} color="#f9c349" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      {useWebView ? (
        <Animated.View style={[styles.webviewContainer, { opacity: fadeAnim }]}>
          <WebView
            source={{ uri: pdfUrl }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setUseWebView(false);
              setError('WebView cannot display this PDF. Please download it instead.');
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            mixedContentMode="always"
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color="#f9c349" />
              </View>
            )}
          />
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.downloadPromptContainer}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }], alignItems: 'center' }}>
            <View style={styles.downloadIconCircle}>
              <LinearGradient
                colors={['#f9c349', '#1a1a1a']}
                style={styles.downloadIconGradient}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={60} color="#fff" />
              </LinearGradient>
            </View>
            
            <Text style={styles.downloadPromptTitle}>PDF Ready</Text>
            <Text style={styles.downloadPromptText}>
              Your professional resume has been generated successfully. Choose an option below to view or share it.
            </Text>
            
            <View style={styles.pdfInfoCard}>
              <View style={styles.pdfInfoRow}>
                <Ionicons name="document-text-outline" size={18} color="#f9c349" />
                <Text style={styles.pdfInfoLabel}>Filename</Text>
                <Text style={styles.pdfInfoValue}>{filename || 'resume.pdf'}</Text>
              </View>
              <View style={styles.pdfInfoDivider} />
              <View style={styles.pdfInfoRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#f9c349" />
                <Text style={styles.pdfInfoLabel}>Status</Text>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>Ready</Text>
                </View>
              </View>
            </View>
            
            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', alignItems: 'center' }}>
              <TouchableOpacity style={styles.viewButton} onPress={handleViewPDF} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#f9c349', '#1a1a1a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewButtonGradient}
                >
                  <Ionicons name="eye-outline" size={22} color="#fff" />
                  <Text style={styles.viewButtonText}>View PDF</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.downloadBigButton} onPress={handleDownload} activeOpacity={0.7}>
                <Ionicons name="download-outline" size={22} color="#f9c349" />
                <Text style={styles.downloadBigButtonText}>Download PDF</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      )}

      {/* Footer */}
      <Animated.View style={[styles.footer, { transform: [{ translateY: footerSlide }] }]}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.7}>
          <View style={styles.editIconCircle}>
            <Ionicons name="create-outline" size={18} color="#f9c349" />
          </View>
          <Text style={styles.editButtonText}>Edit Resume</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.replace('Dashboard')} activeOpacity={0.8}>
          <LinearGradient
            colors={['#f9c349', '#1a1a1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.homeButtonGradient}
          >
            <Ionicons name="home-outline" size={20} color="#fff" />
            <Text style={styles.homeButtonText}>Dashboard</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  
  // Loading Screen
  loadingContainer: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#ffffff',
    padding: 30,
  },
  loadingIconContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    marginBottom: 25,
  },
  loadingIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 30,
  },
  loadingProgressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  headerActions: { 
    flexDirection: 'row', 
    gap: 4 
  },
  headerButton: { 
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // WebView
  webviewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: { 
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  
  // Download Prompt
  downloadPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
  },
  downloadIconCircle: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    marginBottom: 25,
  },
  downloadIconGradient: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadPromptTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  downloadPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  
  // PDF Info Card
  pdfInfoCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  pdfInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  pdfInfoLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    width: 70,
  },
  pdfInfoValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
  },
  pdfInfoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  readyBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  readyBadgeText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '700',
  },
  
  // View Button
  viewButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginBottom: 12,
    width: '100%',
  },
  viewButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Download Big Button
  downloadBigButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    width: '100%',
  },
  downloadBigButtonText: {
    color: '#f9c349',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Footer
  footer: { 
    flexDirection: 'row', 
    padding: 16,
    paddingHorizontal: 20,
    gap: 12, 
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButton: { 
    flex: 1, 
    flexDirection: 'row', 
    paddingVertical: 14, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    borderWidth: 2, 
    borderColor: '#f0f0f0', 
    backgroundColor: '#f8f8f8',
  },
  editIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: { 
    color: '#1a1a1a', 
    fontSize: 14, 
    fontWeight: '700',
  },
  homeButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  homeButtonGradient: { 
    flexDirection: 'row', 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
  },
  homeButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Error Screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '500',
  },
  errorButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  downloadErrorButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    backgroundColor: '#f8f8f8',
  },
  downloadErrorText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
  },
  backErrorButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backErrorText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PDFViewer;