import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useStableCallback } from "../hooks/useStableCallback";
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
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Linking,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { useOpenFromParams } from '../engagement/hooks/useOpenFromParams';
import { WebViewModal, formatUrl, buildLocationUrl } from "./career/JobWebView"; // in-app browser (also used by JobDetails)
import { openJobDetails } from "../utils/careerNav"; // a job opens full screen; Apply is on JobApplicationForm
import CareerApplications from "./CareerApplications"; // FLAG_CAREER_TIMELINE: "my applications" on the hiring timeline
import { careerEnabled } from "../api/careerApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { renderResumeHTML } from '../services/templateService';
import { ResumeContext } from '../context/ResumeContext';
import { BASE_URL } from '../api/api';

const { width, height } = Dimensions.get("window");
const API_URL = `${BASE_URL}/jobs`;

import { color as T, font as F } from "../theme/tokens";
import { useGuestGate } from '../guest/GuestGate';
import { plainError } from "../utils/plainError";
import { copyToClipboard } from "../utils/clipboard";
// Design system tokens (tdc-full-redesign/DESIGN_SYSTEM.md)
const COLORS = {
  page: T.paper,
  surface: T.sand,
  line: T.line,
  primary: T.ink,
  accent: T.yellow,
  accentSoft: T.yellowSoft,
  muted: T.textFaint,
  body: T.textMuted,
  error: T.danger,
  success: T.success,
  warning: T.textMuted,
  info: T.ink,
  purple: T.ink,
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ==================== URL HELPERS ====================


// ==================== ENHANCED CAREER CARD ====================
const CareerCard = React.memo(({ item, index, onPress, onLocationPress, hasApplied, isRecommended, onOptimizePress }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animDelay = Math.min(index, 8) * 55;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: animDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: animDelay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const animatePress = (toValue) => {
    Animated.spring(scale, { toValue, friction: 8, tension: 90, useNativeDriver: true }).start();
  };

  const isTDC =
    (item.companyName || '').toLowerCase().includes('deft crew') ||
    (item.companyName || '').toLowerCase().includes('tdc') ||
    (item.company || '').toLowerCase().includes('deft crew') ||
    (item.company || '').toLowerCase().includes('tdc') ||
    item.isExternal === false ||
    (item.applyUrl && item.applyUrl.includes('/apply/')) ||
    item.createdBy === 'tdc' ||
    item.createdBy === 'admin' ||
    item.source === 'tdc' ||
    item.source === 'internal' ||
    item.applicationType === 'tdc' ||
    item.applicationType === 'internal';

  const isExternal = item.isExternal === true || item.source === 'external' || item.applicationType === 'external';
  const isExpired = item.isExpired || item.active === false || (item.applicationDeadline && new Date(item.applicationDeadline) < new Date());

  return (
    <AnimatedTouchable
      style={[styles.card, { opacity, transform: [{ translateY }, { scale }] }]}
      activeOpacity={0.92}
      onPress={() => onPress(item)}
      onPressIn={() => animatePress(0.97)}
      onPressOut={() => animatePress(1)}
    >
      {isExpired ? (
        <View style={styles.expiredBanner}>
          <Ionicons name="time-outline" size={12} color={T.danger} />
          <Text style={styles.expiredBannerText}>expired</Text>
        </View>
      ) : hasApplied ? (
        <View style={styles.appliedBanner}>
          <Ionicons name="checkmark-circle" size={14} color={T.success} />
          <Text style={styles.appliedBannerText}>you've applied</Text>
        </View>
      ) : null}

      <View style={[styles.cardCompHeader, (hasApplied || isExpired) && { paddingRight: 100 }]}>
        {item.companyName && (
          <View style={styles.companyNameRow}>
            <View style={styles.companyDot} />
            <Text style={styles.companyNameText} numberOfLines={1}>{item.companyName}</Text>
          </View>
        )}
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        {item.department && <Text style={styles.departmentText}>{item.department}</Text>}
      </View>

      <View style={styles.badgeRow}>
        {/* Real match score from the jobs API (Career design "86% match") */}
        {typeof item.matchPercentage === "number" && item.matchPercentage > 0 && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{Math.round(item.matchPercentage)}% match</Text>
          </View>
        )}
        {isTDC && !isExternal && (
          <View style={styles.tdcBadge}>
            <Ionicons name="sparkles" size={11} color={T.yellow} />
            <Text style={styles.tdcBadgeText}>easy apply</Text>
          </View>
        )}
        {isExternal && (
          <View style={styles.externalBadge}>
            <Ionicons name="open-outline" size={11} color={T.ink} />
            <Text style={styles.externalBadgeText}>external</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Ionicons name="briefcase-outline" size={11} color={T.yellow} />
          <Text style={styles.typeBadgeText}>{item.type || "Full-time"}</Text>
        </View>
        {item.experienceLevel && (
          <View style={styles.expBadge}>
            <Ionicons name="trending-up-outline" size={11} color={T.ink} />
            <Text style={styles.expBadgeText}>{item.experienceLevel}</Text>
          </View>
        )}
        {item.locationType && (
          <View style={styles.locTypeBadge}>
            <Ionicons name={item.locationType === "Remote" ? "laptop-outline" : item.locationType === "Hybrid" ? "git-branch-outline" : "business-outline"} size={11} color={T.success} />
            <Text style={styles.locTypeBadgeText}>{item.locationType}</Text>
          </View>
        )}
      </View>

      {/* Location row — tappable to open exact location in Google Maps */}
      <View style={styles.infoRow}>
        <TouchableOpacity
          style={styles.metaItem}
          onPress={(e) => {
            e.stopPropagation?.();
            onLocationPress?.(item);
          }}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons name="location-sharp" size={14} color={T.yellow} />
          <Text style={[styles.metaText, styles.metaTextLink]} numberOfLines={1}>
            {item.location}
          </Text>
          <Ionicons name="open-outline" size={11} color={T.yellow} />
        </TouchableOpacity>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color={T.ink} />
          <Text style={styles.metaText} numberOfLines={1}>{item.salary || "Competitive"}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        {item.education && (
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color={T.ink} />
            <Text style={styles.metaText}>{item.education}</Text>
          </View>
        )}
        {item.minExperience > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={T.textMuted} />
            <Text style={styles.metaText}>{item.minExperience}+ yrs exp</Text>
          </View>
        )}
      </View>

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

      {(item.urgent || item.featured) && (
        <View style={styles.tagRow}>
          {item.urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={10} color={T.danger} />
              <Text style={styles.urgentText}>urgent hiring</Text>
            </View>
          )}
          {item.featured && (
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons name="star" size={10} color={T.yellow} />
              <Text style={styles.featuredText}>featured</Text>
            </View>
          )}
        </View>
      )}

      {isRecommended && isTDC && !isExternal && !isExpired && (
        <TouchableOpacity
          style={styles.optimizeCardBtn}
          onPress={(e) => {
            e.stopPropagation();
            onOptimizePress(item);
          }}
        >
          <Ionicons name="sparkles" size={14} color={T.ink} />
          <Text style={styles.optimizeCardBtnText}>optimize resume</Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardFooter}>
        <Text style={[styles.viewDetailsLabel, isExpired && { color: T.danger }]}>
          {isExpired ? "Opportunity Expired" : hasApplied ? "✓ View Details" : isTDC && !isExternal ? "Apply Now" : "Apply on Company Site"}
        </Text>
        <Ionicons
          name={isExpired ? "close-circle-outline" : hasApplied ? "eye-outline" : isTDC && !isExternal ? "arrow-forward-circle" : "open-outline"}
          size={22}
          color={isExpired ? T.danger : hasApplied ? T.success : isTDC && !isExternal ? T.yellow : T.ink}
        />
      </View>
    </AnimatedTouchable>
  );
});

// ==================== WEBVIEW MODAL ====================

// ==================== JOB DETAILS MODAL (For Applied Jobs) ====================

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
      await copyToClipboard(interview.meetingLink, { title: "Copied!", message: "Meeting link copied to clipboard" });
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

          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={T.ink} />
          </TouchableOpacity>

          <View style={styles.interviewModalHeader}>
            <View style={styles.interviewModalIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={T.yellow} />
            </View>
            <Text style={styles.interviewModalTitle}>interview scheduled</Text>
            <Text style={styles.interviewModalSubtitle}>{interview.jobId?.companyName || interview.jobId?.department}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.interviewDetailCard}>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="briefcase-outline" size={18} color={T.yellow} /></View>
                <View style={{ flex: 1 }}><Text style={styles.interviewDetailLabel}>position</Text><Text style={styles.interviewDetailValue}>{interview.jobId?.title}</Text></View>
              </View>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="calendar-outline" size={18} color={T.yellow} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interviewDetailLabel}>date & time</Text>
                  <Text style={styles.interviewDetailValue}>{new Date(interview.interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
              <View style={styles.interviewDetailRow}>
                <View style={styles.interviewDetailIcon}><Ionicons name="videocam-outline" size={18} color={T.yellow} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interviewDetailLabel}>meeting platform</Text>
                  <Text style={styles.interviewDetailValue}>{getMeetingPlatform()}</Text>
                  {interview.meetingLink && (
                    <TouchableOpacity onPress={copyMeetingLink} style={styles.copyLinkBtn}>
                      <Text style={styles.interviewLink} numberOfLines={1}>{interview.meetingLink}</Text>
                      <Ionicons name="copy-outline" size={14} color={T.yellow} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {interview.interviewNotes && (
                <View style={styles.interviewDetailRow}>
                  <View style={styles.interviewDetailIcon}><Ionicons name="document-text-outline" size={18} color={T.yellow} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.interviewDetailLabel}>notes</Text><Text style={styles.interviewNotes}>{interview.interviewNotes}</Text></View>
                </View>
              )}
            </View>
            <View style={styles.interviewActions}>
              <TouchableOpacity style={styles.interviewActionBtn} onPress={addToCalendar}>
                <View style={styles.interviewActionGradient}>
                  <Ionicons name="calendar" size={18} color={T.yellow} />
                  <Text style={styles.interviewActionText}>calendar</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.interviewJoinBtn, !interview.meetingLink && styles.interviewJoinBtnDisabled]} onPress={joinMeeting}>
                <View style={[styles.interviewJoinGradient, !interview.meetingLink && styles.interviewJoinGradientDisabled]}>
                  <Ionicons name="videocam" size={18} color={interview.meetingLink ? T.white : T.textFaint} />
                  <Text style={[styles.interviewJoinText, !interview.meetingLink && styles.interviewJoinTextDisabled]}>join</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.interviewCloseBtn} onPress={onClose}><Text style={styles.interviewCloseText}>close</Text></TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==================== APPLICATIONS MODAL ====================
