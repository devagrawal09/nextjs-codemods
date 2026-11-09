import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

export function LogBody({ body, note }: { body: string; note: string }) {
  const [highlighted, setHighlighted] = useState("");
  useEffect(() => {
    codeToHtml(body, { lang: "json", theme: "github-light" }).then((html) => setHighlighted(html));
  }, [body]);
  return (
    <>
      {/* not reported: shiki escapes the body it highlights */}
      <pre dangerouslySetInnerHTML={{ __html: highlighted }} />
      {/* reported: the one control case in this fixture */}
      <p dangerouslySetInnerHTML={{ __html: note }} />
    </>
  );
}
