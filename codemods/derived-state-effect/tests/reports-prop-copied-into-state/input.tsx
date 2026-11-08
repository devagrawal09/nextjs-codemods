import { useEffect, useState } from "react";

export function Toggle({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  // reported: renders once with the stale value, then again after the effect
  useEffect(() => {
    setChecked(enabled);
  }, [enabled]);
  return <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} />;
}
