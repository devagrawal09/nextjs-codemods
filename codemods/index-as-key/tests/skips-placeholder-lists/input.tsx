export function Loading({ rows, days }: { rows: number; days: string[] }) {
  return (
    <>
      {/* not reported: skeletons have no identity besides position */}
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton" />)}
      {[...Array(3)].map((_, i) => <div key={i} />)}
      {/* not reported: the item is never read, so the list is positional */}
      {days.map((day, i) => <span key={i} className="column" />)}
      {/* reported: the one control case in this fixture */}
      {days.map((day, i) => <span key={i}>{day}</span>)}
    </>
  );
}
