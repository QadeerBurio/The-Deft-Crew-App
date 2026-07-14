import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  Platform,
  ToastAndroid,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Linking,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GuestGuard from "./GuestGuard";
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { renderResumeHTML } from '../services/templateService';
import { ResumeContext } from '../context/ResumeContext';

const { width, height } = Dimensions.get("window");
const getBaseURL = () => {
  if (__DEV__) {
    const manifest = Constants.expoConfig || Constants.manifest || {};
    const hostUri = manifest.hostUri;
    const devIp = hostUri ? hostUri.split(':')[0] : '192.168.18.128';
    return `https://the-deft-crew-production.up.railway.app/api`;
  }
  return 'https://the-deft-crew-production.up.railway.app/api';
};
const API_URL = `${getBaseURL()}/jobs`;

const COLORS = {
  page: "#ffffff",
  surface: "#fafafa",
  line: "#f0f0f0",
  primary: "#1a1a1a",
  accent: "#f9c349",
  accentSoft: "#fff8e7",
  muted: "#999",
  body: "#666",
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
  purple: "#8b5cf6",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ==================== ENHANCED CAREER CARD ====================
const CareerCard = React.memo(({ item, index, onPress, hasApplied, isRecommended, onOptimizePress }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Limit staggered delay to first 8 items to avoid compounding scroll lags
    const animDelay = Math.min(index, 8) * 55;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: animDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: animDelay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const animatePress = (toValue) => {
    Animated.spring(scale, { toValue, friction: 8, tension: 90, useNativeDriver: true }).start();
  };

  return (
    <AnimatedTouchable
      style={[styles.card, { opacity, transform: [{ translateY }, { scale }] }]}
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={() => animatePress(0.97)}
      onPressOut={() => animatePress(1)}
    >
      {/* Applied Banner - Enhanced */}
      {hasApplied && (
        <View style={styles.appliedBanner}>
          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
          <Text style={styles.appliedBannerText}>You've Applied</Text>
        </View>
      )}

      {/* Company & Title */}
      <View style={[styles.cardCompHeader, hasApplied && { paddingRight: 100 }]}>
        {item.companyName && (
          <View style={styles.companyNameRow}>
            <View style={styles.companyDot} />
            <Text style={styles.companyNameText} numberOfLines={1}>{item.companyName}</Text>
          </View>
        )}
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        {item.department && <Text style={styles.departmentText}>{item.department}</Text>}
      </View>

      {/* Type & Experience Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Ionicons name="briefcase-outline" size={11} color="#f9c349" />
          <Text style={styles.typeBadgeText}>{item.type || "Full-time"}</Text>
        </View>
        {item.experienceLevel && (
          <View style={styles.expBadge}>
            <Ionicons name="trending-up-outline" size={11} color="#8b5cf6" />
            <Text style={styles.expBadgeText}>{item.experienceLevel}</Text>
          </View>
        )}
        {item.locationType && (
          <View style={styles.locTypeBadge}>
            <Ionicons name={item.locationType === "Remote" ? "laptop-outline" : item.locationType === "Hybrid" ? "git-branch-outline" : "business-outline"} size={11} color="#10b981" />
            <Text style={styles.locTypeBadgeText}>{item.locationType}</Text>
          </View>
        )}
      </View>

      {/* Meta Info */}
      <View style={styles.infoRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-sharp" size={14} color="#f9c349" />
          <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color="#1a1a1a" />
          <Text style={styles.metaText} numberOfLines={1}>{item.salary || "Competitive"}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        {item.education && (
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color="#3b82f6" />
            <Text style={styles.metaText}>{item.education}</Text>
          </View>
        )}
        {item.minExperience > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#6f6f6f" />
            <Text style={styles.metaText}>{item.minExperience}+ yrs exp</Text>
          </View>
        )}
      </View>

      {/* Skills */}
      {item.skills?.length > 0 && (
        <View style={styles.skillsRow}>
          {item.skills.slice(0, 4).map((skill, idx) => (
            <View key={idx} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 4 && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>+{item.skills.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* Urgent / Featured Tags */}
      {(item.urgent || item.featured) && (
        <View style={styles.tagRow}>
          {item.urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={10} color="#ef4444" />
              <Text style={styles.urgentText}>Urgent Hiring</Text>
            </View>
          )}
          {item.featured && (
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons name="star" size={10} color="#f9c349" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>
      )}

      {/* Optimize Button */}
      {isRecommended && (
        <TouchableOpacity 
          style={styles.optimizeCardBtn}
          onPress={(e) => {
            e.stopPropagation(); // prevent opening normal apply modal
            onOptimizePress();
          }}
        >
          <Ionicons name="sparkles" size={14} color="#000" />
          <Text style={styles.optimizeCardBtnText}>Optimize Resume</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsLabel}>
          {hasApplied ? "✓ View Details" : "Tap to Apply"}
        </Text>
        <Ionicons 
          name={hasApplied ? "eye-outline" : "arrow-forward-circle"} 
          size={22} 
          color={hasApplied ? "#10b981" : "#f9c349"} 
        />
      </View>
    </AnimatedTouchable>
  );
});

// ==================== JOB DETAILS MODAL (For Applied Jobs) ====================
const JobDetailsModal = ({ visible, job, onClose, myApplication }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!job) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return COLORS.warning;
      case "reviewed": return COLORS.info;
      case "shortlisted": return COLORS.success;
      case "interview": return COLORS.purple;
      case "rejected": return COLORS.error;
      case "hired": return "#059669";
      default: return COLORS.muted;
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "Pending Review";
      case "reviewed": return "Reviewed";
      case "shortlisted": return "Shortlisted";
      case "interview": return "Interview Stage";
      case "rejected": return "Not Selected";
      case "hired": return "Hired! 🎉";
      default: return status || "Unknown";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.applyModalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
        <Animated.View style={[styles.applyModalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalDragHandle} />
          
          {/* Close X Button */}
          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          
          {/* Application Status Banner */}
          {myApplication && (
            <View style={[styles.statusBanner, { backgroundColor: getStatusColor(myApplication.status) + "15" }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(myApplication.status) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusBannerTitle}>Application Status</Text>
                <Text style={[styles.statusBannerStatus, { color: getStatusColor(myApplication.status) }]}>
                  {getStatusLabel(myApplication.status)}
                </Text>
              </View>
              <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(myApplication.status) + "20" }]}>
                <Text style={[styles.statusBadgeLargeText, { color: getStatusColor(myApplication.status) }]}>
                  {getStatusLabel(myApplication.status)}
                </Text>
              </View>
            </View>
          )}

          {/* Interview Info if available */}
          {myApplication?.interviewDate && (
            <TouchableOpacity 
              style={styles.interviewBanner}
              onPress={() => {
                onClose();
                // We'll pass this up to parent
              }}
            >
              <View style={styles.interviewBannerIcon}>
                <Ionicons name="calendar" size={20} color="#f9c349" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.interviewBannerTitle}>Interview Scheduled</Text>
                <Text style={styles.interviewBannerDate}>
                  {new Date(myApplication.interviewDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f9c349" />
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            {/* Job Details Header */}
            <View style={styles.applyModalHeader}>
              {job?.companyName && <Text style={styles.applyModalCompany}>{job.companyName}</Text>}
              <Text style={styles.applyModalJobTitle}>{job?.title}</Text>
              <Text style={styles.applyModalJobMeta}>{job?.department} • {job?.location}</Text>
              
              <View style={styles.applyModalMetaRow}>
                <View style={styles.applyModalMetaBadge}>
                  <Ionicons name="briefcase-outline" size={12} color="#f9c349" />
                  <Text style={styles.applyModalMetaText}>{job?.type}</Text>
                </View>
                <View style={styles.applyModalMetaBadge}>
                  <Ionicons name="trending-up-outline" size={12} color="#8b5cf6" />
                  <Text style={styles.applyModalMetaText}>{job?.experienceLevel}</Text>
                </View>
                <View style={styles.applyModalMetaBadge}>
                  <Ionicons name="school-outline" size={12} color="#3b82f6" />
                  <Text style={styles.applyModalMetaText}>{job?.education || "Bachelor's"}</Text>
                </View>
              </View>

              <View style={styles.applyModalMetaRow}>
                <Text style={styles.applyModalSalary}>💰 {job?.salary}</Text>
                {job?.minExperience > 0 && <Text style={styles.applyModalExp}>⏱ {job.minExperience}+ yrs</Text>}
              </View>

              {job?.locationType && (
                <View style={styles.locTypeRow}>
                  <Ionicons name={job.locationType === "Remote" ? "laptop-outline" : "business-outline"} size={14} color="#f9c349" />
                  <Text style={styles.locTypeText}>{job.locationType}</Text>
                </View>
              )}

              {/* Application Info */}
              {myApplication && (
                <View style={styles.applicationInfoBox}>
                  <View style={styles.applicationInfoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.applicationInfoText}>
                      Applied: {new Date(myApplication.appliedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {myApplication.coverLetter && (
                    <View style={styles.applicationInfoRow}>
                      <Ionicons name="document-text-outline" size={14} color="#666" />
                      <Text style={styles.applicationInfoText} numberOfLines={2}>
                        Cover Letter: {myApplication.coverLetter}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Description */}
            {job?.description && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>📋 Description</Text>
                <Text style={styles.descriptionText}>{job.description}</Text>
              </View>
            )}

            {/* Requirements */}
            {job?.requirements?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>✅ Requirements</Text>
                {job.requirements.map((req, i) => (
                  <View key={i} style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.detailItemText}>{req}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Responsibilities */}
            {job?.responsibilities?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>🎯 Responsibilities</Text>
                {job.responsibilities.map((resp, i) => (
                  <View key={i} style={styles.detailItem}>
                    <Ionicons name="flag-outline" size={16} color="#f9c349" />
                    <Text style={styles.detailItemText}>{resp}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Benefits */}
            {job?.benefits?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>🎁 Benefits</Text>
                <View style={styles.benefitsGrid}>
                  {job.benefits.map((benefit, i) => (
                    <View key={i} style={styles.benefitItem}>
                      <Ionicons name="star" size={14} color="#f9c349" />
                      <Text style={styles.benefitItemText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Skills */}
            {job?.skills?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>💡 Required Skills</Text>
                <View style={styles.skillsGrid}>
                  {job.skills.map((skill, i) => (
                    <View key={i} style={styles.skillBadgeLarge}>
                      <Text style={styles.skillBadgeLargeText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Company Info */}
            {(job?.companyName || job?.companyWebsite) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>🏢 Company Info</Text>
                {job.companyName && <Text style={styles.companyInfoText}>{job.companyName}</Text>}
                {job.companyWebsite && (
                  <TouchableOpacity onPress={() => Linking.openURL(job.companyWebsite)}>
                    <Text style={styles.companyLink}>🌐 {job.companyWebsite}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.shareBtn} onPress={() => {
                Share.share({ message: `🚀 Career Opportunity!\n\n${job.title}\n${job.companyName || job.department}\n${job.location}\nSalary: ${job.salary}\n\nApply via TDC App!` });
              }}>
                <Ionicons name="share-social-outline" size={18} color="#1a1a1a" />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==================== INTERVIEW DETAILS MODAL ====================
const InterviewDetailsModal = ({ visible, interview, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!interview) return null;

  const addToCalendar = () => {
    const date = new Date(interview.interviewDate);
    const endDate = new Date(date.getTime() + 3600000);
    const title = encodeURIComponent(`TDC Interview: ${interview.jobId?.title}`);
    const details = encodeURIComponent(interview.interviewNotes || "Interview via TDC Careers");
    const location = encodeURIComponent(interview.meetingLink || "Online");
    Linking.openURL(`https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${date.toISOString().replace(/-|:|\.\d+/g, '')}/${endDate.toISOString().replace(/-|:|\.\d+/g, '')}&details=${details}&location=${location}`);
  };

  const joinMeeting = () => {
    if (interview.meetingLink) {
      Linking.canOpenURL(interview.meetingLink).then(supported => {
        if (supported) Linking.openURL(interview.meetingLink);
        else Alert.alert("Error", "Cannot open meeting link");
      });
    } else {
      Alert.alert("No Meeting Link", "The interviewer hasn't provided a meeting link yet.");
    }
  };

  const copyMeetingLink = async () => {
    if (interview.meetingLink) {
      await Clipboard.setStringAsync(interview.meetingLink);
      Alert.alert("Copied!", "Meeting link copied to clipboard");
    }
  };

  const getMeetingPlatform = () => {
    if (!interview.meetingLink) return "Not specified";
    if (interview.meetingLink.includes("zoom")) return "Zoom";
    if (interview.meetingLink.includes("meet.google")) return "Google Meet";
    if (interview.meetingLink.includes("teams.microsoft")) return "Microsoft Teams";
    if (interview.meetingLink.includes("skype")) return "Skype";
    return "Online Meeting";
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.interviewModalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={styles.interviewModalBackdrop} /></TouchableWithoutFeedback>
        <Animated.View style={[styles.interviewModalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.interviewModalHandle} />
          
          {/* Close X Button */}
          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          
          <View style={styles.interviewModalHeader}>
            <View style={styles.interviewModalIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color="#f9c349" />
            </View>
            <Text style={styles.interviewModalTitle}>Interview Scheduled</Text>
            <Text style={styles.interviewModalSubtitle}>{interview.jobId?.companyName || interview.jobId?.department}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.interviewDetailCard}>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="briefcase-outline" size={18} color="#f9c349" /></View>
                <View style={{ flex: 1 }}><Text style={styles.interviewDetailLabel}>Position</Text><Text style={styles.interviewDetailValue}>{interview.jobId?.title}</Text></View>
              </View>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="calendar-outline" size={18} color="#f9c349" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interviewDetailLabel}>Date & Time</Text>
                  <Text style={styles.interviewDetailValue}>{new Date(interview.interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="videocam-outline" size={18} color="#f9c349" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interviewDetailLabel}>Meeting Platform</Text>
                  <Text style={styles.interviewDetailValue}>{getMeetingPlatform()}</Text>
                  {interview.meetingLink && (
                    <TouchableOpacity onPress={copyMeetingLink} style={styles.copyLinkBtn}>
                      <Text style={styles.interviewLink} numberOfLines={1}>{interview.meetingLink}</Text>
                      <Ionicons name="copy-outline" size={14} color="#f9c349" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {interview.interviewNotes && (
                <View style={styles.interviewDetailRow}>
                  <View style={styles.interviewDetailIcon}><Ionicons name="document-text-outline" size={18} color="#f9c349" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.interviewDetailLabel}>Notes</Text><Text style={styles.interviewNotes}>{interview.interviewNotes}</Text></View>
                </View>
              )}
            </View>
            <View style={styles.interviewActions}>
              <TouchableOpacity style={styles.interviewActionBtn} onPress={addToCalendar}>
                <View style={styles.interviewActionGradient}>
                  <Ionicons name="calendar" size={18} color="#f9c349" />
                  <Text style={styles.interviewActionText}>Calendar</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.interviewJoinBtn, !interview.meetingLink && styles.interviewJoinBtnDisabled]} onPress={joinMeeting}>
                <View style={[styles.interviewJoinGradient, !interview.meetingLink && styles.interviewJoinGradientDisabled]}>
                  <Ionicons name="videocam" size={18} color={interview.meetingLink ? "#fff" : "#999"} />
                  <Text style={[styles.interviewJoinText, !interview.meetingLink && styles.interviewJoinTextDisabled]}>Join</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.interviewCloseBtn} onPress={onClose}><Text style={styles.interviewCloseText}>Close</Text></TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==================== APPLICATIONS MODAL ====================
const ApplicationsModal = ({ visible, applications, onClose, onInterviewPress }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return COLORS.warning;
      case "reviewed": return COLORS.info;
      case "shortlisted": return COLORS.success;
      case "interview": return COLORS.purple;
      case "rejected": return COLORS.error;
      case "hired": return "#059669";
      default: return COLORS.muted;
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "Pending";
      case "reviewed": return "Reviewed";
      case "shortlisted": return "Shortlisted";
      case "interview": return "Interview";
      case "rejected": return "Not Selected";
      case "hired": return "Hired! 🎉";
      default: return status || "Unknown";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.applicationsModalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
        <View style={styles.applicationsModalContent}>
          <View style={styles.modalDragHandle} />
          
          {/* Close X Button */}
          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          
          <Text style={styles.applicationsModalTitle}>My Applications</Text>
          <Text style={styles.applicationsModalCount}>{applications.length} applications</Text>
          {applications.length === 0 ? (
            <View style={styles.emptyState}><MaterialCommunityIcons name="briefcase-search" size={50} color="#ddd" /><Text style={styles.emptyStateText}>No applications yet</Text></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.6 }}>
              {applications.map((app) => (
                <TouchableOpacity key={app._id} activeOpacity={0.9} onPress={() => app.interviewDate ? onInterviewPress(app) : null}>
                  <View style={styles.applicationCard}>
                    <View style={styles.appHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.appJobTitle}>{app.jobId?.title}</Text>
                        <Text style={styles.appCompany}>{app.jobId?.companyName || app.jobId?.department}</Text>
                      </View>
                      <View style={[styles.appStatus, { backgroundColor: getStatusColor(app.status) + "20" }]}>
                        <Text style={[styles.appStatusText, { color: getStatusColor(app.status) }]}>{getStatusLabel(app.status)}</Text>
                      </View>
                    </View>
                    <View style={styles.appDetails}>
                      <Text style={styles.appDetail}><Ionicons name="location-outline" size={12} /> {app.jobId?.location}</Text>
                      <Text style={styles.appDetail}><Ionicons name="cash-outline" size={12} /> {app.jobId?.salary || "Competitive"}</Text>
                      <Text style={styles.appDate}>Applied: {new Date(app.appliedAt).toLocaleDateString()}</Text>
                    </View>
                    {app.interviewDate && (
                      <View style={styles.interviewInfo}>
                        <View style={styles.interviewInfoInner}>
                          <Ionicons name="calendar" size={14} color="#f9c349" />
                          <Text style={styles.interviewText}>Interview: {new Date(app.interviewDate).toLocaleDateString()} at {new Date(app.interviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#f9c349" />
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.applicationsCloseBtn} onPress={onClose}><Text style={styles.applicationsCloseText}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ==================== MAIN CAREER SCREEN ====================
const Career = ({ navigation }) => {
  const { resumes = [], optimizeResume, checkResumeFit } = useContext(ResumeContext);
  const [optimizing, setOptimizing] = useState(false);
  const [skillGapVisible, setSkillGapVisible] = useState(false);
  const [skillGapData, setSkillGapData] = useState({ missingSkills: [], message: "" });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "Internship", locationType: "", experienceLevel: "", category: "", datePosted: "all" });
  const scope = 'pakistan';
  const [showFilters, setShowFilters] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Pagination & infinite scroll states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  
  // NEW: State for job details modal (applied jobs)
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedAppliedJob, setSelectedAppliedJob] = useState(null);
  const [selectedMyApplication, setSelectedMyApplication] = useState(null);

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(20)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [applicationForm, setApplicationForm] = useState({
    fullName: "", email: "", phone: "", address: "", city: "", country: "",
    coverLetter: "", portfolioUrl: "", linkedInUrl: "", githubUrl: "",
    currentCompany: "", currentPosition: "", yearsOfExperience: "",
    expectedSalary: "", noticePeriod: "", workAuthorization: "Citizen",
  });

  const requiredFields = {
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    coverLetter: "Cover Letter",
  };

  useEffect(() => { loadAuthData(); }, []);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setApplicationForm(prev => ({ ...prev, fullName: userData.name || "", email: userData.email || "" }));
        }
      }
    } catch (err) { console.log("Error loading auth data:", err); }
  };

  const runEntranceAnimation = useCallback(() => {
    entranceOpacity.setValue(0); entranceTranslate.setValue(20);
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(entranceTranslate, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchJobs = useCallback(async (pageNum = 1, shouldAppend = false) => {
    // Explicitly enforce numeric pages and prevent React Event pollution
    const cleanPage = typeof pageNum === 'number' && !isNaN(pageNum) ? pageNum : 1;
    const cleanAppend = typeof shouldAppend === 'boolean' ? shouldAppend : false;

    if (cleanPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(false);
    
    console.log(`📡 [Career.js] Requested page: ${cleanPage}, shouldAppend: ${cleanAppend}, search: "${search}"`);
    
    try {
      // Construct query string manually to avoid JSC compatibility issues in React Native
      // Always send isExternal=true — General Jobs never shows TDC openings
      let queryString = `page=${cleanPage}&limit=20&scope=${scope}`;
      if (search) queryString += `&search=${encodeURIComponent(search)}`;
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "datePosted") {
          queryString += `&${key}=${encodeURIComponent(value)}`;
        }
      });

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(token ? `${API_URL}/feed?${queryString}` : `${API_URL}/public/all?${queryString}`, { headers, timeout: 10000 });
      let jobsData = Array.isArray(response.data.jobs) ? response.data.jobs : [];
      const total = response.data.total || 0;
      const respPage = response.data.page || cleanPage;
      
      console.log(`✅ [Career.js] Received page: ${respPage}, Total: ${total}, jobsData length: ${jobsData.length}`);

      if (filters.datePosted && filters.datePosted !== "all") {
        const now = new Date();
        jobsData = jobsData.filter(job => {
          const jobDate = new Date(job.createdAt);
          const diffHours = (now - jobDate) / (1000 * 60 * 60);
          switch (filters.datePosted) {
            case "24h": return diffHours <= 24;
            case "week": return diffHours <= 168;
            case "month": return diffHours <= 720;
            default: return true;
          }
        });
      }

      setJobs(prev => {
        const combined = cleanAppend ? [...prev, ...jobsData] : jobsData;
        const seen = new Set();
        const unique = combined.filter(j => {
          if (!j._id) return true;
          if (seen.has(j._id)) return false;
          seen.add(j._id);
          return true;
        });

        const duplicateCount = combined.length - unique.length;
        if (duplicateCount > 0) {
          console.log(`⚠️ [Career.js] Filtered out ${duplicateCount} duplicate jobs`);
        }

        // Set hasMore dynamically inside updater to avoid fetchJobs dependencies
        setHasMore(unique.length < total);
        console.log(`📊 [Career.js] Current jobs list length: ${unique.length}, hasMore: ${unique.length < total}`);
        return unique;
      });

      setPage(cleanPage);
      setTotalJobsCount(total);
      runEntranceAnimation();
    } catch (err) { 
      setError(true); 
      console.error(`❌ [Career.js] Fetch error:`, err.message);
      if (!cleanAppend) setJobs([]); 
    } finally { 
      setLoading(false); 
      setLoadingMore(false);
      setRefreshing(false); 
    }
  }, [filters, search, runEntranceAnimation, token]);

  const fetchMyApplications = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/my-applications`, { headers: { Authorization: `Bearer ${token}` } });
      const applications = Array.isArray(response.data) ? response.data : [];
      setMyApplications(applications);
      setAppliedJobIds(new Set(applications.map(app => app.jobId?._id).filter(Boolean)));
    } catch (err) { console.log("Error fetching applications:", err); }
  };

  // Debounced search and filters execution effect
  useEffect(() => {
    // Reset page and clear current jobs list instantly on search/filters/scope change
    setPage(1);
    setJobs([]);
    setHasMore(true);

    const delayDebounceFn = setTimeout(() => {
      fetchJobs(1, false);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [search, filters, fetchJobs]);

  useEffect(() => { if (token) fetchMyApplications(); }, [token]);

  const onRefresh = () => { setRefreshing(true); fetchJobs(1, false); if (token) fetchMyApplications(); };

  const handleInputChange = (field, value) => {
    setApplicationForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!applicationForm[field]?.trim()) {
        errors[field] = `${label} is required`;
      }
    });
    if (!selectedResume) {
      errors.resume = "Resume is required";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedResume({ uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size });
        if (validationErrors.resume) {
          setValidationErrors(prev => { const u = { ...prev }; delete u.resume; return u; });
        }
      } else if (result.type === 'success') {
        setSelectedResume({ uri: result.uri, name: result.name, mimeType: result.mimeType, size: result.size });
      }
    } catch (err) { Alert.alert("Error", "Failed to pick resume."); }
  };

  const checkAlreadyApplied = (jobId) => appliedJobIds.has(jobId);
  
  // NEW: Find my application for a specific job
  const findMyApplication = (jobId) => {
    return myApplications.find(app => app.jobId?._id === jobId);
  };

  const handleOptimizeResumeFlow = async (job) => {
    if (!token) {
      Alert.alert(
        "Login Required",
        "Please login to optimize your resume.",
        [
          { text: "Cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") }
        ]
      );
      return;
    }

    const resumeToOptimize = resumes.find(r => r.isPrimary) || resumes[0];
    if (!resumeToOptimize) {
      Alert.alert(
        "No Resume Found",
        "Please create or upload a resume first in the Resume Dashboard."
      );
      return;
    }

    try {
      setOptimizing(true);

      // Check fit
      const fitResult = await checkResumeFit(resumeToOptimize._id, job._id);

      if (!fitResult.meetsRequirements) {
        setOptimizing(false);
        setSkillGapData({
          missingSkills: fitResult.missingSkills || [],
          message: `your expertise are not that much for this role to apply this role you need to enhance your skills`
        });
        setSkillGapVisible(true);
        return;
      }

      // Optimize
      const tailored = await optimizeResume(resumeToOptimize._id, {
        jobId: job._id,
        jobTitle: job.title,
        jobDescription: job.description || `Target role: ${job.title}`
      });

      if (!tailored) {
        throw new Error('AI tailoring returned empty results.');
      }

      // Generate local PDF
      const html = renderResumeHTML(tailored, tailored.template || 'modern_ats', tailored.customStyles || {}, true);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const firstName = (tailored.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const lastName = (tailored.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${firstName}_${lastName}_Optimized_Resume.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({ from: uri, to: fileUri });
      setOptimizing(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${firstName} ${lastName} Optimized Resume`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('✅ Success', `Optimized resume saved as: ${fileName}`);
      }

    } catch (error) {
      console.error('Career optimization flow error:', error);
      setOptimizing(false);
      Alert.alert('❌ Error', 'Failed to optimize resume: ' + error.message);
    }
  };

  const handleApply = async () => {
    if (!token) { Alert.alert("Login Required", "Please login to apply", [{ text: "Cancel" }, { text: "Login", onPress: () => navigation.navigate("Login") }]); return; }
    if (!validateForm()) { 
      // Scroll to first error
      Alert.alert("Missing Information", "Please fill all required fields marked with *");
      return; 
    }

    setSubmitting(true); setUploadProgress(0);
    try {
      const formData = new FormData();
      Object.entries(applicationForm).forEach(([key, value]) => formData.append(key, value || ""));
      formData.append('resume', { uri: selectedResume.uri, type: selectedResume.mimeType || 'application/octet-stream', name: selectedResume.name });
      await axios.post(`${API_URL}/apply/${selectedJob._id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
        timeout: 60000,
      });
      Platform.OS === 'android' ? ToastAndroid.show("Submitted!", ToastAndroid.LONG) : Alert.alert("Success!", "Application submitted!");
      setModalVisible(false); resetForm(); fetchMyApplications();
    } catch (err) { Alert.alert("Error", err.response?.data?.error || "Failed to submit"); }
    finally { setSubmitting(false); setUploadProgress(0); }
  };

  const resetForm = () => {
    setApplicationForm({ fullName: user?.name || "", email: user?.email || "", phone: "", address: "", city: "", country: "", coverLetter: "", portfolioUrl: "", linkedInUrl: "", githubUrl: "", currentCompany: "", currentPosition: "", yearsOfExperience: "", expectedSalary: "", noticePeriod: "", workAuthorization: "Citizen" });
    setSelectedResume(null);
    setValidationErrors({});
  };

  // Open modal — always redirect to actual portal of internship
  const openApplyModal = (job) => {
    setSelectedJob(job);
    const applyUrl = job.externalUrl || job.companyWebsite || 'https://pk.indeed.com/q-remote-internship-jobs.html';
    Linking.openURL(applyUrl).catch(() => {
      Alert.alert('Cannot Open Link', 'The application link could not be opened.');
    });
    return;

    const isTDC = (job.companyName || '').toLowerCase().includes('deft crew') || 
                  (job.companyName || '').toLowerCase().includes('tdc') || 
                  (job.company || '').toLowerCase().includes('deft crew') || 
                  (job.company || '').toLowerCase().includes('tdc');

    // External jobs: never use in-app form — redirect to employer's website (except TDC)
    if (job.isExternal && !isTDC) {
      const applyUrl = job.externalUrl || job.companyWebsite;
      if (applyUrl) {
        Linking.canOpenURL(applyUrl).then(supported => {
          if (supported) {
            Linking.openURL(applyUrl);
          } else {
            Alert.alert('Cannot Open Link', 'The application link could not be opened.');
          }
        });
      } else {
        Alert.alert(
          'Apply Externally',
          `Visit ${job.companyName || 'the company website'} directly to apply for this position.`,
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Internal TDC job — track application status or show form
    if (checkAlreadyApplied(job._id)) {
      const myApp = findMyApplication(job._id);
      setSelectedAppliedJob(job);
      setSelectedMyApplication(myApp);
      setShowJobDetailsModal(true);
      return;
    }

    setApplicationForm(prev => ({ ...prev, fullName: user?.name || "", email: user?.email || "" }));
    setValidationErrors({});
    setModalVisible(true);
  };

  // NEW: Open interview from job details modal
  const openInterviewFromDetails = () => {
    if (selectedMyApplication?.interviewDate) {
      setShowJobDetailsModal(false);
      setTimeout(() => {
        setSelectedInterview(selectedMyApplication);
        setShowInterviewModal(true);
      }, 300);
    }
  };

  const openInterviewDetails = (application) => {
    if (application.interviewDate) { 
      setSelectedInterview(application); 
      setShowInterviewModal(true); 
    }
  };

  const shareJob = async (job) => {
    try { await Share.share({ message: `🚀 Career Opportunity!\n\n${job.title}\n${job.companyName || job.department}\n${job.location}\nSalary: ${job.salary}\n\nApply via TDC App!` }); } catch (err) {}
  };

  const clearAllFilters = () => setFilters({ type: "", locationType: "", experienceLevel: "", category: "", datePosted: "all" });

  const headerAnimatedStyle = {
    opacity: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.95], extrapolate: 'clamp' }),
    transform: [{ scale: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.98], extrapolate: 'clamp' }) }],
  };

  const filteredData = jobs; // Filtered server-side dynamically via search API parameter

  // ==================== FILTER MODAL ====================
  const FilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
      <View style={styles.filterModalOverlay}>
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
        <View style={styles.filterModalContent}>
          <View style={styles.modalDragHandle} />
          
          {/* Close X Button */}
          <TouchableOpacity style={styles.closeXButton} onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          
          <Text style={styles.filterModalTitle}>Filter Jobs</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Posted</Text>
              <View style={styles.filterOptions}>
                {[{ label: "Any Time", value: "all" }, { label: "Past 24 Hours", value: "24h" }, { label: "Past Week", value: "week" }, { label: "Past Month", value: "month" }].map(o => (
                  <TouchableOpacity key={o.value} style={[styles.filterChip, filters.datePosted === o.value && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, datePosted: o.value }))}>
                    <Text style={[styles.filterChipText, filters.datePosted === o.value && styles.filterChipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Job Type</Text>
              <View style={styles.filterOptions}>
                {["Full-time", "Part-time", "Contract", "Internship"].map(t => (
                  <TouchableOpacity key={t} style={[styles.filterChip, filters.type === t && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, type: p.type === t ? "" : t }))}>
                    <Text style={[styles.filterChipText, filters.type === t && styles.filterChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.filterOptions}>
                {["Remote", "On-site", "Hybrid"].map(t => (
                  <TouchableOpacity key={t} style={[styles.filterChip, filters.locationType === t && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, locationType: p.locationType === t ? "" : t }))}>
                    <Text style={[styles.filterChipText, filters.locationType === t && styles.filterChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Experience</Text>
              <View style={styles.filterOptions}>
                {["Entry Level", "Mid Level", "Senior Level", "Executive"].map(t => (
                  <TouchableOpacity key={t} style={[styles.filterChip, filters.experienceLevel === t && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, experienceLevel: p.experienceLevel === t ? "" : t }))}>
                    <Text style={[styles.filterChipText, filters.experienceLevel === t && styles.filterChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => { clearAllFilters(); setShowFilters(false); }}><Text style={styles.clearFiltersText}>Clear All</Text></TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersBtn} onPress={() => { setShowFilters(false); fetchJobs(1, false); }}><View style={styles.applyFiltersGradient}><Text style={styles.applyFiltersText}>Apply Filters</Text></View></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ===== HEADER ===== */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>tdc<Text style={{color:'#f9c349'}}>.</Text> Internships</Text>
          <Text style={styles.headerSub}>Find Your Dream Internship</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => {
          if (!token) { Alert.alert("Login Required", "Please login"); return; }
          setShowApplicationsModal(true);
        }}>
          <Ionicons name="document-text-outline" size={22} color="#f9c349" />
          {myApplications.length > 0 && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{myApplications.length}</Text></View>}
        </TouchableOpacity>
      </Animated.View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Search internships, skills, companies..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#999" /></TouchableOpacity>}
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterIcon}>
            <Ionicons name="options-outline" size={20} color="#1a1a1a" />
            {Object.values(filters).some(v => v && v !== "all") && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== CONTENT ===== */}
      {loading ? (
        <View style={styles.centerSection}><ActivityIndicator size="large" color="#f9c349" /><Text style={styles.loadingText}>Loading jobs...</Text></View>
      ) : error ? (
        <View style={styles.centerSection}>
          <MaterialCommunityIcons name="wifi-off" size={50} color="#ddd" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(1, false)}><View style={styles.retryGradient}><Text style={styles.retryText}>Retry</Text></View></TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[styles.listWrap, { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] }]}>
          <FlatList
            data={filteredData}
            renderItem={({ item, index }) => (
              <CareerCard 
                item={item} 
                index={index} 
                onPress={() => openApplyModal(item)} 
                hasApplied={checkAlreadyApplied(item._id)} 
                isRecommended={item.isRecommended || item.matchPercentage >= 50}
                onOptimizePress={() => handleOptimizeResumeFlow(item)}
              />
            )}
            keyExtractor={(item, index) => item._id || `${item.title}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f9c349"]} tintColor="#f9c349" />}
            onEndReached={() => {
              if (hasMore && !loadingMore) {
                fetchJobs(page + 1, true);
              }
            }}
            onEndReachedThreshold={0.25}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={loadingMore && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#f9c349" />
              </View>
            )}
            ListHeaderComponent={filteredData.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>{totalJobsCount} jobs found</Text>
                {filters.datePosted !== "all" && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>{filters.datePosted === "24h" ? "Past 24h" : filters.datePosted === "week" ? "Past week" : "Past month"}</Text></View>}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}><MaterialCommunityIcons name="briefcase-search-outline" size={60} color="#ddd" /><Text style={styles.emptyStateText}>No jobs found</Text></View>
            }
          />
        </Animated.View>
      )}

      <FilterModal />
      <ApplicationsModal visible={showApplicationsModal} applications={myApplications} onClose={() => setShowApplicationsModal(false)} onInterviewPress={openInterviewDetails} />
      <InterviewDetailsModal visible={showInterviewModal} interview={selectedInterview} onClose={() => setShowInterviewModal(false)} />
      
      {/* Optimizing Overlay Modal */}
      <Modal visible={optimizing} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', width: width * 0.8 }}>
            <ActivityIndicator size="large" color="#f9c349" />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: '#1a1a1a' }}>Optimizing Resume...</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: '#999', textAlign: 'center' }}>AI is customizing your resume achievements & profile for this role.</Text>
          </View>
        </View>
      </Modal>

      {/* Skill Gap Custom Alert Modal */}
      <Modal visible={skillGapVisible} transparent animationType="fade" onRequestClose={() => setSkillGapVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden', borderWidth: 1.5, borderColor: '#f9c349' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#1a1a1a', paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="alert-decagram" size={48} color="#f9c349" />
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 8 }}>Skill Gap Warning</Text>
            </View>
            
            {/* Body */}
            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 14, color: '#333333', lineHeight: 22, textAlign: 'center', marginBottom: 16 }}>
                your expertise are not that much for this role to apply this role you need to enhance your skills{' '}
                <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>{skillGapData.missingSkills.join(', ') || 'key required skills'}</Text>
                {' '}and then your chances of selection could increase
              </Text>

              {/* Action Button */}
              <TouchableOpacity 
                style={{ backgroundColor: '#f9c349', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
                onPress={() => setSkillGapVisible(false)}
              >
                <Text style={{ color: '#1a1a1a', fontWeight: '800', fontSize: 14 }}>I will enhance them!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* NEW: Job Details Modal for Applied Jobs */}
      <JobDetailsModal 
        visible={showJobDetailsModal}
        job={selectedAppliedJob}
        myApplication={selectedMyApplication}
        onClose={() => setShowJobDetailsModal(false)}
      />

      {/* ===== APPLICATION FORM MODAL (For non-applied jobs) ===== */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.applyModalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <View style={styles.applyModalContent}>
            <View style={styles.modalDragHandle} />
            
            {/* Close X Button */}
            <TouchableOpacity style={styles.closeXButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
              
              {/* Job Details Header */}
              <View style={styles.applyModalHeader}>
                {selectedJob?.companyName && <Text style={styles.applyModalCompany}>{selectedJob.companyName}</Text>}
                <Text style={styles.applyModalJobTitle}>{selectedJob?.title}</Text>
                <Text style={styles.applyModalJobMeta}>{selectedJob?.department} • {selectedJob?.location}</Text>
                
                <View style={styles.applyModalMetaRow}>
                  <View style={styles.applyModalMetaBadge}>
                    <Ionicons name="briefcase-outline" size={12} color="#f9c349" />
                    <Text style={styles.applyModalMetaText}>{selectedJob?.type}</Text>
                  </View>
                  <View style={styles.applyModalMetaBadge}>
                    <Ionicons name="trending-up-outline" size={12} color="#8b5cf6" />
                    <Text style={styles.applyModalMetaText}>{selectedJob?.experienceLevel}</Text>
                  </View>
                  <View style={styles.applyModalMetaBadge}>
                    <Ionicons name="school-outline" size={12} color="#3b82f6" />
                    <Text style={styles.applyModalMetaText}>{selectedJob?.education || "Bachelor's"}</Text>
                  </View>
                </View>

                <View style={styles.applyModalMetaRow}>
                  <Text style={styles.applyModalSalary}>💰 {selectedJob?.salary}</Text>
                  {selectedJob?.minExperience > 0 && <Text style={styles.applyModalExp}>⏱ {selectedJob.minExperience}+ yrs</Text>}
                </View>

                {selectedJob?.locationType && (
                  <View style={styles.locTypeRow}>
                    <Ionicons name={selectedJob.locationType === "Remote" ? "laptop-outline" : "business-outline"} size={14} color="#f9c349" />
                    <Text style={styles.locTypeText}>{selectedJob.locationType}</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {selectedJob?.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>📋 Description</Text>
                  <Text style={styles.descriptionText}>{selectedJob.description}</Text>
                </View>
              )}

              {/* Requirements */}
              {selectedJob?.requirements?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>✅ Requirements</Text>
                  {selectedJob.requirements.map((req, i) => (
                    <View key={i} style={styles.detailItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.detailItemText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Responsibilities */}
              {selectedJob?.responsibilities?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>🎯 Responsibilities</Text>
                  {selectedJob.responsibilities.map((resp, i) => (
                    <View key={i} style={styles.detailItem}>
                      <Ionicons name="flag-outline" size={16} color="#f9c349" />
                      <Text style={styles.detailItemText}>{resp}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Benefits */}
              {selectedJob?.benefits?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>🎁 Benefits</Text>
                  <View style={styles.benefitsGrid}>
                    {selectedJob.benefits.map((benefit, i) => (
                      <View key={i} style={styles.benefitItem}>
                        <Ionicons name="star" size={14} color="#f9c349" />
                        <Text style={styles.benefitItemText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Skills */}
              {selectedJob?.skills?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>💡 Required Skills</Text>
                  <View style={styles.skillsGrid}>
                    {selectedJob.skills.map((skill, i) => (
                      <View key={i} style={styles.skillBadgeLarge}>
                        <Text style={styles.skillBadgeLargeText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Company Info */}
              {(selectedJob?.companyName || selectedJob?.companyWebsite) && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>🏢 Company Info</Text>
                  {selectedJob.companyName && <Text style={styles.companyInfoText}>{selectedJob.companyName}</Text>}
                  {selectedJob.companyWebsite && (
                    <TouchableOpacity onPress={() => Linking.openURL(selectedJob.companyWebsite)}>
                      <Text style={styles.companyLink}>🌐 {selectedJob.companyWebsite}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Application Form */}
              <View style={styles.formSection}>
                <Text style={styles.sectionHeading}>📝 Application Form</Text>
                <Text style={styles.formRequiredNote}>* Required fields</Text>

                {/* Full Name */}
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput 
                  style={[styles.formInput, validationErrors.fullName && styles.formInputError]} 
                  placeholder="Enter your full name" 
                  placeholderTextColor="#999"
                  value={applicationForm.fullName} 
                  onChangeText={t => handleInputChange("fullName", t)} 
                />
                {validationErrors.fullName && <Text style={styles.errorText}>{validationErrors.fullName}</Text>}

                {/* Email */}
                <Text style={styles.formLabel}>Email Address *</Text>
                <TextInput 
                  style={[styles.formInput, validationErrors.email && styles.formInputError]} 
                  placeholder="Enter your email" 
                  placeholderTextColor="#999"
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  value={applicationForm.email} 
                  onChangeText={t => handleInputChange("email", t)} 
                />
                {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

                {/* Phone */}
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput 
                  style={[styles.formInput, validationErrors.phone && styles.formInputError]} 
                  placeholder="Enter your phone number" 
                  placeholderTextColor="#999"
                  keyboardType="phone-pad" 
                  value={applicationForm.phone} 
                  onChangeText={t => handleInputChange("phone", t)} 
                />
                {validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}

                {/* Address */}
                <Text style={styles.formLabel}>Address</Text>
                <TextInput style={styles.formInput} placeholder="Street address" placeholderTextColor="#999" value={applicationForm.address} onChangeText={t => handleInputChange("address", t)} />

                {/* City & Country */}
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Text style={styles.formLabel}>City</Text>
                    <TextInput style={styles.formInput} placeholder="City" placeholderTextColor="#999" value={applicationForm.city} onChangeText={t => handleInputChange("city", t)} />
                  </View>
                  <View style={styles.formHalf}>
                    <Text style={styles.formLabel}>Country</Text>
                    <TextInput style={styles.formInput} placeholder="Country" placeholderTextColor="#999" value={applicationForm.country} onChangeText={t => handleInputChange("country", t)} />
                  </View>
                </View>

                {/* Professional Info */}
                <Text style={styles.formLabel}>Current Company</Text>
                <TextInput style={styles.formInput} placeholder="Your current employer" placeholderTextColor="#999" value={applicationForm.currentCompany} onChangeText={t => handleInputChange("currentCompany", t)} />

                <Text style={styles.formLabel}>Current Position</Text>
                <TextInput style={styles.formInput} placeholder="Your current role" placeholderTextColor="#999" value={applicationForm.currentPosition} onChangeText={t => handleInputChange("currentPosition", t)} />

                <Text style={styles.formLabel}>Years of Experience</Text>
                <TextInput style={styles.formInput} placeholder="e.g., 5" placeholderTextColor="#999" keyboardType="numeric" value={applicationForm.yearsOfExperience} onChangeText={t => handleInputChange("yearsOfExperience", t)} />

                <Text style={styles.formLabel}>Expected Salary</Text>
                <TextInput style={styles.formInput} placeholder="e.g., $80,000 - $100,000" placeholderTextColor="#999" value={applicationForm.expectedSalary} onChangeText={t => handleInputChange("expectedSalary", t)} />

                <Text style={styles.formLabel}>Notice Period</Text>
                <TextInput style={styles.formInput} placeholder="e.g., 2 weeks" placeholderTextColor="#999" value={applicationForm.noticePeriod} onChangeText={t => handleInputChange("noticePeriod", t)} />

                {/* Work Authorization */}
                <Text style={styles.formLabel}>Work Authorization</Text>
                <View style={styles.workAuthRow}>
                  {["Citizen", "Permanent Resident", "Work Visa", "Need Sponsorship", "Other"].map(opt => (
                    <TouchableOpacity 
                      key={opt} 
                      style={[styles.workAuthChip, applicationForm.workAuthorization === opt && styles.workAuthChipActive]}
                      onPress={() => handleInputChange("workAuthorization", opt)}
                    >
                      <Text style={[styles.workAuthChipText, applicationForm.workAuthorization === opt && styles.workAuthChipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cover Letter */}
                <Text style={styles.formLabel}>Cover Letter *</Text>
                <TextInput 
                  style={[styles.formInput, styles.formTextArea, validationErrors.coverLetter && styles.formInputError]} 
                  placeholder="Why are you a good fit for this role?" 
                  placeholderTextColor="#999"
                  multiline 
                  numberOfLines={5} 
                  value={applicationForm.coverLetter} 
                  onChangeText={t => handleInputChange("coverLetter", t)} 
                />
                {validationErrors.coverLetter && <Text style={styles.errorText}>{validationErrors.coverLetter}</Text>}

                {/* URLs */}
                <Text style={styles.formLabel}>Portfolio URL</Text>
                <TextInput style={styles.formInput} placeholder="https://yourportfolio.com" placeholderTextColor="#999" autoCapitalize="none" value={applicationForm.portfolioUrl} onChangeText={t => handleInputChange("portfolioUrl", t)} />

                <Text style={styles.formLabel}>LinkedIn URL</Text>
                <TextInput style={styles.formInput} placeholder="https://linkedin.com/in/yourprofile" placeholderTextColor="#999" autoCapitalize="none" value={applicationForm.linkedInUrl} onChangeText={t => handleInputChange("linkedInUrl", t)} />

                <Text style={styles.formLabel}>GitHub URL</Text>
                <TextInput style={styles.formInput} placeholder="https://github.com/yourusername" placeholderTextColor="#999" autoCapitalize="none" value={applicationForm.githubUrl} onChangeText={t => handleInputChange("githubUrl", t)} />

                {/* Resume Upload */}
                <Text style={styles.formLabel}>Resume *</Text>
                <TouchableOpacity 
                  style={[styles.resumeBtn, validationErrors.resume && styles.resumeBtnError]} 
                  onPress={pickResume}
                >
                  <Ionicons name="document-attach-outline" size={20} color={validationErrors.resume ? "#ef4444" : "#f9c349"} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeBtnText}>{selectedResume ? selectedResume.name : "Upload Resume (PDF/DOC/DOCX)"}</Text>
                    {selectedResume && <Text style={styles.resumeSize}>{(selectedResume.size / 1024).toFixed(1)} KB</Text>}
                  </View>
                  {selectedResume ? (
                    <TouchableOpacity onPress={() => setSelectedResume(null)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={18} color="#999" />
                  )}
                </TouchableOpacity>
                {validationErrors.resume && <Text style={styles.errorText}>{validationErrors.resume}</Text>}

                {/* Upload Progress */}
                {submitting && uploadProgress > 0 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={submitting}>
                  <View style={styles.submitBtnGradient}>
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Submit Application</Text>
                        <Ionicons name="paper-plane" size={16} color="#fff" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => shareJob(selectedJob)}>
                    <Ionicons name="share-social-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    
  );
};

// ==================== COMPLETE STYLES ====================
const styles = StyleSheet.create({
  // ... (keep all existing styles)
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  headerSub: { fontSize: 11, color: '#999', fontWeight: '500', marginTop: -2 },
  headerBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#f9c349', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  headerBadgeText: { color: '#1a1a1a', fontSize: 9, fontWeight: '900' },
  searchWrapper: { paddingHorizontal: 14, marginTop: 8, marginBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f0f0f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1a1a1a' },
  filterIcon: { padding: 6, position: 'relative' },
  filterDot: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: '#f9c349' },
  listWrap: { flex: 1 },
  listContainer: { padding: 14, paddingBottom: 30 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  resultCount: { fontSize: 12, color: '#999', fontWeight: '500' },
  activeFilterBadge: { backgroundColor: '#f9c34920', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  activeFilterText: { fontSize: 10, color: '#f9c349', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: '#f0f0f0', position: 'relative' },
  appliedBanner: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98115', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 1, borderWidth: 1, borderColor: '#10b98130' },
  appliedBannerText: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  cardCompHeader: { marginBottom: 10, marginTop: 4 },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  companyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349' },
  companyNameText: { fontSize: 13, fontWeight: '700', color: '#f9c349' },
  jobTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', lineHeight: 22 },
  departmentText: { fontSize: 12, color: '#999', fontWeight: '600', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f9c34915', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f9c34930' },
  typeBadgeText: { fontSize: 10, color: '#1a1a1a', fontWeight: '700' },
  expBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf615', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#8b5cf630' },
  expBadgeText: { fontSize: 10, color: '#8b5cf6', fontWeight: '700' },
  locTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98115', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#10b98130' },
  locTypeBadgeText: { fontSize: 10, color: '#10b981', fontWeight: '700' },
  infoRow: { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: { fontSize: 12, color: '#666', fontWeight: '500', flexShrink: 1 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
  skillBadge: { backgroundColor: '#f8f8f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  skillText: { fontSize: 10, color: '#666', fontWeight: '600' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444415', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText: { fontSize: 9, fontWeight: '700', color: '#ef4444' },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f9c34920', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  featuredText: { fontSize: 9, fontWeight: '700', color: '#f9c349' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 8 },
  viewDetailsLabel: { fontSize: 12, fontWeight: '800', color: '#1a1a1a' },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 10, fontSize: 13, color: '#999' },
  errorTitle: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  retryBtn: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  retryGradient: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1a1a1a' },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginTop: 8 },
  filterModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  filterModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.7 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  
  // Close X Button - NEW
  closeXButton: { position: 'absolute', top: 12, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fafafa' },
  filterChipActive: { backgroundColor: '#f9c349', borderColor: '#f9c349' },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#1a1a1a', fontWeight: '700' },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  clearFiltersBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  clearFiltersText: { fontWeight: '600', color: '#999', fontSize: 13 },
  applyFiltersBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  applyFiltersGradient: { paddingVertical: 12, alignItems: 'center', backgroundColor: '#1a1a1a' },
  applyFiltersText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  applicationsModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  applicationsModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.8 },
  applicationsModalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  applicationsModalCount: { fontSize: 11, color: '#999', marginBottom: 16 },
  applicationCard: { backgroundColor: '#fafafa', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  appJobTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  appCompany: { fontSize: 11, color: '#999', marginTop: 2 },
  appStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  appStatusText: { fontSize: 9, fontWeight: '700' },
  appDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  appDetail: { fontSize: 11, color: '#666' },
  appDate: { fontSize: 10, color: '#999' },
  interviewInfo: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  interviewInfoInner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9c34910', padding: 8, borderRadius: 8 },
  interviewText: { fontSize: 11, color: '#f9c349', fontWeight: '600', flex: 1 },
  applicationsCloseBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10 },
  applicationsCloseText: { fontWeight: '600', color: '#999', fontSize: 14 },
  interviewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  interviewModalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  interviewModalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '90%', maxWidth: 400, maxHeight: '80%' },
  interviewModalHandle: { width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  interviewModalHeader: { alignItems: 'center', marginBottom: 16 },
  interviewModalIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#f9c34915', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  interviewModalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  interviewModalSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  interviewDetailCard: { backgroundColor: '#fafafa', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  interviewDetailRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  interviewDetailIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#f9c34910', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  interviewDetailLabel: { fontSize: 10, color: '#999', fontWeight: '600', marginBottom: 2 },
  interviewDetailValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  copyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  interviewLink: { fontSize: 11, color: '#f9c349', textDecorationLine: 'underline', flex: 1 },
  interviewNotes: { fontSize: 12, color: '#666', lineHeight: 16 },
  interviewActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  interviewActionBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  interviewActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#f9c34915', borderRadius: 12, borderWidth: 1, borderColor: '#f9c34930' },
  interviewActionText: { fontWeight: '600', color: '#f9c349', fontSize: 12 },
  interviewJoinBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  interviewJoinBtnDisabled: { opacity: 0.5 },
  interviewJoinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#f9c349', borderRadius: 12 },
  interviewJoinGradientDisabled: { backgroundColor: '#e0e0e0' },
  interviewJoinText: { fontWeight: '600', color: '#fff', fontSize: 12 },
  interviewJoinTextDisabled: { color: '#999' },
  interviewCloseBtn: { paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  interviewCloseText: { fontWeight: '600', color: '#999', fontSize: 13 },
  applyModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  applyModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.9, paddingTop: 8 },
  applyModalHeader: { alignItems: 'center', marginBottom: 16, paddingTop: 8 },
  applyModalCompany: { fontSize: 13, fontWeight: '700', color: '#f9c349', marginBottom: 4 },
  applyModalJobTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', lineHeight: 26 },
  applyModalJobMeta: { fontSize: 13, color: '#999', fontWeight: '600', marginTop: 4 },
  applyModalMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  applyModalMetaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fafafa', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  applyModalMetaText: { fontSize: 11, color: '#666', fontWeight: '600' },
  applyModalSalary: { fontSize: 14, color: '#f9c349', fontWeight: '700', marginTop: 6 },
  applyModalExp: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: 6, marginLeft: 12 },
  locTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locTypeText: { fontSize: 12, color: '#f9c349', fontWeight: '600' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: '#f0f0f0' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerTitle: { fontSize: 11, color: '#999', fontWeight: '600' },
  statusBannerStatus: { fontSize: 14, fontWeight: '800' },
  statusBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeLargeText: { fontSize: 11, fontWeight: '700' },
  interviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9c34910', padding: 14, borderRadius: 14, marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: '#f9c34920' },
  interviewBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f9c34920', justifyContent: 'center', alignItems: 'center' },
  interviewBannerTitle: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
  interviewBannerDate: { fontSize: 11, color: '#f9c349', fontWeight: '600', marginTop: 2 },
  applicationInfoBox: { backgroundColor: '#fafafa', padding: 12, borderRadius: 12, marginTop: 10, width: '100%', borderWidth: 1, borderColor: '#f0f0f0' },
  applicationInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  applicationInfoText: { fontSize: 12, color: '#666', flex: 1, lineHeight: 18 },
  detailSection: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  descriptionText: { fontSize: 13, color: '#666', lineHeight: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailItemText: { fontSize: 13, color: '#666', flex: 1, lineHeight: 18 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f9c34910', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#f9c34920' },
  benefitItemText: { fontSize: 11, color: '#666', fontWeight: '600' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillBadgeLarge: { backgroundColor: '#f8f8f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  skillBadgeLargeText: { fontSize: 11, color: '#666', fontWeight: '600' },
  companyInfoText: { fontSize: 13, color: '#1a1a1a', fontWeight: '600', marginBottom: 4 },
  companyLink: { fontSize: 12, color: '#3b82f6', textDecorationLine: 'underline' },
  formSection: { marginTop: 8 },
  formRequiredNote: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginBottom: 5, marginTop: 8 },
  formInput: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 4, backgroundColor: '#fafafa', color: '#1a1a1a' },
  formInputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  formTextArea: { height: 100, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
  errorText: { fontSize: 10, color: '#ef4444', fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  workAuthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  workAuthChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fafafa' },
  workAuthChipActive: { backgroundColor: '#f9c349', borderColor: '#f9c349' },
  workAuthChipText: { fontSize: 11, color: '#666', fontWeight: '500' },
  workAuthChipTextActive: { color: '#1a1a1a', fontWeight: '700' },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#f0f0f0', borderStyle: 'dashed', marginBottom: 4, backgroundColor: '#fafafa' },
  resumeBtnError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  resumeBtnText: { fontSize: 13, color: '#666', fontWeight: '500', flex: 1 },
  resumeSize: { fontSize: 10, color: '#999', marginTop: 2 },
  progressBar: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, marginBottom: 10, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', backgroundColor: '#f9c349', borderRadius: 2 },
  progressText: { position: 'absolute', top: -16, right: 0, fontSize: 10, color: '#999' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, marginTop: 8 },
  submitBtnGradient: { height: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', gap: 6 },
  shareBtnText: { fontWeight: '700', color: '#1a1a1a', fontSize: 13 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  cancelBtnText: { fontWeight: '700', color: '#999', fontSize: 13 },
  // Pakistan / Worldwide scope toggle
  scopeToggleRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  scopeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: '#f0f0f0', backgroundColor: '#fafafa' },
  scopeBtnActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  scopeFlag: { fontSize: 14 },
  scopeBtnText: { fontSize: 13, fontWeight: '700', color: '#999' },
  scopeBtnTextActive: { color: '#f9c349' },
  optimizeCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8e7',
    borderWidth: 1,
    borderColor: '#f9c349',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  optimizeCardBtnText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default Career;