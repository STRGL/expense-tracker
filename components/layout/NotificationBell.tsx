// components/layout/NotificationBell.js
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const res = await fetch("/api/notifications/count")
        if (res.ok && active) {
          const data = await res.json()
          setUnread(data.unread)
        }
      } catch {
        // silently ignore network errors during polling
      }
    }
    poll()
    const interval = setInterval(poll, 30000) // poll every 30 seconds
    return () => { active = false; clearInterval(interval) }
  }, [])

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <span className="sr-only">
          {unread > 0 ? `${unread} unread notifications` : "Notifications"}
        </span>
      </Link>
    </Button>
  )
}
