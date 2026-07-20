import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, StatusBar,
  Modal, Alert, Linking, Dimensions, Animated, Keyboard,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

const { width } = Dimensions.get('window');
const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/decaxpera/auto/upload";
const UPLOAD_PRESET = "tdc_profiles";

const formatDuration = (seconds) => {
  const mins = Math.floor((seconds || 0) / 60);
  const secs = (seconds || 0) % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// ✅ Text Bubble
const TextBubble = React.memo(({ item, isMe, onLongPress }) => (
  <TouchableOpacity 
    style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
    onLongPress={() => onLongPress(item)} delayLongPress={500} activeOpacity={0.8}
  >
    <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
      <Text style={[styles.msgText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
    </View>
    <Text style={[styles.timeText, isMe && styles.timeRight]}>
      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </Text>
  </TouchableOpacity>
));

// ✅ Image Bubble with auto-size
const ImageBubble = React.memo(({ item, isMe, onLongPress }) => {
  const [imageSize, setImageSize] = useState({ width: 200, height: 200 });

  useEffect(() => {
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
    <TouchableOpacity 
      style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
      onLongPress={() => onLongPress(item)} delayLongPress={500} activeOpacity={0.8}
    >
      <View style={[styles.bubble, styles.mediaBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Image source={{ uri: item.mediaUrl }} style={[{ width: imageSize.width, height: imageSize.height }, styles.msgMedia]} resizeMode="cover" />
      </View>
      <Text style={[styles.timeText, isMe && styles.timeRight]}>
        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </TouchableOpacity>
  );
});

// ✅ Audio Bubble
const AudioBubble = React.memo(({ item, isMe, onPlay, onLongPress }) => (
  <TouchableOpacity 
    style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
    onPress={() => onPlay(item.mediaUrl)} onLongPress={() => onLongPress(item)} delayLongPress={500} activeOpacity={0.8}
  >
    <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
      <View style={styles.audioRow}>
        <View style={[styles.playBtn, isMe && styles.playBtnMe]}>
          <Ionicons name="play" size={22} color={isMe ? "#1a1a1a" : "#f9c349"} />
        </View>
        <View style={styles.audioWaveContainer}>
          {[...Array(14)].map((_, i) => (
            <View key={i} style={[styles.audioWave, { height: Math.random() * 20 + 8, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : '#f9c34930' }]} />
          ))}
        </View>
        <Text style={[styles.audioDurationSmall, isMe ? styles.myText : styles.otherText]}>
          {item.duration ? formatDuration(item.duration) : '0:00'}
        </Text>
      </View>
    </View>
    <Text style={[styles.timeText, isMe && styles.timeRight]}>
      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </Text>
  </TouchableOpacity>
));

// ✅ Location Bubble
const LocationBubble = React.memo(({ item, isMe, onLongPress }) => (
  <TouchableOpacity 
    style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}
    onPress={() => item.location && Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${item.location.latitude},${item.location.longitude}`
    )}
    onLongPress={() => onLongPress(item)} delayLongPress={500} activeOpacity={0.8}
  >
    <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
      <View style={styles.locationBox}>
        <View style={styles.locationIconCircle}>
          <Ionicons name="location" size={20} color={isMe ? "#1a1a1a" : "#f9c349"} />
        </View>
        <View>
          <Text style={[styles.locationTitle, isMe ? styles.myText : styles.otherText]}>Shared Location</Text>
          <Text style={styles.locationSub}>Tap to view on map</Text>
        </View>
      </View>
    </View>
    <Text style={[styles.timeText, isMe && styles.timeRight]}>
      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </Text>
  </TouchableOpacity>
));

// ✅ Call Log Bubble
const CallLogBubble = React.memo(({ item, isMe }) => (
  <View style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}>
    <View style={[styles.bubble, styles.callBubble, isMe ? styles.myBubble : styles.otherBubble]}>
      <View style={styles.callRow}>
        <Ionicons name="call-outline" size={18} color={isMe ? "#f9c349" : "#666"} />
        <Text style={[styles.callText, isMe ? styles.myText : styles.otherText]}>{item.text || "Voice Call"}</Text>
      </View>
    </View>
    <Text style={[styles.timeText, isMe && styles.timeRight]}>
      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </Text>
  </View>
));

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user: currentUser } = useContext(AuthContext);
  const { conversationId, recipient } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isRecipientOnline, setIsRecipientOnline] = useState(recipient?.online || false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // ✅ NEW: Track keyboard height
  const [isInputFocused, setIsInputFocused] = useState(false); // ✅ NEW: Track input focus

  const flatListRef = useRef();
  const soundRef = useRef(null);
  const inputRef = useRef(null); // ✅ NEW: Reference to input
  const clearSlide = useRef(new Animated.Value(200)).current;
  const mediaSlide = useRef(new Animated.Value(200)).current;
  const deleteSlide = useRef(new Animated.Value(200)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const recordingTimerRef = useRef(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchMessages();
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    socket.emit("user_online", currentUser._id);
    socket.emit("join_chat", conversationId);
    
    socket.on("user_status_update", (data) => { 
      if (data.userId === recipient?._id) setIsRecipientOnline(data.status === "online"); 
    });
    
    socket.on("new_message", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }
    });

    // ✅ NEW: Listen to keyboard events
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      socket.off("new_message"); 
      socket.off("user_status_update");
      if (soundRef.current) soundRef.current.unloadAsync();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [conversationId]);

  useEffect(() => { if (showClearModal) { clearSlide.setValue(200); Animated.spring(clearSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start(); } }, [showClearModal]);
  useEffect(() => { if (showMediaMenu) { mediaSlide.setValue(200); Animated.spring(mediaSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start(); } }, [showMediaMenu]);
  useEffect(() => { if (showDeleteModal) { deleteSlide.setValue(200); Animated.spring(deleteSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start(); } }, [showDeleteModal]);
  
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      Animated.loop(Animated.sequence([
        Animated.timing(recordingAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        Animated.timing(recordingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])).start();
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingAnim.stopAnimation(); 
      recordingAnim.setValue(1);
    }
  }, [isRecording]);

  const fetchMessages = async () => {
    try { 
      const res = await axios.get(`${API_URL}/messages/${conversationId}`, config); 
      setMessages(Array.isArray(res.data) ? res.data : []); 
    }
    catch (err) { 
      console.error("Fetch Error:", err); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const uploadFile = async (uri, type) => {
    setUploading(true); 
    setUploadProgress(`Uploading ${type}...`);
    const data = new FormData();
    data.append("file", { 
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri, 
      name: `upload_${Date.now()}`, 
      type: type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "audio/m4a" 
    });
    data.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await axios.post(CLOUDINARY_URL, data, { headers: { "Content-Type": "multipart/form-data" } });
      setUploading(false); 
      setUploadProgress("");
      return res.data.secure_url;
    } catch (e) { 
      setUploading(false); 
      setUploadProgress(""); 
      Alert.alert("Upload Failed"); 
      return null; 
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    socket.emit("send_message", { 
      conversationId, 
      senderId: currentUser._id, 
      text: inputText, 
      messageType: "text" 
    });
    setInputText("");
    // ✅ NEW: Keep input focused
    inputRef.current?.focus();
  };

  // ✅ Send location with confirmation
  const sendLocation = async () => {
    setShowMediaMenu(false);
    Alert.alert("Share Location", "Do you want to share your current location?", [
      { text: "Cancel", style: "cancel" },
      { text: "Share", onPress: async () => {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed"); return; }
          let loc = await Location.getCurrentPositionAsync({});
          socket.emit("send_message", { 
            conversationId, 
            senderId: currentUser._id, 
            messageType: "location", 
            location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 
            text: "📍 Shared a location" 
          });
      }}
    ]);
  };

  // ✅ Pick images with confirmation before sending
  const pickImages = async () => {
    setShowMediaMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 0.9,
    });
    
    if (!result.canceled) {
      Alert.alert("Send Image", "Do you want to send this image?", [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: async () => {
            const url = await uploadFile(result.assets[0].uri, "image");
            if (url) socket.emit("send_message", { 
              conversationId, 
              senderId: currentUser._id, 
              mediaUrl: url, 
              messageType: "image" 
            });
        }}
      ]);
    }
  };

  // ✅ Pick videos with confirmation before sending
  const pickVideos = async () => {
    setShowMediaMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
      allowsEditing: true, 
      quality: 0.8, 
      videoMaxDuration: 60,
    });
    
    if (!result.canceled) {
      Alert.alert("Send Video", "Do you want to send this video?", [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: async () => {
            const url = await uploadFile(result.assets[0].uri, "video");
            if (url) socket.emit("send_message", { 
              conversationId, 
              senderId: currentUser._id, 
              mediaUrl: url, 
              messageType: "video" 
            });
        }}
      ]);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("Permission needed"); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording); 
      setIsRecording(true); 
      setRecordingDuration(0);
    } catch (err) { 
      Alert.alert("Error", "Failed to start recording"); 
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const url = await uploadFile(uri, "audio");
      if (url) socket.emit("send_message", { 
        conversationId, 
        senderId: currentUser._id, 
        mediaUrl: url, 
        messageType: "audio", 
        duration: recordingDuration 
      });
    } catch (error) {}
    setRecording(null); 
    setRecordingDuration(0);
  };

  const cancelRecording = async () => { 
    setIsRecording(false); 
    if (recording) { 
      try { 
        await recording.stopAndUnloadAsync(); 
      } catch (error) {} 
    } 
    setRecording(null); 
    setRecordingDuration(0); 
  };

  const playVoice = async (url) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound; 
      await sound.playAsync();
    } catch (e) {}
  };

  const handleLongPress = (message) => {
    if (message.sender?._id === currentUser._id || message.sender === currentUser._id) { 
      setSelectedMessage(message); 
      setShowDeleteModal(true); 
    }
  };

  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setMessages(prev => prev.filter(m => m._id !== selectedMessage._id));
          socket.emit("delete_message", { messageId: selectedMessage._id, conversationId });
          setShowDeleteModal(false); 
          setSelectedMessage(null);
      }}
    ]);
  };

  const handleCall = () => { 
    Linking.openURL(`tel:${recipient?.phone || "0000000000"}`); 
  };

  const clearChat = () => {
    Alert.alert("Clear Chat", "Delete all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
          await axios.delete(`${API_URL}/messages/${conversationId}`, config);
          setMessages([]); 
          setShowClearModal(false);
      }}
    ]);
  };

  const renderMessage = ({ item }) => {
    if (!item) return null;
    const isMe = (item.sender?._id || item.sender) === currentUser._id;
    if (item.messageType === "call_log") return <CallLogBubble item={item} isMe={isMe} />;
    if (item.messageType === "image" || item.messageType === "video") return <ImageBubble item={item} isMe={isMe} onLongPress={handleLongPress} />;
    if (item.messageType === "audio") return <AudioBubble item={item} isMe={isMe} onPlay={playVoice} onLongPress={handleLongPress} />;
    if (item.messageType === "location") return <LocationBubble item={item} isMe={isMe} onLongPress={handleLongPress} />;
    if (item.messageType === "text" && item.text) return <TextBubble item={item} isMe={isMe} onLongPress={handleLongPress} />;
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => navigation.navigate("UserProfile", { userId: recipient?._id })}>
          <LinearGradient colors={isRecipientOnline ? ['#4CAF50', '#2E7D32'] : ['#f9c349', '#1a1a1a']} style={styles.avatarBorder}>
            <Image source={{ uri: recipient?.profileImage || "https://via.placeholder.com/150" }} style={styles.avatar} />
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.userName} numberOfLines={1}>{recipient?.name || "User"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.statusDot, { backgroundColor: isRecipientOnline ? "#4CAF50" : "#999" }]} />
              <Text style={[styles.status, { color: isRecipientOnline ? "#4CAF50" : "#999" }]}>
                {isRecipientOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCall} style={styles.callHeaderBtn}>
          <Ionicons name="call-outline" size={20} color="#f9c349" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowClearModal(true)} style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f9c349" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id || Math.random().toString()}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            scrollEnabled={true} // ✅ NEW: Ensure scroll is enabled
            nestedScrollEnabled={true} // ✅ NEW: Handle nested scrolling
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.emptyIconGradient}>
                  <Ionicons name="chatbubble-ellipses" size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyText}>Start a conversation</Text>
                <Text style={styles.emptySub}>Send a message to begin chatting!</Text>
              </View>
            }
          />
        )}

        {uploading && (
          <View style={styles.uploadBar}>
            <ActivityIndicator size="small" color="#f9c349" />
            <Text style={styles.uploadBarText}>{uploadProgress}</Text>
          </View>
        )}
        
        {isRecording && (
          <View style={styles.recordingBar}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: recordingAnim }] }]} />
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            <Text style={styles.recordingLabel}>Recording...</Text>
            <View style={styles.recordingActions}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordBtn}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording} style={styles.sendRecordBtn}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.sendRecordGradient}>
                  <Ionicons name="send" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ✅ FIXED: Input Area with proper KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 20}
        style={styles.keyboardView}
        enabled={true}
      >
        <View style={styles.inputArea}>
          <TouchableOpacity onPress={() => setShowMediaMenu(true)} style={styles.plusBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TextInput 
            ref={inputRef}
            style={styles.input} 
            placeholder="Message..." 
            placeholderTextColor="#999" 
            value={inputText} 
            onChangeText={setInputText}
            onFocus={() => setIsInputFocused(true)} // ✅ NEW: Track focus
            onBlur={() => setIsInputFocused(false)} // ✅ NEW: Track blur
            multiline 
            editable={!isRecording}
            scrollEnabled={true} // ✅ NEW: Allow scroll in input
            maxHeight={100}
          />
          {inputText.trim().length > 0 ? (
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.sendGradient}>
                <Ionicons name="send" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onLongPress={startRecording} 
              onPressOut={stopRecording} 
              delayLongPress={200} 
              style={styles.micBtn}
            >
              <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.micGradient}>
                <Ionicons name="mic" size={20} color="#f9c349" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Media Menu Modal */}
      <Modal visible={showMediaMenu} transparent animationType="fade" onRequestClose={() => setShowMediaMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMediaMenu(false)}>
          <Animated.View style={[styles.mediaBox, { transform: [{ translateY: mediaSlide }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.mediaTitle}>Share Media</Text>
            <View style={styles.mediaGrid}>
              <TouchableOpacity style={styles.mediaGridItem} onPress={pickImages}>
                <View style={[styles.mediaIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="image" size={28} color="#2196F3" />
                </View>
                <Text style={styles.mediaGridText}>Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaGridItem} onPress={pickVideos}>
                <View style={[styles.mediaIconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="videocam" size={28} color="#F44336" />
                </View>
                <Text style={styles.mediaGridText}>Videos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaGridItem} onPress={sendLocation}>
                <View style={[styles.mediaIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="location" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.mediaGridText}>Location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaGridItem} onPress={() => setShowMediaMenu(false)}>
                <View style={[styles.mediaIconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="close" size={28} color="#FF9800" />
                </View>
                <Text style={styles.mediaGridText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Clear Chat Modal */}
      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClearModal(false)}>
          <Animated.View style={[styles.clearBox, { transform: [{ translateY: clearSlide }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.clearTitle}>Chat Options</Text>
            <TouchableOpacity style={styles.clearItem} onPress={clearChat}>
              <View style={[styles.clearIconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={22} color="#F44336" />
              </View>
              <View style={styles.clearItemContent}>
                <Text style={[styles.clearItemTitle, { color: '#F44336' }]}>Clear Chat</Text>
                <Text style={styles.clearItemSub}>Delete all messages</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.clearItem, styles.clearItemLast]} onPress={() => setShowClearModal(false)}>
              <View style={[styles.clearIconCircle, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="close-outline" size={22} color="#666" />
              </View>
              <View style={styles.clearItemContent}>
                <Text style={styles.clearItemTitle}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Message Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteModal(false)}>
          <Animated.View style={[styles.deleteBox, { transform: [{ translateY: deleteSlide }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.deleteTitle}>Delete Message</Text>
            <TouchableOpacity style={styles.clearItem} onPress={handleDeleteMessage}>
              <View style={[styles.clearIconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={22} color="#F44336" />
              </View>
              <View style={styles.clearItemContent}>
                <Text style={[styles.clearItemTitle, { color: '#F44336' }]}>Delete</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.clearItem, styles.clearItemLast]} onPress={() => setShowDeleteModal(false)}>
              <View style={[styles.clearIconCircle, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="close-outline" size={22} color="#666" />
              </View>
              <View style={styles.clearItemContent}>
                <Text style={styles.clearItemTitle}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fff" },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flexDirection: "row", alignItems: "center", flex: 1, marginHorizontal: 6 },
  avatarBorder: { width: 42, height: 42, borderRadius: 14, padding: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f0f0f0" },
  userName: { fontWeight: "800", fontSize: 15, color: "#1a1a1a" },
  status: { fontSize: 11, fontWeight: "600", marginLeft: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  callHeaderBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 14, paddingBottom: 10, flexGrow: 1 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIconGradient: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  emptySub: { fontSize: 13, color: '#999', marginTop: 4, fontWeight: '500' },
  msgWrapper: { marginBottom: 10, maxWidth: "78%" },
  myMsg: { alignSelf: "flex-end" },
  otherMsg: { alignSelf: "flex-start" },
  bubble: { padding: 12, borderRadius: 18 },
  mediaBubble: { padding: 0, overflow: "hidden" },
  myBubble: { backgroundColor: "#1a1a1a", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#f8f8f8", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#f0f0f0' },
  msgText: { fontSize: 15, lineHeight: 21 },
  myText: { color: "#fff" },
  otherText: { color: "#1a1a1a" },
  timeText: { fontSize: 10, color: "#999", marginTop: 3, marginLeft: 4 },
  timeRight: { textAlign: 'right', marginRight: 4 },
  msgMedia: { borderRadius: 14 },
  callBubble: { padding: 10 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callText: { fontSize: 13, fontWeight: '600' },
  audioRow: { flexDirection: "row", alignItems: "center", padding: 4, gap: 8, minWidth: 160 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f9c34920', justifyContent: 'center', alignItems: 'center' },
  playBtnMe: { backgroundColor: 'rgba(255,255,255,0.2)' },
  audioWaveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 30 },
  audioWave: { flex: 1, borderRadius: 2 },
  audioDurationSmall: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4, minWidth: 160 },
  locationIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f9c34920', justifyContent: 'center', alignItems: 'center' },
  locationTitle: { fontSize: 13, fontWeight: '700' },
  locationSub: { fontSize: 10, color: '#999', marginTop: 2 },
  uploadBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#f8f8f8', gap: 8 },
  uploadBarText: { fontSize: 12, color: '#f9c349', fontWeight: '500' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 16, backgroundColor: '#FFF9F0', borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4444' },
  recordingTime: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', fontVariant: ['tabular-nums'] },
  recordingLabel: { fontSize: 12, color: '#999', flex: 1 },
  recordingActions: { flexDirection: 'row', gap: 8 },
  cancelRecordBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  sendRecordBtn: { borderRadius: 12, overflow: 'hidden' },
  sendRecordGradient: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flexShrink: 1 },
  inputArea: { flexDirection: "row", padding: 10, paddingHorizontal: 12, alignItems: "flex-end", borderTopWidth: 1, borderTopColor: "#f0f0f0", backgroundColor: "#fff", gap: 8 },
  plusBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: "#f8f8f8", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: "#1a1a1a", borderWidth: 2, borderColor: '#f0f0f0' },
  sendBtn: { borderRadius: 14, overflow: 'hidden' },
  sendGradient: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  micBtn: { borderRadius: 14, overflow: 'hidden' },
  micGradient: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  dragHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  clearBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  clearTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  clearItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  clearItemLast: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4, paddingTop: 16 },
  clearIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  clearItemContent: { flex: 1 },
  clearItemTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  clearItemSub: { fontSize: 12, color: '#999', marginTop: 1, fontWeight: '500' },
  mediaBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  mediaTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },
  mediaGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  mediaGridItem: { alignItems: 'center', width: '22%' },
  mediaIconCircle: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  mediaGridText: { fontSize: 11, color: '#1a1a1a', fontWeight: '600' },
  deleteBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  deleteTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
});