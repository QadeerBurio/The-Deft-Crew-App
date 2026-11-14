// app/src/hooks/useFlag.js
// A feature switch for a component: true / false, or null while the first answer is on its way.
// Re-renders when the flags change (login, app open, back to the foreground, logout).
//   const on = useFlag("surplusBoxes");                  (reads the shared flags)
//   const on = useFlag("surplusBoxes", surplusEnabled);  (the feature's own check, which reads the same flags)
import { useEffect, useState } from "react";
import { flagOn, knownFlag, subscribeFlags } from "../api/appFlags";

export default function useFlag(name, check = null) {
  const [on, setOn] = useState(() => knownFlag(name));
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => (check ? check() : flagOn(name)))
      .then((v) => { if (live) setOn(!!v); })
      .catch(() => { if (live) setOn(false); });
    const off = subscribeFlags((flags) => { if (live) setOn(flags ? !!flags[name] : false); });
    return () => { live = false; off(); };
  }, [name]);
  return on;
}
