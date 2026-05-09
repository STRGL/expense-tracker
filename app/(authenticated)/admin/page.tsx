export const dynamic = "force-dynamic"
export const metadata = { title: "User Management — Expense Tracker" }

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import UserManagement from "./UserManagement"

export default async function AdminPage() {
  const session = await auth()
  if (session?.user?.role !== "admin") redirect("/dashboard")

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and manage user accounts. Admins cannot view users&apos; financial data.
        </p>
      </div>
      <UserManagement />
    </div>
  )
}
