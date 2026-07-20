import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, KeyboardAvoidingView, Platform,
  Dimensions, Animated, ActivityIndicator, Clipboard,
  Share, Keyboard, Linking, Image, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Svg, { Path, Circle } from 'react-native-svg';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// ─── SUGGESTED PROMPT CHIPS ───────────────────────────────────────────
const SUGGESTED_CHIPS = [
  { icon: '🏔️', title: 'Plan Hunza Trip', message: 'Plan a 5-day trip to Hunza Valley with budget breakdown in PKR' },
  { icon: '✈️', title: 'Turkey Visa', message: 'What are the required documents and processing time for a Turkey tourist visa from Pakistan?' },
  { icon: '🏖️', title: 'Explore Maldives', message: 'Create a honeymoon travel itinerary for Maldives' },
  { icon: '🚌', title: 'Northern Areas', message: 'What are the best routes and safety guides for Pakistan Northern Areas?' },
  { icon: '🏨', title: 'Hotels Guide', message: 'Recommend standard hotels in Skardu and Hunza' },
  { icon: '🍽️', title: 'Food Guide', message: 'What are the local cuisines to try in Gilgit Baltistan?' },
  { icon: '💰', title: 'Budget Planner', message: 'Help me plan a budget in PKR for a 4-day trip to Swat' },
  { icon: '🎫', title: 'Attractions', message: 'Top places to visit in Pakistan' },
];

// ─── MARKDOWN PARSER ──────────────────────────────────────────────────
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
          <Text key={`t-${index}-${matchIndex}`} style={isBold ? msgStyles.bold : msgStyles.normal}>
            {part.substring(lastIndex, matchIndex)}
          </Text>
        );
      }
      parts.push(
        <Text
          key={`l-${index}-${matchIndex}`}
          style={msgStyles.link}
          onPress={() => Linking.openURL(match[2]).catch(() => {})}
        >
          {match[1]}
        </Text>
      );
      lastIndex = localRegex.lastIndex;
    }
    if (lastIndex < part.length) {
      parts.push(
        <Text key={`e-${index}`} style={isBold ? msgStyles.bold : msgStyles.normal}>
          {part.substring(lastIndex)}
        </Text>
      );
    }
  });
  return parts;
};

