// screens/Events/eventsStyles.js — the Events screen's style sheets, moved unchanged from Events.js
// (Q-a split-only, plan Q-3f).
import { Platform, StyleSheet } from "react-native";
import { color as T, font as F } from "../../theme/tokens";
import { COLORS } from "./eventsFormat";

// ─── Styles ─────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },

  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", position: "relative",
  },
  headerBtnActive: {
    backgroundColor: T.successBg, borderWidth: 1, borderColor: COLORS.success,
  },
  headerBadge: {
    position: "absolute", top: -3, right: -3, minWidth: 16, height: 16,
    paddingHorizontal: 3, borderRadius: 8, backgroundColor: COLORS.danger,
    justifyContent: "center", alignItems: "center",
  },
  headerBadgeText: { color: T.white, fontSize: 9, fontFamily: F.bodyBold },
  logoContainer: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  logoBadge: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  headerTitle: {
    fontSize: 16, fontFamily: F.bodyBold, color: COLORS.primary,
    letterSpacing: 0.3, marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 9, color: COLORS.muted, fontFamily: F.bodySemi,
    marginLeft: 8, letterSpacing: 0.5,
  },

  // ─── Category chips (FIXED: uniform width, 2-line label, auto-shrink) ─
  categoryScrollContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryScrollItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 6,
    width: 86,
    minHeight: 68,
    position: "relative",
    overflow: "hidden",
  },
  categoryScrollItemActive: {
    borderColor: "transparent",
  },
  categoryScrollIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryScrollLabel: {
    fontSize: 8.5,
    lineHeight: 10.5,
    fontFamily: F.bodyBold,
    color: COLORS.body,
    textAlign: "center",
    marginTop: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  cityScrollContainer: {
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line,
    backgroundColor: COLORS.page,
  },
  cityScrollHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 6,
  },
  cityScrollHeaderText: {
    fontSize: 10, fontFamily: F.bodyBold, color: COLORS.muted,
    letterSpacing: 0.4, marginLeft: 4, textTransform: 'none',
  },
  cityScrollContent: { paddingHorizontal: 14, paddingVertical: 2 },
  cityChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    backgroundColor: COLORS.card, marginRight: 8,
  },
  cityChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cityChipText: { fontSize: 12, fontFamily: F.bodySemi, color: COLORS.body },
  cityChipTextActive: { color: T.ink, fontFamily: F.bodyBold },

  feedContainer: { flex: 1 },

  skeletonCard: {
    backgroundColor: T.card, borderRadius: 14, overflow: "hidden",
    marginBottom: 12, shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: COLORS.line,
  },
  skeletonImage: { width: "100%", height: 140, backgroundColor: T.sand, overflow: "hidden" },
  shimmerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: T.paper,
  },
  skeletonContent: { padding: 12 },
  skeletonTitle: {
    height: 18, width: "75%", backgroundColor: T.sand,
    borderRadius: 6, marginBottom: 6,
  },
  skeletonText: {
    height: 11, width: "90%", backgroundColor: T.sand,
    borderRadius: 4, marginBottom: 4,
  },
  skeletonTextShort: {
    height: 11, width: "55%", backgroundColor: T.sand,
    borderRadius: 4, marginBottom: 8, marginTop: 4,
  },
  skeletonButton: {
    width: 80, height: 32, backgroundColor: T.sand, borderRadius: 10,
  },
  skeletonFooter: { flexDirection: "row" },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 },
  card: {
    borderRadius: 16, overflow: "hidden", marginBottom: 12,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: T.line,
  },
  cardGradient: { position: "relative", overflow: "hidden" },
  glowEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.accent, borderRadius: 16,
  },
  imageWrapper: { position: "relative", width: "100%", height: 170 },
  cardImage: { width: "100%", height: "100%" },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  categoryBadge: {
    position: "absolute", bottom: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    maxWidth: "65%",
  },
  categoryBadgeText: { fontSize: 9, fontFamily: F.bodyBold, marginLeft: 3, flexShrink: 1 },
  importedPill: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: T.ink,
  },
  importedPillText: {
    fontSize: 9, fontFamily: F.bodyBold, color: T.white, marginLeft: 3,
  },
  registeredBadge: {
    position: "absolute", top: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  registeredBadgeGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4,
  },
  registeredBadgeText: {
    fontSize: 9, fontFamily: F.bodyBold, color: T.white, marginLeft: 2,
  },
  dateBadge: {
    position: "absolute", bottom: 10, right: 10,
    borderRadius: 8, overflow: "hidden",
  },
  dateBadgeGradient: { paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 9, fontFamily: F.bodyBold, color: T.white },
  contentWrapper: { padding: 14 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  orgContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  orgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  locationText: { fontSize: 14, fontFamily: F.bodySemi, color: COLORS.primary },
  title: {
    fontSize: 16, fontFamily: F.bodyBold, color: COLORS.primary,
    marginBottom: 4, lineHeight: 20,
  },
  description: {
    fontSize: 12, fontFamily: F.body, color: COLORS.body, lineHeight: 16, marginBottom: 8,
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  statText: { fontSize: 10, color: COLORS.muted, marginLeft: 3, fontFamily: F.bodyMedium },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  registerActionButton: { borderRadius: 10, overflow: "hidden" },
  registerGradient: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6,
  },
  registerActionText: {
    fontSize: 12, fontFamily: F.bodyBold, color: T.white, marginLeft: 3,
  },
  cancelActionButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: T.dangerBg,
  },
  cancelActionText: {
    fontSize: 12, fontFamily: F.bodyBold, color: T.danger, marginLeft: 3,
  },
  detailsActionButton: { flexDirection: "row", alignItems: "center" },
  detailsActionText: {
    fontSize: 11, color: T.ink, fontFamily: F.bodySemi, marginRight: 2,
  },

  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 40, paddingBottom: 20 },
  emptyIconContainer: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.line,
  },
  emptyTitle: { color: COLORS.primary, fontSize: 18, fontFamily: F.heading },
  emptyText: {
    marginTop: 4, color: COLORS.body, fontSize: 12, fontFamily: F.body,
    lineHeight: 17, textAlign: "center", maxWidth: 240,
  },
  exploreButton: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  exploreGradient: { paddingHorizontal: 20, paddingVertical: 8 },
  exploreButtonText: { color: T.white, fontSize: 13, fontFamily: F.bodyBold },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: T.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: "column",
  },
  sheetHeader: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexShrink: 0,
  },
  sheetGrabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.handle, alignSelf: "center", marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 14,
  },
  sheetHeaderBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center",
  },
  sheetHeaderTitle: {
    flex: 1, textAlign: "center", fontSize: 15,
    fontFamily: F.bodyBold, color: COLORS.primary, marginHorizontal: 8,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    paddingBottom: 24, // the footer is outside the ScrollView
  },
  sheetImageWrapper: {
    position: "relative", width: "100%", height: 200,
  },
  sheetBanner: { width: "100%", height: "100%" },
  sheetBannerOverlay: { ...StyleSheet.absoluteFillObject },
  sheetRegisteredBadge: {
    position: "absolute", bottom: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.card,
  },
  sheetRegisteredText: {
    color: COLORS.success, fontSize: 11, fontFamily: F.bodyBold, marginLeft: 3,
  },
  sheetBody: { padding: 16, paddingBottom: 8 },

  sheetStickyFooter: {
    borderTopWidth: 1, borderTopColor: COLORS.line,
    backgroundColor: T.card, paddingTop: 10,
    flexShrink: 0,
  },
  sheetStickyContent: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
  },

  detailTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  detailTag: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    maxWidth: "70%",
  },
  detailTagText: { fontSize: 11, fontFamily: F.bodyBold, marginLeft: 3, flexShrink: 1 },
  detailTitle: {
    color: COLORS.primary, fontSize: 20, fontFamily: F.heading,
    lineHeight: 26, marginBottom: 8,
  },
  detailOrgRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  detailAvatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  detailOrgLocationLarge: {
    fontSize: 14, fontFamily: F.bodyBold, color: COLORS.primary,
  },
  specRow: { flexDirection: "row", marginBottom: 12 },
  specCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: "center", marginRight: 6,
  },
  specCardLast: { marginRight: 0 },
  specIcon: { marginBottom: 4 },
  specTitle: {
    color: COLORS.muted, fontSize: 10, fontFamily: F.bodyBold, marginBottom: 2,
  },
  specText: {
    color: COLORS.primary, fontSize: 12, fontFamily: F.bodyBold, textAlign: "center",
  },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.line,
  },
  sectionCardTitle: {
    color: COLORS.primary, fontSize: 13, fontFamily: F.bodyBold, marginBottom: 4,
  },
  sectionCardBody: {
    color: COLORS.body, fontSize: 12, fontFamily: F.body, lineHeight: 18,
  },
  stickyLabel: { color: COLORS.danger, fontSize: 9, fontFamily: F.bodyBold, marginBottom: 0 },
  stickyValue: { color: COLORS.primary, fontSize: 13, fontFamily: F.bodyBold },
  stickyButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
  },
  stickyButtonText: {
    color: T.white, fontSize: 12, fontFamily: F.bodyBold, marginRight: 3,
  },

  modalScreen: { flex: 1, backgroundColor: COLORS.page },
  modalContainer: { flex: 1 },
  keyboardAvoidView: { flex: 1 },
  modalHero: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  modalHeroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  modalHeroTitleRow: { flexDirection: "row", alignItems: "center" },
  modalHeroTitle: {
    color: T.white, fontSize: 18, fontFamily: F.heading, marginLeft: 6,
  },
  modalClose: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    backgroundColor: T.inkSoft,
  },
  modalHeroSubtitle: {
    marginTop: 4, color: T.onInkMuted,
    fontSize: 12, fontFamily: F.bodySemi,
  },
  formScrollView: { flex: 1, paddingHorizontal: 14 },
  formScrollContent: { paddingTop: 10 },
  inputGroup: { marginBottom: 0 },
  inputLabel: {
    color: COLORS.primary, fontSize: 11, fontFamily: F.bodyBold, marginBottom: 3,
  },
  textInput: {
    backgroundColor: T.card, borderWidth: 1.5, borderColor: COLORS.line,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10,
    marginBottom: 10, color: COLORS.primary, fontSize: 12, fontFamily: F.body,
  },
  row: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 4 },
  colRight: { flex: 1, marginLeft: 4 },
  multiLineInput: { minHeight: 80, textAlignVertical: "top" },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 6,
    backgroundColor: T.card,
    overflow: "hidden",
    maxWidth: 220,
  },
  optionPillActive: { borderWidth: 1.5 },
  optionPillText: {
    fontSize: 12,
    fontFamily: F.bodySemi,
    color: COLORS.body,
    flexShrink: 1,
  },
  optionPillTextActive: { color: T.white },
  uploadCard: {
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1.5, borderColor: COLORS.line, borderStyle: "dashed",
    backgroundColor: T.card, minHeight: 110,
    justifyContent: "center", alignItems: "center",
  },
  uploadPlaceholder: { alignItems: "center", paddingVertical: 20 },
  uploadIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  uploadTitle: { fontSize: 13, fontFamily: F.bodyBold, color: COLORS.primary },
  uploadSubtitle: { fontSize: 11, fontFamily: F.body, color: COLORS.muted, marginTop: 2 },
  uploadPreview: { width: "100%", height: 160, resizeMode: "cover" },
  primaryFormButton: {
    borderRadius: 12, overflow: "hidden",
    shadowColor: T.ink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginTop: 14,
  },
  primaryFormGradient: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  primaryFormText: {
    color: T.white, fontSize: 14, fontFamily: F.bodyBold, marginRight: 4,
  },
  formBottomSpacer: { height: Platform.OS === "ios" ? 30 : 20 },
});
// ─── Events design layout ───────────────────────────────────────────
export const EV = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, backgroundColor: T.paper },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: F.heading, fontSize: 24, color: T.ink },
  myBtn: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: T.yellow, flexDirection: "row", alignItems: "center", gap: 6 },
  myBtnOn: { backgroundColor: T.ink },
  myBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  myCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" },
  myCountText: { fontFamily: F.bodyBold, fontSize: 11, color: T.yellow },

  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, justifyContent: "center", maxWidth: 200 },
  chipOn: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  chipTextOn: { color: T.white, fontFamily: F.bodyBold },
  cityChip: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.sand, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: T.sand },
  cityChipOn: { backgroundColor: T.card, borderColor: T.ink },
  cityChipText: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink },

  h2: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginTop: 6, marginBottom: 10, paddingHorizontal: 2 },

  // featured (top event): dark card from the Events design
  featured: { borderRadius: 28, backgroundColor: T.ink, overflow: "hidden", marginBottom: 12 },
  featuredBody: { padding: 16, paddingTop: 14 },
  featuredTitle: { fontFamily: F.heading, fontSize: 22, lineHeight: 27, color: T.white },
  featuredMeta: { fontFamily: F.body, fontSize: 13.5, lineHeight: 18, color: T.onInkMuted, marginTop: 4 },

  // list size: same parts, white with a 1 px line border
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: "hidden", marginBottom: 12 },
  cardBody: { padding: 14, paddingTop: 12 },
  cardTitle: { fontFamily: F.headingBold, fontSize: 17, lineHeight: 22, color: T.ink },
  cardMeta: { fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: T.textMuted, marginTop: 4 },

  // poster area (both sizes): fixed 16:9, sand, radius 18, whole image (contain)
  media: { aspectRatio: 16 / 9, margin: 8, marginBottom: 0, borderRadius: 18, backgroundColor: T.sand, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  mediaImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },

  // pills wrap instead of cutting the value; small so the poster stays readable
  datePill: { minHeight: 24, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: T.yellow, justifyContent: "center", maxWidth: "62%" },
  datePillText: { fontFamily: F.bodyBold, fontSize: 11.5, lineHeight: 15, color: T.ink },
  prizePill: { minHeight: 24, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: T.card, justifyContent: "center", maxWidth: "45%" },
  prizePillText: { fontFamily: F.bodyBold, fontSize: 11.5, lineHeight: 15, color: T.ink },
  pillBottomLeft: { position: "absolute", left: 8, bottom: 8 },
  pillTopRight: { position: "absolute", right: 8, top: 8 },

  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  regBtn: { height: 46, borderRadius: 23, backgroundColor: T.yellow, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16 },
  regBtnDone: { backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  regBtnList: { height: 44, borderRadius: 22, paddingHorizontal: 12 },
  regText: { fontFamily: F.bodyBold, fontSize: 14.5, color: T.ink },
  regTextList: { fontSize: 13.5, flexShrink: 1 },
  regBtnOff: { backgroundColor: T.sand },
  regTextOff: { color: T.textMuted },
  tagPrice: { backgroundColor: T.yellowSoft },
  tagSoldOut: { backgroundColor: T.dangerBg },
  status: { marginTop: 12, borderRadius: 14, padding: 12, gap: 6 },
  statusPending: { backgroundColor: T.yellowSoft },
  statusVerified: { backgroundColor: T.successBg },
  statusRejected: { backgroundColor: T.dangerBg },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, flexShrink: 1 },
  statusMeta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted },
  statusBtn: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: T.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 4, alignSelf: "flex-start" },
  statusBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  infoPill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: "center", backgroundColor: T.sand },
  infoPillText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.lineSoft },
  detailLabel: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.textMuted, flexShrink: 0, maxWidth: "45%" },
  detailValue: { fontFamily: F.body, fontSize: 14, color: T.ink, flex: 1, textAlign: "right" },

  // tags (always reserve the row so cards keep the same height)
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { minHeight: 22, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 11, backgroundColor: T.sand, justifyContent: "center" },
  tagOnInk: { backgroundColor: T.inkSoft },
  tagDark: { backgroundColor: T.ink },

  // save (bookmark): 44 px circle; light on white cards, outlined on the dark card
  saveBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, alignItems: "center", justifyContent: "center" },
  saveBtnDark: { backgroundColor: "transparent", borderColor: T.inkLine },
  saveBtnOn: { backgroundColor: T.yellow, borderColor: T.yellow },
  saveBtnOnDark: { backgroundColor: T.yellow, borderColor: T.yellow },
  sectionEmpty: { paddingVertical: 16 },
  tagText: { fontFamily: F.bodyBold, fontSize: 11, color: T.ink },
});
