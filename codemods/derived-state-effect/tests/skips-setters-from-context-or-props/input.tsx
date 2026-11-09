import { useEffect, useState } from "react";
import { useModal } from "./modal";

export function ImportForm({ busy, setTitle }: { busy: boolean; setTitle: (t: string) => void }) {
  const { setCanDismiss } = useModal();
  const [label, setLabel] = useState("");
  // not reported: pushes state up to the modal, nothing here is derived
  useEffect(() => {
    setCanDismiss(!busy);
  }, [busy]);
  // not reported: the setter comes from the parent
  useEffect(() => {
    setTitle(busy ? "Importing" : "Import");
  }, [busy]);
  // reported: the one control case in this fixture
  useEffect(() => {
    setLabel(busy ? "Importing" : "Import");
  }, [busy]);
  return <p>{label}</p>;
}
