import React, { useState, useContext, useEffect } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, ActivityIndicator, Alert, Platform, 
  StatusBar 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from "../../context/AuthContext"; 
import axios from "axios";

// Using the Railway production URL you previously configured
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social'; 

export default function EditProfileScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState(""); 
  const [degree, setDegree] = useState("");
  const [rollNo, setRollNo] = useState("");

  // Auto-fetch data on mount
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setHeadline(user.headline || "");
      setBio(user.bio || "");
      setRollNo(user.rollNo || "");
      
      // Logic: Pull from education array first, fallback to university object
      const currentUni = user.education?.[0]?.school || user.university?.name || "";
      setSchool(currentUni);
      
      setDegree(user.education?.[0]?.degree || "");
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/profile/update`,
        { name, headline, bio, school, degree, rollNo },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.user) {
        // This updates the entire app (Profile, Feed, etc.)
        setUser(response.data.user); 
        Alert.alert("Success", "Your profile has been updated!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Check your internet connection.";
      Alert.alert("Update Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            <Text style={styles.saveBtnText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageSection}>
          <Image 
            source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${name}&background=6C63FF&color=fff` }} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={styles.changeBtn}>
            <Text style={styles.changePhotoText}>Update Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <CustomInput label="Full Name" value={name} onChange={setName} placeholder="Abdul Qadeer" />
          <CustomInput label="Headline" value={headline} onChange={setHeadline} placeholder="Computer Systems Engineer" />
          <CustomInput label="Bio" value={bio} onChange={setBio} placeholder="MERN Stack Developer..." multiline />
          <CustomInput label="University / School" value={school} onChange={setSchool} placeholder="MUET, Jamshoro" />
          <CustomInput label="Degree Program" value={degree} onChange={setDegree} placeholder="BS Software Engineering" />
          <CustomInput label="Roll Number" value={rollNo} onChange={setRollNo} placeholder="21CS042" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CustomInput = ({ label, value, onChange, placeholder, multiline = false }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput 
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#BBB"
      multiline={multiline}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5', 
    paddingTop: Platform.OS === 'android' ? 40 : 15 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  saveBtnText: { color: '#6C63FF', fontSize: 16, fontWeight: '800' },
  imageSection: { alignItems: 'center', marginVertical: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0', borderWidth: 3, borderColor: '#F8F9FE' },
  changePhotoText: { color: '#6C63FF', marginTop: 12, fontWeight: '700', fontSize: 14 },
  form: { paddingHorizontal: 25 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 11, color: '#AAA', marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderBottomWidth: 1.5, borderBottomColor: '#F0F0F0', paddingVertical: 8, fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
  multiline: { minHeight: 45, textAlignVertical: 'top' }
});