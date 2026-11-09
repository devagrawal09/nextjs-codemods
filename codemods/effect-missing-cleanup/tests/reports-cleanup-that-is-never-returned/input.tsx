import { useEffect, useRef } from "react";

export function useMouseLocation() {
  const position = useRef({ x: 0, y: 0 });
  const onMove = (e: MouseEvent) => {
    position.current = { x: e.clientX, y: e.clientY };
  };
  // reported: the cleanup arrow is a bare statement, so it never runs
  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    () => {
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return () => position.current;
}
