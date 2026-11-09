import { useState } from "react";

export function Settings({ fields }: { fields: string[] }) {
  // reported with harm likely: each parent render remounts Field, dropping its draft and the input's focus
  function Field({ name }: { name: string }) {
    const [draft, setDraft] = useState("");
    return <input name={name} value={draft} onChange={(e) => setDraft(e.target.value)} />;
  }
  return <form>{fields.map((f) => <Field key={f} name={f} />)}</form>;
}
