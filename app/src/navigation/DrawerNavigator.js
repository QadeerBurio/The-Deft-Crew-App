// The-Deft-Crew-App/app/src/navigation/DrawerNavigator.js

import React, {
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CommonActions,
  useNavigation,
  useFocusEffect,
  useNavigationState,
} from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// ---------- CONTEXT ----------
import { AuthContext } from '../context/AuthContext';
import TabNavigator from './TabNavigator';

// ---------- SCREENS ----------
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
import Dashboard from '../screens/skillshare/Dashboard';
import CreateListingScreen from '../screens/skillshare/CreateListingScreen';
import ListingDetailScreen from '../screens/skillshare/ListingDetailScreen';
import SelectListingTypeScreen from '../screens/skillshare/SelectListingTypeScreen';
import CreateOfferScreen from '../screens/skillshare/CreateOfferScreen';
import ManageOffersScreen from '../screens/skillshare/ManageOffersScreen';
import MyOffersScreen from '../screens/skillshare/MyOffersScreen';
import MyListingsScreen from '../screens/skillshare/MyListingDetails';
import MatchChatScreen from '../screens/skillshare/MatchChatScreen';
import InquiryChatScreen from '../screens/skillshare/InquiryChatScreen';
import SkillProfile from '../screens/skillshare/SkillProfile';
import ActivityScreen from '../screens/skillshare/ActivityScreen';
import MyInquiriesScreen from '../screens/skillshare/MyInquiryScreen';
import MyMatches from '../screens/skillshare/MyMatches';
import ChatMatch from '../screens/skillshare/ChatMatch';
import DigitalBadgeScreen from '../components/DigitalBadgeScreen';
import MainCharacterScreen from '../components/MainCharacterScreen';
import DeftProScreen from '../components/DeftProScreen';
import DeftGoatScreen from '../components/DeftGoatScreen';
import FounderCircleScreen from '../components/FounderCircleScreen';
import CreatePostScreen from '../screens/Social/CreatePostScreen';
import ChangePassword from '../screens/Social/ChangePassword';
import FeedScreen from '../screens/Social/FeedScreen';
import BlockedUsersScreen from '../screens/Social/BlockedUserScreen';
import Terrms from '../screens/Social/Terrms';
import Guideline from '../screens/Social/Guideline';
import ProfileWelcomeScreen from '../screens/skillshare/profile/ProfileWelcomeScreen';
import ProfileSetupScreen from '../screens/skillshare/profile/ProfileSetupScreen';
import ProfileSuccessScreen from '../screens/skillshare/profile/ProfileSuccessScreen';
import ProfessionalProfileScreen from '../screens/skillshare/profile/ProfessionalProfileScreen';
import { getMyProfessionalProfile } from '../api/profileApi';
import SkillShareExplore from '../screens/skillshare/Explore';
import MyPostsByType from '../screens/skillshare/MyPostByType';
import OfferScreen from '../screens/OfferScreen';

// ---------- ENGAGEMENT ----------
import StreakChip from '../engagement/components/StreakChip';
import StreakSheet from '../engagement/components/StreakSheet';
import RewardsScreen from '../engagement/screens/RewardsScreen';
import NotificationSettingsScreen from '../engagement/screens/NotificationSettingsScreen';
import BadgesScreen from '../engagement/screens/BadgesScreen';
import CityScreen from '../screens/CityScreen';
import NotificationSkillshare from '../components/NotificationSkillshare';

const { width } = Dimensions.get('window');
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// ============================================================
// MODULE-LEVEL CACHE — SkillShare gate runs once per session
// ============================================================
let SKILLSHARE_GATE_RESOLVED = false;
let SKILLSHARE_GATE_TARGET = null;

