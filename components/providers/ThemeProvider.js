"use client"

import { createContext, useContext, useState } from "react"

const ThemeCtx = createContext({ theme: "light", setTheme: () => {} })

export function ThemeProvider({ children, initialTheme = "light" }) {
  const [theme, setThemeState] = useState(initialTheme)

  function setTheme(t) {
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
