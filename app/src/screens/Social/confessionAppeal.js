// app/src/screens/Social/confessionAppeal.js
// P4-1 appeals (plan: "a suspended student sees 'your account is paused because …' with an appeal button"). Sign-in
// already offers it for a paused account (SignIn.js). This is the same for a student banned from confessions: the
// server's 403 CONFESSION_BANNED carries the sentence and, when Railway has SAFETY_APPEAL_EMAIL, the appeal address.
// Without an address: the sentence alone, as before. Used only with confessionSafety on (bans exist only then).
import { Alert, Linking } from 'react-native';
import { funnel } from '../../analytics/funnel';

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** the appeal address in a ban reply, or null */
export const appealAddress = (err) => (typeof err?.appealEmail === 'string' && EMAIL.test(err.appealEmail) ? err.appealEmail : null);

/** a ban reply → the alert (with "appeal" when there is an address) and true; anything else → false */
export function alertBanned(err) {
  if (err?.code !== 'CONFESSION_BANNED') return false;
  const to = appealAddress(err);
  const text = typeof err.error === 'string' && err.error ? err.error : "you can't post confessions or comments for now (community rules).";
  const buttons = [{ text: 'ok', style: 'cancel' }];
  if (to) {
    const subject = encodeURIComponent('appeal: confessions paused');
    const body = encodeURIComponent(`hi tdc safety team,\n\nplease review the pause on my confessions.\n\n${text}\n\n`);
    buttons.unshift({ text: 'appeal', onPress: () => { funnel('confession_appeal_opened'); Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`).catch(() => {}); } });
  }
  Alert.alert("couldn't post", text, buttons);
  return true;
}
