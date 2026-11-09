import { useState } from "react";

function Group({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{name}</button>;
}

export function Groups({ initial }: { initial: string[] }) {
  const [groups] = useState(initial);
  // reported with harm likely: the list lives in state and each Group keeps its own open state
  return <>{groups.map((name, i) => <Group key={i} name={name} />)}</>;
}
