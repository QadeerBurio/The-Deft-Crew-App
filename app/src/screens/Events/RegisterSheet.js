// app/src/screens/Events/RegisterSheet.js
// Event registration (events v2): the event's own form → payment (paid events) → done.
// Also exports ProofSheet: "send payment proof again" for a pending / rejected payment.
//
// Full-screen Modal with its OWN SafeAreaProvider: insets are measured inside the modal,
// so the title never sits under the status bar (Android, notch, large fonts).
import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { Button, Input, Chip } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { plainError } from "../../utils/plainError";
import { copyToClipboard } from "../../utils/clipboard";
import { pickImageFromLibrary, uploadImageToCloudinary } from "../../utils/cloudinaryUpload";
import {
  API_BASE,
  formFields,
  prefillFromUser,
  validateRegistration,
  validatePayment,
  buildRegisterBody,
  totalFor,
  maxTickets,
  findTier,
  formatRs,
  isLegacyRegistration,
  normTxn,
  METHOD_LABEL,
  fetchEvent,
  registrationState,
} from "./eventsV2";

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const KEYBOARD = { email: "email-address", phone: "phone-pad", number: "number-pad", url: "url" };
const toDate = (v, mode) => {
  if (mode === "time" && /^\d{2}:\d{2}$/.test(String(v || ""))) {
    const d = new Date();
    d.setHours(Number(v.slice(0, 2)), Number(v.slice(3, 5)), 0, 0);
    return d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// heading with the yellow dot
const H = ({ children, style }) => (
  <Text style={[s.h, style]} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
    {children}
    <Text style={{ color: T.yellow }}>.</Text>
  </Text>
);

const Label = ({ field }) => (
  <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>
    {String(field.label || field.key).toLowerCase()}
    {!field.required && <Text style={s.optional}> (optional)</Text>}
  </Text>
);
const Err = ({ text }) => (text ? <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{text}</Text> : null);

// ── one field ─────────────────────────────────────────────────
function FieldInput({ field, value, onChange, error }) {
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const lbl = String(field.label || field.key).toLowerCase();

  if (field.type === "select" || field.type === "multiselect") {
    const multi = field.type === "multiselect";
    const sel = multi ? (Array.isArray(value) ? value : []) : value;
    return (
      <View style={s.field}>
        <Label field={field} />
        <View style={s.chips}>
          {(field.options || []).map((o) => {
            const on = multi ? sel.includes(o) : sel === o;
            return (
              <Chip
                key={o}
                label={String(o)}
                selected={on}
                onPress={() => onChange(multi ? (on ? sel.filter((x) => x !== o) : [...sel, o]) : on && !field.required ? "" : o)}
              />
            );
          })}
        </View>
        <Err text={error} />
      </View>
    );
  }

  if (field.type === "date" || field.type === "time") {
    const mode = field.type;
    return (
      <View style={s.field}>
        <Label field={field} />
        <Pressable
          style={[s.pickBox, error && s.pickBoxErr]}
          onPress={() => setPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`${lbl}: ${value || "not set"}`}
        >
          <Text style={[s.pickText, !value && { color: T.textFaint }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {value || (mode === "date" ? "pick a date" : "pick a time")}
          </Text>
          <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={18} color={T.ink} />
        </Pressable>
        {picker && (
          <DateTimePicker
            value={toDate(value, mode)}
            mode={mode}
            is24Hour
            onChange={(e, d) => {
              setPicker(Platform.OS === "ios");
              if (e.type === "set" && d) onChange(mode === "date" ? ymd(d) : hm(d));
            }}
          />
        )}
        <Err text={error} />
      </View>
    );
  }

  if (field.type === "file") {
    return (
      <View style={s.field}>
        <Label field={field} />
        <Button
          variant="secondary"
          size="small"
          full={false}
          loading={uploading}
          title={value ? "attached · replace" : "attach a file"}
          onPress={async () => {
            const uri = await pickImageFromLibrary({ aspect: [3, 4] });
            if (!uri) return;
            setUploading(true);
            try {
              onChange(await uploadImageToCloudinary(uri));
            } catch (e) {
              Alert.alert("upload failed", e.message);
            } finally {
              setUploading(false);
            }
          }}
        />
        <Err text={error} />
      </View>
    );
  }

  const multiline = field.type === "textarea" || field.type === "list";
  return (
    <Input
      style={s.field}
      label={`${lbl}${field.required ? "" : " (optional)"}`}
      value={Array.isArray(value) ? value.join("\n") : value || ""}
      onChangeText={(t) => onChange(field.type === "number" ? t.replace(/[^\d]/g, "") : t)}
      placeholder={field.type === "list" ? "one per line" : field.helpText || (field.type === "phone" ? "03XXXXXXXXX" : "")}
      keyboardType={KEYBOARD[field.type] || "default"}
      autoCapitalize={["email", "url"].includes(field.type) ? "none" : "sentences"}
      autoCorrect={!["email", "url", "phone"].includes(field.type)}
      multiline={multiline}
      error={error}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
    />
  );
}

// ── ticket tier + quantity ────────────────────────────────────
function TicketPicker({ event, ticket, setTicket, errors }) {
  const tiers = event.ticketTiers || [];
  const tier = findTier(event, ticket.tier);
  const max = maxTickets(event, tier);
  const total = totalFor(event, ticket);
  return (
    <View style={s.field}>
      <H style={s.sectionH}>tickets</H>
      {tiers.map((t) => {
        const left = maxTickets(event, t);
        const on = tier && tier.name === t.name;
        const soldOut = left < 1;
        return (
          <Pressable
            key={t.name}
            style={[s.tier, on && s.tierOn, soldOut && s.tierOff]}
            disabled={soldOut}
            onPress={() => setTicket({ tier: t.name, quantity: Math.min(Math.max(1, ticket.quantity || 1), left) })}
            accessibilityRole="radio"
            accessibilityState={{ selected: !!on, disabled: soldOut }}
            accessibilityLabel={`${t.name}, ${t.price ? formatRs(t.price) : "free"}${soldOut ? ", sold out" : ""}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.tierName} maxFontSizeMultiplier={MAX_FONT_SCALE}>{String(t.name).toLowerCase()}</Text>
              <Text style={s.tierMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {soldOut ? "sold out" : t.remaining != null ? `${t.remaining} left` : ""}
              </Text>
            </View>
            <Text style={s.tierPrice} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t.price ? formatRs(t.price) : "free"}</Text>
            <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={soldOut ? T.textFaint : T.ink} />
          </Pressable>
        );
      })}
      <Err text={errors.ticketTier} />
      {tier && max >= 1 && (
        <View style={s.stepRow}>
          <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>how many</Text>
          <View style={s.stepper}>
            <TouchableOpacity
              style={s.stepBtn}
              disabled={(ticket.quantity || 1) <= 1}
              onPress={() => setTicket({ ...ticket, quantity: Math.max(1, (ticket.quantity || 1) - 1) })}
              accessibilityRole="button"
              accessibilityLabel="one less ticket"
            >
              <Ionicons name="remove" size={20} color={(ticket.quantity || 1) <= 1 ? T.textFaint : T.ink} />
            </TouchableOpacity>
            <Text style={s.stepVal} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite">
              {ticket.quantity || 1}
            </Text>
            <TouchableOpacity
              style={s.stepBtn}
              disabled={(ticket.quantity || 1) >= max}
              onPress={() => setTicket({ ...ticket, quantity: Math.min(max, (ticket.quantity || 1) + 1) })}
              accessibilityRole="button"
              accessibilityLabel="one more ticket"
            >
              <Ionicons name="add" size={20} color={(ticket.quantity || 1) >= max ? T.textFaint : T.ink} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Err text={errors.quantity} />
      <View style={s.totalRow}>
        <Text style={s.totalLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>total</Text>
        <Text style={s.totalValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{total ? formatRs(total) : "free"}</Text>
      </View>
    </View>
  );
}

// ── payment: accounts, transaction id, screenshot ─────────────
// info: GET /:id/payment-info. Used by registration and by "send payment proof again".
function PaymentStep({ total, info, infoState, onRetry, pay, setPay, errors }) {
  if (infoState === "loading") {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.ink} />
        <Text style={s.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>loading payment details…</Text>
      </View>
    );
  }
  if (infoState === "error" || !info) {
    return (
      <View style={s.card}>
        <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {"payment details didn't load, so you can't submit yet. check your connection and try again."}
        </Text>
        <Button title="try again" variant="secondary" size="small" full={false} onPress={onRetry} style={{ marginTop: 12 }} />
      </View>
    );
  }
  const accounts = info.paymentAccounts || [];
  return (
    <View>
      <View style={s.totalCard}>
        <Text style={s.totalLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>pay</Text>
        <Text style={s.totalBig} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatRs(total)}</Text>
      </View>
      <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        pay the total to one of these accounts in your own banking or wallet app, then enter the transaction id and attach the screenshot.
      </Text>
      {!accounts.length && (
        <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{"this event has no payment account yet. you can't pay right now."}</Text>
      )}
      {accounts.map((a, i) => {
        const on = pay.method === a.method;
        const number = a.method === "bank" ? a.iban || a.accountNumber : a.accountNumber;
        return (
          <Pressable
            key={`${a.method}-${i}`}
            style={[s.account, on && s.accountOn]}
            onPress={() => setPay({ ...pay, method: a.method })}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${METHOD_LABEL[a.method] || a.method}, ${a.accountTitle || ""}, ${number || ""}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.accountMethod} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {METHOD_LABEL[a.method] || a.method}
                {a.method === "bank" && a.bankName ? ` · ${a.bankName}` : ""}
              </Text>
              {!!a.accountTitle && <Text style={s.accountTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{a.accountTitle}</Text>}
              {!!number && <Text style={s.accountNumber} selectable maxFontSizeMultiplier={MAX_FONT_SCALE}>{number}</Text>}
              {a.method === "bank" && a.iban && a.accountNumber ? (
                <Text style={s.tierMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>account {a.accountNumber}</Text>
              ) : null}
              {!!a.note && <Text style={s.tierMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{a.note}</Text>}
            </View>
            {!!number && (
              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => copyToClipboard(number, { title: "copied", message: `${METHOD_LABEL[a.method] || "account"} number copied.` })}
                accessibilityRole="button"
                accessibilityLabel={`copy ${METHOD_LABEL[a.method] || ""} number`}
              >
                <Ionicons name="copy-outline" size={18} color={T.ink} />
              </TouchableOpacity>
            )}
            <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={T.ink} />
          </Pressable>
        );
      })}
      <Err text={errors.method} />
      <Input
        style={s.field}
        label="transaction id"
        value={pay.transactionId || ""}
        onChangeText={(t) => setPay({ ...pay, transactionId: t })}
        placeholder="from your payment receipt"
        autoCapitalize="characters"
        autoCorrect={false}
        error={errors.transactionId}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      />
      <View style={s.field}>
        <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>payment screenshot</Text>
        {pay.receiptUri ? (
          <View style={s.receiptRow}>
            <Image source={{ uri: pay.receiptUri }} style={s.receipt} accessibilityIgnoresInvertColors />
            <Button
              title="change"
              variant="secondary"
              size="small"
              full={false}
              onPress={async () => {
                const uri = await pickImageFromLibrary({ aspect: [3, 4] });
                if (uri) setPay({ ...pay, receiptUri: uri, receiptUrl: undefined });
              }}
            />
          </View>
        ) : (
          <Button
            title="attach screenshot"
            variant="secondary"
            icon={<Ionicons name="image-outline" size={18} color={T.ink} />}
            onPress={async () => {
              const uri = await pickImageFromLibrary({ aspect: [3, 4] });
              if (uri) setPay({ ...pay, receiptUri: uri, receiptUrl: undefined });
            }}
          />
        )}
        <Err text={errors.receipt} />
      </View>
    </View>
  );
}

// Fetched fresh every time the payment step opens (`opens` changes), never reused.
function usePaymentInfo(eventId, token, needed, opens = 0) {
  const [info, setInfo] = useState(null);
  const [state, setState] = useState(needed ? "loading" : "idle");
  const load = async () => {
    setState("loading");
    setInfo(null);
    try {
      const r = await axios.get(`${API_BASE}/${eventId}/payment-info`, {
        ...auth(token),
        params: { _: Date.now() },
        headers: { ...auth(token).headers, "Cache-Control": "no-cache" },
      });
      setInfo(r.data);
      setState("ready");
    } catch {
      setState("error");
    }
  };
  useEffect(() => {
    if (needed && eventId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needed, eventId, opens]);
  return { info, state, load };
}

// The latest copy of the event (GET /api/events/:id) before building the form.
// status: loading → fresh, or offline (the list's copy is used, with a note).
function useFreshEvent(listEvent) {
  const [state, setState] = useState({ event: listEvent, status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ event: listEvent, status: "loading" });
    fetchEvent(listEvent?._id)
      .then((ev) => alive && setState({ event: ev, status: "fresh" }))
      .catch(() => alive && setState({ event: listEvent, status: "offline" }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listEvent?._id]);
  return state;
}

// upload the screenshot once; returns the https url
async function ensureReceiptUrl(pay, setPay) {
  if (pay.receiptUrl) return pay.receiptUrl;
  const url = await uploadImageToCloudinary(pay.receiptUri);
  setPay((p) => ({ ...p, receiptUrl: url }));
  return url;
}

// ── shared frame: modal + own safe area + keyboard-aware scroll ──
function Frame({ visible, onClose, title, subtitle, onBack, children, footer }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack || onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <FrameBody title={title} subtitle={subtitle} onClose={onClose} onBack={onBack} footer={footer}>
          {children}
        </FrameBody>
      </SafeAreaProvider>
    </Modal>
  );
}
function FrameBody({ title, subtitle, onClose, onBack, children, footer }) {
  const insets = useSafeAreaInsets(); // measured inside the modal
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={onBack || onClose}
          accessibilityRole="button"
          accessibilityLabel={onBack ? "back" : "close registration"}
        >
          <Ionicons name={onBack ? "arrow-back" : "close"} size={22} color={T.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <H style={s.title}>{title}</H>
          {!!subtitle && (
            <Text style={s.subtitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {children}
        {footer}
      </KeyboardAwareScrollView>
    </View>
  );
}

// ── registration ──────────────────────────────────────────────
export default function RegisterSheet({ event: listEvent, token, user, onClose, onRegistered, onAlreadyRegistered }) {
  const { event, status } = useFreshEvent(listEvent);
  if (!listEvent) return null;
  if (status === "loading") {
    return (
      <Frame visible title="register" subtitle={listEvent.title} onClose={onClose}>
        <View style={s.center}>
          <ActivityIndicator color={T.ink} />
          <Text style={s.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>loading the latest form…</Text>
        </View>
      </Frame>
    );
  }
  const state = registrationState(event);
  if (!state.open) {
    return (
      <Frame visible title="register" subtitle={event.title} onClose={onClose}
        footer={<Button title="close" variant="secondary" onPress={onClose} style={{ marginTop: 20 }} />}>
        <View style={s.card}>
          <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {state.reason === "sold out" ? "this event is full now." : "registration for this event has closed."}
          </Text>
        </View>
      </Frame>
    );
  }
  return (
    <RegisterForm
      key={status}
      event={event}
      offline={status === "offline"}
      token={token}
      user={user}
      onClose={onClose}
      onRegistered={onRegistered}
      onAlreadyRegistered={onAlreadyRegistered}
    />
  );
}

// the form, built only from this event's own registrationForm (four fields when it has none)
function RegisterForm({ event, offline, token, user, onClose, onRegistered, onAlreadyRegistered }) {
  const fields = useMemo(() => formFields(event), [event]);
  const legacy = isLegacyRegistration(event);
  const tiers = event?.ticketTiers || [];
  const [values, setValues] = useState(() => prefillFromUser(user, fields));
  const firstOpen = tiers.find((t) => maxTickets(event, t) >= 1);
  const [ticket, setTicket] = useState({ tier: firstOpen ? firstOpen.name : "", quantity: 1 });
  const [pay, setPay] = useState({ method: "", transactionId: "", receiptUri: "", receiptUrl: undefined });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form"); // form | pay | done
  const [payOpens, setPayOpens] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const total = totalFor(event, ticket);
  const paid = total > 0;
  const payInfo = usePaymentInfo(event?._id, token, paid && step === "pay", payOpens);

  // a single account: preselect it
  useEffect(() => {
    const accts = payInfo.info?.paymentAccounts || [];
    if (accts.length === 1 && !pay.method) setPay((p) => ({ ...p, method: accts[0].method }));
  }, [payInfo.info, pay.method]);

  const set = (key) => (v) => {
    setValues((x) => ({ ...x, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setBusy(true);
    try {
      let payment;
      if (paid) {
        const receiptUrl = await ensureReceiptUrl(pay, setPay);
        payment = { method: pay.method, transactionId: normTxn(pay.transactionId), receiptUrl };
      }
      const body = buildRegisterBody(event, values, ticket, payment);
      const res = await axios.post(`${API_BASE}/register`, body, auth(token));
      setResult(res.data);
      setStep("done");
      onRegistered && onRegistered(res.data);
    } catch (err) {
      if (err?.response?.data?.alreadyRegistered) {
        onAlreadyRegistered && onAlreadyRegistered();
        return;
      }
      // the server's plain message: full, closed, transaction id used, update needed
      Alert.alert("couldn't register", err?.response ? plainError(err, "registration failed. please try again.") : err?.message || "registration failed. please try again.");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    const e = validateRegistration(event, values, ticket);
    setErrors(e);
    if (Object.keys(e).length) {
      Alert.alert("check the form", "some answers need fixing. they're marked in red.");
      return;
    }
    if (paid) {
      setPayOpens((n) => n + 1); // payment details are fetched again
      setStep("pay");
    } else submit();
  };
  const finishPay = () => {
    const e = validatePayment(pay, payInfo.info?.paymentAccounts);
    setErrors(e);
    if (Object.keys(e).length) return;
    submit();
  };

  if (!event) return null;

  if (step === "done") {
    const pending = result?.registration?.payment?.status === "pending";
    return (
      <Frame visible title="registration received" subtitle={event.title} onClose={onClose}
        footer={<Button title="done" variant="accent" onPress={onClose} style={{ marginTop: 24 }} />}>
        <View style={s.doneCard}>
          <Ionicons name={pending ? "time-outline" : "checkmark-circle"} size={40} color={pending ? T.ink : T.success} />
          <Text style={s.doneTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {pending ? "payment pending verification" : "you're registered"}
          </Text>
          <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {pending
              ? "we'll check your payment and let you know when it's confirmed. you can see it in mine."
              : "you'll find it in mine."}
          </Text>
          {!!result?.registration?.ticket?.tier && (
            <Text style={s.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {String(result.registration.ticket.tier).toLowerCase()} × {result.registration.ticket.quantity}
              {result.registration.payment?.amount ? ` · ${formatRs(result.registration.payment.amount)}` : ""}
            </Text>
          )}
        </View>
      </Frame>
    );
  }

  if (step === "pay") {
    return (
      <Frame
        visible
        title="pay"
        subtitle={event.title}
        onClose={onClose}
        onBack={() => setStep("form")}
        footer={
          <Button
            title="submit registration"
            variant="accent"
            loading={busy}
            disabled={payInfo.state !== "ready" || !(payInfo.info?.paymentAccounts || []).length}
            onPress={finishPay}
            style={{ marginTop: 20 }}
          />
        }
      >
        <PaymentStep total={total} info={payInfo.info} infoState={payInfo.state} onRetry={payInfo.load} pay={pay} setPay={setPay} errors={errors} />
      </Frame>
    );
  }

  return (
    <Frame
      visible
      title="register"
      subtitle={event.title}
      onClose={onClose}
      footer={
        <Button
          title={paid ? "continue to payment" : "submit registration"}
          variant="accent"
          loading={busy}
          onPress={next}
          style={{ marginTop: 20 }}
        />
      }
    >
      {offline && (
        <View style={[s.card, { marginBottom: 16 }]}>
          <Text style={s.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {"couldn't load the latest version of this form, so this is the saved one. check your connection if something looks out of date."}
          </Text>
        </View>
      )}
      {fields
        .filter((f) => f.store !== "ticket")
        .map((f) => (
          <FieldInput key={f.key} field={legacy ? { ...f, type: f.key === "whatsapp" ? "phone" : f.type } : f} value={values[f.key]} onChange={set(f.key)} error={errors[f.key]} />
        ))}
      {tiers.length > 0 && <TicketPicker event={event} ticket={ticket} setTicket={setTicket} errors={errors} />}
      {!tiers.length && paid && (
        <View style={s.totalRow}>
          <Text style={s.totalLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>fee</Text>
          <Text style={s.totalValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatRs(total)}</Text>
        </View>
      )}
    </Frame>
  );
}

// ── "send payment proof again" (mine) ─────────────────────────
export function ProofSheet({ registration, event, token, onClose, onSent }) {
  const [pay, setPay] = useState({ method: registration?.payment?.method || "", transactionId: "", receiptUri: "", receiptUrl: undefined });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const payInfo = usePaymentInfo(event?._id, token, true);
  const total = registration?.payment?.amount || totalFor(event, registration?.ticket);

  const send = async () => {
    const e = validatePayment(pay, payInfo.info?.paymentAccounts);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const receiptUrl = await ensureReceiptUrl(pay, setPay);
      await axios.patch(
        `${API_BASE}/registrations/${registration._id}/payment-proof`,
        { transactionId: normTxn(pay.transactionId), receiptUrl, method: pay.method },
        auth(token)
      );
      Alert.alert("proof sent", "we'll check your payment and let you know when it's confirmed.");
      onSent && onSent();
    } catch (err) {
      Alert.alert("couldn't send", err?.response ? plainError(err, "couldn't send the proof. please try again.") : err?.message || "couldn't send the proof. please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame
      visible
      title="send payment proof"
      subtitle={event?.title}
      onClose={onClose}
      footer={<Button title="send proof" variant="accent" loading={busy} disabled={payInfo.state !== "ready"} onPress={send} style={{ marginTop: 20 }} />}
    >
      {registration?.payment?.status === "rejected" && !!registration?.payment?.rejectReason && (
        <View style={s.rejectBox}>
          <Text style={s.rejectText} maxFontSizeMultiplier={MAX_FONT_SCALE}>not accepted: {registration.payment.rejectReason}</Text>
        </View>
      )}
      <PaymentStep total={total} info={payInfo.info} infoState={payInfo.state} onRetry={payInfo.load} pay={pay} setPay={setPay} errors={errors} />
    </Frame>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  title: { fontSize: 24, marginTop: 4 },
  subtitle: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  h: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  sectionH: { fontSize: 18, marginBottom: 10 },
  field: { marginBottom: 16 },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted, marginBottom: 6 },
  optional: { fontFamily: F.body, color: T.textFaint },
  err: { fontFamily: F.bodyMedium, fontSize: 12.5, color: T.danger, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickBox: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickBoxErr: { borderColor: T.danger, borderWidth: 1.5 },
  pickText: { fontFamily: F.body, fontSize: 15, color: T.ink },
  tier: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, marginBottom: 8 },
  tierOn: { borderColor: T.ink, borderWidth: 1.5 },
  tierOff: { opacity: 0.5 },
  tierName: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  tierMeta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  tierPrice: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  stepVal: { minWidth: 32, textAlign: "center", fontFamily: F.bodyBold, fontSize: 17, color: T.ink },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.line },
  totalLabel: { fontFamily: F.bodySemi, fontSize: 14, color: T.textMuted },
  totalValue: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  totalCard: { backgroundColor: T.yellowSoft, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalBig: { fontFamily: F.heading, fontSize: 26, color: T.ink },
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.ink, marginBottom: 12 },
  muted: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 8 },
  center: { alignItems: "center", paddingVertical: 32 },
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.line },
  account: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, marginBottom: 8 },
  accountOn: { borderColor: T.ink, borderWidth: 1.5 },
  accountMethod: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  accountTitle: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, marginTop: 2 },
  accountNumber: { fontFamily: F.bodySemi, fontSize: 16, color: T.ink, marginTop: 4, letterSpacing: 0.5 },
  copyBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: T.sand },
  receiptRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  receipt: { width: 72, height: 96, borderRadius: 12, backgroundColor: T.sand },
  doneCard: { backgroundColor: T.card, borderRadius: 20, padding: 20, alignItems: "center", borderWidth: 1, borderColor: T.line, marginTop: 12 },
  doneTitle: { fontFamily: F.heading, fontSize: 18, color: T.ink, marginVertical: 10, textAlign: "center" },
  rejectBox: { backgroundColor: T.dangerBg, borderRadius: 14, padding: 12, marginBottom: 12 },
  rejectText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.danger },
});
