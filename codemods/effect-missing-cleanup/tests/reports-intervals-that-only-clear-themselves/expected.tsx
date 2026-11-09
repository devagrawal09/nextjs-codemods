import { useEffect, useState } from "react";

export function useElementReady(id: string) {
  const [ready, setReady] = useState(false);
  // reported: if the element never appears, the interval polls after unmount
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.getElementById(id)) {
        setReady(true);
        clearInterval(timer);
      }
    }, 250);
  }, [id]);
  return ready;
}
