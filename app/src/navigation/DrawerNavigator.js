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
import HowToRedeemScreen from '../components/HowToRedeem';
import AppIntroScreen from '../components/AppIntro';
import WhyEduBoostScreen from '../components/WhyEduBoost';
import AboutScreen from '../components/AboutScreen';
import TermsScreen from '../components/Terms';
import PrivacyScreen from '../components/Privacy';
import DisclaimerScreen from '../components/Disclaimer';
import FAQScreen from '../components/FAQ';
import Card from '../components/Card';
import NotificationModal from '../components/NotificationModal';
import Career from '../components/Career';
import ExchangeScreen from '../components/ExchangeScreen';
import ApplicationForm from '../components/ApplicationForm';
import BookingScreen from '../components/BookingScreen';
import PaymentScreen from '../components/PaymentScreen';
import Courses from '../screens/Courses/Courses';
import AISkillsScreen from '../screens/Courses/AiSkillsScreen';
import CourseDetailScreen from '../screens/Courses/CourseDetailScreen';
import EnrollmentFormScreen from '../screens/Courses/EnrollmentFormScreen';
import ResumeDashboard from '../screens/Resume/ResumeDashboard';
import ResumeBuilder from '../screens/Resume/ResumeBuilder';
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
import PDFViewer from '../screens/Resume/PdfViewer';
import TemplateSelection from '../screens/Resume/TemplateScreen';
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

const { width } = Dimensions.get('window');
const Drawer = createDrawerNavigator();

const DRAWER_ITEMS = [
  {
    section: 'Discovery',
    items: [
      {
        label: 'Home',
        icon: (size) => <Ionicons name="home-outline" color="#f9c349" size={size} />,
        route: 'HomeTabs',
      },
      {
        label: "Crew's Privilege Brands",
        icon: (size) => (
          <MaterialCommunityIcons name="shopping-outline" color="#f9c349" size={size} />
        ),
        route: 'Brands',
      },
      {
        label: 'User Dashboard',
        icon: (size) => <FontAwesome5 name="user-circle" color="#f9c349" size={size - 2} />,
        route: 'Profile',
      },
    ],
  },
  {
    section: 'Rewards',
    items: [
      {
        label: 'Refer & Earn',
        icon: (size) => (
          <MaterialCommunityIcons
            name="account-multiple-plus-outline"
            size={size}
            color="#f9c349"
          />
        ),
        route: 'Points',
      },
      {
        label: 'Privilege Benefits',
        icon: (size) => (
          <MaterialCommunityIcons name="trophy-outline" size={size} color="#f9c349" />
        ),
        route: 'WhyPoints',
      },
      {
        label: 'Redeem',
        icon: (size) => (
          <MaterialCommunityIcons name="gift-outline" size={size} color="#f9c349" />
        ),
        route: 'How to Redeem',
      },
    ],
  },
  {
    section: 'Support & Help',
    items: [
      {
        label: 'How it Works',
        icon: (size) => <Ionicons name="cog-outline" color="#f9c349" size={size} />,
        route: 'How It Works',
      },
      {
        label: 'Contact Us',
        icon: (size) => <Ionicons name="mail-unread-outline" color="#f9c349" size={size} />,
        route: 'ContactUs',
      },
      {
        label: 'Chat on WhatsApp',
        icon: (size) => <FontAwesome name="whatsapp" color="#25D366" size={size} />,
        action: 'whatsapp',
      },
      {
        label: 'FAQ',
        icon: (size) => <Ionicons name="chatbubbles-outline" color="#f9c349" size={size} />,
        route: 'FAQ',
      },
    ],
  },
  {
    section: 'Information',
    items: [
      {
        label: 'About TDC',
        icon: (size) => (
          <Ionicons name="information-circle-outline" color="#f9c349" size={size} />
        ),
        route: 'About',
      },
      {
        label: 'App Introduction',
        icon: (size) => <Ionicons name="play-outline" color="#f9c349" size={size} />,
        route: 'App Intro',
      },
      {
        label: 'Privacy Policy',
        icon: (size) => (
          <MaterialCommunityIcons name="shield-lock-outline" color="#f9c349" size={size} />
        ),
        route: 'Privacy Policy',
      },
      {
        label: 'Terms & Conditions',
        icon: (size) => (
          <MaterialCommunityIcons name="file-document-outline" color="#f9c349" size={size} />
        ),
        route: 'Terms & Conditions',
      },
      {
        label: 'Disclaimer',
        icon: (size) => <Ionicons name="alert-circle-outline" color="#f9c349" size={size} />,
        route: 'Disclaimer',
      },
    ],
  },
];

const openWhatsApp = async () => {
  const phoneNumber = '923222969595';
  const message =
    'Hello TDC Support Team,\n\nI am using The Deft Crew app and need assistance with [mention issue].\n\nThank you!';
  const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
  const fallbackUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    Alert.alert('Error', 'WhatsApp is not installed or could not be opened.');
  }
};

const AnimatedDrawerItem = ({ label, icon, onPress, delay = 0 }) => {
  const translateX = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 180,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateX]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <DrawerItem
        label={label}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
        icon={({ size }) => icon(size)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      />
    </Animated.View>
  );
};

