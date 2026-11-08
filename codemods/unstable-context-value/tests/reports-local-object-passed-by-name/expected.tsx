import { createContext, useState } from "react";

const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState("light");
  const value = { theme };
  // reported: `value` is rebuilt on every render without useMemo
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
