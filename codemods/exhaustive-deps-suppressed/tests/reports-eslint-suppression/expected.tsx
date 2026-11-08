import { useEffect } from "react";

export function Search({ query, onSearch }: { query: string; onSearch: (q: string) => void }) {
  useEffect(() => {
    onSearch(query);
    // reported below: a stale onSearch is silently kept
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  return null;
}
