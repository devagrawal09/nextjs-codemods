export function JsonLd({ data }: { data: object }) {
  // reported: JSON.stringify does not escape "</script>" inside string values
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
