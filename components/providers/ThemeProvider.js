"use client"

import { createContext, useContext, useEffect, useState } from "react"

const ThemeCtx = createContext({ theme: "light", setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light")

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "light"
    setThemeState(stored)
  }, [])

  function setTheme(t) {
    setThemeState(t)
    localStorage.setItem("theme", t)
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
