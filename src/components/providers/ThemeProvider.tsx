"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

const STORAGE_KEY = "um-theme";

// Dark is the app's default theme. The root layout renders <html class="dark">
// and runs a tiny inline script before first paint that only removes it when
// the user has explicitly saved a light preference -- so there is never a
// white flash on load, refresh or login. This provider starts in the same
// state ("dark") so React's first render matches the painted page, then
// reconciles with the saved preference.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferred: Theme = stored === "light" ? "light" : "dark";
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
    document.documentElement.style.colorScheme = preferred;
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
