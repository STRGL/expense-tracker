// components/notifications/NotificationList.js
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import NotificationItem from "./NotificationItem"

export default function NotificationList() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/notifications")
    const data = await res.json()
    setNotifications(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" })
    load()
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
  }

  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No notifications yet.</p>
  }

  return (
    <div className="space-y-2">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
      )}
      <div className="border rounded-md divide-y">
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onAction={load}
          />
        ))}
      </div>
    </div>
  )
}
