import { useEffect } from "react";

export function ScrollRestore({ top }: { top: number }) {
  // not reported: the handler removes the listener once the scroll settles
  useEffect(() => {
    const stop = () => window.removeEventListener("scroll", onScroll);
    const onScroll = () => {
      if (window.scrollY === top) stop();
    };
    window.addEventListener("scroll", onScroll);
    window.scrollTo(0, top);
  }, [top]);

  // reported: the one control case in this fixture
  useEffect(() => {
    window.addEventListener("resize", () => {});
  }, []);
  return null;
}
