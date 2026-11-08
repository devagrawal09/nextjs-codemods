import Image from "next/image";

export function Avatar({ src, imgProps }: { src: string; imgProps: object }) {
  return (
    <>
      {/* not reported: alt present, empty alt is a valid decorative marker */}
      <img src={src} alt="" />
      {/* not reported: a spread may carry alt */}
      <img {...imgProps} />
      {/* reported: the one control case in this fixture */}
      <Image src={src} width={32} height={32} />
    </>
  );
}
