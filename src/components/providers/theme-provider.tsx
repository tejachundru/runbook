"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/* ──────────────────────────────────────────────────────────────────────────
   Accent colour provider
   Sets `data-accent` on <html> so CSS accent-hue overrides kick in.
   Persists choice in localStorage.
   ────────────────────────────────────────────────────────────────────────── */

export const ACCENT_OPTIONS = [
  { value: "mauve",  label: "Mauve",  color: "oklch(0.50 0.14 323)" },
  { value: "blue",   label: "Blue",   color: "oklch(0.50 0.16 250)" },
  { value: "green",  label: "Green",  color: "oklch(0.55 0.14 160)" },
  { value: "amber",  label: "Amber",  color: "oklch(0.65 0.16 80)"  },
  { value: "rose",   label: "Rose",   color: "oklch(0.55 0.18 15)"  },
  { value: "slate",  label: "Slate",  color: "oklch(0.50 0.02 270)" },
] as const;

export type Accent = (typeof ACCENT_OPTIONS)[number]["value"];

interface AccentCtx {
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const AccentContext = createContext<AccentCtx>({
  accent: "mauve",
  setAccent: () => {},
});

export function useAccent() {
  return useContext(AccentContext);
}

function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<Accent>("mauve");

  useEffect(() => {
    const stored = localStorage.getItem("accent") as Accent | null;
    if (stored && ACCENT_OPTIONS.some((o) => o.value === stored)) {
      setAccentState(stored);
      document.documentElement.setAttribute("data-accent", stored);
    }
  }, []);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    localStorage.setItem("accent", a);
    if (a === "mauve") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", a);
    }
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Combined provider — wraps next-themes + accent context
   ────────────────────────────────────────────────────────────────────────── */

export function ThemeProvider({
  children,
  ...props
}: Parameters<typeof NextThemesProvider>[0]) {
  return (
    <NextThemesProvider {...props}>
      <AccentProvider>{children}</AccentProvider>
    </NextThemesProvider>
  );
}
