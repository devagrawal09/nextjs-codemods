export function EmptyState() {
  // reported: screen readers read out the file name; decorative images need alt=""
  return <img className="mb-6" src="/empty.svg" />;
}
