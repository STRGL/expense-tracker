"use client"

import { useLayoutEffect } from "react"
import { ACCENT_THEMES, type AccentThemeKey } from "@/lib/accent-themes"

interface Props {
  accent: AccentThemeKey
  children: React.ReactNode
}

export default function ThemeAccentProvider({ accent, children }: Props) {
  useLayoutEffect(() => {
    const vars = ACCENT_THEMES[accent] ?? ACCENT_THEMES.blue
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value)
    }
  }, [accent])

  return <>{children}</>
}
