import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  StatusBar,
  
  Dimensions,
  ScrollView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ContactUsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openDial = () => Linking.openURL("tel:+923222969595");
  const openEmail = () => Linking.openURL("mailto:hello@thedeftcrew.com");
  const openWhatsApp = () => Linking.openURL("https://wa.me/923222969595");
  const openSocial = (url) => Linking.openURL(url);

  const ContactItem = ({ icon, label, value, onPress, iconColor, isLast }) => (
    <TouchableOpacity 
      style={[styles.item, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
          {icon}
        </View>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color="#CBD5E0" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* HERO SECTION */}
          <View style={styles.heroSection}>
            <View style={styles.logoWrapper}>
              <View style={styles.mainCircle}>
                <Icon name="headset-outline" size={40} color="#fff" />
              </View>
              <View style={styles.smallCircle} />
            </View>
            <Text style={styles.appName}>Get in Touch</Text>
            <Text style={styles.subtitle}>Our team at TDC is ready to assist you{'\n'}with any student offer queries.</Text>
          </View>

          {/* CONTACT CARD */}
          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <ContactItem 
                icon={<Icon name="call" size={20} color="#000000" />}
                label="Customer Care"
                value="+92 322 2969595"
                onPress={openDial}
                iconColor="#08634f"
              />
              <ContactItem 
                icon={<MaterialIcons name="email" size={20} color="#000000" />}
                label="Official Email"
                value="hello@thedeftcrew.com"
                onPress={openEmail}
                iconColor="#000000"
              />
              <ContactItem 
                icon={<FontAwesome name="whatsapp" size={22} color="#25D366" />}
                label="WhatsApp Support"
                value="+92 322 2969595"
                onPress={openWhatsApp}
                iconColor="#25D366"
                isLast={true}
              />
            </View>
          </View>

          {/* SOCIAL MEDIA SECTION */}
          <View style={styles.socialSection}>
            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.socialText}>Connect with us</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              {[
                { name: 'facebook', color: '#1877F2', url: 'https://www.facebook.com/share/19rjCzPuhH/' },
                { name: 'instagram', color: '#E4405F', url: 'https://www.instagram.com/thedeftcrew?igsh=MWRnc3RnZ3hkN2s0Yw==' },
                { name: 'linkedin', color: '#0A66C2', url: 'https://www.linkedin.com/company/thedeftcrew/' },
                
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.socialButton} 
                  onPress={() => openSocial(item.url)}
                  activeOpacity={0.8}
                >
                  <FontAwesome name={item.name} size={22} color={item.color} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Powered by TDC</Text>
            <Text style={styles.versionText}>v1.0.4 • Secure Connection</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
    marginTop:20,
    // paddingBottom:10,
    marginBottom:10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#fff",
    marginTop:15
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A202C",
    letterSpacing: -0.5,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 30,
  },
  logoWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  mainCircle: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#08634f",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  smallCircle: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#25D366",
    borderWidth: 3,
    borderColor: "#F7FAFC",
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1A202C",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A0AEC0",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D3748",
    marginTop: 2,
  },
  socialSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  socialText: {
    marginHorizontal: 15,
    color: "#A0AEC0",
    fontSize: 13,
    fontWeight: "900",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    fontWeight:"900"
  },
  socialButton: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  footer: {
    marginTop: 40,
    marginBottom: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    opacity: 0.8,
  },
  versionText: {
    fontSize: 11,
    color: "#CBD5E0",
    marginTop: 4,
    fontWeight:"900",
    fontFamily:"Cardo"
  },
});