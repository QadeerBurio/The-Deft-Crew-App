// ChatDetailScreen.js
import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, Image, ActivityIndicator, StatusBar,
  Modal, Alert, Dimensions, Animated, Keyboard, Pressable,
  Vibration, KeyboardAvoidingView, BackHandler
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { color as T, font as F } from "../../theme/tokens";
const { width } = Dimensions.get('window');
const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/decaxpera/auto/upload";
const UPLOAD_PRESET = "tdc_profiles";

const C = {
  white: T.white,
  dark: T.ink,
  gold: T.yellow,
  goldSoft: T.yellowSoft,
  soft: T.sand,
  border: T.sand,
  divider: T.sand,
  muted: T.textFaint,
  text2: T.textMuted,
  danger: T.danger,
  dangerSoft: T.dangerBg,
  online: T.success,
  metaLight: 'rgba(255,255,255,0.6)',
};

const IMG_MAX_W = Math.round(width * 0.7);
const IMG_MAX_H = 340;
const imageSizeCache = new Map();

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const formatDateHeader = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);
  if (d.toDateString() === today.toDateString()) return 'today';
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() !== today.getFullYear() ? `${base} ${d.getFullYear()}` : base;
};

const formatTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
};

const senderIdOf = (m) => m?.sender?._id || m?.sender;
const isDeletedMsg = (m) => !!(m?.isDeleted || m?.deleted || m?.messageType === 'deleted');
const isReadMsg = (m) => !!(m?.read || m?.isRead || m?.seen);

// ---------- small pieces ----------

const MetaRow = React.memo(({ item, isMe, overlay }) => (
  <View style={[styles.metaRow, overlay && styles.metaOverlay]}>
    <Text style={[styles.metaTime, isMe || overlay ? styles.metaTimeLight : null]}>{formatTime(item.createdAt)}</Text>
    {isMe ? (
      <Ionicons
        name={isReadMsg(item) ? "checkmark-done" : "checkmark"}
        size={14}
        color={isReadMsg(item) ? C.gold : C.metaLight}
        style={styles.metaTick}
      />
    ) : null}
  </View>
));

