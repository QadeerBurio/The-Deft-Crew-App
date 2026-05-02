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
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Pulse animation for online status
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (backendStatus === 'connected') {
      pulse.start();
    } else {
      pulse.stop();
    }
    
    return () => pulse.stop();
  }, [backendStatus]);

  // Animation for welcome message
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
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
            ? "✨ Hi there! I'm your TDC AI assistant. How can I make your experience amazing today? 🚀"
            : "👋 Hi! I'm TDC Assistant. I'm currently in offline mode but I can still help with basic questions! 💪",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    };
    initialize();
  }, []);

  // Android back button handler
  useEffect(() => {
    const onBackPress = () => {
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

    // Add user message
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
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userMessageContainer : styles.botMessageContainer,
          index === messages.length - 1 && {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          }
        ]}
      >
        {item.sender === "bot" && (
          <View style={styles.botAvatarContainer}>
            <View style={styles.botAvatar}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
            </View>
          </View>
        )}
        
        <View style={[
          styles.bubble,
          item.sender === "user" ? styles.userBubble : styles.botBubble
        ]}>
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
              <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />
            )}
          </View>
        </View>
        
        {item.showContactBtn && (
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate("ContactUs")}
          >
            <Ionicons name="headset-outline" size={16} color="#1a1a1a" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
            <Ionicons name="arrow-forward" size={14} color="#1a1a1a" />
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
            <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
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
      <View style={styles.quickIcon}>
        <FontAwesome5 name={item.icon} size={16} color="#f9c349" />
      </View>
      <Text style={styles.quickCardText}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerFade }]}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="robot-outline" size={22} color="#1a1a1a" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerText}>tdc<Text style={{color:'#f9c349'}}>.</Text> Assistant</Text>
                <View style={styles.statusContainer}>
                  <Animated.View style={[
                    styles.statusDot, 
                    { 
                      backgroundColor: backendStatus === 'connected' ? '#4CAF50' : '#FF6B6B',
                      transform: [{ scale: pulseAnim }]
                    }
                  ]} />
                  <Text style={styles.statusText}>
                    {backendStatus === 'connected' ? 'AI Online' : 'Offline Mode'}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </Animated.View>

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
              <Text style={styles.quickTitle}>
                <View style={styles.quickDot} />
                Quick Questions
              </Text>
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
                placeholderTextColor="#999"
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
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <Ionicons name="send" size={18} color="#1a1a1a" />
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
                  <View style={[styles.menuIconBg, { backgroundColor: '#f9c34915' }]}>
                    <Ionicons name="trash-outline" size={20} color="#f9c349" />
                  </View>
                  <Text style={styles.menuItemText}>Clear Chat History</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <View style={styles.menuIconBg}>
                    <Ionicons name="close-outline" size={20} color="#1a1a1a" />
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
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#f9c349',
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTextContainer: {
    gap: 2,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
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
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Bubbles
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#1a1a1a",
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: "#f8f8f8",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  userText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  botText: {
    color: "#1a1a1a",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 9,
    color: "#999",
    fontWeight: "500",
  },
  
  // Typing Indicator
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#1a1a1a",
    opacity: 0.3,
  },
  
  // Contact Button
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9c349",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 8,
    marginLeft: 42,
    gap: 6,
    alignSelf: "flex-start",
  },
  contactButtonText: {
    color: "#1a1a1a",
    fontSize: 12,
    fontWeight: "700",
  },
  
  // Quick Questions
  quickContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  quickList: {
    gap: 10,
  },
  quickCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f9c34915',
    justifyContent: "center",
    alignItems: "center",
  },
  quickCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  
  // Input
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1a1a1a",
    maxHeight: 100,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: "#f9c349",
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: width * 0.85,
    maxWidth: 320,
    overflow: "hidden",
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});

export default ChatBotScreen;