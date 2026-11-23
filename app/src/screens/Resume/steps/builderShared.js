// app/src/screens/Resume/steps/builderShared.js
// What the resume builder and its step files share: the industry list, the list-item keys and the stylesheet
// (moved unchanged out of ResumeBuilder.js, P3a split-only).
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { color as T, font as F } from '../../../theme/tokens';

const { width, height } = Dimensions.get('window');

export const INDUSTRIES = [
  {
    name: 'Technology',
    roles: [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 
      'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer', 
      'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 
      'Cloud Architect', 'Cybersecurity Analyst', 'QA Engineer', 
      'Database Administrator', 'Systems Administrator', 'IT Support Specialist'
    ]
  },
  {
    name: 'Healthcare & Medicine',
    roles: [
      'Registered Nurse', 'Physician', 'Pharmacist', 'Medical Assistant', 
      'Physical Therapist', 'Dentist', 'Radiologist', 'Surgeon', 
      'Healthcare Administrator', 'Clinical Research Associate', 
      'Occupational Therapist', 'Paramedic', 'Nutritionist / Dietitian'
    ]
  },
  {
    name: 'Business & Finance',
    roles: [
      'Financial Analyst', 'Accountant', 'Investment Banker', 'Business Analyst', 
      'Management Consultant', 'Auditor', 'Financial Planner', 'Risk Analyst', 
      'Operations Manager', 'Supply Chain Manager', 'Procurement Specialist', 'Actuary'
    ]
  },
  {
    name: 'Marketing & Sales',
    roles: [
      'Marketing Manager', 'Digital Marketing Specialist', 'Content Strategist', 
      'SEO / SEM Specialist', 'Social Media Manager', 'Brand Manager', 
      'Sales Manager', 'Account Executive', 'Sales Representative', 
      'Growth Hacker', 'Email Marketing Specialist', 'Product Marketer'
    ]
  },
  {
    name: 'Design & Creative',
    roles: [
      'UX Designer', 'UI Designer', 'Graphic Designer', 'Product Designer', 
      'Motion Designer', 'Illustrator', '3D Artist', 'Art Director', 
      'Creative Director', 'Video Editor', 'Photographer', 'Interior Designer', 'Fashion Designer'
    ]
  },
  {
    name: 'Education',
    roles: [
      'Teacher', 'University Lecturer', 'Academic Researcher', 'School Principal', 
      'Education Consultant', 'Curriculum Developer', 'Instructional Designer', 
      'School Counselor', 'Special Education Teacher', 'ESL / Language Instructor', 'Librarian'
    ]
  },
  {
    name: 'Engineering',
    roles: [
      'Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Chemical Engineer', 
      'Aerospace Engineer', 'Structural Engineer', 'Environmental Engineer', 
      'Biomedical Engineer', 'Industrial Engineer', 'Manufacturing Engineer', 
      'Petroleum Engineer', 'Robotics Engineer'
    ]
  },
  {
    name: 'Law & Legal',
    roles: [
      'Lawyer / Attorney', 'Paralegal', 'Legal Assistant', 'Corporate Counsel', 
      'Compliance Officer', 'Judge', 'Legal Researcher', 'Contract Manager', 'IP Specialist'
    ]
  },
  {
    name: 'Human Resources',
    roles: [
      'HR Manager', 'Recruiter / Talent Acquisition', 'HR Business Partner', 
      'Compensation & Benefits Specialist', 'Training & Development Manager', 
      'HR Generalist', 'People Operations Manager', 'Labour Relations Specialist'
    ]
  },
  {
    name: 'Media & Communication',
    roles: [
      'Journalist', 'Content Writer', 'Copywriter', 'Public Relations Specialist', 
      'Editor', 'Broadcast Producer', 'Podcast Producer', 'Technical Writer', 'Communications Manager'
    ]
  }
];

export const keyOf = (item) => (item?._id ? `id:${item._id}` : `v:${JSON.stringify(item)}`);

export const indexOfKey = (list, key) => (key == null ? -1 : (list || []).findIndex((x) => keyOf(x) === key));