const ImageContent = React.memo(({ item, isMe, onImagePress, onLongPress }) => {
  const [size, setSize] = useState(() => imageSizeCache.get(item.mediaUrl) || { width: IMG_MAX_W, height: IMG_MAX_W * 0.75 });

  useEffect(() => {
    if (!item.mediaUrl || imageSizeCache.has(item.mediaUrl)) return;
    let alive = true;
    Image.getSize(item.mediaUrl, (w, h) => {
      if (!w || !h) return;
      let nw = IMG_MAX_W;
      let nh = (h / w) * nw;
      if (nh > IMG_MAX_H) { nh = IMG_MAX_H; nw = (w / h) * nh; }
      const s = { width: Math.round(nw), height: Math.round(nh) };
      imageSizeCache.set(item.mediaUrl, s);
      if (alive) setSize(s);
    }, () => {});
    return () => { alive = false; };
  }, [item.mediaUrl]);

  return (
    <Pressable
      onPress={() => onImagePress(item.mediaUrl)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={400}
      style={[styles.imageWrap, isMe ? styles.myCorner : styles.theirCorner]}
    >
      <Image source={{ uri: item.mediaUrl }} style={[styles.msgImage, size]} resizeMode="cover" />
      <MetaRow item={item} isMe={isMe} overlay />
    </Pressable>
  );
});

const AudioContent = React.memo(({ item, isMe, isPlaying, onPlay }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(item.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlay = useCallback(() => {
    onPlay(item, (status) => {
      if (status.isLoaded) {
        if (status.durationMillis) setDuration(status.durationMillis / 1000);
        if (status.isPlaying && status.durationMillis) {
          setProgress(status.positionMillis / status.durationMillis);
          setCurrentTime(status.positionMillis / 1000);
        }
        if (status.didJustFinish) {
          setProgress(0);
          setCurrentTime(0);
        }
      }
    });
  }, [item, onPlay]);

  return (
    <View style={styles.audioRow}>
      <TouchableOpacity
        onPress={handlePlay}
        activeOpacity={0.8}
        style={[styles.playBtn, { backgroundColor: isMe ? C.gold : C.dark }]}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={16} color={isMe ? C.dark : C.gold} style={!isPlaying && styles.playIconNudge} />
      </TouchableOpacity>
      <View style={styles.audioBody}>
        <View style={[styles.audioTrack, isMe ? styles.audioTrackDark : styles.audioTrackLight]}>
          <View style={[styles.audioFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: isMe ? C.gold : C.dark }]} />
        </View>
        <Text style={[styles.audioTime, isMe && styles.audioTimeLight]}>
          {isPlaying ? formatDuration(currentTime) : formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
});

const MessageRow = React.memo(({ item, isMe, showDate, grouped, isPlaying, fresh, onLongPress, onImagePress, onPlay }) => {
  const fade = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (fresh) Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, []);

  const deleted = isDeletedMsg(item);
  const type = item.messageType;
  let body = null;

  if (deleted) {
    body = (
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <View style={styles.deletedRow}>
          <Ionicons name="ban-outline" size={14} color={isMe ? C.metaLight : C.muted} />
          <Text style={[styles.deletedText, isMe && styles.deletedTextLight]}>message deleted</Text>
        </View>
      </View>
    );
  } else if (type === "image" && item.mediaUrl) {
    body = <ImageContent item={item} isMe={isMe} onImagePress={onImagePress} onLongPress={onLongPress} />;
  } else if (type === "audio" && item.mediaUrl) {
    body = (
      <Pressable onLongPress={() => onLongPress(item)} delayLongPress={400}
        style={[styles.bubble, styles.audioBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <AudioContent item={item} isMe={isMe} isPlaying={isPlaying} onPlay={onPlay} />
        <MetaRow item={item} isMe={isMe} />
      </Pressable>
    );
  } else if (item.text) {
    body = (
      <Pressable onLongPress={() => onLongPress(item)} delayLongPress={400}
        style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.msgText, isMe ? styles.myText : styles.theirText]}>{item.text}</Text>
        <MetaRow item={item} isMe={isMe} />
      </Pressable>
    );
  }

  if (!body && !showDate) return null;

  return (
    <Animated.View style={{ opacity: fade }}>
      {showDate && item.createdAt ? (
        <View style={styles.datePillWrap}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{formatDateHeader(item.createdAt)}</Text>
          </View>
        </View>
      ) : null}
      {body ? (
        <View style={[styles.rowWrap, isMe ? styles.rowMe : styles.rowThem, { marginTop: grouped ? 4 : 10 }]}>
          {body}
        </View>
      ) : null}
    </Animated.View>
  );
});

const TypingBubble = React.memo(() => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 3, duration: 1200, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const dot = (i) => ({
    opacity: t.interpolate({
      inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
      outputRange: i === 0 ? [1, 0.3, 0.3, 0.3, 0.3, 0.3, 1] : i === 1 ? [0.3, 0.3, 1, 0.3, 0.3, 0.3, 0.3] : [0.3, 0.3, 0.3, 0.3, 1, 0.3, 0.3],
    }),
  });
  return (
    <View style={[styles.rowWrap, styles.rowThem, styles.typingWrap]}>
      <View style={[styles.bubble, styles.theirBubble, styles.typingBubble]}>
        {[0, 1, 2].map((i) => <Animated.View key={i} style={[styles.typingDot, dot(i)]} />)}
      </View>
    </View>
  );
});

const Sheet = ({ visible, onClose, insetBottom, children }) => {
  const slide = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    if (visible) {
      slide.setValue(300);
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insetBottom, 16) + 8, transform: [{ translateY: slide }] }]}>
          <Pressable>
            <View style={styles.sheetHandle} />
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const SheetRow = ({ icon, label, onPress, destructive }) => (
  <TouchableOpacity style={styles.sheetRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.sheetIcon, destructive && styles.sheetIconDanger]}>
      <Ionicons name={icon} size={18} color={destructive ? C.danger : C.dark} />
    </View>
    <Text style={[styles.sheetLabel, destructive && styles.sheetLabelDanger]}>{label}</Text>
  </TouchableOpacity>
);

