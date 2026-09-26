import { ThemeContext } from "../context/themeContextObject";

// Same reasoning as SsrAuthProvider: the real ThemeProvider reads
// localStorage/matchMedia synchronously in its useState initializer,
// which throws under Node SSR. Safe to stand in with a static "light"
// value because the real provider only ever applies the "dark" class to
// document.documentElement inside a useEffect — never as part of the
// rendered JSX itself — so the server-rendered HTML is identical either
// way, and the client's real ThemeProvider takes over theme detection
// immediately on hydration exactly as it does on a normal page load
// today (including today's existing brief light-theme flash before the
// effect runs, which this doesn't change or worsen).
export const SsrThemeProvider = ({ children }) => (
  <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => {} }}>
    {children}
  </ThemeContext.Provider>
);
