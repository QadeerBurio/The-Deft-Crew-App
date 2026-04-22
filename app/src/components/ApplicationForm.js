import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity,  KeyboardAvoidingView, 
  Platform, Alert, StatusBar, BackHandler 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
// --- SUB-COMPONENTS (Defined outside to prevent re-render lag) ---
const SectionHeader = ({ title, icon, color }) => (

  <View style={styles.sectionHeader}>
    <FontAwesome5 name={icon} size={14} color={color} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const InputField = ({ label, icon, placeholder, value, onChangeText, keyboardType = 'default', multiline = false, required = false }) => (
  <View style={styles.inputGroup}>
    {label ? <Text style={styles.label}>{label}{required && <Text style={{color: '#E35B5B'}}> *</Text>}</Text> : null}
    <View style={[styles.inputContainer, multiline && styles.textAreaContainer]}>
      <FontAwesome5 name={icon} size={13} color="#9DA8B7" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor="#BDC3C7"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        blurOnSubmit={false} // CRITICAL: Keeps keyboard open
        autoCapitalize="none"
        underlineColorAndroid="transparent"
      />
    </View>
  </View>
);

const ApplicationForm = ({ route, navigation }) => {
    const { token, user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
  const { program } = route.params || { 
    program: { title: 'Program', university: 'University', color: '#6366F1' } 
  };

  // --- Complete State Management ---
  const [formData, setFormData] = useState({
    fullName: '', fatherName: '', caste: '', dob: '', cnic: '', passportNumber: '',
    contactNo: '', country: '', province: '', address: '', permanentAddress: '', postalCode: '',
    email: '', linkedin: '', portfolio: '', socialHandle: '',
    lastDegree: '', institution: '', major: '', passingYear: '', 
    totalMarks: '', obtainedMarks: '', cgpa: '', ieltsScore: '', 
    certifications: '', guardianName: '', guardianRelation: '', 
    guardianContact: '', emergencyNo: '', emergencyContactName: '',
    statementOfPurpose: '', extraActivities: ''
  });

  const [experiences, setExperiences] = useState([]);

  // --- Back Button Handling ---
  useEffect(() => {
    const backAction = () => {
      navigation.reset({ index: 0, routes: [{ name: "Exchange" }] });
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation]);

  // Optimize update function
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addExperience = () => {
    setExperiences(prev => [...prev, { 
      id: Date.now().toString(), role: '', type: '', field: '', start: '', end: '', certLink: '', description: '' 
    }]);
  };

  const updateExperience = (id, field, value) => {
    setExperiences(prev => prev.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  
// --- THE FIXED API FETCH LOGIC ---
  const handleApply = async () => {
  // 1. Basic Validation
  if (!token) {
    Alert.alert("Authentication Required", "Please log in to apply.");
    return;
  }

  // Ensure mandatory fields are filled
//   if (!formData.phoneNumber || !formData.reason) {
//     Alert.alert("Missing Info", "Please fill in all required fields.");
//     return;
//   }

  setLoading(true);
  try {
    const API_URL = "https://the-deft-crew-production.up.railway.app/api/auth/exchange/apply";

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Use token from Context
      },
      body: JSON.stringify({
        programId: program._id,
        formData: formData,
        experiences: experiences
      }),
    });

    const result = await response.json();

    if (response.ok) {
      Alert.alert("Success 🚀", "Your application has been submitted successfully!");
      // Navigation.goBack() or clear state here
    } else {
      throw new Error(result.message || "Something went wrong.");
    }
  } catch (err) {
    console.error("Submission Error:", err);
    Alert.alert("Application Failed", err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: "Exchange" }] })} style={styles.backButton}>
            <FontAwesome5 name="chevron-left" size={18} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Application Form</Text>
            <Text style={styles.headerSubtitle}>{program.university}</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always" // Ensures buttons work while keyboard is up
        >
          
          {/* Section 1: Personal */}
          <SectionHeader title="Personal Identity" icon="fingerprint" color={program.color} />
          <InputField label="Full Name" icon="user" placeholder="Full Name" required value={formData.fullName} onChangeText={(txt) => updateField('fullName', txt)} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="Father Name" icon="users" placeholder="Father Name" value={formData.fatherName} onChangeText={(txt) => updateField('fatherName', txt)} />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="Caste" icon="landmark" placeholder="Caste" value={formData.caste} onChangeText={(txt) => updateField('caste', txt)} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="D.O.B" icon="calendar-alt" placeholder="DD/MM/YYYY" value={formData.dob} onChangeText={(txt) => updateField('dob', txt)} />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="CNIC / ID" icon="id-card" placeholder="42101-..." value={formData.cnic} onChangeText={(txt) => updateField('cnic', txt)} keyboardType="numeric" />
            </View>
          </View>
          <InputField label="Passport Number" icon="passport" placeholder="Optional" value={formData.passportNumber} onChangeText={(txt) => updateField('passportNumber', txt)} />

          {/* Section 2: Geography */}
          <SectionHeader title="Geography & Contact" icon="map-marker-alt" color={program.color} />
          <InputField label="Current Address" icon="home" placeholder="House #, Street, City" required value={formData.address} onChangeText={(txt) => updateField('address', txt)} />
          <InputField label="Permanent Address" icon="map-signs" placeholder="Same as above" required value={formData.permanentAddress} onChangeText={(txt) => updateField('permanentAddress', txt)} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="Country" icon="globe" placeholder="Pakistan" value={formData.country} onChangeText={(txt) => updateField('country', txt)} />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="Province" icon="map" placeholder="Sindh" value={formData.province} onChangeText={(txt) => updateField('province', txt)} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="Contact No" icon="phone" placeholder="+92..." required value={formData.contactNo} onChangeText={(txt) => updateField('contactNo', txt)} keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="Postal Code" icon="mail-bulk" placeholder="71000" value={formData.postalCode} onChangeText={(txt) => updateField('postalCode', txt)} keyboardType="numeric" />
            </View>
          </View>

          {/* Section 3: Connectivity */}
          <SectionHeader title="Connectivity & Socials" icon="share-alt" color={program.color} />
          <InputField label="Email" icon="envelope" placeholder="email@domain.com" required value={formData.email} onChangeText={(txt) => updateField('email', txt)} />
          <InputField label="LinkedIn URL" icon="linkedin" placeholder="https://linkedin.com/in/..." value={formData.linkedin} onChangeText={(txt) => updateField('linkedin', txt)} />
          <InputField label="Portfolio/Website" icon="globe-americas" placeholder="https://..." value={formData.portfolio} onChangeText={(txt) => updateField('portfolio', txt)} />
          <InputField label="Social Handle" icon="at" placeholder="@username" value={formData.socialHandle} onChangeText={(txt) => updateField('socialHandle', txt)} />

          {/* Section 4: Academic */}
          <SectionHeader title="Academic Background" icon="graduation-cap" color={program.color} />
          <InputField label="Latest Qualification" icon="graduation-cap" placeholder="e.g. BSCS" required value={formData.lastDegree} onChangeText={(txt) => updateField('lastDegree', txt)} />
          <InputField label="Institution" icon="university" placeholder="University Name" required value={formData.institution} onChangeText={(txt) => updateField('institution', txt)} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="Major" icon="book" placeholder="Software" value={formData.major} onChangeText={(txt) => updateField('major', txt)} />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="Passing Year" icon="calendar" placeholder="2024" value={formData.passingYear} onChangeText={(txt) => updateField('passingYear', txt)} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <InputField label="CGPA / %" icon="poll" placeholder="3.8" required value={formData.cgpa} onChangeText={(txt) => updateField('cgpa', txt)} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
                <InputField label="IELTS Score" icon="language" placeholder="7.5" value={formData.ieltsScore} onChangeText={(txt) => updateField('ieltsScore', txt)} />
            </View>
          </View>
          <InputField label="Certifications" icon="certificate" placeholder="AWS, Google, etc." value={formData.certifications} onChangeText={(txt) => updateField('certifications', txt)} />

          {/* Section 5: Work Experience */}
          <View style={styles.expHeaderContainer}>
            <SectionHeader title="Work Experience" icon="briefcase" color={program.color} />
            <TouchableOpacity style={styles.addBtn} onPress={addExperience}>
              <FontAwesome5 name="plus" size={10} color="#4F46E5" />
              <Text style={styles.addBtnText}> Add Exp</Text>
            </TouchableOpacity>
          </View>

          {experiences.map((exp, index) => (
            <View key={exp.id} style={styles.experienceCard}>
              <View style={styles.expCardHeader}>
                <Text style={styles.expCountText}>Experience #{index + 1}</Text>
                <TouchableOpacity onPress={() => setExperiences(experiences.filter(e => e.id !== exp.id))}>
                  <FontAwesome5 name="times-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <InputField placeholder="Role (e.g. Intern)" icon="user-tie" value={exp.role} onChangeText={(txt) => updateExperience(exp.id, 'role', txt)} />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}><InputField icon="clock" placeholder="Full-time" value={exp.type} onChangeText={(txt) => updateExperience(exp.id, 'type', txt)} /></View>
                <View style={{ flex: 1 }}><InputField icon="layer-group" placeholder="Field" value={exp.field} onChangeText={(txt) => updateExperience(exp.id, 'field', txt)} /></View>
              </View>
              <InputField placeholder="Job Description" icon="align-left" multiline value={exp.description} onChangeText={(txt) => updateExperience(exp.id, 'description', txt)} />
            </View>
          ))}

          {/* Section 6: Guardian & Emergency */}
          <SectionHeader title="Family & Emergency" icon="shield-alt" color={program.color} />
          <InputField label="Guardian Name" icon="user-shield" placeholder="Guardian Name" required value={formData.guardianName} onChangeText={(txt) => updateField('guardianName', txt)} />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}><InputField label="Relation" icon="users" placeholder="Father" value={formData.guardianRelation} onChangeText={(txt) => updateField('guardianRelation', txt)} /></View>
            <View style={{ flex: 1 }}><InputField label="Contact" icon="phone-alt" placeholder="+92..." value={formData.guardianContact} onChangeText={(txt) => updateField('guardianContact', txt)} /></View>
          </View>

          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyLabel}>Emergency Contact (Alternate)</Text>
            <InputField icon="user-plus" placeholder="Name" value={formData.emergencyContactName} onChangeText={(txt) => updateField('emergencyContactName', txt)} />
            <InputField icon="phone-square" placeholder="Phone" value={formData.emergencyNo} onChangeText={(txt) => updateField('emergencyNo', txt)} keyboardType="phone-pad" />
          </View>

          {/* Section 7: Motivation */}
          <SectionHeader title="Motivation" icon="pen-fancy" color={program.color} />
          <InputField label="Statement of Purpose" icon="file-alt" placeholder="Why should we select you?" multiline value={formData.statementOfPurpose} onChangeText={(txt) => updateField('statementOfPurpose', txt)} />
          <InputField label="Extra Curricular" icon="trophy" placeholder="Sports, Voluteering..." multiline value={formData.extraActivities} onChangeText={(txt) => updateField('extraActivities', txt)} />

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: program.color }]} onPress={handleApply}>
            <Text style={styles.submitButtonText}>Submit Application</Text>
            <FontAwesome5 name="paper-plane" size={16} color="#FFF" style={{marginLeft: 12}} />
          </TouchableOpacity>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#000', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 20 : 50, paddingBottom: 25, 
    flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 40,
  },
  backButton: { marginRight: 20 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: '#94A3B8', fontSize: 13 },
  scrollContent: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 },
  expHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: '#E0E7FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  experienceCard: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  expCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  expCountText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  emergencyBox: { marginTop: 15, backgroundColor: '#FEF2F2', padding: 15, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FCA5A5' },
  emergencyLabel: { fontSize: 11, fontWeight: '800', color: '#B91C1C', marginBottom: 10, marginLeft: 5 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6, marginLeft: 4 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0'
  },
  inputIcon: { marginRight: 12, width: 18, textAlign: 'center' },
  input: { flex: 1, height: 48, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  textAreaContainer: { alignItems: 'flex-start', paddingTop: 14 },
  textArea: { height: 110, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  submitButton: { 
    height: 60, borderRadius: 20, flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center', marginTop: 30, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  submitButtonText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});

export default ApplicationForm;