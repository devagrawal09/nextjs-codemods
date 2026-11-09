const ESCAPES: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };

const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/[<>&]/g, (c) => ESCAPES[c]);

export function JsonLd({ data, note }: { data: object; note: string }) {
  return (
    <>
      {/* not reported: the helper escapes "<", so the JSON cannot close the script tag */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      {/* reported: the one control case in this fixture */}
      <p dangerouslySetInnerHTML={{ __html: note }} />
    </>
  );
}
