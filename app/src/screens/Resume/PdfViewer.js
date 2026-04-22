import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const PDFViewer = ({ navigation, route }) => {
  const { pdfUrl, filename, resumeData } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useWebView, setUseWebView] = useState(true);
  const [localFileUri, setLocalFileUri] = useState(null);

  useEffect(() => {
    if (!pdfUrl) {
      setError('No PDF URL provided');
      setLoading(false);
      return;
    }
    
    console.log('Loading PDF from URL:', pdfUrl);
    
    // Check if URL is accessible
    checkUrlAccessibility();
  }, [pdfUrl]);

  const checkUrlAccessibility = async () => {
    try {
      // Try to fetch the URL to check if it's accessible
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
    setLoading(true);
    try {
      const localUri = await downloadPDF();
      
      // Open with system PDF viewer
      if (Platform.OS === 'android') {
        // For Android, use Sharing to open with system viewer
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF with'
        });
      } else {
        // For iOS
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="file-pdf-box" size={80} color="#ef4444" />
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonError} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Resume Preview</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownload} style={styles.headerButton}>
            <Ionicons name="download-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      {useWebView ? (
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
        />
      ) : (
        <ScrollView contentContainerStyle={styles.downloadPromptContainer}>
          <MaterialCommunityIcons name="file-pdf-box" size={100} color="#4f46e5" />
          <Text style={styles.downloadPromptTitle}>PDF Ready</Text>
          <Text style={styles.downloadPromptText}>
            Your resume has been generated successfully. Click the button below to view or download it.
          </Text>
          <TouchableOpacity style={styles.viewButton} onPress={handleViewPDF}>
            <Ionicons name="eye-outline" size={24} color="#fff" />
            <Text style={styles.viewButtonText}>View PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBigButton} onPress={handleDownload}>
            <Ionicons name="download-outline" size={24} color="#4f46e5" />
            <Text style={styles.downloadBigButtonText}>Download PDF</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color="#4f46e5" />
          <Text style={styles.editButtonText}>Edit Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newButton} onPress={() => navigation.replace('Dashboard')}>
          <Ionicons name="home-outline" size={20} color="#fff" />
          <Text style={styles.newButtonText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fcfdfe' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff'
  },
  backButton: { 
    padding: 8 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  headerActions: { 
    flexDirection: 'row', 
    gap: 16 
  },
  headerButton: { 
    padding: 8 
  },
  loadingContainer: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff'
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14, 
    color: '#64748b' 
  },
  webview: { 
    flex: 1,
    backgroundColor: '#fff'
  },
  footer: { 
    flexDirection: 'row', 
    padding: 20, 
    gap: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    backgroundColor: '#fff' 
  },
  editButton: { 
    flex: 1, 
    flexDirection: 'row', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    borderWidth: 1, 
    borderColor: '#4f46e5', 
    backgroundColor: '#fff' 
  },
  editButtonText: { 
    color: '#4f46e5', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  newButton: { 
    flex: 1, 
    flexDirection: 'row', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: '#4f46e5' 
  },
  newButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  downloadButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  backButtonError: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600'
  },
  downloadPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  downloadPromptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 10
  },
  downloadPromptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20
  },
  viewButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  downloadBigButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#4f46e5'
  },
  downloadBigButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default PDFViewer;