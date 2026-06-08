import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StatusBar,
  Animated,
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from 'expo-haptics';
import aiService from "../services/aiService";

const { width } = Dimensions.get('window');

const predefinedQuestions = [
  { id: 1, text: "💎 How to earn points?", icon: "star", color: "#f9c349" },
  { id: 2, text: "🎁 Referral program", icon: "gift", color: "#f9c349" },
  { id: 3, text: "👑 TDC Premium benefits", icon: "crown", color: "#f9c349" },
  { id: 4, text: "🛍️ Brand discounts", icon: "tag", color: "#f9c349" },
  { id: 5, text: "📞 Contact support", icon: "headset", color: "#f9c349" },
];

const ChatBotScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef();
  const inputRef = useRef();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    if (backendStatus === 'connected') pulse.start();
    else pulse.stop();
    return () => pulse.stop();
  }, [backendStatus]);

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      await aiService.loadConversationHistory();
      const isHealthy = await aiService.checkBackendHealth();
      setBackendStatus(isHealthy ? 'connected' : 'offline');
      setMessages([{
        id: "1",
        text: isHealthy 
          ? "✨ Hi there! I'm your TDC AI assistant. How can I make your experience amazing today? 🚀"
          : "👋 Hi! I'm TDC Assistant. I'm currently in offline mode but I can still help with basic questions! 💪",
        sender: "bot",
        timestamp: new Date(),
      }]);
    };
    initialize();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { keyboardDidShow.remove(); keyboardDidHide.remove(); };
  }, []);

  // Android back handler
  useEffect(() => {
    const onBackPress = () => {
      if (showMenu) { setShowMenu(false); return true; }
      navigation.navigate('Home');
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [navigation, showMenu]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages, isTyping]);

  // Modal animations
  const openMenu = () => {
    setShowMenu(true);
    modalScale.setValue(0.9);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowMenu(false));
  };

  const handleSend = async (textParam) => {
    const messageText = textParam || input;
    if (!messageText.trim() || isLoading) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg = { id: Date.now().toString(), text: messageText.trim(), sender: "user", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const replyData = await aiService.sendMessage(messageText.trim());
      const botMsg = { id: (Date.now() + 1).toString(), text: replyData.text, sender: "bot", timestamp: new Date(), showContactBtn: replyData.showContactBtn || false };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg = { id: (Date.now() + 1).toString(), text: "😅 Oops! Something went wrong. Please try again.", sender: "bot", timestamp: new Date(), showContactBtn: true };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearChatHistory = () => {
    Alert.alert("Clear Conversation", "Are you sure you want to clear all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => {
        aiService.clearHistory();
        setMessages([{ id: Date.now().toString(), text: "✨ Conversation cleared! Ready to help you again. 🚀", sender: "bot", timestamp: new Date() }]);
        closeMenu();
      }},
    ]);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const diff = new Date() - new Date(timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const renderMessage = ({ item, index }) => {
    const isLast = index === messages.length - 1;
    return (
      <Animated.View style={[
        styles.messageRow,
        item.sender === "user" ? styles.userRow : styles.botRow,
        isLast && { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }
      ]}>
        {item.sender === "bot" && (
          <View style={styles.botAvatar}>
            <View style={styles.botAvatarInner}>
              <MaterialCommunityIcons name="robot-outline" size={18} color="#f9c349" />
            </View>
          </View>
        )}
        <View style={[styles.bubble, item.sender === "user" ? styles.userBubble : styles.botBubble]}>
          <Text style={item.sender === "user" ? styles.userText : styles.botText}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            {item.sender === "user" && <Ionicons name="checkmark-done" size={10} color="rgba(255,255,255,0.5)" />}
          </View>
        </View>
        {item.showContactBtn && (
          <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate("ContactUs")} activeOpacity={0.8}>
            <Ionicons name="headset-outline" size={14} color="#1a1a1a" />
            <Text style={styles.contactBtnText}>Contact Support</Text>
            <Ionicons name="arrow-forward" size={12} color="#1a1a1a" />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderTyping = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.messageRow, styles.botRow]}>
        <View style={styles.botAvatar}>
          <View style={styles.botAvatarInner}>
            <MaterialCommunityIcons name="robot-outline" size={18} color="#f9c349" />
          </View>
        </View>
        <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      </View>
    );
  };

  const QuickCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.quickCard} onPress={() => onPress(item.text)} activeOpacity={0.7}>
      <View style={[styles.quickIcon, { backgroundColor: '#f9c34915' }]}>
        <FontAwesome5 name={item.icon} size={14} color="#f9c349" />
      </View>
      <Text style={styles.quickText}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerIconBox}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#1a1a1a" />
            </View>
            <View>
              <Text style={styles.headerTitle}>tdc<Text style={{color:'#f9c349'}}>.</Text> Assistant</Text>
              <View style={styles.statusRow}>
                <Animated.View style={[styles.statusDot, { 
                  backgroundColor: backendStatus === 'connected' ? '#4CAF50' : '#FF6B6B',
                  transform: [{ scale: pulseAnim }]
                }]} />
                <Text style={styles.statusLabel}>
                  {backendStatus === 'connected' ? 'AI Online' : 'Offline Mode'}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity onPress={openMenu} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </Animated.View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListFooterComponent={renderTyping}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Quick Questions */}
        {messages.length < 3 && (
          <View style={styles.quickSection}>
            <View style={styles.quickHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.quickTitle}>Quick Questions</Text>
            </View>
            <FlatList
              data={predefinedQuestions}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <QuickCard item={item} onPress={handleSend} />}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.quickList}
            />
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputSection, { paddingBottom: Platform.OS === 'ios' ? 8 : 10 }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!input.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <Ionicons name="send" size={16} color="#1a1a1a" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Animated.View style={[styles.menuModal, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.menuHeader}>
                <View style={styles.menuHandle} />
                <Text style={styles.menuTitle}>Options</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={clearChatHistory} activeOpacity={0.7}>
                <View style={[styles.menuIconBox, { backgroundColor: '#f9c34915' }]}>
                  <Ionicons name="trash-outline" size={18} color="#f9c349" />
                </View>
                <Text style={styles.menuItemText}>Clear Chat History</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={closeMenu} activeOpacity={0.7}>
                <View style={styles.menuIconBox}>
                  <Ionicons name="close-outline" size={18} color="#1a1a1a" />
                </View>
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ height: Platform.OS === 'ios' ? 20 : 10 }} />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconBox: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#f9c349',
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, color: "#999", fontWeight: "600" },

  // Messages
  messagesList: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  messageRow: { marginBottom: 16, flexDirection: "column" },
  userRow: { alignItems: "flex-end" },
  botRow: { alignItems: "flex-start", flexDirection: "row" },
  botAvatar: { marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 },
  botAvatarInner: {
    width: 30, height: 30, borderRadius: 12, backgroundColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center",
  },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  userBubble: { backgroundColor: "#1a1a1a", borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: "#f8f8f8", borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#f0f0f0' },
  userText: { color: "#ffffff", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  botText: { color: "#1a1a1a", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  messageFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  timestamp: { fontSize: 9, color: "#999", fontWeight: "500" },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 14 },
  typingDots: { flexDirection: "row", gap: 3 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ccc" },
  contactBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#f9c349",
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, marginTop: 6,
    marginLeft: 38, gap: 6, alignSelf: "flex-start",
  },
  contactBtnText: { color: "#1a1a1a", fontSize: 11, fontWeight: "700" },

  // Quick Questions
  quickSection: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  quickHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f9c349', marginRight: 8 },
  quickTitle: { fontSize: 13, fontWeight: "800", color: "#1a1a1a" },
  quickList: { gap: 8 },
  quickCard: {
    backgroundColor: "#ffffff", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, marginRight: 8, flexDirection: "row", alignItems: "center",
    gap: 8, borderWidth: 2, borderColor: '#f0f0f0',
  },
  quickIcon: { width: 28, height: 28, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  quickText: { fontSize: 12, fontWeight: "600", color: "#1a1a1a" },

  // Input
  inputSection: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", backgroundColor: "#f8f8f8",
    borderRadius: 18, borderWidth: 2, borderColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4,
  },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#1a1a1a", maxHeight: 100, fontWeight: '500' },
  sendBtn: { backgroundColor: "#f9c349", width: 38, height: 38, borderRadius: 14, justifyContent: "center", alignItems: "center", marginLeft: 4 },
  sendBtnDisabled: { backgroundColor: "#f0f0f0" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  menuModal: { backgroundColor: "#ffffff", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  menuHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 12 },
  menuTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: "center", alignItems: "center" },
  menuItemText: { fontSize: 14, color: "#1a1a1a", fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 20 },
});

export default ChatBotScreen;