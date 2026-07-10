import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Linking,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  FontAwesome,
} from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { AuthContext } from '../context/AuthContext';
import TabNavigator from './TabNavigator';

import BrandOffersScreen from '../screens/BrandOffersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import University from '../screens/University';
import ProfileDetails from '../screens/ProfileDetailsScreen';
import Brands from '../screens/Brands';
import ContactUs from '../components/ContactUs';
import PointsScreen from '../components/Points';
import WhyPointsScreen from '../components/WhyPoints';
import HowItWorksScreen from '../components/HowItsWorks';
import WhyEduBoostScreen from '../components/WhyEduBoost';
import AboutScreen from '../components/AboutScreen';
import TermsScreen from '../components/Terms';
import PrivacyScreen from '../components/Privacy';
import DisclaimerScreen from '../components/Disclaimer';
import FAQScreen from '../components/FAQ';
import Card from '../components/Card';
import NotificationModal from '../components/NotificationModal';
import Career from '../components/Career';
import TDCCareers from '../components/TDCCareers';
import ExchangeScreen from '../components/ExchangeScreen';
import ApplicationForm from '../components/ApplicationForm';
import BookingScreen from '../components/BookingScreen';
import PaymentScreen from '../components/PaymentScreen';
// Note: Resume screens (ResumeDashboard, ResumeBuilder, ResumeView, etc.) are NOT
// imported here. They are registered exclusively inside ResumeNavigator.js.
// The Drawer navigates to 'ResumeStack' which mounts the full ResumeNavigator.
import Social from '../screens/Social/Social';
import ChatDetailScreen from '../screens/Social/ChatDetails';
import MessagesScreen from '../screens/Social/MessageScreen';
import NotificationScreen from '../screens/Social/NotificationScreen';
import UserProfile from '../screens/Social/UserProfile';
import TravelingScreen from '../components/TravellingScreen';
import SettingsScreen from '../screens/Social/SettingItem';
import EditProfileScreen from '../screens/Social/EditProfileScreen';
import Events from '../screens/Events/Events';
import EventNotification from '../screens/Events/EventNotification';

import YourAccount from '../screens/Social/YourAccount';
import SecurityAndAccess from '../screens/Social/SecurityAnd Access';
import PrivacyAndSafety from '../screens/Social/PrivacyAndSafety';
import AccessibilityDisplay from '../screens/Social/AccessibilityDisplay';
import HelpCenter from '../screens/Social/HelpCenter';
import PostDetailScreen from '../screens/Social/PostDetailScreen';
import FloatingMenu from '../screens/Social/FloatingMenu';
import TDCFlow from '../screens/SplashScren';
import MyDiscountScreen from '../screens/MyDiscountScreen';
import ProfileStack from './ProfileStack';
import Home from '../screens/Home';
import StudentDashboard from '../screens/StudentDashboard';
import Explore from '../screens/Explore';
import EnhancedCareerScreen from '../screens/Resume/EnhanceCareer';

const { width } = Dimensions.get('window');
const Drawer = createDrawerNavigator();

// DRAWER_ITEMS with enhanced icons (increased size)
const DRAWER_ITEMS = [
  {
    label: 'Home',
    icon: (size) => <Ionicons name="home-outline" color="#f9c349" size={size + 5} />,
    route: 'HomeTabs',
  },
  {
    label: 'Privilege Benefits',
    icon: (size) => (
      <MaterialCommunityIcons name="trophy-outline" size={size + 5} color="#f9c349" />
    ),
    route: 'WhyPoints',
  },
  {
    label: 'Refer & Earn',
    icon: (size) => (
      <MaterialCommunityIcons
        name="account-multiple-plus-outline"
        size={size + 5}
        color="#f9c349"
      />
    ),
    route: 'Points',
  },
  {
    label: 'About TDC',
    icon: (size) => (
      <Ionicons name="information-circle-outline" color="#f9c349" size={size + 5} />
    ),
    route: 'About',
  },
  {
    label: 'How it Works',
    icon: (size) => <Ionicons name="cog-outline" color="#f9c349" size={size + 5} />,
    route: 'How It Works',
  },
  {
    label: 'Terms & Conditions',
    icon: (size) => (
      <MaterialCommunityIcons name="file-document-outline" color="#f9c349" size={size + 5} />
    ),
    route: 'Terms & Conditions',
  },
  {
    label: 'Privacy Policy',
    icon: (size) => (
      <MaterialCommunityIcons name="shield-lock-outline" color="#f9c349" size={size + 5} />
    ),
    route: 'Privacy Policy',
  },
  {
    label: 'Disclaimer',
    icon: (size) => <Ionicons name="alert-circle-outline" color="#f9c349" size={size + 5} />,
    route: 'Disclaimer',
  },
  {
    label: 'Careers at TDC',
    icon: (size) => (
      <MaterialCommunityIcons name="briefcase-outline" size={size + 5} color="#f9c349" />
    ),
    route: 'TDCCareers',
  },
];

