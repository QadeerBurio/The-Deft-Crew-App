// app/src/screens/TravelChatBot.js
import React, { useState, useRef, useEffect, useCallback, useContext, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, KeyboardAvoidingView, Platform,
  Dimensions, Animated, ActivityIndicator, Clipboard,
  Share, Keyboard, Linking, Image, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Svg, { Path, Circle } from 'react-native-svg';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { engagementBus, ENGAGEMENT_EVENTS } from '../engagement/engagementBus';

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

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────────
const MessageBubble = React.memo(({ item, onCopy, onShare, isLast }) => {
  const isUser = item.role === 'user';
  const [showActions, setShowActions] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        msgStyles.row,
        isUser ? msgStyles.rowUser : msgStyles.rowAssistant,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={msgStyles.avatarWrap}>
          <LinearGradient colors={['#FFF9E6', '#FFFFFF']} style={msgStyles.avatar}>
            <Image
              source={require('../../../assets/travel_mascot.png')}
              style={msgStyles.avatarImage}
              resizeMode="contain"
            />
          </LinearGradient>
          {isLast && item.content && !item.isStreaming && (
            <Animated.View style={msgStyles.responseIndicator}>
              <Ionicons name="checkmark-done" size={12} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>
      )}

      {isUser ? (
        <View style={msgStyles.bubbleWrapper}>
          <LinearGradient
            colors={['#f9c349', '#f0a500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[msgStyles.bubble, msgStyles.bubbleUser]}
          >
            <Text style={msgStyles.userText}>{item.content}</Text>
          </LinearGradient>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.95}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowActions(!showActions);
          }}
          style={msgStyles.bubbleWrapper}
        >
          <View style={[msgStyles.bubble, msgStyles.bubbleAssistant]}>
            <View>{renderMarkdownContent(item.content)}</View>
            {((item.content && showActions) || isLast) && !item.isStreaming && (
              <View style={msgStyles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCopy(item.content);
                  }}
                  style={msgStyles.actionBtn}
                >
                  <Feather name="copy" size={12} color="#94A3B8" />
                  <Text style={msgStyles.actionText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onShare(item.content);
                  }}
                  style={msgStyles.actionBtn}
                >
                  <Feather name="share-2" size={12} color="#94A3B8" />
                  <Text style={msgStyles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

// ─── TYPING INDICATOR ────────────────────────────────────────────────
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
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
      <LinearGradient colors={['#FFF9E6', '#FFFFFF']} style={msgStyles.avatar}>
        <Image
          source={require('../../../assets/travel_mascot.png')}
          style={msgStyles.avatarImage}
          resizeMode="contain"
        />
      </LinearGradient>
      <View style={msgStyles.typingBubble}>
        <View style={msgStyles.typingDots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[msgStyles.dot, { transform: [{ translateY: dot }], backgroundColor: '#f9c349' }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
const TravelChatBot = forwardRef((props, ref) => {
  const insets = useSafeAreaInsets();
  const { token, isGuest } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const flatListRef = useRef(null);

  // Track whether we've already fired the travel_prompt for this session
  const travelPromptFiredRef = useRef(false);

  // Animation References
  const fabPulse = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const mascotFloatY = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const sparklesRotation = useRef(new Animated.Value(0)).current;
  const compassSpin = useRef(new Animated.Value(0)).current;
  const fabEntrance = useRef(new Animated.Value(0)).current;

  // Network status
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  // FAB entrance animation
  useEffect(() => {
    Animated.spring(fabEntrance, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Continuous FAB pulse
  useEffect(() => {
    if (!isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fabPulse, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fabPulse, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fabPulse.stopAnimation();
      fabPulse.setValue(1);
    }
  }, [isOpen]);

  // Mascot floating animation (empty state)
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(mascotFloatY, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mascotFloatY, { toValue: 6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(mascotScale, { toValue: 1.03, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mascotScale, { toValue: 0.97, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.timing(sparklesRotation, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Compass spin when AI is thinking
  useEffect(() => {
    let animation;
    if (isStreaming) {
      compassSpin.setValue(0);
      animation = Animated.loop(
        Animated.timing(compassSpin, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      compassSpin.stopAnimation();
      compassSpin.setValue(0);
    }
    return () => animation?.stop();
  }, [isStreaming]);

  // Keyboard listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => scrollToEnd());
    return () => showSub.remove();
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
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
      modalSlide.setValue(height);
    });
  }, []);

  const startNewTrip = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  // 🎯 Fire travel_prompt — awards +50 pts, flips Traveling card once per day
  //    Silent failure: chatbot works even if this endpoint 500s
  const fireTravelPrompt = useCallback(async () => {
    if (isGuest || !token) return;
    if (travelPromptFiredRef.current) return;
    travelPromptFiredRef.current = true;

    try {
      const res = await api.post('/traveler/travel-prompt', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🎯 Celebration popups
      if (res?.data?.engagement?.popups?.length) {
        engagementBus.emit(
          ENGAGEMENT_EVENTS.POPUPS_QUEUED,
          res.data.engagement.popups
        );
      }

      // 🎯 Refresh /engagement/me so Home's Traveling card flips to "sorted"
      engagementBus.emit(ENGAGEMENT_EVENTS.PROFILE_REFRESH);
    } catch (e) {
      console.log(
        '[travel-prompt] failed:',
        e?.response?.data || e?.message
      );
    }
  }, [isGuest, token]);

  // ─── SEND MESSAGE (SSE STREAMING) ────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setInputText('');

    const userMsg = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    scrollToEnd();

    // 🎯 Award travel_prompt points (non-blocking, once per session)
    fireTravelPrompt();

    const currentMessages = [...messages, userMsg];
    const conversationHistory = currentMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

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
  }, [inputText, isStreaming, messages, scrollToEnd, fireTravelPrompt]);

  // Screen can open the chat, optionally sending a question right away
  const pendingMessageRef = useRef(null);
  useImperativeHandle(ref, () => ({
    open: (message) => {
      pendingMessageRef.current = message || null;
      openChat();
    },
    close: () => closeChat(),
    isOpen: () => isOpen,
  }), [openChat, closeChat, isOpen]);

  useEffect(() => {
    if (isOpen && pendingMessageRef.current) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      setTimeout(() => sendMessage(msg), 250);
    }
  }, [isOpen, sendMessage]);

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

  const spinVal = sparklesRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const compassSpinVal = compassSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fabEntranceScale = fabEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.trailContainer}>
        <Svg width="280" height="140" viewBox="0 0 280 140">
          <Path
            d="M 20 110 Q 80 20, 140 65 T 260 35"
            fill="none"
            stroke="rgba(249, 195, 73, 0.35)"
            strokeWidth="2"
            strokeDasharray="5 7"
          />
          <Circle cx="20" cy="110" r="4" fill="#f9c349" />
          <Circle cx="260" cy="35" r="4" fill="#f9c349" />
        </Svg>
        <View style={styles.pinIcon1}>
          <Ionicons name="location" size={16} color="#EF4444" />
        </View>
        <Animated.View style={[styles.compassDecoration, { transform: [{ rotate: spinVal }] }]}>
          <Ionicons name="compass" size={20} color="#f9c349" />
        </Animated.View>
      </View>

      <View style={styles.mascotAnimationContainer}>
        <Animated.Image
          source={require('../../../assets/travel_mascot.png')}
          style={[
            styles.emptyMascotImage,
            { transform: [{ translateY: mascotFloatY }, { scale: mascotScale }] },
          ]}
          resizeMode="contain"
        />
        <Animated.View style={[styles.sparklesOverlay, { transform: [{ rotate: spinVal }] }]}>
          <Ionicons name="sparkles" size={22} color="#f9c349" style={styles.sparkle1} />
          <Ionicons name="sparkles" size={14} color="#f9c349" style={styles.sparkle2} />
        </Animated.View>
      </View>

      <Text style={styles.emptyTitle}>Where would you like to explore?</Text>
      <Text style={styles.emptySubtitle}>
        I can plan detailed itineraries, estimate budgets, explain visa requirements, and build your complete travel plan.
      </Text>
    </View>
  );

  return (
    <>
      {/* ── FAB ──────────────────────────────────────────────────────── */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: [{ scale: Animated.multiply(fabEntranceScale, fabPulse) }],
              opacity: fabEntrance,
            },
          ]}
        >
          <TouchableOpacity onPress={openChat} activeOpacity={0.85} style={styles.fabBareTouch}>
            <Image
              source={require('../../../assets/travel.png')}
              style={styles.fabBareMascotImage}
              resizeMode="contain"
            />
            <View style={styles.fabLabelWrap}>
              <Text style={styles.fabLabel}>Travel Assist</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── CHAT MODAL ─────────────────────────────────────────────── */}
      <Modal
        visible={isOpen}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closeChat}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: modalSlide }] }]}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
              <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                enabled
              >
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={closeChat}
                    style={styles.headerLeftBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
                  </TouchableOpacity>

                  <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                      <LinearGradient colors={['#FFF9E6', '#FFFFFF']} style={styles.headerIconSmall}>
                        {isStreaming ? (
                          <Animated.View style={{ transform: [{ rotate: compassSpinVal }] }}>
                            <Ionicons name="compass" size={16} color="#f9c349" />
                          </Animated.View>
                        ) : (
                          <Image
                            source={require('../../../assets/travel_mascot.png')}
                            style={styles.headerMascotImageSmall}
                            resizeMode="contain"
                          />
                        )}
                      </LinearGradient>
                      <Text style={styles.headerTitle} numberOfLines={1}>
                        travel assist<Text style={{ color: '#f9c349' }}>.</Text>
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isStreaming
                              ? '#f9c349'
                              : isOnline
                              ? '#10B981'
                              : '#EF4444',
                          },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {isStreaming ? 'Thinking...' : isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    {messages.length > 0 ? (
                      <TouchableOpacity onPress={startNewTrip} style={styles.newTripBtn} activeOpacity={0.7}>
                        <Ionicons name="refresh-outline" size={13} color="#d97706" />
                        <Text style={styles.newTripText}>New</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.headerRightPlaceholder} />
                    )}
                  </View>
                </View>

                {/* Offline banner */}
                {!isOnline && (
                  <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={14} color="#EF4444" />
                    <Text style={styles.offlineText}>No internet connection</Text>
                  </View>
                )}

                {/* Messages list */}
                <LinearGradient colors={['#fafafa', '#fafafa', '#ffffff']} style={styles.flex}>
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
                    removeClippedSubviews
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={10}
                  />
                </LinearGradient>

                {/* Suggested chips */}
                {!isStreaming && (
                  <View style={styles.quickPromptsRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsScrollContainer}
                    >
                      {SUGGESTED_CHIPS.map((chip, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.pillChip}
                          onPress={() => sendMessage(chip.message)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.pillChipIcon}>{chip.icon}</Text>
                          <Text style={styles.pillChipTitle}>{chip.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Input bar */}
                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="ask about a trip, budget or visa..."
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
                      style={[
                        styles.sendBtn,
                        (!inputText.trim() || isStreaming) && styles.sendBtnDisabled,
                      ]}
                      onPress={() => sendMessage()}
                      disabled={!inputText.trim() || isStreaming}
                      activeOpacity={0.7}
                    >
                      {isStreaming ? (
                        <ActivityIndicator size="small" color="#f9c349" />
                      ) : (
                        <Ionicons name="arrow-up" size={18} color="#f9c349" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
});

// ─── MESSAGE STYLES ──────────────────────────────────────────────────
const msgStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 14, paddingHorizontal: 16, width: '100%' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatarWrap: { position: 'relative', marginRight: 10, marginTop: 2 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fde047',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: { width: 34, height: 34 },
  responseIndicator: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#10B981', borderRadius: 10,
    width: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3,
    elevation: 2,
  },
  bubbleWrapper: { maxWidth: '80%' },
  bubble: {
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: {
    borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
    borderTopRightRadius: 18, borderBottomRightRadius: 6,
    shadowColor: '#f9c349', shadowOpacity: 0.2,
    shadowRadius: 6, elevation: 3,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 6, borderBottomLeftRadius: 20,
    borderTopRightRadius: 20, borderBottomRightRadius: 20,
    borderWidth: 1, borderColor: '#eeeeee',
  },
  userText: { color: '#1a1a1a', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  normal: { color: '#333', fontSize: 13.8, lineHeight: 21 },
  bold: { color: '#111', fontSize: 13.8, lineHeight: 21, fontWeight: '700' },
  link: { color: '#2563EB', fontSize: 13.8, lineHeight: 21, textDecorationLine: 'underline', fontWeight: '600' },
  h1: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  h2: { color: '#1a1a1a', fontSize: 14.5, fontWeight: '700', marginTop: 5, marginBottom: 3 },
  h3: { color: '#1a1a1a', fontSize: 13.5, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginTop: 3 },
  bullet: { color: '#777', fontSize: 13, width: 14, fontWeight: '600' },
  bulletText: { color: '#333', fontSize: 13.8, lineHeight: 21, flex: 1 },
  actions: {
    flexDirection: 'row', marginTop: 10, gap: 14,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f4f4f4',
    paddingTop: 8,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, color: '#999', fontWeight: '600' },
  tagBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginLeft: 'auto',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 9, color: '#10B981', fontWeight: '700' },
  typingRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14 },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 6, borderBottomLeftRadius: 20,
    borderTopRightRadius: 20, borderBottomRightRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#eeeeee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04, shadowRadius: 2,
    elevation: 1,
  },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── COMPONENT STYLES ────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },

  fabContainer: {
    position: 'absolute', bottom: 24, right: 12,
    zIndex: 9999, alignItems: 'center',
  },
  fabBareTouch: {
    width: 90, height: 90,
    justifyContent: 'center', alignItems: 'center',
  },
  fabBareMascotImage: { width: 95, height: 95 },
  fabLabelWrap: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, marginTop: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
    elevation: 2,
  },
  fabLabel: {
    fontSize: 10, fontWeight: '800',
    color: '#f9c349', letterSpacing: 0.2,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContainer: { flex: 1, backgroundColor: '#fafafa' },
  safeArea: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#f4f4f4',
  },
  headerLeftBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F7F9F8',
    borderWidth: 1, borderColor: '#E8E8E8',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  headerCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconSmall: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#fde047',
  },
  headerMascotImageSmall: { width: 22, height: 22 },
  headerTitle: {
    color: '#1a1a1a', fontSize: 16, fontWeight: '900',
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#777', fontSize: 10, fontWeight: '600' },
  headerRight: {
    width: 80, alignItems: 'flex-end', justifyContent: 'center',
  },
  headerRightPlaceholder: { width: 40 },
  newTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(249, 195, 73, 0.15)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(249, 195, 73, 0.3)',
  },
  newTripText: { color: '#d97706', fontSize: 10, fontWeight: '700' },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', paddingVertical: 6, gap: 6,
  },
  offlineText: { color: '#EF4444', fontSize: 11.5, fontWeight: '600' },

  messageList: { paddingTop: 16, paddingBottom: 8 },
  messageListEmpty: { flexGrow: 1, justifyContent: 'center' },

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10,
  },
  trailContainer: {
    position: 'absolute', top: -20,
    width: '100%', alignItems: 'center', zIndex: 0,
  },
  pinIcon1: { position: 'absolute', top: 45, left: '22%' },
  compassDecoration: { position: 'absolute', top: 25, right: '18%' },

  mascotAnimationContainer: {
    width: 140, height: 140,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, zIndex: 1,
  },
  emptyMascotImage: { width: 130, height: 130 },
  sparklesOverlay: {
    position: 'absolute', width: 140, height: 140,
    top: 0, left: 0,
  },
  sparkle1: { position: 'absolute', top: 12, right: 12 },
  sparkle2: { position: 'absolute', bottom: 12, left: 12 },

  emptyTitle: {
    fontSize: 19, fontWeight: '800',
    color: '#1a1a1a', marginBottom: 8,
    letterSpacing: 0.1, zIndex: 1,
    textAlign: 'center', paddingHorizontal: 10,
  },
  emptySubtitle: {
    fontSize: 12.5, color: '#777',
    textAlign: 'center', lineHeight: 19,
    marginBottom: 10, paddingHorizontal: 15,
    zIndex: 1, fontWeight: '500',
  },

  quickPromptsRow: {
    borderTopWidth: 1, borderTopColor: '#f4f4f4',
    backgroundColor: '#FFFFFF',
  },
  chipsScrollContainer: {
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  pillChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#eeeeee',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2, gap: 6, marginRight: 8,
  },
  pillChipIcon: { fontSize: 13.5 },
  pillChipTitle: { fontSize: 12, fontWeight: '700', color: '#333' },

  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#f4f4f4',
    paddingHorizontal: 12, paddingTop: 10,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 18,
    borderWidth: 1, borderColor: '#eeeeee',
    paddingLeft: 6, paddingRight: 5, paddingVertical: 4,
  },
  textInput: {
    flex: 1, fontSize: 14, color: '#333',
    maxHeight: 100,
    paddingLeft: 12, paddingRight: 8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#d6d6d6', shadowOpacity: 0,
  },
});

export default TravelChatBot;