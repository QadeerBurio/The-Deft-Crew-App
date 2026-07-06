// app/src/navigation/ResumeStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, View } from 'react-native';
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
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      height: 60,
    }}>
      {showBack && (
        <TouchableOpacity 
          onPress={() => onBack ? onBack() : navigation.goBack()}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
      )}
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>
        {title || 'Resume'}
      </Text>
    </View>
  );
};

export default function ResumeStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#f5f7fa' }
      }}
    >
      <Stack.Screen 
        name="ResumeDashboard" 
        component={ResumeDashboardScreen}
      />
      
      <Stack.Screen 
        name="ResumeBuilder" 
        component={ResumeBuilderScreen}
        options={{
          headerShown: false,
          header: () => <CustomHeader title="Build Resume" showBack />
        }}
      />
      
      <Stack.Screen 
        name="ResumeView" 
        component={ResumeViewScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader title="Resume Preview" showBack />
        }}
      />
      
      <Stack.Screen 
        name="ResumeTemplate" 
        component={ResumeTemplateScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader title="Choose Template" showBack />
        }}
      />
      
      <Stack.Screen 
        name="ResumeShare" 
        component={ResumeShareScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader title="Share Resume" showBack />
        }}
      />
      
      <Stack.Screen 
        name="ResumeAnalytics" 
        component={ResumeAnalyticsScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader title="Resume Analytics" showBack />
        }}
      />
      
      <Stack.Screen 
        name="ResumeSettings" 
        component={ResumeSettingsScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader title="Resume Settings" showBack />
        }}
      />
    </Stack.Navigator>
  );
}