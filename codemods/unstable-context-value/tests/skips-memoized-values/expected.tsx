import { createContext, useMemo, useState } from "react";

const ThemeContext = createContext({ theme: "light" });
const ModeContext = createContext("light");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState("light");
  const value = useMemo(() => ({ theme }), [theme]);
  return (
    // not reported: memoized value and a primitive value
    <ThemeContext.Provider value={value}>
      <ModeContext.Provider value={theme}>
        {/* reported: the one control case in this fixture */}
        <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  );
}
