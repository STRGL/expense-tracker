"use client"

import { createContext, useContext, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeCtx = createContext<ThemeContextValue>({ theme: "light", setTheme: () => {} })

interface Props {
  children: React.ReactNode
  initialTheme?: Theme
}

export function ThemeProvider({ children, initialTheme = "light" }: Props) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  function setTheme(t: Theme) {
    setThemeState(t)
    document.cookie = `theme=${t};path=/;max-age=31536000;samesite=lax`
    if (t === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
