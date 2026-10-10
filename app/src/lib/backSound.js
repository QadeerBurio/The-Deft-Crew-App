// app/src/lib/backSound.js
// Android hardware back plays the tap sound once, when back actually does something.
//
// installBackSound() wraps BackHandler.addEventListener (same idea as installAppAlert):
// every "hardwareBackPress" listener, including React Navigation's own, plays soundTap()
// when it returns true, i.e. it closed a sheet / modal or went back a screen.
// Listeners run newest first and stop at the first true, so one press = one sound.
// Back that does nothing (app exits / goes to background) stays silent.
// Modals: Android back goes to Modal onRequestClose, not here (see ui/Sheet.js, AppAlert).
// Call once, before the NavigationContainer mounts (App.js).
import { BackHandler } from "react-native";
import { soundTap } from "./tdcSounds";

let installed = false;

export function installBackSound() {
  if (installed) return;
  installed = true;
  const add = BackHandler.addEventListener;
  BackHandler.addEventListener = function (eventName, handler) {
    if (eventName !== "hardwareBackPress" || typeof handler !== "function") {
      return add.call(BackHandler, eventName, handler);
    }
    return add.call(BackHandler, eventName, function (...args) {
      const handled = handler.apply(this, args);
      if (handled === true) soundTap(); // fire and forget
      return handled;
    });
  };
}

export default installBackSound;
