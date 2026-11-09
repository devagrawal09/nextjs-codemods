const HEIGHTS = [40, 72, 56, 90];

export function ChartSkeleton({ labels }: { labels: string[] }) {
  return (
    <>
      {/* not reported: a module constant never changes, so position is stable */}
      {HEIGHTS.map((height, i) => <div key={i} style={{ height }} />)}
      {/* reported: the one control case in this fixture */}
      {labels.map((label, i) => <span key={i}>{label}</span>)}
    </>
  );
}
