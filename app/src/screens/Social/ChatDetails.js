import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
 
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
  Linking,
  Dimensions,
  Animated,
  Vibration,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { io } from "socket.io-client";
import CallModal from "../../components/CallModal";
import { Video } from "expo-av";
import { Audio } from 'expo-audio';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";

const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/decaxpera/auto/upload";
const UPLOAD_PRESET = "tdc_profiles";

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user: currentUser } = useContext(AuthContext);
  const { conversationId, recipient } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(recipient?.online || false);
  const [callStatus, setCallStatus] = useState(null);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingAnimation] = useState(new Animated.Value(0));
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const flatListRef = useRef();
  const soundRef = useRef(null);
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchMessages();
    socket.emit("user_online", currentUser._id);
    socket.emit("join_chat", conversationId);

    socket.on("user_status_update", (data) => {
      if (data.userId === recipient?._id) {
        setIsRecipientOnline(data.status === "online");
      }
    });

    socket.on("new_message", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }
    });

    // Call events
    socket.on("incoming_call", (data) => {
      Vibration.vibrate([1000, 500, 1000]);
      setCallStatus("Incoming Call...");
      setIsCallModalVisible(true);
    });

    socket.on("call_accepted", () => {
      setCallStatus("Connected");
      setIsCallModalVisible(true);
    });

    socket.on("call_ended", () => {
      setIsCallModalVisible(false);
      setCallStatus(null);
      setCallTimer(0);
      cleanupAudio();
    });

    socket.on("call_failed", (data) => {
      Alert.alert("Call Failed", data.reason);
      setIsCallModalVisible(false);
      setCallStatus(null);
    });

    return () => {
      socket.off("new_message");
      socket.off("user_status_update");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_ended");
      socket.off("call_failed");
      cleanupAudio();
    };
  }, [conversationId, recipient?._id]);

  const cleanupAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,

    });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/${conversationId}`, config);
      setMessages(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (uri, type) => {
    setUploading(true);
    const data = new FormData();

    let fileType = type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "audio/m4a";

    data.append("file", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: `upload_${Date.now()}`,
      type: fileType,
    });
    data.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await axios.post(CLOUDINARY_URL, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploading(false);
      return res.data.secure_url;
    } catch (e) {
      setUploading(false);
      console.error("Cloudinary Upload Error:", e.response ? e.response.data : e.message);
      Alert.alert("Upload Failed", "Could not send media.");
      return null;
    }
  };

  const handleCall = () => {
    const phoneNum = recipient.phone || "0000000000";
    Linking.openURL(`tel:${phoneNum}`);
  };

  const sendLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    let loc = await Location.getCurrentPositionAsync({});
    socket.emit("send_message", {
      conversationId,
      senderId: currentUser._id,
      messageType: "location",
      location: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      },
      text: "📍 Shared a location",
    });
    setShowMenu(false);
  };

  const pickMedia = async (mediaType) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType,
      quality: 0.6,
      allowsEditing: mediaType === ImagePicker.MediaTypeOptions.Images ? true : false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const type = asset.type === "video" ? "video" : "image";
      const url = await uploadFile(asset.uri, type);

      if (url) {
        socket.emit("send_message", {
          conversationId,
          senderId: currentUser._id,
          mediaUrl: url,
          messageType: type,
        });
      }
    }
    setShowMenu(false);
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") return;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Start animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      Vibration.vibrate(100);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
    recordingAnimation.stopAnimation();
    Vibration.vibrate(100);
    
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const url = await uploadFile(uri, "audio");
      if (url) {
        socket.emit("send_message", {
          conversationId,
          senderId: currentUser._id,
          mediaUrl: url,
          messageType: "audio",
          duration: recordingDuration,
        });
      }
    } catch (error) {
      console.error(error);
    }
    setRecording(null);
    setRecordingDuration(0);
  };

  const playVoice = async (url) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.error("Audio Playback Error:", e);
    }
  };

  const handleStartCall = () => {
    if (!isRecipientOnline) {
      Alert.alert("User Offline", "User is currently offline.");
      return;
    }
    setCallStatus("Calling...");
    setIsCallModalVisible(true);
    socket.emit("start_call", {
      senderId: currentUser._id,
      receiverId: recipient._id,
      senderName: currentUser.name,
      type: "audio",
    });
  };

  useEffect(() => {
    if (callStatus === "Connected") {
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callStatus !== "Incoming Call...") setCallTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const getFormattedTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleEndCall = () => {
    if (callStatus === "Connected") {
      const finalDuration = getFormattedTime(callTimer);
      socket.emit("send_message", {
        conversationId,
        senderId: currentUser._id,
        text: `📞 Voice Call • ${finalDuration}`,
        messageType: "call_log",
      });
    }
    cleanupAudio();
    socket.emit("end_call", { to: recipient._id });
    setIsCallModalVisible(false);
    setCallStatus(null);
    setCallTimer(0);
  };

  const toggleMute = async () => {
    setIsMuted(!isMuted);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: !isMuted,
    });
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeaker;
    setIsSpeaker(newSpeakerState);
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: !newSpeakerState,
    });
  };

  const handleAcceptCall = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: true,
      });
      setCallStatus("Connected");
      socket.emit("accept_call", { to: recipient._id });
    } catch (e) {
      console.log("Audio Init Error", e);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    socket.emit("send_message", {
      conversationId,
      senderId: currentUser._id,
      text: inputText,
      messageType: "text",
    });
    setInputText("");
  };

  const renderCallLog = (item, isMe) => {
    const callText = item.text || "";
    return (
      <View style={[styles.callLogContainer, isMe ? styles.myCallLog : styles.otherCallLog]}>
        <Ionicons 
          name="call-outline" 
          size={16} 
          color={isMe ? "#FFF" : "#6C63FF"} 
          style={styles.callIcon}
        />
        <Text style={[styles.callLogText, isMe ? styles.myCallLogText : styles.otherCallLogText]}>
          {callText}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const isMe = (item.sender?._id || item.sender) === currentUser._id;
    const isCallLog = item.messageType === "call_log";

    if (isCallLog) {
      return renderCallLog(item, isMe);
    }

    const isMedia = item.messageType === "image" || item.messageType === "video";

    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}>
        <View
          style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.otherBubble,
            isMedia && styles.mediaBubble,
          ]}
        >
          {item.messageType === "image" && (
            <Image source={{ uri: item.mediaUrl }} style={styles.msgMedia} resizeMode="cover" />
          )}

          {item.messageType === "video" && (
            <Video
              source={{ uri: item.mediaUrl }}
              style={styles.msgMedia}
              useNativeControls
              resizeMode="cover"
              isLooping={false}
            />
          )}

          {item.messageType === "audio" && (
            <TouchableOpacity onPress={() => playVoice(item.mediaUrl)} style={styles.audioRow}>
              <Ionicons name="play-circle" size={40} color={isMe ? "#FFF" : "#6C63FF"} />
              <View style={styles.audioInfo}>
                <Text style={[styles.audioText, isMe ? styles.myText : styles.otherText]}>
                  Voice Message
                </Text>
                {item.duration && (
                  <Text style={styles.audioDuration}>{formatDuration(item.duration)}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {item.messageType === "location" && item.location && (
            <TouchableOpacity
              style={styles.locationBox}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${item.location.latitude},${item.location.longitude}`
                )
              }
            >
              <Ionicons name="location-sharp" size={36} color={isMe ? "#FFF" : "#6C63FF"} />
              <Text style={[styles.locationText, isMe ? styles.myText : styles.otherText]}>
                View Location
              </Text>
            </TouchableOpacity>
          )}

          {item.messageType === "text" && item.text && (
            <Text style={[styles.msgText, isMe ? styles.myText : styles.otherText]}>
              {item.text}
            </Text>
          )}
        </View>
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  // Add this function to ChatDetailScreen.js
const clearChat = () => {
  Alert.alert(
    "Clear Chat",
    "Are you sure you want to clear all messages?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/messages/${conversationId}`, config);
            setMessages([]);
            Alert.alert("Success", "Chat cleared successfully");
          } catch (error) {
            console.error("Clear chat error:", error);
            Alert.alert("Error", "Failed to clear chat");
          }
        }
      }
    ]
  );
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Image
          source={{
            uri: recipient?.profileImage || "https://via.placeholder.com/150",
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {recipient?.name || "User"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isRecipientOnline ? "#4CAF50" : "#A0A0A0" },
              ]}
            />
            <Text
              style={[
                styles.status,
                { color: isRecipientOnline ? "#4CAF50" : "#A0A0A0" },
              ]}
            >
              {isRecipientOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleStartCall} style={styles.callBtn}>
          <Ionicons name="call" size={20} color="#6C63FF" />
        </TouchableOpacity>
        // Add to header (next to call button)
<TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
</TouchableOpacity>
      </View>

      {/* CALL MODAL */}
      <CallModal
        visible={isCallModalVisible}
        status={callStatus}
        user={recipient}
        timer={callTimer}
        onAccept={handleAcceptCall}
        onReject={handleEndCall}
        isMuted={isMuted}
        toggleMute={toggleMute}
        isSpeaker={isSpeaker}
        toggleSpeaker={toggleSpeaker}
      />

      {/* MESSAGES */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6C63FF" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={{ padding: 15 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* INPUT BAR */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {uploading && (
          <View style={styles.uploadLoader}>
            <ActivityIndicator size="small" color="#6C63FF" />
            <Text style={styles.uploadText}>Uploading media...</Text>
          </View>
        )}
        
        {/* WhatsApp-style recording indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Animated.View style={[styles.recordingDot, { opacity: recordingAnimation }]} />
            <Text style={styles.recordingText}>
              Recording voice message {formatDuration(recordingDuration)}
            </Text>
            <Text style={styles.releaseText}>Release to send</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity onPress={() => setShowMenu(true)}>
            <Ionicons name="add-circle" size={36} color="#6C63FF" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={isRecording ? "Recording..." : "Message..."}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isRecording}
          />

          {inputText.trim().length > 0 || uploading ? (
            <TouchableOpacity onPress={sendMessage} disabled={uploading}>
              <Ionicons name="send" size={30} color={uploading ? "#CCC" : "#6C63FF"} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onLongPress={startRecording}
              onPressOut={stopRecording}
              delayLongPress={200}
            >
              <Ionicons name="mic" size={30} color={isRecording ? "#FF4D4D" : "#6C63FF"} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ACTION MENU */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => pickMedia(ImagePicker.MediaTypeOptions.Images)}
            >
              <View style={[styles.iconBg, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="image" size={30} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => pickMedia(ImagePicker.MediaTypeOptions.Videos)}
            >
              <View style={[styles.iconBg, { backgroundColor: "#FFEBEE" }]}>
                <Ionicons name="videocam" size={30} color="#F44336" />
              </View>
              <Text style={styles.menuText}>Videos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={sendLocation}>
              <View style={[styles.iconBg, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="location" size={30} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Location</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginTop: Platform.OS === "android" ? 30 : 0,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEE" },
  userName: { fontWeight: "700", fontSize: 17, color: "#1A1A1A" },
  status: { fontSize: 12, fontWeight: "500", marginLeft: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  callBtn: { padding: 10, backgroundColor: "#F0EFFF", borderRadius: 25 },
  msgWrapper: { marginBottom: 18, maxWidth: "82%" },
  myMsg: { alignSelf: "flex-end" },
  otherMsg: { alignSelf: "flex-start" },
  bubble: { padding: 10, borderRadius: 20 },
  mediaBubble: { padding: 0, overflow: "hidden" },
  myBubble: { backgroundColor: "#000000", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#F2F2F7", borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16, lineHeight: 20 },
  myText: { color: "#FFF" },
  otherText: { color: "#1C1C1E" },
  msgMedia: { width: 250, height: 200, borderRadius: 12 },
  audioRow: { flexDirection: "row", alignItems: "center", padding: 8, minWidth: 150 },
  audioInfo: { marginLeft: 12 },
  audioText: { fontSize: 14, fontWeight: "500" },
  audioDuration: { fontSize: 11, color: "#888", marginTop: 2 },
  locationBox: { alignItems: "center", padding: 12, minWidth: 150 },
  locationText: { fontSize: 13, marginTop: 8 },
  timeText: { fontSize: 10, color: "#A0A0A0", marginTop: 4, textAlign: "right" },
  inputArea: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#000",
  },
  uploadLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#F8F8F8",
  },
  uploadText: { fontSize: 12, color: "#6C63FF", marginLeft: 8 },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#FFE5E5",
    borderTopWidth: 1,
    borderTopColor: "#FFCDCD",
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF4D4D", marginRight: 8 },
  recordingText: { fontSize: 13, color: "#FF4D4D", fontWeight: "500" },
  releaseText: { fontSize: 11, color: "#888", marginLeft: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
  menuBox: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  menuItem: { alignItems: "center" },
  iconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  menuText: { fontSize: 14, fontWeight: "600", color: "#333" },
  callLogContainer: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: "80%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  myCallLog: { backgroundColor: "#E8F5E9" },
  otherCallLog: { backgroundColor: "#F0EFFF" },
  callLogText: { fontSize: 13, fontWeight: "500", marginLeft: 8 },
  myCallLogText: { color: "#2E7D32" },
  otherCallLogText: { color: "#6C63FF" },
  callIcon: { marginRight: 4 },
});