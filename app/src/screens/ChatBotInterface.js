// screens/ChatBotInterface.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Clipboard,
  Alert,
  Keyboard,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ChatContext } from '../context/ChatContext';

const { width } = Dimensions.get('window');

/* ------------------------------------------------------------------ */
/*  Inline markdown formatter (bold + links)                          */
/* ------------------------------------------------------------------ */
const parseInlineFormatting = (content) => {
  const parts = [];
  const boldParts = content.split('**');

  boldParts.forEach((part, index) => {
    const isBold = index % 2 === 1;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const localRegex = new RegExp(linkRegex);

    while ((match = localRegex.exec(part)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(
          <Text
            key={`text-${index}-${matchIndex}`}
            style={isBold ? styles.mdBoldText : styles.mdNormalText}
          >
            {part.substring(lastIndex, matchIndex)}
          </Text>
        );
      }

      const linkText = match[1];
      const linkUrl = match[2];

      parts.push(
        <Text
          key={`link-${index}-${matchIndex}`}
          style={styles.linkText}
          onPress={() =>
            Linking.openURL(linkUrl).catch((err) =>
              console.error('Error opening URL:', err)
            )
          }
        >
          {linkText}
        </Text>
      );

      lastIndex = localRegex.lastIndex;
    }

    if (lastIndex < part.length) {
      parts.push(
        <Text
          key={`text-end-${index}`}
          style={isBold ? styles.mdBoldText : styles.mdNormalText}
        >
          {part.substring(lastIndex)}
        </Text>
      );
    }
  });

  return parts;
};

