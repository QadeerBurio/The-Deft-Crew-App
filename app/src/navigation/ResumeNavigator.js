// app/src/navigation/ResumeStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import Screens
import ResumeBuilderScreen from "../screens/Resume/ResumeBuilder";
import ResumeDashboardScreen from "../screens/Resume/ResumeDashboard";
import ResumeViewScreen from "../screens/Resume/ViewResume";
import ResumeTemplateScreen from "../screens/Resume/ResumeTemplate";
import ResumeSettingsScreen from "../screens/Resume/ResumeSetting";
import ResumeAnalyticsScreen from "../screens/Resume/ResumeAnalytics";
import ResumeShareScreen from "../screens/Resume/ResumeShare";

const Stack = createNativeStackNavigator();

// Custom Header
const CustomHeader = ({ title, showBack, onBack }) => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.headerContainer}>
      {showBack && (
        <TouchableOpacity 
          onPress={() => onBack ? onBack() : navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>
        {title || 'Resume'}
      </Text>
    </View>
  );
};

export default function ResumeStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader 
            title={options.title || route.name} 
            showBack 
          />
        ),
        cardStyle: { backgroundColor: '#f5f7fa' }
      }}
    >
      <Stack.Screen 
        name="ResumeDashboard" 
        component={ResumeDashboardScreen}
        options={{ title: 'Build Resume' }}
      />
      
      <Stack.Screen 
        name="ResumeBuilder" 
        component={ResumeBuilderScreen}
        options={{headerShown: false}}
        
      />
      
      <Stack.Screen 
        name="ResumeView" 
        component={ResumeViewScreen}
        options={{ 
          headerShown: false,  // Full screen view — no header
        }}
      />
      
      <Stack.Screen 
        name="ResumeTemplate" 
        component={ResumeTemplateScreen}
         options={{headerShown: false}}
      />
      
      <Stack.Screen 
        name="ResumeShare" 
        component={ResumeShareScreen}
         options={{headerShown: false}}
      />
      
      <Stack.Screen 
        name="ResumeAnalytics" 
        component={ResumeAnalyticsScreen}
         options={{headerShown: false}}
      />
      
      <Stack.Screen 
        name="ResumeSettings" 
        component={ResumeSettingsScreen}
         options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 60,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});