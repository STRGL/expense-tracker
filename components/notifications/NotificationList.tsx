"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Spinner from "@/components/ui/Spinner"
import NotificationItem, { type NotificationData } from "./NotificationItem"
import { apiFetch } from "@/lib/api-client"

export default function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // Wrap in Promise to ensure it's not synchronous within the effect
    await Promise.resolve()
    setLoading(true)
    try {
      const data = await apiFetch<NotificationData[]>("/api/notifications")
      setNotifications(data)
    } catch {
      // silently fail — list stays at previous state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [load])

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" })
    load()
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) return <Spinner />

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
