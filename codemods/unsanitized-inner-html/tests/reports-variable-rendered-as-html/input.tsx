export function Comment({ body }: { body: string }) {
  // reported: user-authored HTML goes straight into the DOM
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}
