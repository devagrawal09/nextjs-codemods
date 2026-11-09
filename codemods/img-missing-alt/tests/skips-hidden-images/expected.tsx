export function Logos({ src }: { src: string }) {
  return (
    <>
      {/* not reported: hidden from assistive tech */}
      <img src={src} aria-hidden />
      {/* not reported: marked presentational */}
      <img src={src} role="presentation" />
      {/* reported: the one control case in this fixture */}
      <img src={src} />
    </>
  );
}