const renderMarkdownContent = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      return <Text key={i} style={msgStyles.h3}>{parseInlineFormatting(trimmed.replace('### ', ''))}</Text>;
    }
    if (trimmed.startsWith('## ')) {
      return <Text key={i} style={msgStyles.h2}>{parseInlineFormatting(trimmed.replace('## ', ''))}</Text>;
    }
    if (trimmed.startsWith('# ')) {
      return <Text key={i} style={msgStyles.h1}>{parseInlineFormatting(trimmed.replace('# ', ''))}</Text>;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      return (
        <View key={i} style={msgStyles.bulletRow}>
          <Text style={msgStyles.bullet}>•</Text>
          <Text style={msgStyles.bulletText}>{parseInlineFormatting(trimmed.substring(2))}</Text>
        </View>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <View key={i} style={msgStyles.bulletRow}>
            <Text style={msgStyles.bullet}>{numMatch[1]}.</Text>
            <Text style={msgStyles.bulletText}>{parseInlineFormatting(numMatch[2])}</Text>
          </View>
        );
      }
    }
    if (trimmed === '') return <View key={i} style={{ height: 6 }} />;
    return <Text key={i} style={msgStyles.normal}>{parseInlineFormatting(trimmed)}</Text>;
  });
};

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────
const MessageBubble = React.memo(({ item, onCopy, onShare, isLast }) => {
  const isUser = item.role === 'user';
  const [showActions, setShowActions] = useState(false);
  
  return (
    <View style={[msgStyles.row, isUser ? msgStyles.rowUser : msgStyles.rowAssistant]}>
      {!isUser && (
        <View style={msgStyles.avatar}>
          <Image
            source={require('../../../assets/travel_mascot.png')}
            style={msgStyles.avatarImage}
            resizeMode="contain"
          />
          {/* Floating response indicator - appears once when response is complete */}
          {isLast && item.content && !item.isStreaming && (
            <Animated.View style={[msgStyles.responseIndicator, msgStyles.responseComplete]}>
              <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
            </Animated.View>
          )}
        </View>
      )}
      {isUser ? (
        <LinearGradient
          colors={['#f9c349', '#f0a500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[msgStyles.bubble, msgStyles.bubbleUser]}
        >
          <Text style={msgStyles.userText}>{item.content}</Text>
        </LinearGradient>
      ) : (
        <TouchableOpacity 
          activeOpacity={0.9}
          onLongPress={() => setShowActions(!showActions)}
          style={msgStyles.bubbleWrapper}
        >
          <View style={[msgStyles.bubble, msgStyles.bubbleAssistant]}>
            <View>{renderMarkdownContent(item.content)}</View>
            {(item.content && showActions) || isLast ? (
              <View style={msgStyles.actions}>
                <TouchableOpacity onPress={() => onCopy(item.content)} style={msgStyles.actionBtn}>
                  <Feather name="copy" size={13} color="#94A3B8" />
                  <Text style={msgStyles.actionText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onShare(item.content)} style={msgStyles.actionBtn}>
                  <Feather name="share" size={13} color="#94A3B8" />
                  <Text style={msgStyles.actionText}>Share</Text>
                </TouchableOpacity>
                <View style={msgStyles.tagBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                  <Text style={msgStyles.tagText}>TDC Verified Info</Text>
                </View>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── TYPING INDICATOR ─────────────────────────────────────────────────
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={msgStyles.typingRow}>
      <View style={msgStyles.avatar}>
        <Image
          source={require('../../../assets/travel_mascot.png')}
          style={msgStyles.avatarImage}
          resizeMode="contain"
        />
      </View>
      <View style={msgStyles.typingBubble}>
        <View style={msgStyles.typingDots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[msgStyles.dot, { transform: [{ translateY: dot }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────
const TravelChatBot = () => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const flatListRef = useRef(null);
  
  // Animation References
  const fabPulse = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const mascotFloatY = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const sparklesRotation = useRef(new Animated.Value(0)).current;
  const compassSpin = useRef(new Animated.Value(0)).current;

  // Network status
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  // Continuous FAB pulse & Mascot float animations
  useEffect(() => {
    if (!isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fabPulse, { toValue: 1.12, duration: 1500, useNativeDriver: true }),
          Animated.timing(fabPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }

    // Continuous floating and breathing mascot loop
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(mascotFloatY, {
            toValue: -8,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mascotFloatY, {
            toValue: 8,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(mascotScale, {
            toValue: 1.04,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mascotScale, {
            toValue: 0.96,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Constant rotation for decorative sparkles
    Animated.loop(
      Animated.timing(sparklesRotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [isOpen]);

  // Compass spin animation when AI is thinking
  useEffect(() => {
    if (isStreaming) {
      Animated.loop(
        Animated.timing(compassSpin, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      compassSpin.setValue(0);
    }
  }, [isStreaming]);

  // Keyboard show listener to scroll to end
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollToEnd();
      }
    );
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const openChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
    Animated.spring(modalSlide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  const closeChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsOpen(false);
    modalSlide.setValue(height);
  }, []);

  const startNewTrip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
    setInputText('');
    setIsStreaming(false);
  }, []);

  const handleCopy = useCallback((text) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleShare = useCallback(async (text) => {
    try {
      await Share.share({ message: text, title: 'TDC Travel Assistant' });
    } catch {}
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // ─── SEND MESSAGE (SSE STREAMING) ────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setInputText('');

    // Add user message
    const userMsg = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    scrollToEnd();

    // Build conversation history (last 10 messages)
    const currentMessages = [...messages, userMsg];
    const conversationHistory = currentMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Create placeholder for assistant response
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { 
      id: assistantId, 
      role: 'assistant', 
      content: '',
      isStreaming: true 
    }]);
    scrollToEnd();

    try {
      const baseURL = (api.defaults.baseURL || '').replace('/api', '');
      const url = `${baseURL}/api/v1/travel/stream`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');

      // Attach auth token
      const stores = await AsyncStorage.multiGet(['token', 'isGuest']);
      const token = stores[0][1];
      const isGuest = stores[1][1];
      if (isGuest === 'true') {
        xhr.setRequestHeader('Authorization', 'Bearer guest-token-2024');
      } else if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      let processedChars = 0;
      let buffer = '';

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const currentText = xhr.responseText;
          const chunk = currentText.substring(processedChars);
          processedChars = currentText.length;
          buffer += chunk;

          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const frame of parts) {
            const cleanFrame = frame.trim();
            if (!cleanFrame || !cleanFrame.startsWith('data: ')) continue;
            const dataString = cleanFrame.replace('data: ', '').trim();

            if (dataString === '[DONE]') {
              setIsStreaming(false);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
              scrollToEnd();
            } else {
              try {
                const dataObj = JSON.parse(dataString);
                if (dataObj.token) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: m.content + dataObj.token } : m
                    )
                  );
                  scrollToEnd();
                }
                if (dataObj.error) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
                        : m
                    )
                  );
                  setIsStreaming(false);
                }
              } catch {}
            }
          }
        }

        if (xhr.readyState === 4) {
          // Process remaining buffer
          if (buffer.trim()) {
            const cleanFrame = buffer.trim();
            if (cleanFrame.startsWith('data: ')) {
              const dataString = cleanFrame.replace('data: ', '').trim();
              if (dataString !== '[DONE]') {
                try {
                  const dataObj = JSON.parse(dataString);
                  if (dataObj.token) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId ? { ...m, content: m.content + dataObj.token } : m
                      )
                    );
                  }
                } catch {}
              }
            }
          }
          if (xhr.status >= 400) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: 'Travel assistant is temporarily unavailable. Please try again later.', isStreaming: false }
                  : m
              )
            );
          }
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
          scrollToEnd();
        }
      };

      xhr.onerror = () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Network error. Please check your connection and try again.', isStreaming: false }
              : m
          )
        );
        setIsStreaming(false);
      };

      xhr.send(JSON.stringify({ message: trimmed, conversationHistory }));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false }
            : m
        )
      );
      setIsStreaming(false);
    }
  }, [inputText, isStreaming, messages, scrollToEnd]);

  // ─── RENDER ───────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }) => {
    const isLast = index === messages.length - 1 && !isStreaming;
    return (
      <MessageBubble 
        item={item} 
        onCopy={handleCopy} 
        onShare={handleShare} 
        isLast={isLast}
      />
    );
  }, [messages.length, isStreaming, handleCopy, handleShare]);

  const keyExtractor = useCallback((item) => item.id, []);

  // Interpolated spins/transforms
  const spinVal = sparklesRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const compassSpinVal = compassSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {/* Background Dotted Flight Trail */}
      <View style={styles.trailContainer}>
        <Svg width="300" height="150" viewBox="0 0 300 150">
          <Path
            d="M 20 120 Q 80 20, 150 70 T 280 40"
            fill="none"
            stroke="rgba(249, 195, 73, 0.3)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <Circle cx="20" cy="120" r="4" fill="#f9c349" />
          <Circle cx="280" cy="40" r="4" fill="#f9c349" />
        </Svg>
        <Ionicons name="location" size={16} color="#E53E3E" style={styles.pinIcon1} />
        <Ionicons name="compass" size={18} color="#f9c349" style={styles.compassDecoration} />
      </View>

      {/* Floating Animated Mascot Frame */}
      <View style={styles.mascotAnimationContainer}>
        <Animated.Image
          source={require('../../../assets/travel_mascot.png')}
          style={[
            styles.emptyMascotImage,
            {
              transform: [
                { translateY: mascotFloatY },
                { scale: mascotScale },
              ]
            }
          ]}
          resizeMode="contain"
        />
        <Animated.View style={[styles.sparklesOverlay, { transform: [{ rotate: spinVal }] }]}>
          <Ionicons name="sparkles" size={24} color="#f9c349" style={styles.sparkle1} />
          <Ionicons name="sparkles" size={16} color="#f9c349" style={styles.sparkle2} />
        </Animated.View>
      </View>

      <Text style={styles.emptyTitle}>Where would you like to explore today?</Text>
      <Text style={styles.emptySubtitle}>
        I can plan detailed itineraries, estimate budgets, explain visa requirements, and build your complete travel plan.
      </Text>
    </View>
  );

  return (
    <>
      {/* ── FAB MASCOT BUTTON ────────────────────────────────────────── */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: [
                { translateY: mascotFloatY },
                { scale: fabPulse },
              ]
            }
          ]}
        >
          <TouchableOpacity
            onPress={openChat}
            activeOpacity={0.85}
            style={styles.fabBareTouch}
          >
            <Image
              source={require('../../../assets/travel.png')}
              style={styles.fabBareMascotImage}
              resizeMode="contain"
            />
            <Text style={styles.fabLabel}>Travel Assist</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── CHAT MODAL ─────────────────────────────────────────────── */}
      <Modal visible={isOpen} animationType="none" transparent statusBarTranslucent>
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: modalSlide }] }]}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              enabled={true}
            >
              {/* ── HEADER ──────────────────────────────────────────── */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    {isStreaming ? (
                      <Animated.View style={{ transform: [{ rotate: compassSpinVal }] }}>
                        <Ionicons name="compass" size={22} color="#f9c349" />
                      </Animated.View>
                    ) : (
                      <Image
                        source={require('../../../assets/travel_mascot.png')}
                        style={styles.headerMascotImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>TDC Travel Companion</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: isStreaming ? '#f9c349' : (isOnline ? '#10B981' : '#EF4444') }]} />
                      <Text style={styles.statusText}>
                        {isStreaming ? 'Thinking...' : (isOnline ? 'Active Mascot Online' : 'Offline')}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  {messages.length > 0 && (
                    <TouchableOpacity onPress={startNewTrip} style={styles.newTripBtn}>
                      <Ionicons name="refresh-outline" size={14} color="#d97706" />
                      <Text style={styles.newTripText}>New Trip</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={closeChat} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#1A1A2E" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── OFFLINE BANNER ───────────────────────────────────── */}
              {!isOnline && (
                <View style={styles.offlineBanner}>
                  <Ionicons name="cloud-offline" size={14} color="#EF4444" />
                  <Text style={styles.offlineText}>No internet connection. Syncing offline.</Text>
                </View>
              )}

              {/* ── MESSAGES LIST WITH GRADIENT BACKGROUND ──────────── */}
              <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#FFFFFF']} style={styles.flex}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  contentContainerStyle={[
                    styles.messageList,
                    messages.length === 0 && styles.messageListEmpty,
                  ]}
                  ListEmptyComponent={renderEmptyState}
                  ListFooterComponent={isStreaming ? <TypingIndicator /> : null}
                  onContentSizeChange={scrollToEnd}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              </LinearGradient>

              {/* ── HORIZONTAL SUGGESTED CHIPS ABOVE KEYBOARD ────────── */}
              {!isStreaming && (
                <View style={styles.quickPromptsRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScrollContainer}>
                    {SUGGESTED_CHIPS.map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.pillChip}
                        onPress={() => sendMessage(chip.message)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.pillChipIcon}>{chip.icon}</Text>
                        <Text style={styles.pillChipTitle}>{chip.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── INPUT BAR ───────────────────────────────────────── */}
              <View style={styles.inputBar}>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ask about travel, flights, visa rules..."
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={1000}
                    editable={!isStreaming}
                    onSubmitEditing={() => sendMessage()}
                    blurOnSubmit
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnDisabled]}
                    onPress={() => sendMessage()}
                    disabled={!inputText.trim() || isStreaming}
                    activeOpacity={0.7}
                  >
                    {isStreaming ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="arrow-up" size={18} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
};

// ─── MESSAGE STYLES ────────────────────────────────────────────────────
const msgStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 14, paddingHorizontal: 16, width: '100%' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    marginRight: 10, marginTop: 2, borderWidth: 1.2, borderColor: '#fde047',
    shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  avatarImage: { width: 38, height: 38 },
  responseIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  responseComplete: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleWrapper: { maxWidth: '80%' },
  bubble: { padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  bubbleUser: {
    borderTopLeftRadius: 20, borderBottomLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 4,
    shadowColor: '#f9c349', shadowOpacity: 0.15,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 4, borderBottomLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  userText: { color: '#1A1A2E', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  normal: { color: '#334155', fontSize: 13.8, lineHeight: 21 },
  bold: { color: '#0F172A', fontSize: 13.8, lineHeight: 21, fontWeight: '700' },
  link: { color: '#2563EB', fontSize: 13.8, lineHeight: 21, textDecorationLine: 'underline', fontWeight: '600' },
  h1: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  h2: { color: '#1E293B', fontSize: 14.5, fontWeight: '700', marginTop: 5, marginBottom: 3 },
  h3: { color: '#1E293B', fontSize: 13.5, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginTop: 3 },
  bullet: { color: '#64748B', fontSize: 13, width: 14, fontWeight: '600' },
  bulletText: { color: '#334155', fontSize: 13.8, lineHeight: 21, flex: 1 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 9, color: '#10B981', fontWeight: '700' },
  typingRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14 },
  typingBubble: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 4, borderBottomLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' },
});

// ─── COMPONENT STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  fabContainer: {
    position: 'absolute', 
    bottom: 35, 
    right: 12, 
    zIndex: 9999,
    alignItems: 'center',
  },
  fabBareTouch: {
    width: 85, 
    height: 85, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  fabBareMascotImage: {
    width: 100, 
    height: 100,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1A1A2E',
    marginTop: -4,
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f4f4f4',
    marginTop: 0,
    marginBottom: 0,
  },
  
  // Header centered to 8pt Grid
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    minHeight: 64, 
    backgroundColor: '#F5F6FA',
    borderBottomWidth: 1, 
    borderBottomColor: '#E8ECF0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  headerMascotImage: { width: 36, height: 36 },
  headerTextWrap: { marginLeft: 12, justifyContent: 'center' },
  headerTitle: { color: '#1A1A2E', fontSize: 14.5, fontWeight: '700', letterSpacing: 0.1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  newTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(249, 195, 73, 0.12)', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(249, 195, 73, 0.25)',
    marginRight: 8,
  },
  newTripText: { color: '#d97706', fontSize: 11, fontWeight: '700' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },
  
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', paddingVertical: 6, gap: 6,
  },
  offlineText: { color: '#EF4444', fontSize: 11.5, fontWeight: '600' },
  messageList: { paddingTop: 16, paddingBottom: 8 },
  messageListEmpty: { flexGrow: 1, justifyContent: 'center' },
  
  // Empty Welcome Screen Styles
  emptyContainer: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  trailContainer: { position: 'absolute', top: -30, width: '100%', alignItems: 'center', zIndex: 0 },
  pinIcon1: { position: 'absolute', top: 50, left: '20%' },
  compassDecoration: { position: 'absolute', top: 30, right: '15%' },
  
  mascotAnimationContainer: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 12, zIndex: 1 },
  emptyMascotImage: { width: 130, height: 130 },
  sparklesOverlay: { position: 'absolute', width: 140, height: 140, top: 0, left: 0 },
  sparkle1: { position: 'absolute', top: 15, right: 15 },
  sparkle2: { position: 'absolute', bottom: 15, left: 15 },
  
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#1E293B', marginBottom: 8, letterSpacing: 0.1, zIndex: 1, textAlign: 'center', paddingHorizontal: 10 },
  emptySubtitle: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 19, marginBottom: 10, paddingHorizontal: 15, zIndex: 1, fontWeight: '600' },
  
  // Suggested horizontal scrolling pill chips
  quickPromptsRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFF' },
  chipsScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
    marginRight: 8,
  },
  pillChipIcon: {
    fontSize: 13.5,
  },
  pillChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  inputBar: {
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
  },
  inputWrap: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: 24,
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    paddingLeft: 12, 
    paddingRight: 4,
  },
  textInput: {
    flex: 1, 
    fontSize: 14, 
    color: '#334155', 
    maxHeight: 100,
    paddingLeft: 12, 
    paddingRight: 8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f9c349', justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
});

export default TravelChatBot;