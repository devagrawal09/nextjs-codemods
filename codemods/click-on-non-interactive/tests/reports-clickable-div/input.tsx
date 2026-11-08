export function Collapsible({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  // reported: keyboard and screen reader users cannot reach or activate this
  return <div className="header" onClick={onToggle}>{open ? "Hide" : "Show"}</div>;
}
