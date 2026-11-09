import { useEffect } from "react";

export function Login({ onFocus }: { onFocus: () => void }) {
  // not reported: the unmount effect below removes the listener
  useEffect(() => {
    window.addEventListener("focus", onFocus);
  }, [onFocus]);

  useEffect(() => () => {
    window.removeEventListener("focus", onFocus);
  }, []);
  return null;
}

export function Banner() {
  // reported: the one control case in this fixture
  useEffect(() => {
    window.addEventListener("resize", () => {});
  }, []);
  return null;
}
