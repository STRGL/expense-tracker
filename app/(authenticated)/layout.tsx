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

  const [user, otherUsersCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { themeAccent: true },
    }),
    prisma.user.count({
      where: { isActive: true, id: { not: session.user.id } },
    }),
  ])

  return (
    <AppShell
      isAdmin={session.user.role === "admin"}
      themeAccent={(user?.themeAccent ?? "blue") as AccentThemeKey}
      hasOtherUsers={otherUsersCount > 0}
    >
      {children}
    </AppShell>
  )
}
