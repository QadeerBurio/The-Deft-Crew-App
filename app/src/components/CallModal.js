import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { color as T, font as F } from "../theme/tokens";
export default function CallModal({ 
  visible, status, user, timer, onAccept, onReject, 
  isMuted, toggleMute, isSpeaker, toggleSpeaker 
}) {
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "Incoming Call...") {
      // Shake animation for incoming call
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation for avatar
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shakeAnimation.setValue(0);
      pulseAnimation.setValue(1);
    }

    return () => {
      shakeAnimation.stopAnimation();
      pulseAnimation.stopAnimation();
    };
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch(status) {
      case "Calling...":
        return "Calling...";
      case "Incoming Call...":
        return "Incoming call...";
      case "Connected":
        return formatTime(timer);
      default:
        return status;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <Image 
              source={{ uri: user?.profileImage || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
          </Animated.View>
          
          <Text style={styles.name}>{user?.name}</Text>
          
          <Animated.Text 
            style={[
              styles.status, 
              status === "Incoming Call..." && { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            {getStatusMessage()}
          </Animated.Text>
          
          {/* In-call controls */}
          {status === "Connected" && (
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                onPress={toggleMute} 
                style={[styles.controlBtn, isMuted && styles.activeControl]}
              >
                <Ionicons 
                  name={isMuted ? "mic-off" : "mic"} 
                  size={28} 
                  color={isMuted ? T.white : "#6C63FF"} 
                />
                <Text style={styles.controlLabel}>mute</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={toggleSpeaker} 
                style={[styles.controlBtn, isSpeaker && styles.activeControl]}
              >
                <Ionicons 
                  name={isSpeaker ? "volume-high" : "volume-medium"} 
                  size={28} 
                  color={isSpeaker ? T.white : "#6C63FF"} 
                />
                <Text style={styles.controlLabel}>speaker</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Call buttons */}
          <View style={styles.btnRow}>
            {status === "Incoming Call..." ? (
              <>
                <TouchableOpacity onPress={onReject} style={[styles.btn, styles.decline]}>
                  <Ionicons name="close" size={35} color={T.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onAccept} style={[styles.btn, styles.accept]}>
                  <Ionicons name="call" size={35} color={T.white} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={onReject} style={[styles.btn, styles.decline]}>
                <Ionicons name="call" size={35} color={T.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: T.overlay, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: { 
    alignItems: 'center', 
    width: '100%' 
  },
  avatar: { 
    width: 150, 
    height: 150, 
    borderRadius: 75, 
    marginBottom: 24, 
    borderWidth: 3, 
    borderColor: '#6C63FF' 
  },
  name: { 
    color: T.white, 
    fontSize: 28, 
    fontFamily: F.heading, 
    marginBottom: 8 
  },
  status: { 
    color: '#6C63FF', 
    fontSize: 18, 
    marginTop: 8, 
    fontFamily: F.headingBold 
  },
  controlsRow: { 
    flexDirection: 'row', 
    marginTop: 40, 
    width: '60%', 
    justifyContent: 'space-around' 
  },
  controlBtn: { 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: T.ink, 
    width: 80 
  },
  activeControl: { 
    backgroundColor: '#6C63FF' 
  },
  controlLabel: { 
    color: T.white, 
    fontSize: 11, fontFamily: F.body, 
    marginTop: 6 
  },
  btnRow: { 
    flexDirection: 'row', 
    marginTop: 50, 
    width: '100%', 
    justifyContent: 'space-around', 
    paddingHorizontal: 60 
  },
  btn: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  accept: { 
    backgroundColor: T.success 
  },
  decline: { 
    backgroundColor: T.danger 
  }
});