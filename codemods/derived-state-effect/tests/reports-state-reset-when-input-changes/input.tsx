import { useEffect, useState } from "react";

export function Filters({ tab }: { tab: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  // reported: a `key={tab}` on the component resets this without an extra render
  useEffect(() => {
    setSelected([]);
  }, [tab]);
  return <ul>{selected.map((s) => <li key={s}>{s}</li>)}</ul>;
}
