import { createContext, useState } from "react";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");
  // reported with madeOf other: the inline callback is new on every render
  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(theme === "light" ? "dark" : "light") }}>
      {children}
    </ThemeContext.Provider>
  );
}
