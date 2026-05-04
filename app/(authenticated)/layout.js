// app/(authenticated)/layout.js
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"

export const dynamic = "force-dynamic"

export default async function AuthenticatedLayout({ children }) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeAccent: true },
  })

  return (
    <AppShell isAdmin={session.user.role === "admin"} themeAccent={user?.themeAccent ?? "blue"}>
      {children}
    </AppShell>
  )
}
