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
  Platform,
} from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  FontAwesome,
} from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
// Context & Navigators
import { AuthContext } from "../context/AuthContext";
import TabNavigator from "./TabNavigator";

// Screens
import BrandOffersScreen from "../screens/BrandOffersScreen";
import ProfileScreen from "../screens/ProfileScreen";
import University from "../screens/University";
import ProfileDetails from "../screens/ProfileDetailsScreen";
import Brands from "../screens/Brands";
import ContactUs from "../components/ContactUs";
import PointsScreen from "../components/Points";
import WhyPointsScreen from "../components/WhyPoints";
import HowItWorksScreen from "../components/HowItsWorks";
import HowToRedeemScreen from "../components/HowToRedeem";
import AppIntroScreen from "../components/AppIntro";
import WhyEduBoostScreen from "../components/WhyEduBoost";
import AboutScreen from "../components/AboutScreen";
import TermsScreen from "../components/Terms";
import PrivacyScreen from "../components/Privacy";
import DisclaimerScreen from "../components/Disclaimer";
import FAQScreen from "../components/FAQ";
import Card from "../components/Card";
import NotificationModal from "../components/NotificationModal";
import Career from "../components/Career";
import ExchangeScreen from '../components/ExchangeScreen';
import ApplicationForm from '../components/ApplicationForm';
import BookingScreen from '../components/BookingScreen';
import PaymentScreen from '../components/PaymentScreen';
import Courses from "../screens/Courses/Courses"
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
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
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

const { width } = Dimensions.get("window");
const Drawer = createDrawerNavigator();

const openWhatsApp = async () => {
  const phoneNumber = "923222969595";
  const message = "Hello TDC Support Team,\n\nI am using The Deft Crew app and need assistance with [mention issue].\n\nThank you!";
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
    Alert.alert("Error", "WhatsApp is not installed or could not be opened.");
  }
};

