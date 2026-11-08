import { useEffect } from "react";

export function Poller({ poll }: { poll: () => void }) {
  // reported: the interval keeps firing after unmount
  useEffect(() => {
    setInterval(poll, 5000);
  }, [poll]);
  return null;
}
