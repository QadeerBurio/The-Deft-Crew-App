// screens/Events/EventCards.js — the Events list's pieces (loading skeleton, save button, event card, list row,
// registration status, header), moved unchanged from Events.js (Q-a split-only, plan Q-3f).
import React, { useEffect, useRef, useState, memo } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import RemoteImage from "../../ui/RemoteImage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PressScale, SkeletonBlock } from "../../ui";
import { color as T, MAX_FONT_SCALE } from "../../theme/tokens";
import TicketButton from "./TicketButton";
import { priceLabel, seatsLabel, registrationState, formatRs, PAYMENT_LABEL } from "./eventsV2";
import { isImportedEvent, real, eventImage, eventWhen, eventMeta } from "./eventsFormat";
import { styles, EV } from "./eventsStyles";

// ─── Skeleton: one featured card + list cards, same shapes as the real ones
export const SkeletonList = () => (
  <View style={styles.listContent} accessible accessibilityLabel="loading events">
    <View style={[EV.featured, { backgroundColor: T.sand }]}>
      <View style={[EV.media, { backgroundColor: T.lineSoft }]} />
      <View style={EV.featuredBody}>
        <SkeletonBlock width="75%" height={20} />
        <SkeletonBlock width="50%" height={12} style={{ marginTop: 10 }} />
        <SkeletonBlock height={46} radius={23} style={{ marginTop: 16 }} />
      </View>
    </View>
    {[1, 2].map((k) => (
      <View key={k} style={EV.card}>
        <View style={EV.media} />
        <View style={EV.cardBody}>
          <SkeletonBlock width="80%" height={16} />
          <SkeletonBlock width="55%" height={12} style={{ marginTop: 10 }} />
          <SkeletonBlock height={40} radius={20} style={{ marginTop: 14 }} />
        </View>
      </View>
    ))}
  </View>
);
// Save / unsave: bookmark, filled when saved, 44 px, PressScale + light haptic
export const SaveButton = ({ saved, onPress, dark = false }) => (
  <PressScale
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }}
    scaleTo={0.9}
    style={[EV.saveBtn, dark && EV.saveBtnDark, saved && (dark ? EV.saveBtnOnDark : EV.saveBtnOn)]}
    accessibilityRole="button"
    accessibilityState={{ selected: saved }}
    accessibilityLabel={saved ? "remove from saved" : "save event"}
  >
    <Ionicons
      name={saved ? "bookmark" : "bookmark-outline"}
      size={18}
      color={saved ? T.ink : dark ? T.white : T.ink}
    />
  </PressScale>
);
// ─── Event card: featured (top event, dark, design) or list size (white) ──────
// Same parts in both: banner (event image or sand) with the date and prize pills,
// title, place line, tags, register / registered button and the slot on its right.
// onPressIn (Q-3e, flag prefetchDetails): the finger touched the card (the details request starts); absent = as before
export const EventCard = ({ item, onOpen, onPressIn, onRegister, isRegistered, onCancel, featured, side, registration, onProof, onTicket }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imported = isImportedEvent(item);
  // events v2: price, seats, open / closed (not for external events)
  const price = imported ? null : priceLabel(item);
  const seats = imported ? null : seatsLabel(item);
  const closedReason = imported ? "" : registrationState(item).reason;
  const when = eventWhen(item);
  const meta = eventMeta(item);
  const prize = real(item, "prize");
  const type = real(item, "type");
  const img = eventImage(item);
  const showImg = !!img && !imgFailed;

  const action = isRegistered ? (
    <TouchableOpacity
      style={[EV.regBtn, EV.regBtnDone, !featured && EV.regBtnList]}
      onPress={() => onCancel && onCancel(item)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`registered for ${item.title}, tap to cancel`}
    >
      <Ionicons name="checkmark-circle" size={featured ? 17 : 15} color={T.success} />
      <Text style={[EV.regText, !featured && EV.regTextList]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        registered · tap to cancel
      </Text>
    </TouchableOpacity>
  ) : closedReason ? (
    <View
      style={[EV.regBtn, EV.regBtnOff, !featured && EV.regBtnList]}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`${item.title}: ${closedReason}`}
    >
      <Ionicons name="lock-closed-outline" size={featured ? 16 : 14} color={T.textMuted} />
      <Text style={[EV.regText, EV.regTextOff, !featured && EV.regTextList]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {closedReason}
      </Text>
    </View>
  ) : (
    <TouchableOpacity
      style={[EV.regBtn, !featured && EV.regBtnList]}
      onPress={() => onRegister(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={imported ? `open link for ${item.title}` : `register for ${item.title}`}
    >
      {imported && <Ionicons name="open-outline" size={featured ? 16 : 14} color={T.ink} />}
      <Text style={[EV.regText, !featured && EV.regTextList]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {imported ? "open link" : "Save my Spot"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <PressScale
      onPress={() => onOpen(item)}
      onPressIn={onPressIn ? () => onPressIn(item) : undefined}
      scaleTo={0.98}
      style={featured ? EV.featured : EV.card}
      accessibilityLabel={[item.title, when, meta].filter(Boolean).join(", ")}
    >
      {/* poster: whole image (posters carry text), never cropped */}
      <View style={EV.media}>
        {showImg ? (
          <RemoteImage
            source={{ uri: img }}
            style={EV.mediaImg}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
            accessibilityIgnoresInvertColors
            size="card"
          />
        ) : (
          <MaterialCommunityIcons name="calendar-star" size={featured ? 36 : 28} color={T.textFaint} />
        )}
        {!!prize && (
          <View style={[EV.prizePill, EV.pillTopRight]}>
            <Text style={EV.prizePillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>prize pool {prize}</Text>
          </View>
        )}
        {/* bottom-left so it covers the poster's headline as little as possible; wraps, never cut */}
        {!!when && (
          <View style={[EV.datePill, EV.pillBottomLeft]}>
            <Text style={EV.datePillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{when}</Text>
          </View>
        )}
      </View>

      <View style={featured ? EV.featuredBody : EV.cardBody}>
        <Text
          style={featured ? EV.featuredTitle : EV.cardTitle}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {item.title}
        </Text>
        {!!meta && (
          <Text style={featured ? EV.featuredMeta : EV.cardMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {meta}
          </Text>
        )}
        {!!(type || imported || price || seats) && (
          <View style={EV.tagRow}>
            {!!price && (
              <View style={[EV.tag, featured ? EV.tagOnInk : EV.tagPrice]}>
                <Text style={[EV.tagText, featured && { color: T.yellow }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{price}</Text>
              </View>
            )}
            {!!seats && (
              <View style={[EV.tag, featured && EV.tagOnInk, seats === "sold out" && EV.tagSoldOut]}>
                <Text style={[EV.tagText, featured && { color: T.white }, seats === "sold out" && { color: T.danger }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{seats}</Text>
              </View>
            )}
            {!!type && (
              <View style={[EV.tag, featured && EV.tagOnInk]}>
                <Text style={[EV.tagText, featured && { color: T.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {type.toLowerCase()}
                </Text>
              </View>
            )}
            {imported && (
              <View style={[EV.tag, featured ? EV.tagOnInk : EV.tagDark]}>
                <Text style={[EV.tagText, { color: featured ? T.white : T.yellow }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>external</Text>
              </View>
            )}
          </View>
        )}
        <View style={EV.actions}>
          <View style={{ flex: 1 }}>{action}</View>
          {side}
        </View>
        {registration && <RegistrationStatus registration={registration} onProof={onProof} onTicket={onTicket} dark={featured} />}
      </View>
    </PressScale>
  );
};
// One list row, memoised: it re-renders only when its event, its saved / registered state or
// its place in the list changes (the screen passes stable callbacks). Before, an inline
// renderItem built a new `side` element and onProof arrow per row, so every visible card
// re-rendered on every screen render.
export const EventRow = memo(function EventRow({ ev, index, showApplied, saved, registered, onOpen, onPressIn, onRegister, onCancel, onTicket, onSave, onProof }) {
  const featured = index === 0 && !showApplied;
  return (
    <>
      {index === 1 && !showApplied && (
        <Text style={EV.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
          coming up<Text style={{ color: T.yellow }}>.</Text>
        </Text>
      )}
      <EventCard
        item={ev}
        featured={featured}
        onOpen={onOpen}
        onPressIn={onPressIn}
        onRegister={onRegister}
        isRegistered={registered}
        onCancel={onCancel}
        registration={showApplied ? ev.registration : null}
        onProof={(reg) => onProof(reg, ev)}
        onTicket={onTicket}
        side={<SaveButton saved={saved} dark={featured} onPress={() => onSave(ev)} />}
      />
    </>
  );
});
// ─── Mine: tickets + payment status (events v2) ───────────────────────────
// pending / rejected: "send payment proof again"; verified: a clear confirmed state
export const RegistrationStatus = ({ registration, onProof, onTicket }) => {
  const pay = registration?.payment || {};
  const status = pay.status || "not_required";
  const ticket = registration?.ticket;
  // the ticket exists once the payment is verified (or straight away for a free event)
  const seats = Array.isArray(registration?.tickets) ? registration.tickets.length : 0;
  const hasTicket = seats > 0 && (status === "verified" || status === "not_required");
  if (status === "not_required" && !ticket?.tier && !hasTicket) return null;
  const tone = status === "verified" ? EV.statusVerified : status === "rejected" ? EV.statusRejected : EV.statusPending;
  const icon = status === "verified" ? "checkmark-circle" : status === "rejected" ? "close-circle" : "time-outline";
  const iconColor = status === "verified" ? T.success : status === "rejected" ? T.danger : T.ink;
  return (
    <View style={[EV.status, status === "not_required" ? { backgroundColor: T.sand } : tone]}>
      {!!ticket?.tier && (
        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {String(ticket.tier).toLowerCase()} × {ticket.quantity || 1}
          {pay.amount ? ` · ${formatRs(pay.amount)}` : ""}
        </Text>
      )}
      {status !== "not_required" && (
        <View style={EV.statusRow}>
          <Ionicons name={icon} size={16} color={iconColor} />
          <Text style={EV.statusText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {PAYMENT_LABEL[status]}
          </Text>
        </View>
      )}
      <TicketButton registration={registration} onOpen={onTicket} />
      {status === "rejected" && !!pay.rejectReason && (
        <Text style={EV.statusMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          reason: {pay.rejectReason}
        </Text>
      )}
      {(status === "pending" || status === "rejected") && onProof && (
        <TouchableOpacity
          style={EV.statusBtn}
          onPress={() => onProof(registration)}
          accessibilityRole="button"
          accessibilityLabel="send payment proof again"
        >
          <Text style={EV.statusBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            send payment proof again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
// ─── Header (Events design) ───────────────────────────────────────────────
export const ModernHeader = ({ onBack, onMenuPress, showApplied, appliedCount }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[EV.header, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={onBack} style={EV.headerBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="back">
        <Ionicons name="chevron-back" size={22} color={T.ink} />
      </TouchableOpacity>
      <Text style={EV.headerTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {showApplied ? "my events" : "events"}<Text style={{ color: T.yellow }}>.</Text>
      </Text>
      <TouchableOpacity
        onPress={onMenuPress}
        style={[EV.myBtn, showApplied && EV.myBtnOn]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: showApplied }}
        accessibilityLabel={showApplied ? "show all events" : `my events, ${appliedCount} registered or saved`}
      >
        <Ionicons name={showApplied ? "close" : "checkmark-circle-outline"} size={16} color={showApplied ? T.white : T.ink} />
        <Text style={[EV.myBtnText, showApplied && { color: T.white }]}>
          {showApplied ? "all" : "mine"}
        </Text>
        {appliedCount > 0 && !showApplied && (
          <View style={EV.myCount}>
            <Text style={EV.myCountText}>{appliedCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
