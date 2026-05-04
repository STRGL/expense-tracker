// components/providers/ThemeAccentProvider.js
"use client"

import { useLayoutEffect } from "react"
import { ACCENT_THEMES } from "@/lib/accent-themes"

export default function ThemeAccentProvider({ accent, children }) {
  useLayoutEffect(() => {
    const vars = ACCENT_THEMES[accent] ?? ACCENT_THEMES.blue
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value)
    }
  }, [accent])

  return <>{children}</>
}