const AnimatedSectionLabel = ({ label, delay = 0 }) => {
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 160,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.sectionContainer,
        { opacity, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={styles.sectionLine} />
      <Text style={styles.sectionText}>{label}</Text>
    </Animated.View>
  );
};

function CustomDrawerContent(props) {
  const { logout } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  let delay = 50;

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
                <Text style={styles.headerTitle}>The Deft Crew</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>STUDENTS REWARDS</Text>
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
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 20 }}>
          {DRAWER_ITEMS.map((group, groupIndex) => (
            <View key={group.section}>
              <AnimatedSectionLabel label={group.section} delay={groupIndex * 40} />

              {group.items.map((item) => {
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

              {groupIndex !== DRAWER_ITEMS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
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
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert('Logout', 'Sign out of your account?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: () => logout(props.navigation),
              },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={22} color="#f9c349" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function CustomHeader({ navigation }) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchWidth = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const { unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  const [notifVisible, setNotifVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (token) {
      updateUnreadCount();
    }

    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [headerOpacity, pulseAnim, token, updateUnreadCount]);

  const toggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (searchVisible) {
      Animated.timing(searchWidth, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        setSearchVisible(false);
        setSearchQuery('');
      });
    } else {
      setSearchVisible(true);
      Animated.timing(searchWidth, {
        toValue: width * 0.5,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [searchVisible, searchWidth]);

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

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Animated.View style={[styles.headerMain, { opacity: headerOpacity }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.toggleDrawer();
          }}
          style={styles.headerCircleBtn}
        >
          <Ionicons name="menu-outline" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {searchVisible ? (
            <Animated.View style={[styles.headerSearchWrap, { width: searchWidth }]}>
              <Ionicons name="search-outline" size={18} color="#f9c349" style={styles.searchIcon} />
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
              <Text style={styles.headerAppTitle}>
                <Text style={{ color: '#000' }}>DEFT</Text>
                <Text style={{ color: '#f9c349' }}>CREW</Text>
              </Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>STUDENT REWARDS</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleSearch} style={styles.headerCircleBtn}>
            <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={20} color="#000" />
          </TouchableOpacity>

          {!searchVisible && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifVisible(true);
              }}
              style={[styles.headerCircleBtn, { marginLeft: 10 }]}
            >
              <Ionicons name="notifications-outline" size={20} color="#000" />
              {unreadCount > 0 && (
                <Animated.View style={[styles.badges, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.badgeTexts}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <NotificationModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </SafeAreaView>
  );
}

export default function DrawerNavigator() {
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
        })}
      >
        <Drawer.Screen name="HomeTabs" component={TabNavigator} />
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
        <Drawer.Screen name="Brands" component={Brands} />

        {[
          { name: 'University', comp: University },
          { name: 'ContactUs', comp: ContactUs },
          { name: 'BrandOffers', comp: BrandOffersScreen },
          { name: 'Points', comp: PointsScreen },
          { name: 'WhyPoints', comp: WhyPointsScreen },
          { name: 'How It Works', comp: HowItWorksScreen },
          { name: 'How to Redeem', comp: HowToRedeemScreen },
          { name: 'App Intro', comp: AppIntroScreen },
          { name: 'Why EduBoost', comp: WhyEduBoostScreen },
          { name: 'About', comp: AboutScreen },
          { name: 'Terms & Conditions', comp: TermsScreen },
          { name: 'Privacy Policy', comp: PrivacyScreen },
          { name: 'Disclaimer', comp: DisclaimerScreen },
          { name: 'FAQ', comp: FAQScreen },
          { name: 'Career', comp: Career },
          { name: 'Booking', comp: BookingScreen },
          { name: 'Exchange', comp: ExchangeScreen },
          { name: 'ApplicationForm', comp: ApplicationForm },
          { name: 'Payment', comp: PaymentScreen },
          { name: 'Courses', comp: Courses },
          { name: 'AiSkillsScreen', comp: AISkillsScreen },
          { name: 'CourseDetailScreen', comp: CourseDetailScreen },
          { name: 'EnrollmentFormScreen', comp: EnrollmentFormScreen },
          { name: 'ResumeDashboard', comp: ResumeDashboard },
          { name: 'ResumeBuilder', comp: ResumeBuilder },
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
          { name: 'PDFViewer', comp: PDFViewer },
          { name: 'TemplateSelection', comp: TemplateSelection },
          { name: 'TDCFlow', comp: TDCFlow },
          { name: 'ProfileScreen', comp: ProfileScreen },
          { name: 'ProfileDetails', comp: ProfileDetails },
          { name: 'Card', comp: Card },
          { name: 'MyDiscountScreen', comp: MyDiscountScreen },
        ].map((item) => (
          <Drawer.Screen
            key={item.name}
            name={item.name}
            component={item.comp}
            options={{ headerShown: false }}
          />
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
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 22,
  },
  premiumText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  drawerItem: {
    borderRadius: 14,
    marginHorizontal: 8,
    marginVertical: 1,
  },
  drawerItemLabel: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: -8,
  },
  sectionContainer: {
    marginTop: 18,
    marginLeft: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLine: {
    width: 4,
    height: 16,
    backgroundColor: '#f9c349',
    marginRight: 8,
    borderRadius: 2,
  },
  sectionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 14,
    marginHorizontal: 15,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSearchWrap: {
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
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
    minWidth: 18,
    height: 18,
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
});