export const styles = StyleSheet.create({
  fieldError: { color: T.danger, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 4 },
  fieldHint: { color: T.textMuted, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  problemBox: { backgroundColor: T.dangerBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  problemTitle: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.danger, marginBottom: 4 },
  problemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  problemText: { flex: 1, fontFamily: F.body, fontSize: 13, color: T.ink },
  problemGo: { minHeight: 44, justifyContent: 'center' },
  problemGoText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textDecorationLine: 'underline' },
  skipLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  skipLinkText: { fontFamily: F.bodySemi, fontSize: 14, color: T.textMuted, textDecorationLine: 'underline' },
  safeArea: {
    flex: 1,
    backgroundColor: T.ink,
  },
  mainHeader: {
    height: 60,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.ink,
  },
  headerBackBtn: {
    padding: 4,
  },
  mainHeaderTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.white,
  },
  previewFloatBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.ink,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.inkLine,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  stepCircleCompleted: {
    backgroundColor: T.success,
    borderColor: T.success,
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: T.inkSoft,
    left: '50%',
    right: '-50%',
    top: 15,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: T.success,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  cardContainer: {
    backgroundColor: T.card,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    shadowColor: T.ink,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.ink,
  },
  cardStepBadge: {
    backgroundColor: T.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardStepBadgeText: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  cardSubtitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginBottom: 20,
  },
  bannerCard: {
    backgroundColor: T.sand,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  bannerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerUploadBtn: {
    backgroundColor: T.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  bannerUploadBtnText: {
    color: T.ink,
    fontSize: 12,
    fontFamily: F.bodyBold,
  },
  bannerSkipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerSkipBtnText: {
    color: T.textMuted,
    fontSize: 12,
    fontFamily: F.bodySemi,
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textMuted,
    textTransform: 'none',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginBottom: 12,
  },
  inputGridRow: {
    flexDirection: 'row',
  },
  yellowButton: {
    backgroundColor: T.yellow,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  yellowButtonText: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodyBold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.textMuted,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiEnhanceMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiEnhanceMiniBtnText: {
    fontSize: 10,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginLeft: 4,
  },
  skillInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skillTextInput: {
    flex: 1,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginRight: 10,
  },
  skillAddBtn: {
    backgroundColor: T.yellow,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: F.bodySemi,
  },
  skillTipText: {
    fontSize: 11, fontFamily: F.body,
    color: T.textFaint,
    textAlign: 'center',
    marginTop: 12,
  },
  certificationHeading: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    paddingBottom: 4,
  },
  emptyCardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: T.sand,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  itemRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.sand,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: T.line,
    marginBottom: 10,
  },
  itemBadgeTitle: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
  },
  itemBadgeSub: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  rolesListContainer: {
    marginTop: 10,
  },
  industryBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    backgroundColor: T.sand,
    overflow: 'hidden',
  },
  industryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  industryHeaderTitle: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  industryRolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: T.line,
    backgroundColor: T.card,
  },
  roleSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.line,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: T.sand,
  },
  roleSelectBtnActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  roleSelectText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
  },
  roleSelectTextActive: {
    color: T.ink,
    fontFamily: F.bodyBold,
  },
  summaryTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inkSoft,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.white,
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  continueButtonText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginRight: 6,
  },
  bottomLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  bottomLabelText: {
    fontSize: 9,
    color: T.textMuted,
    fontFamily: F.bodyMedium,
  },
  bottomLabelTextActive: {
    color: T.yellow,
    fontFamily: F.bodyBold,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: T.ink,
  },
  previewHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: T.ink,
  },
  previewTitle: {
    fontSize: 15,
    fontFamily: F.bodySemi,
    color: T.white,
  },
  previewWebView: {
    flex: 1,
    backgroundColor: T.card,
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmptyText: {
    color: T.textMuted,
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalContent: {
    width: width * 0.85,
    backgroundColor: T.inkSoft,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.inkLine,
  },
  aiModalTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.white,
    marginBottom: 10,
  },
  aiModalStep: {
    fontSize: 14, fontFamily: F.body,
    color: T.textFaint,
    marginBottom: 20,
    textAlign: 'center',
  },
  aiProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: T.inkSoft,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  aiProgressBar: {
    height: '100%',
    backgroundColor: T.yellow,
    borderRadius: 3,
  },
  aiModalPercent: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.yellow,
  },
});