// ---------- screen ----------

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token, user: currentUser } = useContext(AuthContext);

  const conversationId = route.params?.conversationId;
  const recipient = route.params?.recipient || {};
  const myId = currentUser?._id;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showMsgSheet, setShowMsgSheet] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const flatListRef = useRef();
  const soundRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const nearBottomRef = useRef(true);
  const freshIdsRef = useRef(new Set());
  const currentPlayingIdRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Refs for recording (avoid stale closure issues)
  const recordingRef = useRef(null);
  const recordingDurationRef = useRef(0);
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef(null);
  // LOCK: prevents overlapping createAsync calls
  const isStartingRecordingRef = useRef(false);
  // CHAIN: forces next start to wait for previous stop to fully unload
  const recordingCleanupRef = useRef(Promise.resolve());
  const recordingTimerRef = useRef(null);

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const scrollToEnd = useCallback((animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  // Validate params
  useEffect(() => {
    if (!conversationId || !recipient?._id) {
      Alert.alert('error', 'invalid conversation data');
      navigation.goBack();
      return;
    }
  }, [conversationId, recipient]);

  const handleGoBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Messages' }],
        })
      );
    }
    setTimeout(() => { isNavigatingRef.current = false; }, 500);
  }, [navigation]);

  // Hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isNavigatingRef.current) {
        handleGoBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [handleGoBack]);

  // Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollToEnd(true), 200);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setTimeout(() => scrollToEnd(true), 100);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToEnd]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/${conversationId}`, config);
      setMessages(Array.isArray(res.data) ? res.data : []);
      setTimeout(() => scrollToEnd(false), 100);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    if (!conversationId || !recipient?._id) return;

    fetchMessages();

    if (recipient?.online !== undefined) {
      setIsRecipientOnline(recipient.online);
    }

    socket.emit("user_online", currentUser._id);
    socket.emit("join_chat", conversationId);

    const handleStatusUpdate = (data) => {
      if (data.userId === recipient?._id) {
        setIsRecipientOnline(data.status === "online");
      }
    };

    const handleStatusResponse = (data) => {
      if (data.userId === recipient?._id) {
        setIsRecipientOnline(data.status === "online");
      }
    };

    const handleNewMessage = (msg) => {
      if (msg.conversationId === conversationId) {
        if (msg._id) freshIdsRef.current.add(msg._id);
        setMessages((prev) => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        const mine = senderIdOf(msg) === currentUser._id;
        if (mine || nearBottomRef.current) {
          setTimeout(() => scrollToEnd(true), 120);
        } else {
          setNewCount((n) => n + 1);
        }
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const handleUserTyping = ({ userId, userName, typing }) => {
      if (userId !== currentUser._id) {
        setTypingUser(typing ? (userName || 'typing') : null);
      }
    };

    socket.on("user_status_update", handleStatusUpdate);
    socket.emit("get_user_status", recipient?._id);
    socket.on("user_status_response", handleStatusResponse);
    socket.on("new_message", handleNewMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_status_update", handleStatusUpdate);
      socket.off("user_status_response", handleStatusResponse);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.emit("leave_chat", conversationId);

      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Cleanup any in-flight recording
      if (recordingRef.current) {
        const stale = recordingRef.current;
        recordingRef.current = null;
        isRecordingRef.current = false;
        try {
          stale.stopAndUnloadAsync();
        } catch (e) {}
      }

      // Reset flags so next mount works cleanly
      isStartingRecordingRef.current = false;
      recordingCleanupRef.current = Promise.resolve();
    };
  }, [conversationId]);

  // Recording duration timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          recordingDurationRef.current = elapsed;
          setRecordingDuration(elapsed);
        }
      }, 500);
      Vibration.vibrate([0, 100]);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording]);

  const uploadFile = async (uri, type) => {
    setUploading(true);
    setUploadProgress(`uploading ${type}…`);

    try {
      const formData = new FormData();
      const fileType = type === "image" ? "jpg" : type === "video" ? "mp4" : "m4a";

      formData.append("file", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: `upload_${Date.now()}.${fileType}`,
        type: type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "audio/m4a"
      });
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await axios.post(CLOUDINARY_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(`uploading… ${percentCompleted}%`);
        }
      });
      setUploading(false);
      setUploadProgress("");
      return res.data.secure_url;
    } catch (e) {
      console.error('Upload error:', e);
      setUploading(false);
      setUploadProgress("");
      Alert.alert("upload failed", "please try again");
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const trimmedText = inputText.trim();

    socket.emit("send_message", {
      conversationId,
      senderId: currentUser._id,
      text: trimmedText,
      messageType: "text",
    });

    setInputText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("typing_stop", {
      conversationId,
      userId: currentUser._id
    });
    inputRef.current?.focus();

    try {
      await axios.post(
        `${API_URL}/notifications/create-message-notif`,
        {
          recipientId: recipient._id,
          conversationId,
          text: trimmedText,
          messageType: 'text',
        },
        config
      );
    } catch (e) {
      console.log('Message notif create failed (non-blocking):', e.message);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);

    if (text.length > 0) {
      socket.emit("typing_start", {
        conversationId,
        userId: currentUser._id,
        userName: currentUser.name
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", {
          conversationId,
          userId: currentUser._id
        });
      }, 2000);
    } else {
      socket.emit("typing_stop", {
        conversationId,
        userId: currentUser._id
      });
    }
  };

  const sendImageUri = async (uri) => {
    const url = await uploadFile(uri, "image");
    if (url) {
      socket.emit("send_message", {
        conversationId,
        senderId: currentUser._id,
        mediaUrl: url,
        messageType: "image"
      });
      try {
        await axios.post(
          `${API_URL}/notifications/create-message-notif`,
          {
            recipientId: recipient._id,
            conversationId,
            text: '',
            messageType: 'image',
          },
          config
        );
      } catch (e) {
        console.log('Image notif failed:', e.message);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pickImage = async () => {
    setShowImagePicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('permission needed', 'allow photo access to send images.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      Alert.alert("send image", "send this image?", [
        { text: "cancel", style: "cancel" },
        { text: "send", onPress: () => sendImageUri(result.assets[0].uri) }
      ]);
    }
  };

  const takePhoto = async () => {
    setShowImagePicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('permission needed', 'allow camera access to take photos.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      Alert.alert("send image", "send this photo?", [
        { text: "cancel", style: "cancel" },
        { text: "send", onPress: () => sendImageUri(result.assets[0].uri) }
      ]);
    }
  };

  // ============================================
  // RECORDING
  // ============================================

  const startRecording = async () => {
    // Guard: already recording OR currently starting
    if (isRecordingRef.current || isStartingRecordingRef.current) {
      console.log('[Recording] blocked, already active or starting');
      return;
    }

    isStartingRecordingRef.current = true;

    try {
      // CRITICAL: wait for any previous recording to fully unload
      await recordingCleanupRef.current;

      // Kill any stale recording object that survived
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }

      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('permission needed', 'allow microphone access to record voice notes.');
        isStartingRecordingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = newRecording;
      isRecordingRef.current = true;
      recordingStartTimeRef.current = Date.now();
      recordingDurationRef.current = 0;

      setIsRecording(true);
      setRecordingDuration(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Vibration.vibrate([0, 50]);
    } catch (err) {
      console.error('[Recording] start error:', err);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {}

      isRecordingRef.current = false;
      recordingRef.current = null;
      recordingStartTimeRef.current = null;
      setIsRecording(false);

      Alert.alert('recording unavailable', 'could not start recording. wait a moment and try again.');
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const stopRecording = async (shouldSend = true) => {
    if (!isRecordingRef.current && !recordingRef.current) return;
    if (isStartingRecordingRef.current && !recordingRef.current) return;

    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    isRecordingRef.current = false;

    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const elapsedSec = recordingStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
      : Math.max(1, recordingDurationRef.current);

    recordingStartTimeRef.current = null;

    const resetMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {}
    };

    const cleanupPromise = (async () => {
      try {
        if (!activeRecording) return null;
        await activeRecording.stopAndUnloadAsync();
        const uri = activeRecording.getURI();
        await resetMode();
        return uri;
      } catch (error) {
        console.error('[Recording] stop/unload error:', error);
        await resetMode();
        return null;
      }
    })();

    recordingCleanupRef.current = cleanupPromise;

    const uri = await cleanupPromise;

    if (!shouldSend || !uri) {
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      return;
    }

    try {
      const url = await uploadFile(uri, 'audio');
      if (url) {
        socket.emit('send_message', {
          conversationId,
          senderId: currentUser._id,
          mediaUrl: url,
          messageType: 'audio',
          duration: elapsedSec,
        });

        try {
          await axios.post(
            `${API_URL}/notifications/create-message-notif`,
            {
              recipientId: recipient._id,
              conversationId,
              text: '',
              messageType: 'audio',
            },
            config
          );
        } catch (e) {
          console.log('[Recording] notif failed:', e.message);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (uploadErr) {
      console.error('[Recording] upload/send error:', uploadErr);
    }

    setRecordingDuration(0);
    recordingDurationRef.current = 0;
  };

  const cancelRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await stopRecording(false);
  };

  // Stable across renders (reads playback state from refs) so memoized rows don't re-render
  const playVoice = useCallback(async (item, onProgressUpdate) => {
    const setPlaying = (id, playing) => {
      currentPlayingIdRef.current = id;
      isPlayingRef.current = playing;
      setCurrentPlayingId(id);
      setIsCurrentlyPlaying(playing);
    };

    try {
      if (currentPlayingIdRef.current === item._id && isPlayingRef.current) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          isPlayingRef.current = false;
          setIsCurrentlyPlaying(false);
        }
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: item.mediaUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlaying(item._id, true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (onProgressUpdate) onProgressUpdate(status);
          if (status.didJustFinish) {
            setPlaying(null, false);
            if (soundRef.current) {
              soundRef.current.unloadAsync();
              soundRef.current = null;
            }
          }
        }
      });

      await sound.playAsync();
    } catch (e) {
      console.error('Play voice error:', e);
      setPlaying(null, false);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    }
  }, []);

  const handleLongPress = useCallback((message) => {
    if (!message || isDeletedMsg(message)) return;
    const mine = senderIdOf(message) === myId;
    const canCopy = !!message.text && message.messageType !== 'image' && message.messageType !== 'audio';
    if (!mine && !canCopy) return;
    setSelectedMessage(message);
    setShowMsgSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [myId]);

  const handleImagePress = useCallback((url) => {
    setFullscreenImage(url);
    setIsImageFullscreen(true);
  }, []);

  const closeMsgSheet = () => {
    setShowMsgSheet(false);
    setSelectedMessage(null);
  };

  const copySelected = async () => {
    const text = selectedMessage?.text;
    closeMsgSheet();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('Copy failed:', e?.message);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      const response = await axios.delete(`${API_URL}/messages/${selectedMessage._id}`, config);

      if (response.data.success) {
        socket.emit("delete_message", {
          messageId: selectedMessage._id,
          conversationId
        });

        setMessages(prev => prev.filter(m => m._id !== selectedMessage._id));
        setShowMsgSheet(false);
        setSelectedMessage(null);

        Alert.alert('deleted', 'message deleted');
      } else {
        Alert.alert('error', response.data?.error || 'could not delete the message');
      }
    } catch (err) {
      console.error('Delete message error:', err);
      Alert.alert('error', 'could not delete the message. try again.');
    }
  };

  const clearChat = () => {
    Alert.alert("clear chat", "delete all messages?", [
      { text: "cancel", style: "cancel" },
      { text: "clear", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/conversations/${conversationId}`, config);
            setMessages([]);
            setShowOptionsModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            handleGoBack();
          } catch (err) {
            console.error('Clear chat error:', err);
            Alert.alert('error', 'could not clear the chat');
          }
      }}
    ]);
  };

  const navigateToProfile = () => {
    if (recipient?._id && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigation.navigate("UserProfile", { userId: recipient._id });
      setTimeout(() => { isNavigatingRef.current = false; }, 500);
    }
  };

  // ---------- list ----------

  const rowMeta = useMemo(() => {
    const meta = new Array(messages.length);
    for (let i = 0; i < messages.length; i++) {
      const item = messages[i];
      const prev = i > 0 ? messages[i - 1] : null;
      let showDate = i === 0;
      if (prev && prev.createdAt && item?.createdAt) {
        showDate = new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
      }
      const grouped = !!prev && !showDate && senderIdOf(prev) === senderIdOf(item);
      meta[i] = { showDate, grouped };
    }
    return meta;
  }, [messages]);

  const renderMessage = useCallback(({ item, index }) => {
    if (!item) return null;
    const m = rowMeta[index] || { showDate: false, grouped: false };
    return (
      <MessageRow
        item={item}
        isMe={senderIdOf(item) === myId}
        showDate={m.showDate}
        grouped={m.grouped}
        isPlaying={isCurrentlyPlaying && currentPlayingId === item._id}
        fresh={freshIdsRef.current.has(item._id)}
        onLongPress={handleLongPress}
        onImagePress={handleImagePress}
        onPlay={playVoice}
      />
    );
  }, [rowMeta, myId, isCurrentlyPlaying, currentPlayingId, handleLongPress, handleImagePress, playVoice]);

  const keyExtractor = useCallback((item, index) => item?._id || `msg-${index}-${item?.createdAt || ''}`, []);

  const onScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const fromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    nearBottomRef.current = fromBottom < 120;
    const show = fromBottom > 300;
    setShowScrollBtn((s) => (s === show ? s : show));
    if (fromBottom < 120) setNewCount((n) => (n === 0 ? n : 0));
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (nearBottomRef.current) scrollToEnd(true);
  }, [scrollToEnd]);

  const jumpToBottom = () => {
    nearBottomRef.current = true;
    setNewCount(0);
    scrollToEnd(true);
  };

  if (!conversationId || !recipient?._id) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={C.dark} />
          <Text style={styles.loadingText}>invalid conversation</Text>
        </View>
      </View>
    );
  }

  const hasText = inputText.trim().length > 0;
  const statusLabel = typingUser ? 'typing…' : isRecipientOnline ? 'online' : 'offline';
  const recipientName = recipient?.name || 'user';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} translucent={false} />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.squareBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={21} color={C.dark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerInfo} onPress={navigateToProfile} activeOpacity={0.7}>
            <View style={styles.avatarWrap}>
              {recipient?.profileImage ? (
                <Image source={{ uri: recipient.profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{recipientName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {isRecipientOnline ? <View style={styles.onlineDot} /> : null}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.userName} numberOfLines={1}>{recipientName}</Text>
              <Text style={[styles.statusText, typingUser && styles.statusTyping]} numberOfLines={1}>{statusLabel}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowOptionsModal(true)} style={styles.squareBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={18} color={C.dark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior="padding"
        keyboardVerticalOffset={0}
        enabled={true}
      >
        <View style={styles.flex1}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={C.dark} />
              <Text style={styles.loadingText}>loading messages…</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              extraData={rowMeta}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={onContentSizeChange}
              onLayout={() => scrollToEnd(false)}
              onScroll={onScroll}
              scrollEventThrottle={64}
              initialNumToRender={20}
              maxToRenderPerBatch={12}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                <>
                  {typingUser ? <TypingBubble /> : null}
                  <View style={styles.listFooterSpace} />
                </>
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={32} color={C.dark} />
                  </View>
                  <Text style={styles.emptyTitle}>say hi 👋</Text>
                  <Text style={styles.emptySub}>send a message to start the chat with {recipientName}</Text>
                </View>
              }
            />
          )}

          {showScrollBtn ? (
            <TouchableOpacity style={styles.scrollBtn} onPress={jumpToBottom} activeOpacity={0.8}>
              <Ionicons name="chevron-down" size={20} color={C.dark} />
              {newCount > 0 ? (
                <View style={styles.scrollBadge}>
                  <Text style={styles.scrollBadgeText}>{newCount > 99 ? '99+' : newCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {uploading ? (
            <View style={styles.uploadBar}>
              <ActivityIndicator size="small" color={C.dark} />
              <Text style={styles.uploadText}>{uploadProgress}</Text>
            </View>
          ) : null}

          {isRecording ? (
            <View style={styles.recordingBar}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.recordingLabel}>recording… release to send</Text>
              <TouchableOpacity onPress={cancelRecording} style={styles.squareBtnSm} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.text2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopRecording(true)} style={styles.recordSendBtn} activeOpacity={0.8}>
                <Ionicons name="arrow-up" size={18} color={C.gold} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={[styles.inputArea, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity onPress={() => setShowImagePicker(true)} style={styles.squareBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color={C.dark} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="message…"
            placeholderTextColor={C.muted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            editable={!isRecording}
            scrollEnabled={true}
          />

          {hasText ? (
            <TouchableOpacity
              onPress={sendMessage}
              disabled={uploading}
              style={[styles.sendBtn, uploading && styles.sendBtnDisabled]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color={uploading ? T.textFaint : C.gold} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={() => {
                if (isStartingRecordingRef.current || isRecordingRef.current) return;
                startRecording();
              }}
              onPressOut={() => stopRecording(true)}
              delayPressIn={100}
              delayPressOut={0}
              activeOpacity={0.7}
              style={[styles.sendBtn, isRecording && styles.micActive]}
            >
              <Ionicons name="mic" size={20} color={isRecording ? C.dark : C.gold} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Attach sheet */}
      <Sheet visible={showImagePicker} onClose={() => setShowImagePicker(false)} insetBottom={insets.bottom}>
        <Text style={styles.sheetTitle}>send a photo</Text>
        <SheetRow icon="camera-outline" label="camera" onPress={takePhoto} />
        <SheetRow icon="images-outline" label="gallery" onPress={pickImage} />
      </Sheet>

      {/* Chat options sheet */}
      <Sheet visible={showOptionsModal} onClose={() => setShowOptionsModal(false)} insetBottom={insets.bottom}>
        <Text style={styles.sheetTitle}>chat options</Text>
        <SheetRow icon="person-outline" label="view profile" onPress={() => { setShowOptionsModal(false); navigateToProfile(); }} />
        <SheetRow icon="trash-outline" label="clear chat" onPress={clearChat} destructive />
      </Sheet>

      {/* Message actions sheet */}
      <Sheet visible={showMsgSheet} onClose={closeMsgSheet} insetBottom={insets.bottom}>
        {selectedMessage?.text && selectedMessage?.messageType !== 'image' && selectedMessage?.messageType !== 'audio' ? (
          <SheetRow icon="copy-outline" label="copy" onPress={copySelected} />
        ) : null}
        {selectedMessage && senderIdOf(selectedMessage) === myId ? (
          <SheetRow icon="trash-outline" label="delete message" onPress={handleDeleteMessage} destructive />
        ) : null}
      </Sheet>

      {/* Fullscreen image viewer */}
      <Modal visible={isImageFullscreen} transparent animationType="fade" onRequestClose={() => setIsImageFullscreen(false)}>
        <View style={styles.fullscreenOverlay}>
          <Pressable style={styles.fullscreenTouchable} onPress={() => setIsImageFullscreen(false)}>
            {fullscreenImage ? (
              <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImage} resizeMode="contain" />
            ) : null}
          </Pressable>
          <TouchableOpacity
            style={[styles.closeFullscreen, { top: Math.max(insets.top, 20) + 10 }]}
            onPress={() => setIsImageFullscreen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color={C.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: C.muted, fontFamily: F.bodySemi },

  // header
  safeHeader: { backgroundColor: C.white },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider,
    backgroundColor: C.white,
  },
  squareBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.soft, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  squareBtnSm: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 12 },
  avatarWrap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft },
  avatarFallback: { backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontFamily: F.bodyBold, color: C.dark },
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: C.online, borderWidth: 2.5, borderColor: C.white,
  },
  headerText: { marginLeft: 10, flex: 1 },
  userName: { fontSize: 16, fontFamily: F.bodyBold, color: C.dark },
  statusText: { fontSize: 11.5, color: C.muted, marginTop: 1, fontFamily: F.bodyMedium },
  statusTyping: { color: C.dark, fontFamily: F.bodyBold },

  // list
  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4, flexGrow: 1 },
  listFooterSpace: { height: 8 },
  datePillWrap: { alignItems: 'center', marginTop: 14, marginBottom: 4 },
  datePill: {
    backgroundColor: C.soft, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  datePillText: { fontSize: 11.5, fontFamily: F.bodyBold, color: C.muted },

  rowWrap: { maxWidth: '80%' },
  rowMe: { alignSelf: 'flex-end' },
  rowThem: { alignSelf: 'flex-start' },

  bubble: { borderRadius: 18, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6 },
  myBubble: { backgroundColor: C.dark, borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: C.soft, borderBottomLeftRadius: 6 },
  myCorner: { borderBottomRightRadius: 6 },
  theirCorner: { borderBottomLeftRadius: 6 },
  msgText: { fontSize: 14.5, fontFamily: F.body, lineHeight: 20 },
  myText: { color: C.white },
  theirText: { color: C.dark },

  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  metaOverlay: {
    position: 'absolute', right: 8, bottom: 8, marginTop: 0,
    backgroundColor: T.overlay, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  metaTime: { fontSize: 10.5, fontFamily: F.body, color: C.muted },
  metaTimeLight: { color: C.metaLight },
  metaTick: { marginLeft: 3 },

  imageWrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: C.soft },
  msgImage: { borderRadius: 0 },

  audioBubble: { minWidth: 210, paddingTop: 10 },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  playBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  playIconNudge: { marginLeft: 2 },
  audioBody: { flex: 1, marginLeft: 10 },
  audioTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  audioTrackDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  audioTrackLight: { backgroundColor: C.border },
  audioFill: { height: '100%', borderRadius: 2 },
  audioTime: { fontSize: 11, color: C.muted, marginTop: 5, fontFamily: F.bodySemi },
  audioTimeLight: { color: C.metaLight },

  deletedRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  deletedText: { marginLeft: 6, fontSize: 13.5, fontFamily: F.body, fontStyle: 'italic', color: C.muted },
  deletedTextLight: { color: C.metaLight },

  typingWrap: { marginTop: 10 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.dark, marginHorizontal: 2 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.heading, color: C.dark },
  emptySub: { fontSize: 13.5, fontFamily: F.body, color: C.muted, marginTop: 4, textAlign: 'center' },

  scrollBtn: {
    position: 'absolute', right: 14, bottom: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollBadge: {
    position: 'absolute', top: -6, right: -4,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center',
  },
  scrollBadgeText: { fontSize: 10, fontFamily: F.bodyBold, color: C.dark },

  uploadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, backgroundColor: C.soft,
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  uploadText: { marginLeft: 8, fontSize: 12, color: C.text2, fontFamily: F.bodyBold },

  recordingBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: C.goldSoft,
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger },
  recordingTime: { marginLeft: 8, fontSize: 14, fontFamily: F.bodyBold, color: C.dark },
  recordingLabel: { marginLeft: 8, fontSize: 12, fontFamily: F.body, color: C.muted, flex: 1 },
  recordSendBtn: {
    marginLeft: 8, width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.dark, justifyContent: 'center', alignItems: 'center',
  },

  // input
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.divider,
    backgroundColor: C.white,
  },
  input: {
    flex: 1, minHeight: 46, maxHeight: 110,
    marginHorizontal: 8,
    borderRadius: 23, backgroundColor: C.soft,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    fontSize: 15, fontFamily: F.body, color: C.dark,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.dark, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: T.sand },
  micActive: { backgroundColor: C.gold },

  // sheets
  sheetOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 10,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: T.sand, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontFamily: F.bodyBold, color: C.muted, marginBottom: 4, marginLeft: 4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', height: 52 },
  sheetIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: C.soft, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  sheetIconDanger: { backgroundColor: C.dangerSoft },
  sheetLabel: { fontSize: 15, fontFamily: F.bodyBold, color: C.dark },
  sheetLabelDanger: { color: C.danger },

  // viewer
  fullscreenOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'center', alignItems: 'center' },
  fullscreenTouchable: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  closeFullscreen: {
    position: 'absolute', right: 16,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
});
