import { createContext, memo } from "react";

const BUSINESS = true;
const ConfigContext = createContext({});

export const ConfigProvider = memo(({ children, flags, config }: { children: React.ReactNode; flags?: object; config?: object }) => (
  // reported with madeOf own-state-or-props: only props, literals and a constant
  <ConfigContext value={{ flags: flags || {}, config: { ...(config ?? {}), business: BUSINESS }, ready: true }}>
    {children}
  </ConfigContext>
));
