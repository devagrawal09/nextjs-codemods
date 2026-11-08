import { useEffect, useState } from "react";

export function Profile({ id }: { id: string }) {
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  // not reported: runs once on mount, not on input change
  useEffect(() => {
    setMounted(true);
  }, []);

  // not reported: fetches, so an effect is the right tool
  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then((u) => setName(u.name));
  }, [id]);

  // reported: the one control case in this fixture
  useEffect(() => {
    setName(id.toUpperCase());
  }, [id]);
  return <p>{mounted ? name : null}</p>;
}
