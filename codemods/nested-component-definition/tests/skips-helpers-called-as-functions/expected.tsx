export function Table({ rows }: { rows: string[] }) {
  // not reported: called as a function, so React never sees a new component type
  const renderRow = (value: string) => <tr key={value}><td>{value}</td></tr>;
  // not reported: capitalised but only called, never rendered as <Cell />
  const Cell = (value: string) => <td>{value}</td>;
  // reported: the one control case in this fixture
  function Empty() {
    return <p>No rows</p>;
  }
  return rows.length ? <table><tbody>{rows.map(renderRow)}<tr>{Cell("total")}</tr></tbody></table> : <Empty />;
}