// ============================================================
// RECURSIVE HELPER — finds the deepest active route name
// ============================================================
const getDeepestRouteName = (route) => {
  if (!route) return null;
  if (route.state && route.state.routes && route.state.routes.length > 0) {
    const index = route.state.index ?? route.state.routes.length - 1;
    const activeChild = route.state.routes[index];
    const deepest = getDeepestRouteName(activeChild);
    return deepest || activeChild?.name || route.name;
  }
  return route.name;
};

// ============================================================
// FULLSCREEN SCREENS (hide drawer/header/tab)
// ============================================================
const FULLSCREEN_SCREENS = [
  'Resume',
  'ResumeDashboard',
  'ResumeBuilder',
  'ResumeTemplate',
  'ResumeShare',
  'ResumeAnalytics',
  'ResumeSettings',
  'ResumeView',
  'Social',
  'SocialStack',
  'Messages',
  'MessagesScreen',
  'ChatDetailScreen',
  'PostDetailScreen',
  'CreatePostScreen',
  'FeedScreen',
  'UserProfile',
  'Brands',
  'OfferScreen',
  'BrandOffers',
  'ChatHistory',
  'Booking',
  'Payment',
];

const SKILLSHARE_CHAT_SCREENS = ['MatchChat', 'InquiryChat', 'ChatMatch'];

// ============================================================
// DRAWER ITEMS
// ============================================================
const DRAWER_ITEMS = [
  {
    label: 'Home',
    icon: (size, color) => <Ionicons name="home-outline" color={color} size={size} />,
    route: 'HomeTabs',
    resetNavigation: true,
  },
  {
    label: 'Privilege Benefits',
    icon: (size, color) => (
      <MaterialCommunityIcons name="trophy-outline" size={size} color={color} />
    ),
    route: 'WhyPoints',
    resetNavigation: false,
  },
  {
    label: 'Rewards',
    icon: (size, color) => (
      <MaterialCommunityIcons name="gift-outline" size={size} color={color} />
    ),
    route: 'Rewards',
    resetNavigation: false,
  },
  // {
  //   label: 'SkillShare',
  //   icon: (size, color) => (
  //     <MaterialCommunityIcons name="swap-horizontal" size={size} color={color} />
  //   ),
  //   route: 'Dashboard',
  //   resetNavigation: false,
  // },
  {
    label: 'the crew',
    icon: (size, color) => (
      <MaterialCommunityIcons
        name="account-multiple-plus-outline"
        size={size}
        color={color}
      />
    ),
    route: 'Points',
    resetNavigation: false,
  },
  {
    label: 'About tdc',
    icon: (size, color) => (
      <Ionicons name="information-circle-outline" color={color} size={size} />
    ),
    route: 'About',
    resetNavigation: false,
  },
  {
    label: 'How it Works',
    icon: (size, color) => <Ionicons name="cog-outline" color={color} size={size} />,
    route: 'How It Works',
    resetNavigation: false,
  },
  {
    label: 'Terms & Conditions',
    icon: (size, color) => (
      <MaterialCommunityIcons name="file-document-outline" color={color} size={size} />
    ),
    route: 'Terms & Conditions',
    resetNavigation: false,
  },
  {
    label: 'Privacy Policy',
    icon: (size, color) => (
      <MaterialCommunityIcons name="shield-lock-outline" color={color} size={size} />
    ),
    route: 'Privacy Policy',
    resetNavigation: false,
  },
  {
    label: 'Disclaimer',
    icon: (size, color) => (
      <Ionicons name="alert-circle-outline" color={color} size={size} />
    ),
    route: 'Disclaimer',
    resetNavigation: false,
  },
];

