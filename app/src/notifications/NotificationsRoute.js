// app/src/notifications/NotificationsRoute.js
// The "Notifications" route (the social feed's bell). Plan N-4: with the unifiedInbox flag on it shows the one inbox
// (components/NotificationModal as a screen); off (or not known yet) it is the social notifications screen, as today.
// The social screen stays reachable as "SocialNotifications" (connection requests are answered there).
import React from "react";
import useFlag from "../hooks/useFlag";
import NotificationModal from "../components/NotificationModal";
import SocialNotificationScreen from "../screens/Social/NotificationScreen";
import { FLAG } from "./unifiedInbox";

export default function NotificationsRoute(props) {
  const unified = useFlag(FLAG) === true;
  return unified ? <NotificationModal navigation={props.navigation} /> : <SocialNotificationScreen {...props} />;
}
