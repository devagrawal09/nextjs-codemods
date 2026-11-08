export function Tags({ tags }: { tags: string[] }) {
  // reported: the template still only varies by position
  return <>{tags.map((tag, i) => <span key={`tag-${i}`}>{tag}</span>)}</>;
}