// ============================================================
// ANIMATED DRAWER ITEM
// ============================================================
const AnimatedDrawerItem = ({ label, icon, onPress, delay = 0, isActive = false }) => {
  const translateX = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const [isPressed, setIsPressed] = useState(false);

  // quick, light entrance (was 450ms with a bounce per item)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        delay: Math.min(delay, 160),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: Math.min(delay, 160),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        delay: Math.min(delay, 160),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={() => {
          setIsPressed(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => setIsPressed(false)}
        onPress={onPress}
        style={[
          styles.drawerItemContainer,
          isActive && styles.drawerItemActive,
          isPressed && styles.drawerItemPressed,
        ]}
      >
        <View style={[styles.drawerItemIconWrapper, isActive && styles.drawerItemIconActive]}>
          {icon(22, isActive ? '#f9c349' : '#666')}
        </View>
        <Text style={[styles.drawerItemLabel, isActive && styles.drawerItemLabelActive]}>
          {label}
        </Text>
        {isActive && <View style={styles.drawerItemActiveIndicator} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================
// DRAWER HEADER
// ============================================================
const DrawerHeader = ({ isGuest }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.drawerHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drawerHeaderGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <LinearGradient
                colors={['#000', '#000']}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  tdc<Text style={{ color: '#f9c349' }}>.</Text>
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.avatarGlow} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>The Deft Crew</Text>
            <View style={styles.badgeWrapper}>
              <LinearGradient
                colors={['#f9c349', '#f9c349']}
                style={styles.premiumBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.premiumText}>
                  {isGuest ? '👤 GUEST MODE' : 'STUDENT BENEFITS'}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================================
// CUSTOM DRAWER CONTENT
// ============================================================
function CustomDrawerContent(props) {
  const { logout, isGuest, setIsGuest } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('HomeTabs');

  // Highlight the item for the screen that is really open
  // (Points, About, etc. live inside the HomeTabs stack, so the drawer's own
  // route name alone was always "HomeTabs")
  useEffect(() => {
    const pick = (state) => {
      if (!state) return;
      const top = state.routes[state.index];
      if (!top) return;
      const deepest = getDeepestRouteName(top);
      const match = DRAWER_ITEMS.find((i) => i.route === deepest || i.route === top.name && top.name !== 'HomeTabs');
      setActiveRoute(match ? match.route : deepest === 'HomeTabs' || top.name === 'HomeTabs' ? 'HomeTabs' : deepest);
    };
    pick(props.state);
    const unsubscribe = props.navigation.addListener('state', (e) => pick(e.data.state));
    return unsubscribe;
  }, [props.navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  const navigateToAuth = (screenName) => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      props.navigation.getParent()?.navigate(screenName);
    }, 350);
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
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            props.navigation.closeDrawer();
            SKILLSHARE_GATE_RESOLVED = false;
            SKILLSHARE_GATE_TARGET = null;
            try {
              await logout();
            } catch (e) {
              console.error('Logout failed:', e);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleNavigation = (route, resetNavigation = false) => {
    setActiveRoute(route);
    props.navigation.closeDrawer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // wait for the drawer to finish closing (no jump mid-animation)
    setTimeout(() => {
      try {
        // Home: hard reset
        if (resetNavigation && route === 'HomeTabs') {
          props.navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'HomeTabs' }],
            })
          );
          return;
        }

        // SkillShare: just navigate — React Navigation resumes the
        // existing Dashboard stack (including whatever screen is on top).
        if (route === 'Dashboard') {
          props.navigation.navigate('Dashboard');
          return;
        }

        // Screens that live inside the HomeTabs stack (Points, About, Terms…):
        // React Navigation 7 needs the parent named, otherwise nothing opens
        const drawerRoutes = props.state?.routeNames || [];
        if (drawerRoutes.includes(route)) {
          props.navigation.navigate(route);
        } else {
          props.navigation.navigate('HomeTabs', { screen: route });
        }
      } catch (error) {
        console.error('Navigation error:', error);
        props.navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'HomeTabs' }],
          })
        );
      }
    }, 350);
  };

  let delay = 50;

  return (
    <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom']}>
      <DrawerHeader isGuest={isGuest} />

      <DrawerContentScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.drawerScrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, paddingTop: 8 }}>
          {DRAWER_ITEMS.map((item, index) => {
            delay += 20;
            const isActive = activeRoute === item.route;
            return (
              <AnimatedDrawerItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                delay={delay}
                isActive={isActive}
                onPress={() =>
                  handleNavigation(item.route, item.resetNavigation || false)
                }
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
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {isGuest ? (
          <View style={styles.guestDrawerFooter}>
            <Text style={styles.guestDrawerText}>👋 Browsing as Guest</Text>
            <TouchableOpacity
              style={styles.signInDrawerBtn}
              onPress={handleGuestSignIn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f9c349', '#f7971e']}
                style={styles.signInGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="log-in-outline" size={20} color="#1a1a1a" />
                <Text style={styles.signInDrawerText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createAccountDrawerBtn}
              onPress={handleGuestSignUp}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color="#f9c349" />
              <Text style={styles.createAccountDrawerText}>Create Account</Text>
            </TouchableOpacity>
            <Text style={styles.guestBenefitText}>
              Unlock exclusive student discounts!
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#f9c349" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

// ============================================================
// CUSTOM HEADER
// ============================================================
function CustomHeader({ navigation }) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchWidth = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const { unreadCount, updateUnreadCount, token, isGuest } = useContext(AuthContext);
  const [notifVisible, setNotifVisible] = useState(false);
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);
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
  }, [headerOpacity, headerTranslateY, pulseAnim]);

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
            transform: [{ translateY: headerTranslateY }],
          },
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
                  transform: [{ scale: searchScale }],
                },
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
              <Text style={[styles.headerAppTitle, { fontSize: 36 }]}>
                <Text style={{ color: '#000' }}>tdc</Text>
                <Text style={{ color: '#f9c349' }}>.</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {!searchVisible && (
            <>
              {!isGuest && (
                <StreakChip onPress={() => setStreakSheetVisible(true)} />
              )}
              <TouchableOpacity
                onPress={handleNotificationPress}
                style={[styles.headerCircleBtn, { marginLeft: 10 }]}
              >
                <Ionicons name="notifications-outline" size={22} color="#000" />
                {!isGuest && unreadCount > 0 && (
                  <Animated.View style={[styles.badges, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={[styles.badgeTexts, { fontSize: 10 }]}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </Animated.View>
                )}
                {isGuest && (
                  <View style={styles.guestLockBadge}>
                    <Ionicons name="lock-closed" size={8} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      <NotificationModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ============================================================
// ANIMATION WRAPPER
// ============================================================
// Only a short fade. The old version also scaled the whole app from 0.96 and
// slid it up; right after login/sign-up that animation could get stuck, which
// left Home looking "zoomed out" with a white border.
const AnimatedScreenWrapper = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{children}</Animated.View>;
};

// ============================================================
// HOME TABS WRAPPER
// ============================================================
const HomeTabsScreen = (props) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [deepestRoute, setDeepestRoute] = useState('Home');

  const hideHeader =
    activeTab === 'Social' ||
    (deepestRoute && FULLSCREEN_SCREENS.includes(deepestRoute));

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {!hideHeader && <CustomHeader navigation={props.navigation} />}
      <AnimatedScreenWrapper>
        <TabNavigator
          {...props}
          onTabChange={(tabName) => setActiveTab(tabName)}
          onRouteChange={(routeName) => setDeepestRoute(routeName)}
        />
      </AnimatedScreenWrapper>
    </View>
  );
};

// ============================================================
// SKILLSHARE GATE
// ============================================================
function SkillShareGate({ navigation }) {
  const { isGuest } = useContext(AuthContext);
  const resolvedRef = useRef(SKILLSHARE_GATE_RESOLVED);

  useEffect(() => {
    if (resolvedRef.current) {
      const target = SKILLSHARE_GATE_TARGET || 'DashboardMain';
      navigation.replace(target);
      return;
    }

    if (isGuest) {
      SKILLSHARE_GATE_RESOLVED = true;
      SKILLSHARE_GATE_TARGET = 'DashboardMain';
      resolvedRef.current = true;
      navigation.replace('DashboardMain');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { profile, hasProfile } = await getMyProfessionalProfile();
        if (cancelled) return;
        const isComplete = hasProfile && profile?.isComplete;
        const target = isComplete ? 'DashboardMain' : 'ProfileWelcome';
        SKILLSHARE_GATE_RESOLVED = true;
        SKILLSHARE_GATE_TARGET = target;
        resolvedRef.current = true;
        navigation.replace(target);
      } catch (err) {
        if (cancelled) return;
        SKILLSHARE_GATE_RESOLVED = true;
        SKILLSHARE_GATE_TARGET = 'ProfileWelcome';
        resolvedRef.current = true;
        navigation.replace('ProfileWelcome');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGuest, navigation]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDF9F0',
      }}
    >
      <ActivityIndicator size="large" color="#f9c349" />
    </View>
  );
}

// ============================================================
// SKILLSHARE BACK HANDLER
// A single, universal handler that:
//   - If the stack can go back → goBack()
//   - Else → navigate to HomeTabs
// It's attached ONCE at the stack wrapper level, so it covers
// EVERY screen in the SkillShare stack (DashboardMain, MyMatches,
// MatchChat, ListingDetail, MyOffers, etc.).
// ============================================================
function SkillShareStackWrapper({ children }) {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Let the stack's internal handler deal with it if it can go back
        if (navigation.canGoBack()) {
          return false;
        }

        // At the root → go to HomeTabs (Home)
        const drawerNav = navigation.getParent();
        if (drawerNav) {
          drawerNav.navigate('HomeTabs');
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => sub.remove();
    }, [navigation])
  );

  return children;
}

// ============================================================
// DASHBOARD STACK (SkillShare)
// ============================================================
function DashboardStackNavigator() {
  return (
    <SkillShareStackWrapper>
      <Stack.Navigator
        initialRouteName="SkillShareGate"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' },
          // Keep previous screens mounted so state survives
          detachPreviousScreen: false,
          // Enable iOS swipe-back
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen name="SkillShareGate" component={SkillShareGate} />
        <Stack.Screen name="ProfileWelcome" component={ProfileWelcomeScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="ProfileSuccess" component={ProfileSuccessScreen} />
        <Stack.Screen
          name="ProfessionalProfile"
          component={ProfessionalProfileScreen}
        />
        <Stack.Screen name="DashboardMain" component={Dashboard} />
        <Stack.Screen name="BrowseListings" component={SkillShareExplore} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="NotificationSkillshare" component={NotificationSkillshare} />
        <Stack.Screen
          name="SelectListingTypeScreen"
          component={SelectListingTypeScreen}
        />
        <Stack.Screen name="CreateOffer" component={CreateOfferScreen} />
        <Stack.Screen name="ManageOffers" component={ManageOffersScreen} />
        <Stack.Screen name="MyOffers" component={MyOffersScreen} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />

        {/* Chat screens — unique identity per thread */}
        <Stack.Screen
          name="MatchChat"
          component={MatchChatScreen}
          getId={({ params }) =>
            `matchchat-${params?.matchId ?? params?.id ?? 'default'}`
          }
        />
        <Stack.Screen
          name="InquiryChat"
          component={InquiryChatScreen}
          getId={({ params }) =>
            `inquirychat-${params?.threadId ?? params?.inquiryId ?? params?.id ?? 'default'}`
          }
        />
        <Stack.Screen
          name="ChatMatch"
          component={ChatMatch}
          getId={({ params }) =>
            `chatmatch-${params?.matchId ?? params?.id ?? 'default'}`
          }
        />

        <Stack.Screen name="SkillProfile" component={ProfessionalProfileScreen} />
        <Stack.Screen name="MyPostsByType" component={MyPostsByType} />
        <Stack.Screen name="MyInquiries" component={MyInquiriesScreen} />
        <Stack.Screen name="MyMatches" component={MyMatches} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="SkillProfileEdit" component={SkillProfile} />
      </Stack.Navigator>
    </SkillShareStackWrapper>
  );
}

// ============================================================
// SOCIAL STACK
// ============================================================
function SocialStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Social"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
        detachPreviousScreen: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Social" component={Social} />
      <Stack.Screen name="Messages" component={Social} />
      <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      <Stack.Screen
        name="ChatDetailScreen"
        component={ChatDetailScreen}
        getId={({ params }) =>
          `socialchat-${params?.chatId ?? params?.id ?? 'default'}`
        }
      />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="FloatingMenu" component={FloatingMenu} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} />
      <Stack.Screen name="FeedScreen" component={FeedScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="YourAccount" component={YourAccount} />
      <Stack.Screen name="SecurityAndAccess" component={SecurityAndAccess} />
      <Stack.Screen name="PrivacyAndSafety" component={PrivacyAndSafety} />
      <Stack.Screen name="AccessibilityDisplay" component={AccessibilityDisplay} />
      <Stack.Screen name="HelpCenter" component={HelpCenter} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="Terrms" component={Terrms} />
      <Stack.Screen name="Guideline" component={Guideline} />
    </Stack.Navigator>
  );
}

// ============================================================
// HOME STACK
// ============================================================
function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="HomeTabs"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: { opacity: progress },
        }),
      }}
    >
      <Stack.Screen name="HomeTabs" component={HomeTabsScreen} />
      <Stack.Screen name="University" component={University} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="BrandOffers" component={BrandOffersScreen} />
      <Stack.Screen name="Points" component={PointsScreen} />
      <Stack.Screen name="WhyPoints" component={WhyPointsScreen} />
      <Stack.Screen name="How It Works" component={HowItWorksScreen} />
      <Stack.Screen name="Why EduBoost" component={WhyEduBoostScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Terms & Conditions" component={TermsScreen} />
      <Stack.Screen name="Privacy Policy" component={PrivacyScreen} />
      <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="Career" component={Career} />
      <Stack.Screen name="TDCCareers" component={TDCCareers} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Exchange" component={ExchangeScreen} />
      <Stack.Screen name="ApplicationForm" component={ApplicationForm} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
      <Stack.Screen name="EnhancedCareer" component={EnhancedCareerScreen} />
      <Stack.Screen name="Card" component={Card} />
      <Stack.Screen name="DigitalBadge" component={DigitalBadgeScreen} />
      <Stack.Screen name="MainCharacter" component={MainCharacterScreen} />
      <Stack.Screen name="DeftPro" component={DeftProScreen} />
      <Stack.Screen name="DeftGoat" component={DeftGoatScreen} />
      <Stack.Screen name="FounderCircle" component={FounderCircleScreen} />
      <Stack.Screen name="SocialStack" component={SocialStackNavigator} />
      <Stack.Screen name="Social" component={Social} />
      <Stack.Screen name="Messages" component={Social} />
      <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="FloatingMenu" component={FloatingMenu} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} />
      <Stack.Screen name="FeedScreen" component={FeedScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="YourAccount" component={YourAccount} />
      <Stack.Screen name="SecurityAndAccess" component={SecurityAndAccess} />
      <Stack.Screen name="PrivacyAndSafety" component={PrivacyAndSafety} />
      <Stack.Screen name="AccessibilityDisplay" component={AccessibilityDisplay} />
      <Stack.Screen name="HelpCenter" component={HelpCenter} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="Terrms" component={Terrms} />
      <Stack.Screen name="Guideline" component={Guideline} />
      <Stack.Screen name="Events" component={Events} />
      <Stack.Screen name="EventNotification" component={EventNotification} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetails} />
      <Stack.Screen name="MyDiscountScreen" component={MyDiscountScreen} />
      <Stack.Screen name="Explore" component={Explore} />
      <Stack.Screen name="Brands" component={Brands} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
      <Stack.Screen name="CityScreen" component={CityScreen} />
      <Stack.Screen
        name="OfferScreen"
        component={OfferScreen}
        options={{ animation: 'slide_from_right' }}
        getId={({ params }) => params?.brand?._id}
      />
      <Stack.Screen name="TDCFlow" component={TDCFlow} />
    </Stack.Navigator>
  );
}

