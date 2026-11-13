// app/src/ui/ActionButton.js
// A Button driven by a useAction(): spinner + disabled while that action runs, nothing else.
//   const save = useAction(async () => ..., { errorTitle: "not saved" });
//   <ActionButton action={save} title="save" params={[item]} />
import React from "react";
import Button from "./Button";

export default function ActionButton({ action, params, disabled = false, onPress, ...rest }) {
  const running = !!action?.running;
  return (
    <Button
      {...rest}
      loading={running}
      disabled={disabled || running}
      onPress={() => {
        if (onPress) onPress();
        return action?.run(...(params || []));
      }}
    />
  );
}
