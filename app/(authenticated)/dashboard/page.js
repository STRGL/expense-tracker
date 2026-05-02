// app/(authenticated)/dashboard/page.js
import { auth } from "@/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard — Expense Tracker" }

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Welcome back, {session.user.name}. Dashboard charts and widgets will appear here in Plan 6.
      </p>
    </div>
  )
}
