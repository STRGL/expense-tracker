"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ThemeAccentProvider from "@/components/providers/ThemeAccentProvider"
import type { AccentThemeKey } from "@/lib/accent-themes"

interface Props {
  children: React.ReactNode
  isAdmin: boolean
  themeAccent: AccentThemeKey
}

export default function AppShell({ children, isAdmin, themeAccent }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ThemeAccentProvider accent={themeAccent}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          isAdmin={isAdmin}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </ThemeAccentProvider>
  )
}
