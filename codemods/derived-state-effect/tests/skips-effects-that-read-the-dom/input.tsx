import { useEffect, useState } from "react";

export function WizardHeader({ step }: { step: number }) {
  const [meta, setMeta] = useState({ title: "", description: "" });
  const [heading, setHeading] = useState("");
  // not reported: reads the document, which only an effect can do after render
  useEffect(() => {
    setMeta({ title: document.title, description: window.location.pathname });
  }, [step]);
  // reported: the one control case in this fixture
  useEffect(() => {
    setHeading(`Step ${step}`);
  }, [step]);
  return <h1 title={meta.title}>{heading}</h1>;
}
