import DOMPurify from "dompurify";

export function Comment({ body }: { body: string }) {
  const clean = DOMPurify.sanitize(body);
  return (
    <>
      {/* not reported: static markup */}
      <style dangerouslySetInnerHTML={{ __html: ".a{color:red}" }} />
      {/* not reported: sanitized inline and through a variable */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
      <div dangerouslySetInnerHTML={{ __html: clean }} />
      {/* not reported: JSON with "<" escaped cannot close the script tag */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ body }).replace(/</g, "\\u003c") }} />
      {/* reported: the one control case in this fixture */}
      <div dangerouslySetInnerHTML={{ __html: `<b>${body}</b>` }} />
    </>
  );
}
