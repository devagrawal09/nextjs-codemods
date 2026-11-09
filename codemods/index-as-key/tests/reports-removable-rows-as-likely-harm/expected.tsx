import { QueryRow } from "./query-row";

export function Queries({ queries, onRemove }: { queries: Query[]; onRemove: (i: number) => void }) {
  // reported with harm likely: removing a row shifts every later row onto the wrong component
  return <>{queries.map((query, index) => <QueryRow key={index} query={query} onRemove={() => onRemove(index)} />)}</>;
}
