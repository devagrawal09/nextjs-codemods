import { useEffect, useState } from "react";

export function Summary({ name, count }: { name: string; count: number }) {
  const [summary, setSummary] = useState({ name: "", count: 0 });
  // reported as derived-value, not reset-on-change: the object literal carries the props
  useEffect(() => {
    setSummary({ name, count });
  }, [name, count]);
  return <p>{summary.name}</p>;
}
