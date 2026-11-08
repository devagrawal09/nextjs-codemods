import { createContext, useState } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: (_: string) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");
  // reported: a new object every render re-renders every consumer
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
