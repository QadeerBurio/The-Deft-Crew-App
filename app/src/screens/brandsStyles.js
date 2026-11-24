// screens/brandsStyles.js — the brands screen's style sheet and grid sizes, moved unchanged from Brands.js
// (Q-a split-only, plan Q-3f).
import { StyleSheet } from "react-native";
import { color as T, font as F } from "../theme/tokens";

export const NUM_COLUMNS = 2;
export const GRID_SIDE = 16; // side padding
export const GRID_GAP = 12; // between cards, both directions
// ==========================================
// STYLES
// ==========================================
export const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: T.paper },
  fadeContainer: { flex: 1 },

  // Header
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  customHeaderTitle: {
    flex: 1,
    fontFamily: F.heading,
    fontSize: 28,
    letterSpacing: -0.8,
    color: T.ink,
  },

  // Search
  searchRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: T.ink, paddingVertical: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: T.yellow,
    borderWidth: 2,
    borderColor: T.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontFamily: F.bodyBold, fontSize: 10, color: T.ink },

  // Chips row
  categoryGridScroll: { paddingHorizontal: 16, paddingTop: 12, gap: 8, alignItems: "center" },

  // Banners
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: T.yellowSoft,
  },
  guestBannerText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 13, color: T.ink },
  signInLink: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textDecorationLine: "underline" },
  searchIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchIndicatorText: { fontFamily: F.body, fontSize: 13, color: T.textMuted },
  searchIndicatorQuery: { fontFamily: F.bodyBold, color: T.ink },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: T.dangerBg,
  },
  errorText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 13, color: T.danger },
  retryButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: "center",
  },
  retryButtonText: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.ink },

  // List
  loadingContainer: { paddingHorizontal: 16, paddingTop: 16 },
  listHeader: { paddingTop: 16, paddingBottom: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  gridRow: { gap: GRID_GAP },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line,
    padding: 8,
    paddingBottom: 10,
  },
  imageBox: {
    aspectRatio: 4 / 3,
    borderRadius: 18,
    backgroundColor: T.card,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageBoxEmpty: { backgroundColor: T.sand },
  image: { width: "100%", height: "100%" },
  name: { fontFamily: F.headingBold, fontSize: 15, color: T.ink, marginTop: 10, paddingHorizontal: 4 },
  meta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2, paddingHorizontal: 4 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 24,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  offPill: { height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: T.yellow, justifyContent: "center" },
  offPillText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
  modeIcons: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" },

  // Footer
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  footerContainer: { paddingVertical: 20, alignItems: "center" },
  totalBrandsText: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: "center" },
  showingText: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted },

  // Unused StatsBar (kept)
  statsBarContainer: { flexDirection: "row", gap: 16 },
  statsBarSkeleton: { height: 40, flex: 1, borderRadius: 12, backgroundColor: T.sand },
  statItem: { alignItems: "center" },
  statValue: { fontFamily: F.heading, fontSize: 18, color: T.ink },
  statLabel: { fontFamily: F.body, fontSize: 12, color: T.textMuted },

  // Filter sheet
  modalOverlay: { flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" },
  filterModalContainer: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalContentWrapper: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  filterHeader: { fontFamily: F.heading, fontSize: 22, color: T.ink },
  resetText: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted },
  filterLabel: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted, marginBottom: 10 },
  filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  divider: { height: 1, backgroundColor: T.lineSoft, marginVertical: 18 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  toggleTitle: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink },
  toggleSubtitle: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
    padding: 2,
    justifyContent: "center",
  },
  switchTrackOn: { backgroundColor: T.ink, borderColor: T.ink },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.white },
  switchKnobOn: { alignSelf: "flex-end", backgroundColor: T.yellow },
  modalFooter: { paddingTop: 8 },
});
