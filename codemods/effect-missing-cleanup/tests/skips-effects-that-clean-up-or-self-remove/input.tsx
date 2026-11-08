import { useEffect } from "react";

export function Shortcuts({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  // not reported: returns a cleanup
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // not reported: a once listener removes itself
  useEffect(() => {
    window.addEventListener("load", () => {}, { once: true });
  }, []);

  // reported: the one control case in this fixture
  useEffect(() => {
    document.addEventListener("click", () => {});
  }, []);
  return null;
}
