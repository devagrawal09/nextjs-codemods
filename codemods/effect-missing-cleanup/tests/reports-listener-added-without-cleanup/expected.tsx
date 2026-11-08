import { useEffect } from "react";

export function Shortcuts({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  // reported: the listener outlives the component
  useEffect(() => {
    window.addEventListener("keydown", onKey);
  }, [onKey]);
  return null;
}
