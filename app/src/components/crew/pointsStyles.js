// app/src/components/crew/pointsStyles.js
// The crew screen's stylesheet (moved unchanged out of components/Points.js).
import { StyleSheet } from 'react-native';
import { color as T, font as F } from "../../theme/tokens";

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.card,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: F.heading,
    color: T.ink,
    letterSpacing: -0.6,
  },
  scrollContent: { paddingBottom: 40 },

  // Hero
  heroCard: {
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  heroGradient: { padding: 24, position: 'relative', overflow: 'hidden' },
  heroOrb1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: T.yellowSoft, top: -90, right: -70,
  },
  heroOrb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: T.yellowSoft, bottom: -50, left: -50,
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  heroLabel: {
    color: T.onInkMuted, fontSize: 11,
    fontFamily: F.bodyBold, letterSpacing: 1.6,
  },
  levelBadge: {
    backgroundColor: T.yellow, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  levelBadgeText: { color: T.ink, fontSize: 11, fontFamily: F.bodyBold, letterSpacing: 0.6 },
  heroBalance: { color: T.white, fontSize: 44, fontFamily: F.heading, letterSpacing: -1.4, marginTop: 2 },
  heroSub: { color: T.onInkMuted, fontSize: 12, fontFamily: F.bodySemi, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 12 },
  progressTextWrap: { flex: 1 },
  progressTitle: { color: T.white, fontSize: 14, fontFamily: F.bodyBold, marginBottom: 4 },
  progressSub: { color: T.onInkMuted, fontSize: 11, fontFamily: F.bodyMedium, lineHeight: 16 },

  // Members
  membersCard: {
    marginHorizontal: 16, marginTop: 4, padding: 16,
    backgroundColor: T.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: T.line,
  },
  membersTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12,
  },
  membersLabel: { fontSize: 10, color: T.textFaint, fontFamily: F.bodyBold, letterSpacing: 1.4, marginBottom: 4 },
  membersCount: { fontSize: 26, fontFamily: F.heading, color: T.ink, letterSpacing: -0.5 },
  membersCountSub: { fontSize: 14, fontFamily: F.bodyBold, color: T.textFaint },
  membersSub: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyMedium, marginTop: 6 },
  inviteBtn: { borderRadius: 12, overflow: 'hidden' },
  inviteGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 5,
  },
  inviteText: { color: T.ink, fontSize: 12, fontFamily: F.bodyBold },
  avatarStackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: T.white,
  },
  avatarExtras: { backgroundColor: T.ink },
  avatarExtrasText: { color: T.yellow, fontSize: 11, fontFamily: F.bodyBold },
  avatarStackLabel: { marginLeft: 12, fontSize: 12, color: T.textMuted, fontFamily: F.bodySemi },
  emptyMembersBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: T.sand, borderRadius: 12, marginTop: 12,
  },
  emptyMembersText: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyMedium, flex: 1 },

  // Members status pills (NEW)
  membersStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  membersStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.sand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  membersStatusText: {
    fontSize: 10,
    fontFamily: F.bodyBold,
    color: T.ink,
  },

  // Code
  codeCard: {
    marginHorizontal: 16, marginTop: 12, padding: 18,
    backgroundColor: T.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: T.line,
  },
  codeLabel: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyBold, letterSpacing: 1.4, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 26, fontFamily: F.heading, color: T.yellow, letterSpacing: 2 },
  copyBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.yellowSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.line,
  },
  codeHint: { fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium, marginTop: 10, lineHeight: 17 },
  shareBtn: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  shareGradient: {
    flexDirection: 'row', paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 14 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 20, fontFamily: F.heading, color: T.ink, letterSpacing: -0.5 },
  sectionSub: {
    fontSize: 12, color: T.textFaint, fontFamily: F.bodyMedium,
    marginTop: 2, marginBottom: 12,
  },

  // Earn list
  earnList: {
    backgroundColor: T.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: T.line, padding: 6,
  },
  earnRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: T.line, gap: 12,
  },
  earnLabel: { flex: 1, fontSize: 13, fontFamily: F.bodySemi, color: T.ink },
  earnValue: { fontSize: 13, fontFamily: F.bodyBold, color: T.success },

  // Level card
  levelCard: {
    flexDirection: 'row', backgroundColor: T.card,
    borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 2, borderColor: T.line,
    alignItems: 'flex-start', position: 'relative', overflow: 'hidden',
  },
  levelCardUnlocked: { borderColor: T.ink },
  levelCardCurrent: { borderColor: T.yellow, backgroundColor: T.yellowSoft },
  levelCardNext: { borderColor: T.ink, borderStyle: 'dashed' },
  levelShimmer: {
    position: 'absolute', top: 0, left: 0,
    width: 120, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  levelIconContainer: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  levelContent: { flex: 1 },
  levelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
  },
  levelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, flexWrap: 'wrap' },
  levelNumPill: { backgroundColor: T.ink, paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center' },
  levelNumPillCurrent: { backgroundColor: T.yellow },
  levelNumPillLocked: { backgroundColor: T.sand },
  levelNumText: { color: T.white, fontSize: 11, fontFamily: F.bodyBold },
  levelNumTextCurrent: { color: T.ink },
  levelNumTextLocked: { color: T.textMuted },
  levelName: { fontSize: 14, fontFamily: F.bodyBold, color: T.ink },
  unlockedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.sand, paddingHorizontal: 9,
    height: 24, borderRadius: 12, gap: 4,
  },
  currentBadge: { backgroundColor: T.yellow },
  unlockedText: { color: T.ink, fontSize: 11, fontFamily: F.bodyBold },
  nextBadge: {
    backgroundColor: T.sand, paddingHorizontal: 9,
    paddingVertical: 3, borderRadius: 12,
  },
  nextText: { color: T.textMuted, fontSize: 11, fontFamily: F.bodyBold },
  levelReward: {
    fontSize: 12, color: T.textMuted, fontFamily: F.bodyMedium,
    marginTop: 4, lineHeight: 16,
  },

  condRow: { marginTop: 10, gap: 6 },
  condItem: {},
  condTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  condLabel: {
    fontSize: 10, fontFamily: F.bodyBold, color: T.textMuted,
    letterSpacing: 0.4, textTransform: 'lowercase',
  },
  condLabelLocked: { color: T.textFaint },
  condValue: { fontSize: 10, fontFamily: F.bodyBold, color: T.ink },
  condValueLocked: { color: T.textFaint },
  condTrack: {
    height: 4, backgroundColor: T.sand,
    borderRadius: 2, overflow: 'hidden',
  },
  condFill: { height: '100%', borderRadius: 2 },

  perksRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  perkItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.sand, paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8, gap: 4,
  },
  perkText: { fontSize: 10, color: T.textFaint, fontFamily: F.bodySemi },
  perkTextActive: { color: T.ink },

  // Apply banner
  applyBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, padding: 16,
    borderRadius: 18, backgroundColor: T.ink, gap: 12,
  },
  applyBannerTitle: { color: T.yellow, fontSize: 13, fontFamily: F.bodyBold, letterSpacing: 0.3 },
  applyBannerSub: {
    color: T.onInkMuted, fontSize: 11,
    marginTop: 2, fontFamily: F.bodyMedium,
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.yellow, paddingHorizontal: 14,
    paddingVertical: 9, borderRadius: 10, gap: 4,
  },
  applyBtnText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 12 },

  // Ambassador (pairs with the download card below it)
  ambassadorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  ambassadorApplied: { backgroundColor: T.sand, borderColor: T.sand },
  ambassadorIcon: { backgroundColor: T.ink },
  ambassadorIconApplied: { backgroundColor: T.card },
  ambassadorSub: { fontSize: 12, color: T.textFaint, fontFamily: F.bodyMedium, marginTop: 2 },
  downloadAfterAmbassador: { marginTop: 12 },

  // Download
  downloadCard: {
    marginHorizontal: 16, marginTop: 22, padding: 18,
    backgroundColor: T.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: T.line,
  },
  downloadTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink, letterSpacing: -0.4 },
  downloadSub: {
    fontSize: 12, color: T.textFaint, fontFamily: F.bodyMedium,
    marginTop: 2, marginBottom: 14,
  },
  storesRow: { flexDirection: 'row', gap: 10 },
  storeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.ink, paddingVertical: 12,
    paddingHorizontal: 12, borderRadius: 14, gap: 10,
  },
  storeIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: T.inkSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  storeTextCol: { flex: 1 },
  storeSmall: {
    color: T.onInkMuted, fontSize: 11,
    fontFamily: F.bodyBold, letterSpacing: 0.5, textTransform: 'none',
  },
  storeBig: { color: T.white, fontSize: 13, fontFamily: F.bodyBold, marginTop: 1 },

  footerNote: {
    textAlign: 'center', color: T.textFaint,
    fontSize: 11, marginTop: 22,
    paddingHorizontal: 24, fontFamily: F.bodyMedium,
  },
});
