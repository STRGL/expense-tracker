// app/(authenticated)/layout.js
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AppShell from "@/components/layout/AppShell"

export default async function AuthenticatedLayout({ children }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <AppShell isAdmin={session.user.role === "admin"}>
      {children}
    </AppShell>
  )
}
