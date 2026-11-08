export function Table({ rows }: { rows: string[] }) {
  // reported: Row is a new component type on every render, so every row remounts
  const Row = ({ value }: { value: string }) => <tr><td>{value}</td></tr>;
  return <table><tbody>{rows.map((r) => <Row key={r} value={r} />)}</tbody></table>;
}
