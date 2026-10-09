// app/src/navigation/ResumeStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from "../ui";
import { color as T } from "../theme/tokens";

// Import Screens
import ResumeBuilderScreen from "../screens/Resume/ResumeBuilder";
import ResumeDashboardScreen from "../screens/Resume/ResumeDashboard";
import ResumeViewScreen from "../screens/Resume/ViewResume";
import ResumeTemplateScreen from "../screens/Resume/ResumeTemplate";
import ResumeSettingsScreen from "../screens/Resume/ResumeSetting";
import ResumeAnalyticsScreen from "../screens/Resume/ResumeAnalytics";
import ResumeShareScreen from "../screens/Resume/ResumeShare";

const Stack = createNativeStackNavigator();

// Stack header: the design-system ScreenHeader, below the status bar
const CustomHeader = ({ title, showBack, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <ScreenHeader title={title || 'resume'} showBack={showBack} onBack={onBack} />
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
        options={{ title: 'build resume' }}
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
  headerContainer: { backgroundColor: T.paper },
});
