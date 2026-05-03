// app/(authenticated)/notifications/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Notifications — Expense Tracker" }

import NotificationList from "@/components/notifications/NotificationList"

export default function NotificationsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Activity on your shared transactions
        </p>
      </div>
      <NotificationList />
    </div>
  )
}
