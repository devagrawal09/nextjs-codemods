import { ImageResponse } from "next/og";

// not reported: Satori renders this JSX to a PNG, where alt does nothing
export default function OgImage() {
  return new ImageResponse(<img src="https://example.com/logo.png" width={64} height={64} />);
}