// --- CUSTOM DRAWER CONTENT ---
function CustomDrawerContent(props) {
  const { logout } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderSectionLabel = (label) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionText}>{label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <DrawerContentScrollView {...props} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.drawerHeaderBG}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerContent}>
              <View style={styles.avatarCircle}>
                <Text style={{color:"white", fontSize:23, fontWeight:800, fontFamily:"Cardo",}}>tdc</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.headerTitle}>The Deft Crew</Text>
                <Text style={styles.headerSubtitle}>Student Rewards</Text>
              </View>
              <TouchableOpacity
                onPress={() => props.navigation.closeDrawer()}
                style={styles.closeIcon}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 20 }}>
          {/* GROUP 1: MAIN NAVIGATION */}
          {renderSectionLabel("Discovery")}
          <DrawerItem
            label="Home"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="home-outline" color="#666" size={size} />
            )}
            onPress={() => props.navigation.navigate("HomeTabs")}
          />
          <DrawerItem
            label="Crew's Privilege Brands"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="shopping-outline"
                color="#666"
                size={size}
              />
            )}
            onPress={() => props.navigation.navigate("Brands")}
          />
          <DrawerItem
            label="User Dashboard"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <FontAwesome5 name="user-circle" color="#666" size={size - 2} />
            )}
            onPress={() => props.navigation.navigate("Profile")}
          />

          {/* GROUP 2: REWARDS SYSTEM */}
          {renderSectionLabel("Rewards")}

          <DrawerItem
            label="Refer & Earn"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="account-multiple-plus-outline"
                size={size}
                color="#666"
              />
            )}
            onPress={() => props.navigation.navigate("Points")}
          />

          <DrawerItem
            label="Privilege Benefits"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="trophy-outline"
                size={size}
                color="#666"
              />
            )}
            onPress={() => props.navigation.navigate("WhyPoints")}
          />

          <DrawerItem
            label="Redeem"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="gift-outline"
                size={size}
                color="#666"
              />
            )}
            onPress={() => props.navigation.navigate("How to Redeem")}
          />
          <View style={styles.divider} />

          {/* GROUP 3: SUPPORT */}
          {renderSectionLabel("Support & Help")}
          <DrawerItem
            label="How it Works"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="cog-outline" color="#666" size={size} />
            )}
            onPress={() => props.navigation.navigate("How It Works")}
          />
          <DrawerItem
            label="Contact Us"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="mail-unread-outline" color="#666" size={size} />
            )}
            onPress={() => props.navigation.navigate("ContactUs")}
          />
          <DrawerItem
            label="Chat on WhatsApp"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <FontAwesome name="whatsapp" color="#25D366" size={size} />
            )}
            onPress={openWhatsApp}
          />
          <DrawerItem
            label="FAQ"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="chatbubbles-outline" color="#666" size={size} />
            )}
            onPress={() => props.navigation.navigate("FAQ")}
          />

          <View style={styles.divider} />

          {/* GROUP 4: ABOUT & LEGAL */}
          {renderSectionLabel("Information")}
          <DrawerItem
            label="About TDC"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons
                name="information-circle-outline"
                color="#999"
                size={size}
              />
            )}
            onPress={() => props.navigation.navigate("About")}
          />
          <DrawerItem
            label="App Introduction"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="play-outline" color="#999" size={size} />
            )}
            onPress={() => props.navigation.navigate("App Intro")}
          />
          <DrawerItem
            label="Privacy Policy"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="shield-lock-outline"
                color="#999"
                size={size}
              />
            )}
            onPress={() => props.navigation.navigate("Privacy Policy")}
          />
          <DrawerItem
            label="Terms & Conditions"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="file-document-outline"
                color="#999"
                size={size}
              />
            )}
            onPress={() => props.navigation.navigate("Terms & Conditions")}
          />
          <DrawerItem
            label="Disclaimer"
            labelStyle={{ color: '#000000' }}
            icon={({ size }) => (
              <Ionicons name="alert-circle-outline" color="#999" size={size} />
            )}
            onPress={() => props.navigation.navigate("Disclaimer")}
          />
        </Animated.View>
      </DrawerContentScrollView>

      {/* FOOTER: LOGOUT */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert("Logout", "Sign out of your account?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => logout(props.navigation),
              },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={22} color="#d32f2f" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- CUSTOM HEADER COMPONENT ---
function CustomHeader({ navigation }) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchWidth = useRef(new Animated.Value(0)).current;
  const { unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  const [notifVisible, setNotifVisible] = useState(false);

  useEffect(() => {
    if (token) updateUnreadCount();
  }, [token]);

  const toggleSearch = useCallback(() => {
    if (searchVisible) {
      Animated.timing(searchWidth, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSearchVisible(false);
        setSearchQuery(""); 
      });
    } else {
      setSearchVisible(true);
      Animated.timing(searchWidth, {
        toValue: width * 0.6, 
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [searchVisible]);

  const submitSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length > 0) {
      navigation.navigate("Brands", { 
        query: trimmedQuery,
        timestamp: Date.now() 
      });
      toggleSearch(); 
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.headerMain}>
        {/* Drawer Toggle */}
        {!searchVisible && (
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.headerCircleBtn}>
            <Ionicons name="menu-outline" size={24} color="#333" />
          </TouchableOpacity>
        )}

        <View style={styles.headerCenter}>
          {searchVisible ? (
            <Animated.View style={[styles.headerSearchWrap, { width: searchWidth }]}>
              <TextInput 
                style={styles.headerInput} 
                placeholder="Search brands..." 
                autoFocus 
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={submitSearch}
                returnKeyType="search"
                placeholderTextColor="#999"
              />
            </Animated.View>
          ) : (
            <Text style={styles.headerAppTitle}>The Deft Crew</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleSearch} style={styles.headerCircleBtn}>
            <Ionicons name={searchVisible ? "close" : "search-outline"} size={22} color="#333" />
          </TouchableOpacity>

          {!searchVisible && (
            <TouchableOpacity
              onPress={() => setNotifVisible(true)}
              style={[styles.headerCircleBtn, { marginLeft: 12 }]}
            >
              <Ionicons name="notifications-outline" size={22} color="#333" />
              {unreadCount > 0 && (
                <View style={styles.badges}>
                  <Text style={styles.badgeTexts}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <NotificationModal 
        visible={notifVisible} 
        onClose={() => setNotifVisible(false)} 
      />
    </SafeAreaView>
  );
}

// --- MAIN NAVIGATOR ---
export default function DrawerNavigator() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }} edges={['top', 'left', 'right']}>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ route, navigation }) => ({
          drawerStyle: { width: width * 0.82 },
          header: (props) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
            if (routeName === "Traveling" || routeName === "Social") {
              return null;
            }
            return <CustomHeader navigation={navigation} />;
          },
        })}
      >
        <Drawer.Screen name="HomeTabs" component={TabNavigator} />
        <Drawer.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Drawer.Screen 
          name="Travelling" 
          component={TravelingScreen} 
          options={{ headerShown: false }} 
        />
        <Drawer.Screen name="Brands" component={Brands} />
        <Drawer.Screen name="Card" component={Card} />
        
        {/* Dynamic Screen Generation to keep code clean */}
        {[
          { name: "University", comp: University },
          { name: "ContactUs", comp: ContactUs },
          { name: "ProfileDetails", comp: ProfileDetails },
          { name: "BrandOffers", comp: BrandOffersScreen },
          { name: "Points", comp: PointsScreen },
          { name: "WhyPoints", comp: WhyPointsScreen },
          { name: "How It Works", comp: HowItWorksScreen },
          { name: "How to Redeem", comp: HowToRedeemScreen },
          { name: "App Intro", comp: AppIntroScreen },
          { name: "Why EduBoost", comp: WhyEduBoostScreen },
          { name: "About", comp: AboutScreen },
          { name: "Terms & Conditions", comp: TermsScreen },
          { name: "Privacy Policy", comp: PrivacyScreen },
          { name: "Disclaimer", comp: DisclaimerScreen },
          { name: "FAQ", comp: FAQScreen },
          { name: "Career", comp: Career },
          { name: "Booking", comp: BookingScreen },
          { name: "Exchange", comp: ExchangeScreen },
          { name: "ApplicationForm", comp: ApplicationForm },
          { name: "Payment", comp: PaymentScreen },
          { name: "Courses", comp: Courses },
          { name: "AiSkillsScreen", comp: AISkillsScreen },
          { name: "CourseDetailScreen", comp: CourseDetailScreen },
          { name: "EnrollmentFormScreen", comp: EnrollmentFormScreen },
          { name: "ResumeDashboard", comp: ResumeDashboard},
          { name: "ResumeBuilder", comp: ResumeBuilder},
          { name: "Social", comp: Social },
          { name: "MessagesScreen", comp: MessagesScreen},
          { name: "ChatDetailScreen", comp: ChatDetailScreen},
          { name: "Notifications", comp: NotificationScreen},
          { name: "UserProfile", comp: UserProfile},
          { name: "SettingsScreen", comp: SettingsScreen},
          { name: "YourAccount", comp: YourAccount},
          { name: "SecurityAndAccess", comp: SecurityAndAccess},
          { name: "PrivacyAndSafety", comp: PrivacyAndSafety},
          { name: "AccessibilityDisplay", comp: AccessibilityDisplay},
          { name: "HelpCenter", comp: HelpCenter},
          { name: "FloatingMenu", comp: FloatingMenu},
          { name: "EditProfileScreen", comp: EditProfileScreen},
          { name: "Events", comp: Events},
          { name: "EventNotification", comp: EventNotification},
          { name: "PostDetailScreen", comp: PostDetailScreen},
          { name: "PDFViewer", comp: PDFViewer},
          { name: "TemplateSelection", comp: TemplateSelection},
          { name: "TDCFlow", comp: TDCFlow}
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
  // Drawer Header
  drawerHeaderBG: {
    backgroundColor: "#000000",
    paddingBottom: 5,
    borderBottomRightRadius: 35,
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 8 : 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 12,
    fontFamily: "Cardo",
  },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    fontFamily: "Cardo",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    fontFamily: "Cardo",
  },
  closeIcon: {
    position: "absolute",
    right: 15,
    top: Platform.OS === 'ios' ? 10 : 15,
  },

  // Sections
  sectionContainer: {
    marginTop: 20,
    marginLeft: 18,
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: "Cardo",
  },
  divider: {
    height: 1,
    backgroundColor: "#f4f4f4",
    marginVertical: 10,
    marginHorizontal: 15,
  },

  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f4f4f4",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    padding: 14,
    borderRadius: 15,
    fontFamily: "Cardo",
  },
  logoutText: {
    marginLeft: 12,
    color: "#d32f2f",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Cardo",
  },

  // Custom Header - Fixed Padding and Height
  headerSafe: {
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 1 },
  },
  headerMain: {
    height: Platform.OS === 'ios' ? 60 : 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    paddingBottom:40,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAppTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: -0.5,
    fontFamily: "Cardo",
  },
  headerSearchWrap: {
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  headerInput: {
    fontSize: 15,
    color: "#333",
    padding: 0,
    margin: 0,
  },
  badges: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeTexts: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
});