const AnimatedDrawerItem = ({ label, icon, onPress, delay = 0 }) => {
  const translateX = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        delay,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 250,
        delay,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateX, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
      <DrawerItem
        label={label}
        labelStyle={[styles.drawerItemLabel, { fontSize: 16 }]}
        style={[styles.drawerItem, { marginVertical: 2 }]}
        icon={({ size }) => icon(size)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      />
    </Animated.View>
  );
};

function CustomDrawerContent(props) {
  const { logout, isGuest, setIsGuest } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  let delay = 50;

  const navigateToAuth = (screenName) => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      props.navigation.getParent()?.navigate(screenName);
    }, 300);
  };

  const handleGuestSignIn = () => {
    setIsGuest(false);
    navigateToAuth('Login');
  };

  const handleGuestSignUp = () => {
    setIsGuest(false);
    navigateToAuth('Signup');
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          setTimeout(() => {
            props.navigation.getParent()?.navigate('Login');
          }, 300);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom']}>
      <DrawerContentScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerScrollContent}
      >
        <Animated.View
          style={[
            styles.drawerHeaderBG,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  tdc<Text style={{ color: '#f9c349' }}>.</Text>
                </Text>
              </View>

              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { fontSize: 22 }]}>The Deft Crew</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.premiumBadge}>
                    <Text style={[styles.premiumText, { fontSize: 11 }]}>
                      {isGuest ? 'GUEST MODE' : 'STUDENTS BENEFITS'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  props.navigation.closeDrawer();
                }}
                style={styles.closeIcon}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 20 }}>
          {DRAWER_ITEMS.map((item, index) => {
            delay += 30;
            return (
              <AnimatedDrawerItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                delay={delay}
                onPress={() => {
                  if (item.action === 'whatsapp') {
                    openWhatsApp();
                    return;
                  }
                  props.navigation.navigate(item.route);
                }}
              />
            );
          })}
        </Animated.View>
      </DrawerContentScrollView>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim,
              },
            ],
          },
        ]}
      >
        {isGuest ? (
          <View style={styles.guestDrawerFooter}>
            <Text style={styles.guestDrawerText}>Browsing as Guest</Text>
            <TouchableOpacity 
              style={styles.signInDrawerBtn}
              onPress={handleGuestSignIn}
              activeOpacity={0.7}
            >
              <Ionicons name="log-in-outline" size={22} color="#f9c349" style={{ marginRight: 10 }} />
              <Text style={[styles.signInDrawerText, { fontSize: 16 }]}>Sign In to Unlock All Features</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.createAccountDrawerBtn}
              onPress={handleGuestSignUp}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={22} color="#1a1a1a" style={{ marginRight: 10 }} />
              <Text style={[styles.createAccountDrawerText, { fontSize: 16 }]}>Create Free Account</Text>
            </TouchableOpacity>
            <Text style={styles.guestBenefitText}>
              Unlock exclusive student discounts and benefits!
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#f9c349" />
            <Text style={[styles.logoutText, { fontSize: 17 }]}>Log Out</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function CustomHeader({ navigation }) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchWidth = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const { unreadCount, updateUnreadCount, token, isGuest } = useContext(AuthContext);
  const [notifVisible, setNotifVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (token && !isGuest) {
      updateUnreadCount(token);
      
      const interval = setInterval(() => {
        if (token && !isGuest) {
          updateUnreadCount(token);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token, isGuest, updateUnreadCount]);

  useEffect(() => {
    if (token && !isGuest) {
      updateUnreadCount();
    }

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [headerOpacity, headerTranslateY, pulseAnim, token, isGuest, updateUnreadCount]);

  const toggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (searchVisible) {
      Animated.parallel([
        Animated.timing(searchWidth, {
          toValue: 0,
          duration: 250,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: false,
        }),
        Animated.timing(searchScale, {
          toValue: 0.8,
          duration: 250,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSearchVisible(false);
        setSearchQuery('');
        searchScale.setValue(0.8);
      });
    } else {
      setSearchVisible(true);
      Animated.parallel([
        Animated.timing(searchWidth, {
          toValue: width * 0.55,
          duration: 250,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: false,
        }),
        Animated.timing(searchScale, {
          toValue: 1,
          duration: 250,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [searchVisible, searchWidth, searchScale]);

  const submitSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Brands', {
      query: trimmedQuery,
      timestamp: Date.now(),
    });
    toggleSearch();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (token && !isGuest) {
        updateUnreadCount(token);
      }
    });
    
    return unsubscribe;
  }, [navigation, token, isGuest, updateUnreadCount]);

  const handleNotificationPress = () => {
    if (isGuest) {
      navigation.getParent()?.navigate('Login');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifVisible(true);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Animated.View 
        style={[
          styles.headerMain, 
          { 
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.toggleDrawer();
          }}
          style={styles.headerCircleBtn}
        >
          <Ionicons name="menu-outline" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {searchVisible ? (
            <Animated.View 
              style={[
                styles.headerSearchWrap, 
                { 
                  width: searchWidth,
                  transform: [{ scale: searchScale }]
                }
              ]}
            >
              <Ionicons name="search-outline" size={20} color="#f9c349" style={styles.searchIcon} />
              <TextInput
                style={styles.headerInput}
                placeholder="Search brands..."
                placeholderTextColor="#999"
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={submitSearch}
                returnKeyType="search"
              />
            </Animated.View>
          ) : (
            <View style={styles.logoContainer}>
              <Text style={[styles.headerAppTitle, { fontSize: 22 }]}>
                <Text style={{ color: '#000' }}>DEFT</Text>
                <Text style={{ color: '#f9c349' }}>CREW</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {!searchVisible && (
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={[styles.headerCircleBtn, { marginLeft: 10 }]}
            >
              <Ionicons name="notifications-outline" size={22} color="#000" />
              {!isGuest && unreadCount > 0 && (
                <Animated.View style={[styles.badges, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={[styles.badgeTexts, { fontSize: 10 }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </Animated.View>
              )}
              {isGuest && (
                <View style={styles.guestLockBadge}>
                  <Ionicons name="lock-closed" size={8} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <NotificationModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </SafeAreaView>
  );
}

// Animated Screen Wrapper Component
const AnimatedScreenWrapper = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// Animated Screen Component
const AnimatedScreen = ({ component: Component, ...props }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <Animated.View 
      style={{ 
        flex: 1, 
        opacity: fadeAnim, 
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }] 
      }}
    >
      <Component {...props} />
    </Animated.View>
  );
};

export default function DrawerNavigator() {
  const routeAnim = useRef(new Animated.Value(0)).current;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ route, navigation }) => ({
          drawerStyle: styles.drawerStyle,
          sceneContainerStyle: { backgroundColor: '#fff' },
          header: () => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
            const hiddenRoutes = [
              'Traveling',
              'Social',
              'Travelling',
              'ChatDetailScreen',
              'MessagesScreen',
            ];

            if (hiddenRoutes.includes(routeName)) {
              return null;
            }

            return <CustomHeader navigation={navigation} />;
          },
          headerShown: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
            },
          }),
        })}
      >
        <Drawer.Screen name="HomeTabs">
          {(props) => (
            <AnimatedScreenWrapper>
              <TabNavigator {...props} />
            </AnimatedScreenWrapper>
          )}
        </Drawer.Screen>
        <Drawer.Screen
          name="Profile"
          component={ProfileStack}
          options={{ headerShown: false }}
        />
        <Drawer.Screen
          name="Travelling"
          component={TravelingScreen}
          options={{ headerShown: false }}
        />
        <Drawer.Screen 
          name="Brands" 
          component={Brands}
        />
         <Drawer.Screen 
          name="Explore" 
          component={Explore}
        />

        {[
          { name: 'University', comp: University },
          { name: 'ContactUs', comp: ContactUs },
          { name: 'Home', comp: Home },
          
          { name: 'BrandOffers', comp: BrandOffersScreen },
          { name: 'Points', comp: PointsScreen },
          { name: 'WhyPoints', comp: WhyPointsScreen },
          { name: 'How It Works', comp: HowItWorksScreen },
          
          { name: 'Why EduBoost', comp: WhyEduBoostScreen },
          { name: 'About', comp: AboutScreen },
          { name: 'Terms & Conditions', comp: TermsScreen },
          { name: 'Privacy Policy', comp: PrivacyScreen },
          { name: 'Disclaimer', comp: DisclaimerScreen },
          { name: 'FAQ', comp: FAQScreen },
          { name: 'Career', comp: Career },
          { name: 'TDCCareers', comp: TDCCareers },
          { name: 'Booking', comp: BookingScreen },
          { name: 'Exchange', comp: ExchangeScreen },
          { name: 'ApplicationForm', comp: ApplicationForm },
          { name: 'Payment', comp: PaymentScreen },
          { name: 'StudentDashboard', comp: StudentDashboard },
          // NOTE: Resume screens removed — they are registered in ResumeNavigator.js only.
          // Navigate to 'ResumeStack' in HomeStack to reach the Resume section.
          { name: 'EnhancedCareer', comp: EnhancedCareerScreen },
          { name: 'Social', comp: Social },
          { name: 'MessagesScreen', comp: MessagesScreen },
          { name: 'ChatDetailScreen', comp: ChatDetailScreen },
          { name: 'Notifications', comp: NotificationScreen },
          { name: 'UserProfile', comp: UserProfile },
          { name: 'SettingsScreen', comp: SettingsScreen },
          { name: 'YourAccount', comp: YourAccount },
          { name: 'SecurityAndAccess', comp: SecurityAndAccess },
          { name: 'PrivacyAndSafety', comp: PrivacyAndSafety },
          { name: 'AccessibilityDisplay', comp: AccessibilityDisplay },
          { name: 'HelpCenter', comp: HelpCenter },
          { name: 'FloatingMenu', comp: FloatingMenu },
          { name: 'EditProfileScreen', comp: EditProfileScreen },
          { name: 'Events', comp: Events },
          { name: 'EventNotification', comp: EventNotification },
          { name: 'PostDetailScreen', comp: PostDetailScreen },
          
          
          { name: 'TDCFlow', comp: TDCFlow },
          { name: 'ProfileScreen', comp: ProfileScreen },
          { name: 'ProfileDetails', comp: ProfileDetails },
          { name: 'Card', comp: Card },
          { name: 'MyDiscountScreen', comp: MyDiscountScreen },
        ].map((item) => (
          <Drawer.Screen
            key={item.name}
            name={item.name}
            options={{ headerShown: false }}
          >
            {(props) => <AnimatedScreen component={item.comp} {...props} />}
          </Drawer.Screen>
        ))}
      </Drawer.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerStyle: {
    width: width * 0.84,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  drawerScrollContent: {
    paddingBottom: 20,
  },
  drawerHeaderBG: {
    backgroundColor: '#000',
    marginBottom: 18,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9c349',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
  },
  badgeContainer: {
    marginTop: 5,
    flexDirection: 'row',
  },
  premiumBadge: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 22,
  },
  premiumText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  drawerItem: {
    borderRadius: 14,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  drawerItemLabel: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: -8,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#f9c349',
  },
  logoutText: {
    marginLeft: 12,
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 16,
  },
  headerSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerMain: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAppTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerBadge: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  headerBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSearchWrap: {
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  headerInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
    margin: 0,
  },
  badges: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#f9c349',
    borderRadius: 11,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeTexts: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  guestDrawerFooter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestDrawerText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '500',
  },
  signInDrawerBtn: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  signInDrawerText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 15,
  },
  createAccountDrawerBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    marginBottom: 12,
  },
  createAccountDrawerText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 15,
  },
  guestBenefitText: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    lineHeight: 16,
  },
  guestLockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#999',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
});