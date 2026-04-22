import React, { useState, useRef, useEffect } from "react";
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

} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import aiService from "../services/aiService";

const { width, height } = Dimensions.get('window');

const predefinedQuestions = [
  { id: 1, text: "💎 How to earn points?", icon: "star", color: "#FFD700" },
  { id: 2, text: "🎁 Referral program", icon: "gift", color: "#FF6B6B" },
  { id: 3, text: "👑 TDC Premium benefits", icon: "crown", color: "#9B59B6" },
  { id: 4, text: "🛍️ Brand discounts", icon: "tag", color: "#3498DB" },
  { id: 5, text: "📞 Contact support", icon: "headset", color: "#2ECC71" },
];

const ChatBotScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Animation for welcome message
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load conversation history and check backend on mount
  useEffect(() => {
    const initialize = async () => {
      await aiService.loadConversationHistory();
      
      const isHealthy = await aiService.checkBackendHealth();
      setBackendStatus(isHealthy ? 'connected' : 'offline');
      
      setMessages([
        {
          id: "1",
          text: isHealthy 
            ? "✨ Hi there! I'm your AI shopping assistant. How can I make your TDC experience amazing today? 🚀"
            : "👋 Hi! I'm TDC Assistant. I'm currently in offline mode but I can still help with basic questions! 💪",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    };
    initialize();
  }, []);

  // Android back button handler - FIXED with navigate
  useEffect(() => {
    const onBackPress = () => {
      // Navigate to Home screen when back button is pressed
      navigation.navigate('Home');
      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, isTyping]);

  const handleSend = async (textParam) => {
    const messageText = textParam || input;
    if (!messageText.trim() || isLoading) return;

    // Add user message with animation
    const userMsg = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const replyData = await aiService.sendMessage(messageText.trim());
      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        text: replyData.text,
        sender: "bot",
        timestamp: new Date(),
        showContactBtn: replyData.showContactBtn || false,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Send message error:", error);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        text: "😅 Oops! Something went wrong. Please check your connection and try again.",
        sender: "bot",
        timestamp: new Date(),
        showContactBtn: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearChatHistory = () => {
    Alert.alert(
      "Clear Conversation",
      "Are you sure you want to clear all messages?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            aiService.clearHistory();
            setMessages([
              {
                id: Date.now().toString(),
                text: "✨ Conversation cleared! Ready to help you again. What would you like to know? 🚀",
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            setShowMenu(false);
          },
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item, index }) => {
    const isLastMessage = index === messages.length - 1;
    
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userMessageContainer : styles.botMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {item.sender === "bot" && (
          <View style={styles.botAvatarContainer}>
            <View style={styles.botAvatar}>
              <MaterialCommunityIcons name="robot-happy" size={22} color="#FFF" />
            </View>
          </View>
        )}
        
        <View style={[
          styles.bubble,
          item.sender === "user" ? styles.userBubble : styles.botBubble
        ]}>
          <View style={styles.messageContent}>
            <Text style={[
              item.sender === "user" ? styles.userText : styles.botText
            ]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>
                {formatTime(item.timestamp)}
              </Text>
              {item.sender === "user" && (
                <Ionicons name="checkmark-done" size={12} color="#9ca3af" />
              )}
            </View>
          </View>
        </View>
        
        {item.showContactBtn && (
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate("ContactUs")}
          >
            <Ionicons name="headset-outline" size={18} color="#FFF" />
            <Text style={styles.contactButtonText}>Contact Support Team</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.messageContainer, styles.botMessageContainer]}>
        <View style={styles.botAvatarContainer}>
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot-happy" size={22} color="#FFF" />
          </View>
        </View>
        <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  const QuickQuestionCard = ({ item, onPress }) => (
    <TouchableOpacity 
      style={styles.quickCard}
      onPress={() => onPress(item.text)}
      activeOpacity={0.8}
    >
      <View style={[styles.quickIcon, { backgroundColor: item.color + '20' }]}>
        <FontAwesome5 name={item.icon} size={18} color={item.color} />
      </View>
      <Text style={styles.quickCardText}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#1a1a2e" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="robot" size={24} color="#FFF" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerText}>TDC Assistant</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { backgroundColor: backendStatus === 'connected' ? '#4CAF50' : '#FF6B6B' }]} />
                  <Text style={styles.statusText}>
                    {backendStatus === 'connected' ? 'AI Online' : 'Offline Mode'}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#1a1a2e" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            ListFooterComponent={renderTypingIndicator}
            showsVerticalScrollIndicator={false}
          />

          {/* Quick Questions */}
          {messages.length < 3 && (
            <View style={styles.quickContainer}>
              <Text style={styles.quickTitle}>✨ Quick Questions</Text>
              <FlatList
                data={predefinedQuestions}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <QuickQuestionCard item={item} onPress={handleSend} />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.quickList}
              />
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
                placeholderTextColor="#A0A0A0"
                multiline
                maxLength={500}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Modal */}
          <Modal
            visible={showMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
              <View style={styles.menuModal}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Options</Text>
                </View>
                <TouchableOpacity style={styles.menuItem} onPress={clearChatHistory}>
                  <View style={styles.menuIconBg}>
                    <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                  </View>
                  <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Clear Chat History</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <View style={styles.menuIconBg}>
                    <Ionicons name="close-outline" size={22} color="#1a1a2e" />
                  </View>
                  <Text style={styles.menuItemText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    gap: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  botMessageContainer: {
    justifyContent: "flex-start",
  },
  botAvatarContainer: {
    marginRight: 8,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  userBubble: {
    backgroundColor: "#1a1a2e",
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageContent: {
    flex: 1,
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  botText: {
    color: "#1a1a2e",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
    color: "#A0A0A0",
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a1a2e",
    opacity: 0.4,
  },
  typingDot1: {
    animation: 'pulse 1.4s infinite',
  },
  typingDot2: {
    animation: 'pulse 1.4s infinite 0.2s',
  },
  typingDot3: {
    animation: 'pulse 1.4s infinite 0.4s',
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginTop: 12,
    marginLeft: 44,
    gap: 8,
    alignSelf: "flex-start",
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  quickContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  quickList: {
    gap: 12,
  },
  quickCard: {
    backgroundColor: "#F8F9FC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickCardText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  inputWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F8F9FC",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a2e",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#1a1a2e",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#D0D0D0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: width * 0.85,
    maxWidth: 320,
    overflow: "hidden",
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FC",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#1a1a2e",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
});

export default ChatBotScreen;