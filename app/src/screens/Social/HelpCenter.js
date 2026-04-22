import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StatusBar,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function HelpCenter({ navigation }) {
  const [loading, setLoading] = useState(true);
  const helpUrl = 'https://thedeftcrew.com/'; // Replace with your actual help/support URL

  const openInBrowser = () => {
    Linking.openURL(helpUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={26} color="#0F1419" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Help Center</Text>
          <Text style={styles.headerSubtitle}>thedeftcrew.com</Text>
        </View>

        <TouchableOpacity 
          onPress={openInBrowser} 
          style={styles.externalBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color="#1D9BF0" />
        </TouchableOpacity>
      </View>

      <View style={styles.webWrapper}>
        <WebView 
          source={{ uri: helpUrl }} 
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
          // Enable common features
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
        />
        
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator 
              size="large" 
              color="#1D9BF0" 
            />
            <Text style={styles.loadingText}>Loading TDC Support...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFF" 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#F7F9F9',
    backgroundColor: '#FFF',
    paddingTop: 40 // Adjusted for notch
  },
  closeBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'flex-start' 
  },
  titleContainer: { 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#0F1419' 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: '#536471', 
    fontWeight: '500' 
  },
  externalBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'flex-end' 
  },
  webWrapper: { 
    flex: 1, 
    backgroundColor: '#F7F9F9' 
  },
  webview: { 
    flex: 1 
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#536471',
    fontWeight: '500'
  }
});