import { useEffect } from "react";

export function Search({ query }: { query: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyValue: any = query;
  useEffect(() => {
    console.log(anyValue);
    // biome-ignore lint/correctness/useExhaustiveDependencies: control case, reported
  }, []);
  return null;
}
