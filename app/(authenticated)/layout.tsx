import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"
import type { AccentThemeKey } from "@/lib/accent-themes"

export const dynamic = "force-dynamic"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeAccent: true },
  })

  return (
    <AppShell isAdmin={session.user.role === "admin"} themeAccent={(user?.themeAccent ?? "blue") as AccentThemeKey}>
      {children}
    </AppShell>
  )
}
