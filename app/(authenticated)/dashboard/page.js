// app/(authenticated)/dashboard/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard — Expense Tracker" }

import DashboardShell from "@/components/dashboard/DashboardShell"

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your spending at a glance</p>
      </div>
      <DashboardShell />
    </div>
  )
}