// timeline (FLAG_CAREER_TIMELINE): the hiring timeline (CareerApplications: answer interviews and offers, withdraw);
// otherwise the classic list
const ApplicationsModal = ({ visible, applications, onClose, onInterviewPress, timeline = false }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return COLORS.warning;
      case "reviewed": return COLORS.info;
      case "shortlisted": return COLORS.success;
      case "interview": return COLORS.purple;
      case "rejected": return COLORS.error;
      case "hired": return T.success;
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

          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={T.ink} />
          </TouchableOpacity>

          <Text style={styles.applicationsModalTitle}>my applications</Text>
          <Text style={styles.applicationsModalCount}>{applications.length} applications</Text>
          {timeline ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.7 }}>
              <CareerApplications />
            </ScrollView>
          ) : applications.length === 0 ? (
            <View style={styles.emptyState}><MaterialCommunityIcons name="briefcase-search" size={50} color={T.textFaint} /><Text style={styles.emptyStateText}>no applications yet</Text></View>
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
                          <Ionicons name="calendar" size={14} color={T.yellow} />
                          <Text style={styles.interviewText}>Interview: {new Date(app.interviewDate).toLocaleDateString()} at {new Date(app.interviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          <Ionicons name="chevron-forward" size={14} color={T.yellow} />
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.applicationsCloseBtn} onPress={onClose}><Text style={styles.applicationsCloseText}>close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ==================== FILTER MODAL ====================
const FilterModal = React.memo(({ visible, filters, setFilters, onClose, onApply, onClear }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.filterModalOverlay}>
      <TouchableWithoutFeedback onPress={onClose}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
      <View style={styles.filterModalContent}>
        <View style={styles.modalDragHandle} />

        <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={T.ink} />
        </TouchableOpacity>

        <Text style={styles.filterModalTitle}>filter jobs</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>date posted</Text>
            <View style={styles.filterOptions}>
              {[{ label: "Any Time", value: "all" }, { label: "Past 24 Hours", value: "24h" }, { label: "Past Week", value: "week" }, { label: "Past Month", value: "month" }].map(o => (
                <TouchableOpacity key={o.value} style={[styles.filterChip, filters.datePosted === o.value && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, datePosted: o.value }))}>
                  <Text style={[styles.filterChipText, filters.datePosted === o.value && styles.filterChipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>job type</Text>
            <View style={styles.filterOptions}>
              {["Full-time", "Part-time", "Contract", "Internship"].map(t => (
                <TouchableOpacity key={t} style={[styles.filterChip, filters.type === t && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, type: p.type === t ? "" : t }))}>
                  <Text style={[styles.filterChipText, filters.type === t && styles.filterChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>location</Text>
            <View style={styles.filterOptions}>
              {["Remote", "On-site", "Hybrid"].map(t => (
                <TouchableOpacity key={t} style={[styles.filterChip, filters.locationType === t && styles.filterChipActive]} onPress={() => setFilters(p => ({ ...p, locationType: p.locationType === t ? "" : t }))}>
                  <Text style={[styles.filterChipText, filters.locationType === t && styles.filterChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>experience</Text>
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
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={onClear}><Text style={styles.clearFiltersText}>clear all</Text></TouchableOpacity>
          <TouchableOpacity style={styles.applyFiltersBtn} onPress={onApply}><View style={styles.applyFiltersGradient}><Text style={styles.applyFiltersText}>apply filters</Text></View></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

// ==================== MAIN CAREER SCREEN ====================
const Career = ({ navigation, route }) => {
  const { resumes = [], optimizeResume, checkResumeFit } = useContext(ResumeContext);
  const [optimizing, setOptimizing] = useState(false);
  const [skillGapVisible, setSkillGapVisible] = useState(false);
  const [skillGapData, setSkillGapData] = useState({ missingSkills: [], message: "" });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "All", locationType: "", experienceLevel: "", category: "", datePosted: "all", isTdc: false });
  const scope = 'pakistan';
  const [showFilters, setShowFilters] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  // FLAG_CAREER_TIMELINE: pilot students see their applications on the hiring timeline (was TDCCareers' sheet)
  const [careerOn, setCareerOn] = useState(false);
  const [token, setToken] = useState(null);
  const { requireAccount } = useGuestGate();
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState(0);


  // ✅ NEW: WebView state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [webViewTitle, setWebViewTitle] = useState('');

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(20)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadAuthData(); }, []);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) setToken(storedToken);
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
    const cleanPage = typeof pageNum === 'number' && !isNaN(pageNum) ? pageNum : 1;
    const cleanAppend = typeof shouldAppend === 'boolean' ? shouldAppend : false;

    if (cleanPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(false);

    try {
      let queryString = `page=${cleanPage}&limit=30&scope=${scope}`;
      if (search) queryString += `&search=${encodeURIComponent(search)}`;
      if (filters.isTdc) queryString += `&isExternal=false`;
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "datePosted" && key !== "isTdc" && (key !== "type" || value !== "All")) {
          queryString += `&${key}=${encodeURIComponent(value)}`;
        }
      });

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const requestUrl = filters.isTdc
        ? `${API_URL}/public/tdc?${queryString}`
        : `${API_URL}/public/all?${queryString}`;
      const response = await axios.get(requestUrl, { headers, timeout: 10000 });
      let jobsData = Array.isArray(response.data.jobs) ? response.data.jobs : [];
      const total = response.data.total || 0;

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
        setHasMore(unique.length < total);
        return unique;
      });

      setPage(cleanPage);
      setTotalJobsCount(total);
      runEntranceAnimation();
    } catch (err) {
      setError(true);
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

  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
    const delayDebounceFn = setTimeout(() => {
      fetchJobs(1, false);
    }, 450);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filters, fetchJobs]);

  useEffect(() => { if (token) fetchMyApplications(); }, [token]);

  // back from JobApplicationForm after the server confirmed the application (utils/careerNav.backToJobsList):
  // the job shows "Applied" at once, then the statuses reload
  useEffect(() => { careerEnabled().then(setCareerOn).catch(() => setCareerOn(false)); }, [token]);

  // a job push without a job (utils/careerNav.jobTarget) → { openApplications: true }: the applications sheet;
  // the old TDC careers list (TDCCareers) → { tdc: true }: this list, TDC jobs only
  const openApplications = route?.params?.openApplications;
  useEffect(() => {
    if (!openApplications) return;
    setShowApplicationsModal(true);
    if (token) fetchMyApplications();
    navigation.setParams({ openApplications: undefined });
  }, [openApplications]);
  const tdcOnly = route?.params?.tdc;
  useEffect(() => {
    if (!tdcOnly) return;
    setFilters((f) => ({ ...f, isTdc: true }));
    navigation.setParams({ tdc: undefined });
  }, [tdcOnly]);

  const appliedJobId = route?.params?.appliedJobId;
  useEffect(() => {
    if (!appliedJobId) return;
    setAppliedJobIds((prev) => new Set(prev).add(String(appliedJobId)));
    if (token) fetchMyApplications();
    navigation.setParams({ appliedJobId: undefined });
  }, [appliedJobId]);

  const onRefresh = () => { setRefreshing(true); fetchJobs(1, false); if (token) fetchMyApplications(); };

  // Rows are memoised (CareerCard): stable callbacks and renderItem, so a parent render no
  // longer re-renders every visible job card
  // a job opens full screen (JobDetails: details, "your match", Apply / Applied / Closed)
  const openJob = useStableCallback((job) => openJobDetails(navigation, job));
  const locationPress = useStableCallback((job) => handleLocationPress(job));
  const optimizeJob = useStableCallback((job) => handleOptimizeResumeFlow(job));
  const renderJob = useCallback(({ item, index }) => (
    <CareerCard
      item={item}
      index={index}
      onPress={openJob}
      onLocationPress={locationPress}
      hasApplied={appliedJobIds.has(item._id)}
      isRecommended={item.isRecommended || item.matchPercentage >= 50}
      onOptimizePress={optimizeJob}
    />
  ), [openJob, locationPress, optimizeJob, appliedJobIds]);

  const openInterviewDetails = (application) => {
    if (application.interviewDate) {
      setSelectedInterview(application);
      setShowInterviewModal(true);
    }
  };

  const handleOptimizeResumeFlow = async (job) => {
    if (!token) {
      requireAccount();
      return;
    }

    const resumeToOptimize = resumes.find(r => r.isPrimary) || resumes[0];
    if (!resumeToOptimize) {
      Alert.alert("No Resume Found", "Please create or upload a resume first in the Resume Dashboard.");
      return;
    }

    try {
      setOptimizing(true);
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

      const tailored = await optimizeResume(resumeToOptimize._id, {
        jobId: job._id,
        jobTitle: job.title,
        jobDescription: job.description || `Target role: ${job.title}`
      });

      if (!tailored) throw new Error('AI tailoring returned empty results.');

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
      Alert.alert('❌ Error', plainError(error, "Failed to optimize resume. Please try again."));
    }
  };

  // ✅ NEW: Open external URL in WebView modal
  const openInWebView = (url, title) => {
    const formatted = formatUrl(url);
    if (!formatted) {
      Alert.alert('Invalid Link', 'This job does not have a valid application URL.');
      return;
    }
    setWebViewUrl(formatted);
    setWebViewTitle(title || 'Application');
    setWebViewVisible(true);
  };

  // ✅ NEW: Location tap → open exact map location
  const handleLocationPress = (job) => {
    const mapUrl = buildLocationUrl(job.location);
    if (!mapUrl) {
      Alert.alert('No Location', 'This job does not have a location set.');
      return;
    }
    Linking.canOpenURL(mapUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mapUrl);
        } else {
          // Fallback: open in in-app WebView
          openInWebView(mapUrl, job.location);
        }
      })
      .catch(() => openInWebView(mapUrl, job.location));
  };

  const clearAllFilters = () => setFilters({ type: "", locationType: "", experienceLevel: "", category: "", datePosted: "all" });

  const headerAnimatedStyle = {
    opacity: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.95], extrapolate: 'clamp' }),
    transform: [{ scale: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.98], extrapolate: 'clamp' }) }],
  };

  const filteredData = jobs;

  // Daily Drop / push → navigate('Career', { openJobId }) opens that job
  useOpenFromParams('openJobId', async (id) => {
    const job = jobs.find((j) => String(j._id) === String(id));
    openJobDetails(navigation, job || String(id));
    return true;
  }, !loading);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* ===== HEADER ===== */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} accessibilityRole="header">jobs<Text style={{ color: T.yellow }}>.</Text></Text>
          <Text style={styles.headerSub}>careers, internships and easy apply</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => {
          if (!token) { Alert.alert("Login Required", "Please login"); return; }
          setShowApplicationsModal(true);
        }}>
          <Ionicons name="document-text-outline" size={22} color={T.yellow} />
          {myApplications.length > 0 && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{myApplications.length}</Text></View>}
        </TouchableOpacity>
      </Animated.View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={T.textFaint} />
          <TextInput style={styles.searchInput} placeholder="Search jobs, skills, companies..." placeholderTextColor={T.textFaint} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={T.textFaint} /></TouchableOpacity>}
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterIcon}>
            <Ionicons name="options-outline" size={20} color={T.ink} />
            {Object.values(filters).some(v => v && v !== "all" && v !== false) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== TOP QUICK FILTER TABS ===== */}
      <View style={styles.topTabsWrapper}>
        <View style={styles.topTabsContainer}>
          <TouchableOpacity
            style={[styles.topTabChip, !filters.isTdc && styles.topTabChipActive]}
            onPress={() => setFilters(prev => ({ ...prev, isTdc: false }))}
          >
            <Ionicons name="grid-outline" size={13} color={!filters.isTdc ? T.ink : T.textMuted} />
            <Text style={[styles.topTabChipText, !filters.isTdc && styles.topTabChipTextActive]}>all listings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabChip, filters.isTdc && styles.topTabChipTdcActive]}
            onPress={() => setFilters(prev => ({ ...prev, isTdc: true }))}
          >
            <Ionicons name="sparkles" size={14} color={filters.isTdc ? T.ink : T.yellow} />
            <Text style={[styles.topTabChipText, filters.isTdc && styles.topTabChipTdcTextActive]}> easy apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== CONTENT ===== */}
      {loading ? (
        <View style={styles.centerSection}><ActivityIndicator size="large" color={T.yellow} /><Text style={styles.loadingText}>loading jobs...</Text></View>
      ) : error ? (
        <View style={styles.centerSection}>
          <MaterialCommunityIcons name="wifi-off" size={50} color={T.textFaint} />
          <Text style={styles.errorTitle}>connection error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(1, false)}><View style={styles.retryGradient}><Text style={styles.retryText}>retry</Text></View></TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[styles.listWrap, { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] }]}>
          <FlatList
            data={filteredData}
            renderItem={renderJob}
            keyExtractor={(item, index) => item._id || `${item.title}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.yellow]} tintColor={T.yellow} />}
            initialNumToRender={10}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={T.yellow} />
                  <Text style={{ marginTop: 8, fontSize: 13, color: T.textMuted, fontFamily: F.bodySemi }}>loading more listings...</Text>
                </View>
              ) : (hasMore && filteredData.length > 0) ? (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => fetchJobs(page + 1, true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={16} color={T.ink} />
                  <Text style={styles.showMoreButtonText}>
                    Show All Listings ({totalJobsCount - filteredData.length} remaining)
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={T.ink} />
                </TouchableOpacity>
              ) : null
            }
            ListHeaderComponent={(
              <View>
                {filteredData.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>{totalJobsCount} jobs found</Text>
                {filters.datePosted !== "all" && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>{filters.datePosted === "24h" ? "Past 24h" : filters.datePosted === "week" ? "Past week" : "Past month"}</Text></View>}
              </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}><MaterialCommunityIcons name="briefcase-search-outline" size={60} color={T.textFaint} /><Text style={styles.emptyStateText}>no jobs found</Text></View>
            }
          />
        </Animated.View>
      )}

      <FilterModal
        visible={showFilters}
        filters={filters}
        setFilters={setFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => { setShowFilters(false); fetchJobs(1, false); }}
        onClear={() => { clearAllFilters(); setShowFilters(false); }}
      />
      <ApplicationsModal
        visible={showApplicationsModal}
        timeline={careerOn}
        applications={myApplications}
        onClose={() => setShowApplicationsModal(false)}
        onInterviewPress={openInterviewDetails}
      />
      <InterviewDetailsModal
        visible={showInterviewModal}
        interview={selectedInterview}
        onClose={() => setShowInterviewModal(false)}
      />

      {/* ✅ NEW: In-app WebView for external job applications */}
      <WebViewModal
        visible={webViewVisible}
        url={webViewUrl}
        title={webViewTitle}
        onClose={() => {
          setWebViewVisible(false);
          setWebViewUrl(null);
          setWebViewTitle('');
        }}
      />

      {/* Optimizing Overlay Modal */}
      {/* progress overlay, no close button: back does nothing while it runs */}
      <Modal visible={optimizing} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: T.card, padding: 24, borderRadius: 16, alignItems: 'center', width: width * 0.8 }}>
            <ActivityIndicator size="large" color={T.yellow} />
            <Text style={{ marginTop: 16, fontSize: 16, fontFamily: F.bodyBold, color: T.ink }}>optimizing resume...</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: T.textFaint, textAlign: 'center' }}>AI is customizing your resume achievements & profile for this role.</Text>
          </View>
        </View>
      </Modal>

      {/* Skill Gap Custom Alert Modal */}
      <Modal visible={skillGapVisible} transparent animationType="fade" onRequestClose={() => setSkillGapVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: T.card, borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden', borderWidth: 1.5, borderColor: T.yellow }}>
            <View style={{ backgroundColor: T.ink, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="alert-decagram" size={48} color={T.yellow} />
              <Text style={{ color: T.white, fontSize: 18, fontFamily: F.heading, marginTop: 8 }}>skill gap warning</Text>
            </View>
            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 14, color: T.ink, lineHeight: 22, textAlign: 'center', marginBottom: 16 }}>
                your expertise are not that much for this role to apply this role you need to enhance your skills{' '}
                <Text style={{ fontFamily: F.bodyBold, color: T.ink }}>{skillGapData.missingSkills.join(', ') || 'key required skills'}</Text>
                {' '}and then your chances of selection could increase
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: T.yellow, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
                onPress={() => setSkillGapVisible(false)}
              >
                <Text style={{ color: T.ink, fontFamily: F.bodyBold, fontSize: 14 }}>i will enhance them!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
};


// ==================== COMPLETE STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.paper },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 26, fontFamily: F.heading, letterSpacing: -0.6, color: T.ink },
  headerSub: { fontSize: 12.5, color: T.textMuted, fontFamily: F.body, marginTop: 0 },
  headerBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: T.yellow, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  headerBadgeText: { color: T.ink, fontSize: 9, fontFamily: F.bodyBold },
  searchWrapper: { paddingHorizontal: 14, marginTop: 8, marginBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.sand, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: T.line },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: F.body, color: T.ink },
  filterIcon: { padding: 6, position: 'relative' },
  filterDot: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: T.yellow },
  listWrap: { flex: 1 },
  listContainer: { padding: 14, paddingBottom: 30 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  resultCount: { fontSize: 12, color: T.textFaint, fontFamily: F.bodyMedium },
  activeFilterBadge: { backgroundColor: T.yellowSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  activeFilterText: { fontSize: 10, color: T.yellow, fontFamily: F.bodySemi },
  card: { backgroundColor: T.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: T.line, position: 'relative' },
  appliedBanner: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 1, borderWidth: 1, borderColor: T.success },
  appliedBannerText: { fontSize: 10, fontFamily: F.bodyBold, color: T.success },
  cardCompHeader: { marginBottom: 10, marginTop: 4 },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  companyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.yellow },
  companyNameText: { fontSize: 13, fontFamily: F.bodyBold, color: T.yellow },
  jobTitle: { fontSize: 17, fontFamily: F.bodyBold, color: T.ink, lineHeight: 22 },
  departmentText: { fontSize: 12, color: T.textFaint, fontFamily: F.bodySemi, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  tdcBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.ink, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tdcBadgeText: { fontSize: 9, color: T.yellow, fontFamily: F.bodyBold },
  externalBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.sand, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: T.ink },
  externalBadgeText: { fontSize: 9, color: T.ink, fontFamily: F.bodyBold },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.yellowSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  typeBadgeText: { fontSize: 10, color: T.ink, fontFamily: F.bodyBold },
  expBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.sand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.sand },
  expBadgeText: { fontSize: 10, color: T.ink, fontFamily: F.bodyBold },
  locTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.success },
  locTypeBadgeText: { fontSize: 10, color: T.success, fontFamily: F.bodyBold },
  infoRow: { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: { fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium, flexShrink: 1 },
  metaTextLink: { color: T.yellow, fontFamily: F.bodyBold, textDecorationLine: 'underline' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
  skillBadge: { backgroundColor: T.sand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  skillText: { fontSize: 10, color: T.textMuted, fontFamily: F.bodySemi },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.dangerBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText: { fontSize: 9, fontFamily: F.bodyBold, color: T.danger },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.yellowSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  featuredText: { fontSize: 9, fontFamily: F.bodyBold, color: T.yellow },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10, marginTop: 8 },
  viewDetailsLabel: { fontSize: 12, fontFamily: F.bodyBold, color: T.ink },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 10, fontSize: 13, fontFamily: F.body, color: T.textFaint },
  errorTitle: { marginTop: 10, fontSize: 16, fontFamily: F.bodyBold, color: T.ink },
  retryBtn: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  retryGradient: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: T.ink },
  retryText: { color: T.white, fontFamily: F.bodyBold, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink, marginTop: 8 },
  filterModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: T.overlay },
  filterModalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.7 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: T.sand, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  closeXButton: { position: 'absolute', top: 12, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  filterModalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink, marginBottom: 16 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 13, fontFamily: F.bodyBold, color: T.ink, marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: T.sand },
  filterChipActive: { backgroundColor: T.yellow, borderColor: T.yellow },
  filterChipText: { fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium },
  filterChipTextActive: { color: T.ink, fontFamily: F.bodyBold },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.line },
  clearFiltersBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: T.line },
  clearFiltersText: { fontFamily: F.bodySemi, color: T.textFaint, fontSize: 13 },
  applyFiltersBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  applyFiltersGradient: { paddingVertical: 12, alignItems: 'center', backgroundColor: T.ink },
  applyFiltersText: { color: T.white, fontFamily: F.bodyBold, fontSize: 13 },
  applicationsModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: T.overlay },
  applicationsModalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.8 },
  applicationsModalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink, marginBottom: 2 },
  applicationsModalCount: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginBottom: 16 },
  applicationCard: { backgroundColor: T.sand, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.line },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  appJobTitle: { fontSize: 14, fontFamily: F.bodyBold, color: T.ink },
  appCompany: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginTop: 2 },
  appStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  appStatusText: { fontSize: 9, fontFamily: F.bodyBold },
  appDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  appDetail: { fontSize: 11, fontFamily: F.body, color: T.textMuted },
  appDate: { fontSize: 10, fontFamily: F.body, color: T.textFaint },
  interviewInfo: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.line },
  interviewInfoInner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.yellowSoft, padding: 8, borderRadius: 8 },
  interviewText: { fontSize: 11, color: T.yellow, fontFamily: F.bodySemi, flex: 1 },
  applicationsCloseBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: T.line, marginTop: 10 },
  applicationsCloseText: { fontFamily: F.bodySemi, color: T.textFaint, fontSize: 14 },
  interviewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.overlay },
  interviewModalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  interviewModalContent: { backgroundColor: T.card, borderRadius: 24, padding: 20, width: '90%', maxWidth: 400, maxHeight: '80%' },
  interviewModalHandle: { width: 40, height: 5, backgroundColor: T.sand, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  interviewModalHeader: { alignItems: 'center', marginBottom: 16 },
  interviewModalIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  interviewModalTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink },
  interviewModalSubtitle: { fontSize: 12, fontFamily: F.body, color: T.textFaint, marginTop: 2 },
  interviewDetailCard: { backgroundColor: T.sand, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: T.line },
  interviewDetailRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  interviewDetailIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  interviewDetailLabel: { fontSize: 10, color: T.textFaint, fontFamily: F.bodySemi, marginBottom: 2 },
  interviewDetailValue: { fontSize: 13, color: T.ink, fontFamily: F.bodyMedium },
  copyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  interviewLink: { fontSize: 11, fontFamily: F.body, color: T.yellow, textDecorationLine: 'underline', flex: 1 },
  interviewNotes: { fontSize: 12, fontFamily: F.body, color: T.textMuted, lineHeight: 16 },
  interviewActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  interviewActionBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  interviewActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: T.yellowSoft, borderRadius: 12, borderWidth: 1, borderColor: T.line },
  interviewActionText: { fontFamily: F.bodySemi, color: T.yellow, fontSize: 12 },
  interviewJoinBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  interviewJoinBtnDisabled: { opacity: 0.5 },
  interviewJoinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: T.yellow, borderRadius: 12 },
  interviewJoinGradientDisabled: { backgroundColor: T.sand },
  interviewJoinText: { fontFamily: F.bodySemi, color: T.white, fontSize: 12 },
  interviewJoinTextDisabled: { color: T.textFaint },
  interviewCloseBtn: { paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: T.line },
  interviewCloseText: { fontFamily: F.bodySemi, color: T.textFaint, fontSize: 13 },
  applyModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: T.overlay },
  applyModalContent: { backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.9, paddingTop: 8 },
  applyModalHeader: { alignItems: 'center', marginBottom: 16, paddingTop: 8 },
  applyModalCompany: { fontSize: 13, fontFamily: F.bodyBold, color: T.yellow, marginBottom: 4 },
  applyModalJobTitle: { fontSize: 20, fontFamily: F.heading, color: T.ink, textAlign: 'center', lineHeight: 26 },
  applyModalJobMeta: { fontSize: 13, color: T.textFaint, fontFamily: F.bodySemi, marginTop: 4 },
  applyModalMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  applyModalMetaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.sand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: T.line },
  applyModalMetaText: { fontSize: 11, color: T.textMuted, fontFamily: F.bodySemi },
  applyModalSalary: { fontSize: 14, color: T.yellow, fontFamily: F.bodyBold, marginTop: 6 },
  applyModalExp: { fontSize: 13, color: T.textMuted, fontFamily: F.bodySemi, marginTop: 6, marginLeft: 12 },
  locTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locTypeText: { fontSize: 12, color: T.yellow, fontFamily: F.bodySemi },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    marginTop: 10,
    maxWidth: '100%',
  },
  locationChipText: {
    fontSize: 12,
    color: T.ink,
    fontFamily: F.bodyBold,
    flexShrink: 1,
  },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: T.line },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerTitle: { fontSize: 11, color: T.textFaint, fontFamily: F.bodySemi },
  statusBannerStatus: { fontSize: 14, fontFamily: F.bodyBold },
  statusBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeLargeText: { fontSize: 11, fontFamily: F.bodyBold },
  interviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.yellowSoft, padding: 14, borderRadius: 14, marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: T.line },
  interviewBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.yellowSoft, justifyContent: 'center', alignItems: 'center' },
  interviewBannerTitle: { fontSize: 12, fontFamily: F.bodyBold, color: T.ink },
  interviewBannerDate: { fontSize: 11, color: T.yellow, fontFamily: F.bodySemi, marginTop: 2 },
  applicationInfoBox: { backgroundColor: T.sand, padding: 12, borderRadius: 12, marginTop: 10, width: '100%', borderWidth: 1, borderColor: T.line },
  applicationInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  applicationInfoText: { fontSize: 12, fontFamily: F.body, color: T.textMuted, flex: 1, lineHeight: 18 },
  detailSection: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  sectionHeading: { fontSize: 14, fontFamily: F.bodyBold, color: T.ink, marginBottom: 10 },
  descriptionText: { fontSize: 13, fontFamily: F.body, color: T.textMuted, lineHeight: 20 },
  tailorBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.yellowSoft, marginTop: 12 },
  tailorBtnText: { fontSize: 13.5, fontFamily: F.bodySemi, color: T.ink },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailItemText: { fontSize: 13, fontFamily: F.body, color: T.textMuted, flex: 1, lineHeight: 18 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.yellowSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: T.line },
  benefitItemText: { fontSize: 11, color: T.textMuted, fontFamily: F.bodySemi },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillBadgeLarge: { backgroundColor: T.sand, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: T.line },
  skillBadgeLargeText: { fontSize: 11, color: T.textMuted, fontFamily: F.bodySemi },
  companyInfoText: { fontSize: 13, color: T.ink, fontFamily: F.bodySemi, marginBottom: 4 },
  companyLink: { fontSize: 12, fontFamily: F.body, color: T.ink, textDecorationLine: 'underline' },
  formSection: { marginTop: 8 },
  formRequiredNote: { fontSize: 11, color: T.danger, fontFamily: F.bodySemi, marginBottom: 12 },
  formLabel: { fontSize: 12, fontFamily: F.bodyBold, color: T.ink, marginBottom: 5, marginTop: 8 },
  formInput: { borderWidth: 1, borderColor: T.line, borderRadius: 12, padding: 12, fontSize: 13, fontFamily: F.body, marginBottom: 4, backgroundColor: T.sand, color: T.ink },
  formInputError: { borderColor: T.danger, backgroundColor: T.dangerBg },
  formTextArea: { height: 100, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
  errorText: { fontSize: 10, color: T.danger, fontFamily: F.bodySemi, marginBottom: 6, marginLeft: 4 },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: T.line, borderStyle: 'dashed', marginBottom: 4, backgroundColor: T.sand },
  resumeBtnError: { borderColor: T.danger, backgroundColor: T.dangerBg },
  resumeBtnText: { fontSize: 13, color: T.textMuted, fontFamily: F.bodyMedium, flex: 1 },
  resumeSize: { fontSize: 10, fontFamily: F.body, color: T.textFaint, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: T.sand, borderRadius: 2, marginBottom: 10, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', backgroundColor: T.yellow, borderRadius: 2 },
  progressText: { position: 'absolute', top: -16, right: 0, fontSize: 10, fontFamily: F.body, color: T.textFaint },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, marginTop: 8 },
  submitBtnGradient: { height: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: T.ink },
  submitBtnText: { color: T.white, fontSize: 14, fontFamily: F.bodyBold },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1, borderColor: T.line, gap: 6 },
  shareBtnText: { fontFamily: F.bodyBold, color: T.ink, fontSize: 13 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: T.paper, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.line },
  cancelBtnText: { fontFamily: F.bodyBold, color: T.textFaint, fontSize: 13 },
  expiredBanner: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.dangerBg,
    borderWidth: 1,
    borderColor: T.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  expiredBannerText: { color: T.danger, fontSize: 10, fontFamily: F.bodyBold },
  optimizeCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.yellowSoft,
    borderWidth: 1,
    borderColor: T.yellow,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  optimizeCardBtnText: { color: T.ink, fontSize: 12, fontFamily: F.bodyBold, marginLeft: 6 },
  matchBadge: { height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: T.yellowSoft, justifyContent: 'center' },
  matchBadgeText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },

  // Segmented control (Career design)
  topTabsWrapper: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: T.paper },
  topTabsContainer: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 24,
    backgroundColor: T.lineSoft,
    alignItems: 'center',
  },
  topTabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
  },
  topTabChipActive: { backgroundColor: T.ink },
  topTabChipTdcActive: { backgroundColor: T.ink },
  topTabChipText: { fontSize: 14, fontFamily: F.bodySemi, color: T.ink },
  topTabChipTextActive: { color: T.white, fontFamily: F.bodyBold },
  topTabChipTdcTextActive: { color: T.white, fontFamily: F.bodyBold },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.yellow,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 28,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  showMoreButtonText: { color: T.ink, fontSize: 14, fontFamily: F.bodyBold, letterSpacing: 0.3 },
});

export default Career;