// ============================================================
// ROOT DRAWER NAVIGATOR
// ============================================================
export default function DrawerNavigator() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ route }) => {
          const deepestRouteName = getDeepestRouteName(route);
          const shouldDisableDrawer =
            deepestRouteName && FULLSCREEN_SCREENS.includes(deepestRouteName);

          return {
            drawerStyle: styles.drawerStyle,
            sceneContainerStyle: { backgroundColor: '#fff' },
            swipeEnabled: !shouldDisableDrawer,
            swipeEdgeWidth: shouldDisableDrawer ? 0 : 50,
            headerShown: false,
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: { opacity: progress },
            }),
          };
        }}
      >
        <Drawer.Screen
          name="HomeTabs"
          component={HomeStackNavigator}
          options={({ route }) => {
            const deepestRouteName = getDeepestRouteName(route);
            const shouldDisableDrawer =
              deepestRouteName && FULLSCREEN_SCREENS.includes(deepestRouteName);

            return {
              unmountOnBlur: false,
              headerShown: false,
              swipeEnabled: !shouldDisableDrawer,
            };
          }}
        />

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
          name="Dashboard"
          component={DashboardStackNavigator}
          options={{ headerShown: false, unmountOnBlur: false }}
        />

        <Drawer.Screen
          name="SocialStack"
          component={SocialStackNavigator}
          options={{ headerShown: false, swipeEnabled: false, unmountOnBlur: false }}
        />

        <Drawer.Screen
          name="Rewards"
          component={RewardsScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="Points"
          component={PointsScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="WhyPoints"
          component={WhyPointsScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="How It Works"
          component={HowItWorksScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="About"
          component={AboutScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="Terms & Conditions"
          component={TermsScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="Privacy Policy"
          component={PrivacyScreen}
          options={{ headerShown: false }}
        />

        <Drawer.Screen
          name="Disclaimer"
          component={DisclaimerScreen}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  drawerStyle: {
    width: width * 0.85,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  drawerScrollContent: {
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  drawerHeader: {
    marginBottom: 8,
    borderBottomRightRadius: 25,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginTop: 0,
  },
  drawerHeaderGradient: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f9c349',
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  avatarGlow: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f9c349',
    opacity: 0.6,
  },
  headerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  badgeWrapper: {
    marginTop: 6,
  },
  premiumBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  premiumText: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  drawerItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: 'rgba(249, 195, 73, 0.12)',
  },
  drawerItemPressed: {
    transform: [{ scale: 0.96 }],
  },
  drawerItemIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  drawerItemIconActive: {
    backgroundColor: 'rgba(249, 195, 73, 0.2)',
  },
  drawerItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.2,
    flex: 1,
  },
  drawerItemLabelActive: {
    color: '#f9c349',
    fontWeight: '700',
  },
  drawerItemActiveIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#f9c349',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#f8f9fa',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f9c349',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    marginLeft: 12,
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 16,
  },
  guestDrawerFooter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestDrawerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
  },
  signInDrawerBtn: {
    width: '100%',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  signInDrawerText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 10,
  },
  createAccountDrawerBtn: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f9c349',
    width: '100%',
    marginBottom: 10,
  },
  createAccountDrawerText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 10,
  },
  guestBenefitText: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginTop: 2,
    lineHeight: 16,
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
    marginLeft: 40,
  },
  headerAppTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.8,
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