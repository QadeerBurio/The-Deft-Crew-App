// app/src/hooks/useSocketAuth.js
// SEC-1: tells the server who this socket is, with the sign-in token (the server never trusts an id the app sends).
// Sends 'authenticate' now and again after every reconnect. Older servers ignore the event. Use it before any effect
// that joins a chat, so the token goes first.
//   useSocketAuth(socket, token)
import { useEffect } from "react";

export default function useSocketAuth(socket, token) {
  useEffect(() => {
    if (!socket || !token) return undefined;
    const send = () => socket.emit("authenticate", token);
    if (socket.connected !== false) send();
    socket.on?.("connect", send);
    return () => { socket.off?.("connect", send); };
  }, [socket, token]);
}