/* ------------------------------------------------------------------ */
/*  Markdown renderer                                                  */
/* ------------------------------------------------------------------ */
const MarkdownRenderer = ({ text, style }) => {
  if (!text) return null;

  const parts = [];
  let isCode = false;
  let codeBuffer = [];

  const rawLines = text.split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.trim().startsWith('```')) {
      if (isCode) {
        parts.push({ type: 'code', content: codeBuffer.join('\n') });
        codeBuffer = [];
        isCode = false;
      } else {
        isCode = true;
      }
    } else if (isCode) {
      codeBuffer.push(line);
    } else {
      parts.push({ type: 'line', content: line });
    }
  }

  if (codeBuffer.length > 0) {
    parts.push({ type: 'code', content: codeBuffer.join('\n') });
  }

  return (
    <View style={styles.markdownContainer}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <View key={index} style={styles.codeBlockContainer}>
              <Text style={styles.codeText}>{part.content}</Text>
            </View>
          );
        }

        const line = part.content;
        const trimmed = line.trim();

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (trimmed.replace(/[|\-\s]/g, '') === '') return null;
          const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
          return (
            <View key={index} style={styles.tableRow}>
              {cells.map((cell, cIdx) => (
                <View key={cIdx} style={styles.tableCell}>
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
          );
        }

        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const content = match[2];
            const headerStyle =
              level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
            return (
              <Text key={index} style={[headerStyle, style]}>
                {parseInlineFormatting(content)}
              </Text>
            );
          }
        }

        const isBullet =
          trimmed.startsWith('-') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('•');
        const cleanContent = isBullet
          ? trimmed.replace(/^[-*•]\s+/, '')
          : line;

        return (
          <View
            key={index}
            style={[styles.lineWrapper, isBullet && styles.bulletLine]}
          >
            {isBullet && <Text style={styles.bulletSymbol}>• </Text>}
            <Text style={[styles.textLine, style]}>
              {parseInlineFormatting(cleanContent)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Animated typing dots                                               */
/* ------------------------------------------------------------------ */
const AnimatedTyping = () => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingBubbleContainer}>
      <Text style={styles.typingBubbleText}>
        Generating response...{dots}
      </Text>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const ChatBotInterface = ({ onClose }) => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const {
    messages,
    suggestions,
    isLoading,
    isStreaming,
    isOnline,
    activeSessionId,
    sendMessage,
    loadSessionDetails,
    regenerateLastResponse,
  } = useContext(ChatContext);

  const [input, setInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /* ---------- Auto-scroll on new messages ---------- */
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [messages, isLoading, isStreaming]);

  /* ---------- Keyboard listeners (track height) ---------- */
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /* ---------- Handlers ---------- */
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(input.trim());
    setInput('');
  };

  const handleSuggestionPress = (question) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(question);
  };

  const handleFeatureCardPress = (suggestedQuery, category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(suggestedQuery, category);
  };

  const handleRefresh = async () => {
    if (!activeSessionId) return;
    setIsRefreshing(true);
    await loadSessionDetails(activeSessionId);
    setIsRefreshing(false);
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Message copied to clipboard.');
  };

  const shareMessage = async (text) => {
    try {
      await Share.share({ message: text });
    } catch (error) {
      console.error('Error sharing message:', error.message);
    }
  };

  /* ---------- Render single message ---------- */
  const renderMessageItem = ({ item }) => {
    if (item.isLoadingBubble) {
      return (
        <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
          <View style={styles.avatarIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={16}
              color="#ffffff"
            />
          </View>
          <View
            style={[
              styles.messageBubble,
              styles.botMessageBubble,
              { paddingVertical: 12 },
            ]}
          >
            <AnimatedTyping />
          </View>
        </View>
      );
    }

    const isBot = item.role === 'assistant';
    return (
      <View
        style={[
          styles.messageWrapper,
          isBot ? styles.botMessageWrapper : styles.userMessageWrapper,
          { maxWidth: isBot ? '85%' : '75%' },
        ]}
      >
        {isBot && (
          <View style={styles.avatarIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={16}
              color="#ffffff"
            />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isBot ? styles.botMessageBubble : styles.userMessageBubble,
          ]}
        >
          {isBot ? (
            <MarkdownRenderer
              text={item.message}
              style={styles.botMessageText}
            />
          ) : (
            <Text style={styles.userMessageText} selectable={true}>
              {item.message}
            </Text>
          )}

          {isBot && !item._id.startsWith('warn-') ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => copyToClipboard(item.message)}
                style={styles.actionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="copy-outline" size={13} color="#777777" />
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => shareMessage(item.message)}
                style={styles.actionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={13}
                  color="#777777"
                />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={regenerateLastResponse}
                style={styles.actionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="refresh-outline"
                  size={13}
                  color="#777777"
                />
                <Text style={styles.actionText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !isBot ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => copyToClipboard(item.message)}
                style={styles.actionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="copy-outline" size={12} color="#555555" />
                <Text style={[styles.actionText, { color: '#555555' }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const displayMessages = [...messages];
  if (isLoading && !isStreaming) {
    displayMessages.push({
      _id: 'loading-bubble',
      role: 'assistant',
      message: '',
      isLoadingBubble: true,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  KEY FIX: apply keyboard height as bottom padding                */
  /*  on the whole screen container. No KeyboardAvoidingView needed.  */
  /* ---------------------------------------------------------------- */
  // The screen already sits inside SafeAreaView (top edge only), so
  // we don't need to subtract the top inset. We just push everything
  // up by the exact keyboard height reported by the OS.
  const bottomSpacer =
    keyboardHeight > 0
      ? keyboardHeight
      : insets.bottom; // safe-area inset when keyboard is closed

  /* ---------- Render ---------- */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (onClose ? onClose() : navigation.goBack())}
          style={styles.backBtn}
        >
          <Ionicons
            name={onClose ? 'close' : 'chevron-back'}
            size={24}
            color="#111111"
          />
        </TouchableOpacity>
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle}>TDC Assistant</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                isOnline ? styles.onlineColor : styles.offlineColor,
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? 'Online' : 'Offline Mode'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (onClose) onClose();
            navigation.navigate('ChatHistory');
          }}
          style={styles.historyBtn}
        >
          <Ionicons
            name="file-tray-full-outline"
            size={22}
            color="#111111"
          />
        </TouchableOpacity>
      </View>

      {/* Everything below the header sits in a flex container.
          The bottom spacer height tracks the keyboard. */}
      <View style={styles.body}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            displayMessages.length === 0 && styles.listContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeHeaderContainer}>
                <Ionicons
                  name="sparkles-sharp"
                  size={26}
                  color="#f9c349"
                  style={styles.welcomeSparkle}
                />
                <Text style={styles.welcomeTitle}>TDC Assistant</Text>
              </View>
              <Text style={styles.welcomeSubtitle}>
                I'm here to help with TDC App!
              </Text>

              <Text style={styles.tryAskingTitle}>
                Try asking me about:
              </Text>

              <View style={styles.featuresGrid}>
                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Study Abroad scholarship options and programs'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>🎓</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Study Abroad</Text>
                    <Text style={styles.cardSubtitle}>
                      Masters / Bachelors / PhD
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Show me active internships and job opportunities on TDC',
                      'jobs'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>💼</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Jobs & Careers</Text>
                    <Text style={styles.cardSubtitle}>
                      Internships & Full-time
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Show me the latest brand discounts and student deals',
                      'offers'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>🏷</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Brand Discounts</Text>
                    <Text style={styles.cardSubtitle}>
                      200+ Brands registered
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Show exclusive student discounts and promo deals',
                      'offers'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>🎁</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Exclusive Offers</Text>
                    <Text style={styles.cardSubtitle}>
                      Promos & Voucher Codes
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Show me student travel packages and tour plans',
                      'packages'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>✈</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Travel Packages</Text>
                    <Text style={styles.cardSubtitle}>Student tours</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Show notes, lectures and books available on TDC',
                      'notes'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>📚</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Learning Platform</Text>
                    <Text style={styles.cardSubtitle}>Notes & books</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'What are the benefits of TDC Gold Card membership?',
                      'tdc_knowledge'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>🏆</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>TDC Gold Card</Text>
                    <Text style={styles.cardSubtitle}>
                      Premium membership
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'Tell me about TDC social networking and community features',
                      'tdc_knowledge'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>👥</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Social Features</Text>
                    <Text style={styles.cardSubtitle}>Posts & Stories</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'How do I manage push notification settings in the TDC app?',
                      'tdc_knowledge'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>🔔</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Notifications</Text>
                    <Text style={styles.cardSubtitle}>Alerts & Updates</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleFeatureCardPress(
                      'How can I earn and redeem TDC reward points?',
                      'tdc_knowledge'
                    )
                  }
                  style={styles.welcomeCard}
                >
                  <Text style={styles.cardEmoji}>⭐</Text>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Reward Points</Text>
                    <Text style={styles.cardSubtitle}>
                      Redeem achievements
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.justTypeInstructions}>
                Just type your question!
              </Text>
            </View>
          }
        />

        {/* Suggestions */}
        {suggestions.length > 0 && !isLoading && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSuggestionPress(item)}
                  style={styles.suggestionBubble}
                >
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Type your question..."
            placeholderTextColor="#888888"
            multiline
            maxHeight={100}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              !input.trim() && styles.sendBtnDisabled,
            ]}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* -------------------------------------------------------- */}
        {/*  KEY FIX: an explicit spacer that exactly matches the     */}
        {/*  keyboard height (or safe-area bottom when closed).       */}
        {/* -------------------------------------------------------- */}
        <View style={{ height: bottomSpacer }} />
      </View>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  backBtn: { padding: 4 },
  titleWrapper: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111111' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  onlineColor: { backgroundColor: '#44db5e' },
  offlineColor: { backgroundColor: '#ff3b30' },
  statusText: { fontSize: 10, color: '#666666' },
  historyBtn: { padding: 4 },

  body: { flex: 1 },

  listContent: { padding: 16, paddingBottom: 24 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  messageWrapper: { flexDirection: 'row', marginVertical: 6 },
  userMessageWrapper: { alignSelf: 'flex-end' },
  botMessageWrapper: { alignSelf: 'flex-start' },
  avatarIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: '#f9c349',
    borderTopRightRadius: 2,
  },
  botMessageBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  userMessageText: { fontSize: 14, color: '#111111' },
  botMessageText: { fontSize: 14, color: '#222222', lineHeight: 20 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
    paddingTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionText: { fontSize: 11, color: '#777777', marginLeft: 3 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111111',
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cccccc' },

  suggestionsContainer: { paddingVertical: 8, backgroundColor: '#f6f6f9' },
  suggestionsList: { paddingHorizontal: 12 },
  suggestionBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e2e6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  suggestionText: { fontSize: 12, color: '#444444' },

  welcomeContainer: { padding: 16, alignItems: 'center' },
  welcomeHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  welcomeSparkle: { marginRight: 6 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#111111' },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  tryAskingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginLeft: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f2',
  },
  cardEmoji: { fontSize: 22, marginRight: 8 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#111111' },
  cardSubtitle: { fontSize: 10, color: '#888888', marginTop: 2 },
  justTypeInstructions: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  typingBubbleContainer: { paddingVertical: 2, paddingHorizontal: 4 },
  typingBubbleText: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },

  codeBlockContainer: {
    backgroundColor: '#f4f4f6',
    borderColor: '#e1e1e8',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#c7254e',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
    paddingVertical: 6,
  },
  tableCell: { flex: 1, paddingHorizontal: 4, justifyContent: 'center' },
  tableCellText: { fontSize: 12, color: '#333333' },

  h1: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111111',
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111111',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111111',
    marginTop: 6,
    marginBottom: 2,
  },
  linkText: { color: '#0066cc', textDecorationLine: 'underline' },
  mdBoldText: { fontWeight: 'bold', color: '#111111' },
  mdNormalText: { fontWeight: 'normal', color: '#222222' },
  markdownContainer: { flexDirection: 'column' },
  lineWrapper: { flexDirection: 'row', marginVertical: 1 },
  bulletLine: { paddingLeft: 6 },
  bulletSymbol: { fontSize: 14, color: '#111111' },
  textLine: { fontSize: 14, color: '#222222' },
});

export default ChatBotInterface;