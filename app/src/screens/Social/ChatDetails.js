import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, Image, ActivityIndicator, StatusBar,
  Modal, Alert, Dimensions, Animated, Keyboard,
  Vibration, KeyboardAvoidingView, BackHandler
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useIsFocused, CommonActions } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/decaxpera/auto/upload";
const UPLOAD_PRESET = "tdc_profiles";

const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e6b800',
  primaryLight: '#fef9f0',
  white: '#ffffff',
  black: '#1a1a1a',
  dark: '#0f1419',
  gray: '#666666',
  lightGray: '#f5f6f8',
  border: '#eef0f2',
  danger: '#ff4757',
  success: '#4CAF50',
  text: '#1a1a1a',
  textSecondary: '#71767b',
  textLight: '#8899a6',
  shadow: 'rgba(0,0,0,0.05)',
};

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
  
  const msgDate = new Date(date);
  
  if (msgDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (msgDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return msgDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

// Text Bubble Component
const TextBubble = React.memo(({ item, isMe, onLongPress }) => {
  const messageTime = item.createdAt ? new Date(item.createdAt) : new Date();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ 
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }]
    }}>
      <TouchableOpacity 
        style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
        onLongPress={() => onLongPress(item)} 
        delayLongPress={500} 
        activeOpacity={0.7}
      >
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.msgText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
        </View>
        <Text style={[styles.timeText, isMe && styles.timeRight]}>
          {messageTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Image Bubble Component
const ImageBubble = React.memo(({ item, isMe, onLongPress, onImagePress }) => {
  const [imageSize, setImageSize] = useState({ width: 200, height: 200 });
  const messageTime = item.createdAt ? new Date(item.createdAt) : new Date();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (item.mediaUrl) {
      Image.getSize(item.mediaUrl, (w, h) => {
        const maxWidth = width * 0.65;
        const ratio = maxWidth / w;
        const newHeight = Math.min(h * ratio, 350);
        const newWidth = h * ratio > 350 ? (350 / h) * w : maxWidth;
        setImageSize({ width: Math.min(newWidth, maxWidth), height: newHeight });
      }, () => {});
    }
  }, [item.mediaUrl]);

  return (
    <Animated.View style={{ 
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }]
    }}>
      <TouchableOpacity 
        style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
        onLongPress={() => onLongPress(item)} 
        delayLongPress={500} 
        activeOpacity={0.7}
      >
        <TouchableOpacity 
          style={[styles.bubble, styles.mediaBubble, isMe ? styles.myBubble : styles.otherBubble]}
          onPress={() => onImagePress && onImagePress(item.mediaUrl)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.mediaUrl }} style={[{ width: imageSize.width, height: imageSize.height }, styles.msgMedia]} resizeMode="cover" />
        </TouchableOpacity>
        <Text style={[styles.timeText, isMe && styles.timeRight]}>
          {messageTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Audio Bubble Component
const AudioBubble = React.memo(({ item, isMe, onPlay, onLongPress, isCurrentlyPlaying, currentPlayingId }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(item.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const isPlaying = isCurrentlyPlaying && currentPlayingId === item._id;
  const messageTime = item.createdAt ? new Date(item.createdAt) : new Date();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
    }
  }, [isPlaying]);

  const handlePlay = async () => {
    await onPlay(item, (status) => {
      if (status.isLoaded) {
        setDuration(status.durationMillis / 1000);
        if (status.isPlaying) {
          const progress = status.positionMillis / status.durationMillis;
          setProgress(progress);
          setCurrentTime(status.positionMillis / 1000);
        }
        if (status.didJustFinish) {
          setProgress(0);
          setCurrentTime(0);
        }
      }
    });
  };

  const displayDuration = duration > 0 ? formatDuration(duration) : '0:00';
  const displayCurrentTime = duration > 0 ? formatDuration(currentTime) : '0:00';
  const totalDuration = duration > 0 ? formatDuration(duration) : '0:00';

  const waveHeights = [8, 12, 16, 12, 8];

  return (
    <Animated.View style={{ 
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }]
    }}>
      <TouchableOpacity 
        style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
        onLongPress={() => onLongPress(item)} 
        delayLongPress={500} 
        activeOpacity={0.7}
      >
        <View style={[styles.bubble, styles.audioBubble, isMe ? styles.myAudioBubble : styles.otherAudioBubble]}>
          <View style={styles.audioContainer}>
            <TouchableOpacity onPress={handlePlay} style={styles.audioPlayBtn}>
              <LinearGradient 
                colors={isMe ? [COLORS.primary, COLORS.primaryDark] : [COLORS.dark, COLORS.dark]} 
                style={styles.audioPlayGradient}
              >
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={22} 
                  color={isMe ? COLORS.black : COLORS.primary} 
                />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.audioProgressSection}>
              <View style={styles.audioProgressContainer}>
                <Animated.View style={[
                  styles.audioProgressBar, 
                  { width: `${Math.min(progress * 100, 100)}%` }
                ]} />
              </View>
              <View style={styles.audioTimeRow}>
                <Text style={[styles.audioCurrentTime, isMe ? styles.myText : styles.otherText]}>
                  {isPlaying ? displayCurrentTime : totalDuration}
                </Text>
                {isPlaying && (
                  <View style={styles.waveContainer}>
                    {waveHeights.map((h, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            height: h,
                            transform: [{
                              scaleY: waveAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5 + i * 0.1, 1.5 - i * 0.1],
                              })
                            }],
                            backgroundColor: isMe ? COLORS.black : COLORS.primary,
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
        <Text style={[styles.timeText, isMe && styles.timeRight]}>
          {messageTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Date Header Component
const DateHeader = React.memo(({ date }) => (
  <View style={styles.dateHeaderContainer}>
    <LinearGradient colors={['transparent', COLORS.border]} style={styles.dateHeaderLine} />
    <View style={styles.dateHeaderContent}>
      <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
    </View>
    <LinearGradient colors={[COLORS.border, 'transparent']} style={styles.dateHeaderLine} />
  </View>
));

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user: currentUser } = useContext(AuthContext);
  const isFocused = useIsFocused();
  
  // Safely get params with fallback
  const conversationId = route.params?.conversationId;
  const recipient = route.params?.recipient || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const flatListRef = useRef();
  const soundRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Animations
  const optionsSlide = useRef(new Animated.Value(400)).current;
  const deleteSlide = useRef(new Animated.Value(400)).current;
  const imagePickerSlide = useRef(new Animated.Value(400)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const inputSlide = useRef(new Animated.Value(30)).current;
  const recordingTimerRef = useRef(null);
  const onlinePulse = useRef(new Animated.Value(1)).current;
  
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // FIXED: Validate params and handle navigation
  useEffect(() => {
    if (!conversationId || !recipient?._id) {
      Alert.alert('Error', 'Invalid conversation data');
      navigation.goBack();
      return;
    }
  }, [conversationId, recipient]);

  // FIXED: Handle back navigation properly
  const handleGoBack = useCallback(() => {
    if (!isNavigating) {
      setIsNavigating(true);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // If can't go back, navigate to Messages screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Messages' }],
          })
        );
      }
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [navigation, isNavigating]);

  // FIXED: Hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isNavigating) {
        handleGoBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [handleGoBack, isNavigating]);

  // Lifecycle
  useEffect(() => {
    if (!conversationId || !recipient?._id) return;
    
    fetchMessages();
    
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(inputSlide, { 
        toValue: 0, 
        friction: 8, 
        tension: 40, 
        useNativeDriver: true 
      }),
    ]).start();

    if (recipient?.online !== undefined) {
      setIsRecipientOnline(recipient.online);
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(onlinePulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(onlinePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    socket.emit("user_online", currentUser._id);
    socket.emit("join_chat", conversationId);
    
    // Socket event listeners
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
        setMessages((prev) => {
          // Prevent duplicate messages
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const handleUserTyping = ({ userId, userName, typing }) => {
      if (userId !== currentUser._id) {
        setTypingUser(typing ? userName : null);
      }
    };

    socket.on("user_status_update", handleStatusUpdate);
    socket.emit("get_user_status", recipient?._id);
    socket.on("user_status_response", handleStatusResponse);
    socket.on("new_message", handleNewMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("user_typing", handleUserTyping);

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      }
    );

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
      keyboardWillShow.remove();
    };
  }, [conversationId]);

  // Modal animations
  useEffect(() => { 
    if (showOptionsModal) { 
      optionsSlide.setValue(400); 
      Animated.spring(optionsSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start(); 
    } 
  }, [showOptionsModal]);
  
  useEffect(() => { 
    if (showDeleteModal) { 
      deleteSlide.setValue(400); 
      Animated.spring(deleteSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start(); 
    } 
  }, [showDeleteModal]);

  useEffect(() => { 
    if (showImagePicker) { 
      imagePickerSlide.setValue(400); 
      Animated.spring(imagePickerSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start(); 
    } 
  }, [showImagePicker]);
  
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      
      Vibration.vibrate([0, 100]);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingAnim.stopAnimation(); 
      recordingAnim.setValue(1);
    }
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording]);

  const fetchMessages = async () => {
    try { 
      const res = await axios.get(`${API_URL}/messages/${conversationId}`, config); 
      setMessages(Array.isArray(res.data) ? res.data : []); 
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const uploadFile = async (uri, type) => {
    setUploading(true); 
    setUploadProgress(`Uploading ${type}...`);
    
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
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(`Uploading... ${percentCompleted}%`);
        }
      });
      setUploading(false); 
      setUploadProgress("");
      return res.data.secure_url;
    } catch (e) { 
      console.error('Upload error:', e);
      setUploading(false); 
      setUploadProgress(""); 
      Alert.alert("Upload Failed", "Please try again"); 
      return null; 
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const messageData = { 
      conversationId, 
      senderId: currentUser._id, 
      text: inputText.trim(), 
      messageType: "text" 
    };
    socket.emit("send_message", messageData);
    setInputText("");
    inputRef.current?.focus();
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

  const pickImage = async () => {
    setShowImagePicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { 
      Alert.alert('Permission needed', 'Media library permission is required to send images.'); 
      return; 
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 0.9,
    });
    
    if (!result.canceled) {
      Alert.alert("Send Image", "Send this image?", [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: async () => {
            const url = await uploadFile(result.assets[0].uri, "image");
            if (url) {
              socket.emit("send_message", { 
                conversationId, 
                senderId: currentUser._id, 
                mediaUrl: url, 
                messageType: "image" 
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }}
      ]);
    }
  };

  const takePhoto = async () => {
    setShowImagePicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { 
      Alert.alert('Permission needed', 'Camera permission is required to take photos.'); 
      return; 
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    
    if (!result.canceled) {
      Alert.alert("Send Image", "Send this photo?", [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: async () => {
            const url = await uploadFile(result.assets[0].uri, "image");
            if (url) {
              socket.emit("send_message", { 
                conversationId, 
                senderId: currentUser._id, 
                mediaUrl: url, 
                messageType: "image" 
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }}
      ]);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Vibration.vibrate([0, 50]);
      
    } catch (err) {
      console.error('Start recording error:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }
    
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        Alert.alert('Error', 'Recording failed to save.');
        setRecording(null);
        setRecordingDuration(0);
        return;
      }

      const url = await uploadFile(uri, 'audio');
      if (url) {
        const durationInSeconds = recordingDuration;
        socket.emit('send_message', {
          conversationId,
          senderId: currentUser._id,
          mediaUrl: url,
          messageType: 'audio',
          duration: durationInSeconds
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to process recording.');
    }
    
    setRecording(null);
    setRecordingDuration(0);
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Cancel recording error:', error);
      }
    }
    
    setRecording(null);
    setRecordingDuration(0);
  };

  const playVoice = async (item, onProgressUpdate) => {
    try {
      if (currentPlayingId === item._id && isCurrentlyPlaying) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
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
      setCurrentPlayingId(item._id);
      setIsCurrentlyPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (onProgressUpdate) {
            onProgressUpdate(status);
          }
          
          if (status.didJustFinish) {
            setIsCurrentlyPlaying(false);
            setCurrentPlayingId(null);
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
      setIsCurrentlyPlaying(false);
      setCurrentPlayingId(null);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    }
  };

  const handleLongPress = (message) => {
    if (message.sender?._id === currentUser._id || message.sender === currentUser._id) { 
      setSelectedMessage(message); 
      setShowDeleteModal(true); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

 // In ChatDetailScreen.js - Fix the handleDeleteMessage function

const handleDeleteMessage = async () => {
  if (!selectedMessage) return;
  
  try {
    console.log('Deleting message:', selectedMessage._id);
    // Call API to delete message
    const response = await axios.delete(`${API_URL}/messages/${selectedMessage._id}`, config);
    console.log('Delete message response:', response.data);
    
    if (response.data.success) {
      // Emit socket event
      socket.emit("delete_message", { 
        messageId: selectedMessage._id, 
        conversationId 
      });
      
      // Remove message from local state
      setMessages(prev => prev.filter(m => m._id !== selectedMessage._id));
      setShowDeleteModal(false); 
      setSelectedMessage(null);
      
      Alert.alert('Success', 'Message deleted successfully');
    } else {
      Alert.alert('Error', response.data?.error || 'Failed to delete message');
    }
  } catch (err) {
    console.error('Delete message error:', err);
    Alert.alert('Error', 'Failed to delete message. Please try again.');
  }
};

  const clearChat = () => {
    Alert.alert("Clear Chat", "Delete all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/conversations/${conversationId}`, config);
            setMessages([]); 
            setShowOptionsModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            handleGoBack();
          } catch (err) {
            console.error('Clear chat error:', err);
            Alert.alert('Error', 'Failed to clear chat');
          }
      }}
    ]);
  };

  const navigateToProfile = () => {
    if (recipient?._id && !isNavigating) {
      setIsNavigating(true);
      navigation.navigate("UserProfile", { userId: recipient._id });
      setTimeout(() => setIsNavigating(false), 500);
    }
  };

  const renderMessage = ({ item, index }) => {
    if (!item) return null;
    const isMe = (item.sender?._id || item.sender) === currentUser._id;
    
    let showDateHeader = false;
    if (index === 0) {
      showDateHeader = true;
    } else {
      const prevItem = messages[index - 1];
      if (prevItem && prevItem.createdAt) {
        const currentDate = new Date(item.createdAt);
        const prevDate = new Date(prevItem.createdAt);
        if (currentDate.toDateString() !== prevDate.toDateString()) {
          showDateHeader = true;
        }
      }
    }

    let messageComponent = null;
    
    if (item.messageType === "image") {
      messageComponent = <ImageBubble item={item} isMe={isMe} onLongPress={handleLongPress} onImagePress={(url) => {
        setFullscreenImage(url);
        setIsImageFullscreen(true);
      }} />;
    } else if (item.messageType === "audio") {
      messageComponent = (
        <AudioBubble 
          item={item} 
          isMe={isMe} 
          onPlay={playVoice} 
          onLongPress={handleLongPress}
          isCurrentlyPlaying={isCurrentlyPlaying}
          currentPlayingId={currentPlayingId}
        />
      );
    } else if (item.messageType === "text" && item.text) {
      messageComponent = <TextBubble item={item} isMe={isMe} onLongPress={handleLongPress} />;
    }

    return (
      <View>
        {showDateHeader && item.createdAt && (
          <DateHeader date={item.createdAt} />
        )}
        {messageComponent}
      </View>
    );
  };

  // Better loading and validation handling
  if (!conversationId || !recipient?._id) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Invalid conversation</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerInfo} 
          onPress={navigateToProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: recipient?.profileImage || `https://ui-avatars.com/api/?name=${recipient?.name || 'User'}&background=f9c349&color=1a1a1a&size=128` }} 
              style={styles.avatar} 
            />
            {isRecipientOnline && (
              <Animated.View style={[styles.statusDot, { transform: [{ scale: onlinePulse }] }]} />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.userName} numberOfLines={1}>{recipient?.name || "User"}</Text>
            <Text style={[styles.statusText, { color: isRecipientOnline ? COLORS.success : COLORS.textLight }]}>
              {isRecipientOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowOptionsModal(true)} style={styles.headerActionBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Messages Container */}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item._id || `msg-${index}-${Date.now()}`}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                typingUser && (
                  <View style={styles.typingIndicator}>
                    <Text style={styles.typingText}>{typingUser} is typing...</Text>
                  </View>
                )
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.emptyIcon}>
                    <Ionicons name="chatbubble-ellipses" size={40} color={COLORS.black} />
                  </LinearGradient>
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptySubtitle}>Send a message to begin chatting!</Text>
                </View>
              }
            />
          )}

          {/* Upload Progress */}
          {uploading && (
            <View style={styles.uploadBar}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.uploadText}>{uploadProgress}</Text>
            </View>
          )}
          
          {/* Recording UI */}
          {isRecording && (
            <View style={styles.recordingBar}>
              <Animated.View style={[styles.recordingDot, { transform: [{ scale: recordingAnim }] }]} />
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.recordingLabel}>Recording...</Text>
              <View style={styles.recordingActions}>
                <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={stopRecording} style={styles.sendRecordBtn}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.sendRecordGradient}>
                    <Ionicons name="send" size={18} color={COLORS.black} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Input Area */}
        <Animated.View style={[styles.inputArea, { transform: [{ translateY: inputSlide }] }]}>
          <TouchableOpacity onPress={() => setShowImagePicker(true)} style={styles.plusBtn}>
            <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.plusGradient}>
              <Ionicons name="add" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
          
          <TextInput 
            ref={inputRef}
            style={styles.input} 
            placeholder="Type a message..." 
            placeholderTextColor={COLORS.textLight} 
            value={inputText} 
            onChangeText={handleInputChange}
            multiline 
            editable={!isRecording}
            scrollEnabled={true}
            maxHeight={100}
          />
          
          {inputText.trim().length > 0 ? (
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.sendGradient}>
                <Ionicons name="send" size={18} color={COLORS.black} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              delayPressIn={200}
              style={styles.micBtn}
            >
              <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.micGradient}>
                <Ionicons name="mic" size={22} color={COLORS.primary} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Image Picker Modal */}
      <Modal visible={showImagePicker} transparent animationType="fade" onRequestClose={() => setShowImagePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowImagePicker(false)}>
          <Animated.View style={[styles.imagePickerModal, { transform: [{ translateY: imagePickerSlide }] }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Photo</Text>
            
            <View style={styles.imagePickerGrid}>
              <TouchableOpacity style={styles.imagePickerItem} onPress={takePhoto}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.imagePickerIcon}>
                  <Ionicons name="camera" size={28} color={COLORS.black} />
                </LinearGradient>
                <Text style={styles.imagePickerLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.imagePickerItem} onPress={pickImage}>
                <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.imagePickerIcon}>
                  <Ionicons name="images" size={28} color={COLORS.primary} />
                </LinearGradient>
                <Text style={styles.imagePickerLabel}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelPickerBtn} onPress={() => setShowImagePicker(false)}>
              <Text style={styles.cancelPickerText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <Animated.View style={[styles.optionsModal, { transform: [{ translateY: optionsSlide }] }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Chat Options</Text>
            
            <TouchableOpacity style={styles.optionItem} onPress={clearChat}>
              <View style={[styles.optionIcon, { backgroundColor: '#fff5f5' }]}>
                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: COLORS.danger }]}>Clear Chat</Text>
                <Text style={styles.optionSubtitle}>Delete all messages</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={() => setShowOptionsModal(false)}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.lightGray }]}>
                <Ionicons name="close-outline" size={22} color={COLORS.textSecondary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Message Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteModal(false)}>
          <Animated.View style={[styles.deleteModal, { transform: [{ translateY: deleteSlide }] }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Delete Message</Text>
            
            <TouchableOpacity style={styles.optionItem} onPress={handleDeleteMessage}>
              <View style={[styles.optionIcon, { backgroundColor: '#fff5f5' }]}>
                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: COLORS.danger }]}>Delete</Text>
                <Text style={styles.optionSubtitle}>Remove this message</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={() => setShowDeleteModal(false)}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.lightGray }]}>
                <Ionicons name="close-outline" size={22} color={COLORS.textSecondary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal visible={isImageFullscreen} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.fullscreenOverlay} 
          activeOpacity={1} 
          onPress={() => setIsImageFullscreen(false)}
        >
          <Image 
            source={{ uri: fullscreenImage }} 
            style={styles.fullscreenImage} 
            resizeMode="contain" 
          />
          <TouchableOpacity 
            style={styles.closeFullscreen} 
            onPress={() => setIsImageFullscreen(false)}
          >
            <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']} style={styles.closeFullscreenGradient}>
              <Ionicons name="close" size={30} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fc' 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.black,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: { 
    padding: 14, 
    paddingBottom: 10, 
    flexGrow: 1 
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  dateHeaderLine: {
    flex: 1,
    height: 0.5,
  },
  dateHeaderContent: {
    paddingHorizontal: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  msgWrapper: { 
    marginBottom: 8, 
    maxWidth: "78%" 
  },
  myMsg: { 
    alignSelf: "flex-end" 
  },
  otherMsg: { 
    alignSelf: "flex-start" 
  },
  bubble: { 
    padding: 12, 
    borderRadius: 18 
  },
  mediaBubble: { 
    padding: 0, 
    overflow: "hidden" 
  },
  audioBubble: {
    padding: 8,
    paddingHorizontal: 12,
    minWidth: 200,
  },
  myAudioBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherAudioBubble: {
    backgroundColor: '#2d2d2d',
    borderBottomLeftRadius: 4,
  },
  myBubble: { 
    backgroundColor: COLORS.black, 
    borderBottomRightRadius: 4 
  },
  otherBubble: { 
    backgroundColor: COLORS.lightGray, 
    borderBottomLeftRadius: 4, 
  },
  msgText: { 
    fontSize: 15, 
    lineHeight: 21 
  },
  myText: { 
    color: COLORS.white 
  },
  otherText: { 
    color: COLORS.black 
  },
  timeText: { 
    fontSize: 10, 
    color: COLORS.textLight, 
    marginTop: 3, 
    marginLeft: 4 
  },
  timeRight: { 
    textAlign: 'right', 
    marginRight: 4 
  },
  msgMedia: { 
    borderRadius: 14 
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  audioPlayBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    flexShrink: 0,
  },
  audioPlayGradient: {
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioProgressSection: {
    flex: 1,
    gap: 6,
  },
  audioProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  audioProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioCurrentTime: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.9,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  typingIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  uploadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: COLORS.lightGray,
    gap: 8,
  },
  uploadText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryLight,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  recordingLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendRecordBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendRecordGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    paddingHorizontal: 12,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  plusBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  plusGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: COLORS.black,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  micBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  micGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  imagePickerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  imagePickerItem: {
    alignItems: 'center',
    width: '40%',
  },
  imagePickerIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePickerLabel: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  cancelPickerBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  cancelPickerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  optionsModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
    fontWeight: '500',
  },
  deleteModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeFullscreen: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  closeFullscreenGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});