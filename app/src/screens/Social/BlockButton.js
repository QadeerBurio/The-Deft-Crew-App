import React, { useState, useContext } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function BlockButton({ userId, userName, onBlock, size = 'medium' }) {
  const { token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName || 'this user'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: performBlock
        }
      ]
    );
  };

  const performBlock = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/user/block/${userId}`, {}, config);

      Alert.alert(
        'User Blocked',
        `${userName || 'This user'} has been blocked. You won't see their content anymore.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onBlock) onBlock();
              // Navigate back or refresh feed
              navigation.goBack();
            }
          }
        ]
      );
    } catch (err) {
      console.error('Block error:', err);
      Alert.alert(
        'Error',
        err.response?.data?.error || 'Failed to block user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const buttonSize = size === 'small' ? styles.buttonSmall : styles.buttonMedium;
  const textSize = size === 'small' ? styles.textSmall : styles.textMedium;

  return (
    <TouchableOpacity
      style={[styles.button, buttonSize]}
      onPress={handleBlock}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#e74c3c" />
      ) : (
        <View style={styles.buttonContent}>
          <Ionicons
            name="ban-outline"
            size={size === 'small' ? 14 : 16}
            color="#e74c3c"
          />
          <Text style={[styles.buttonText, textSize]}>Block</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonMedium: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#e74c3c',
    fontWeight: '600',
    marginLeft: 4,
  },
  textMedium: {
    fontSize: 14,
  },
  textSmall: {
    fontSize: 12,
  },
});