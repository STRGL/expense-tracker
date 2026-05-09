"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}

interface NotificationTransaction {
  id: string
  merchantName: string
  totalAmount: number
}

interface NotificationSuggestion {
  id: string
  suggestedChanges: string
}

export interface NotificationData {
  id: string
  type: string
  message: string | null
  read: boolean
  createdAt: string
  transactionId: string | null
  transaction: NotificationTransaction | null
  suggestion: NotificationSuggestion | null
}

interface Props {
  notification: NotificationData
  onAction?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  split_created: "Split a transaction with you",
  split_updated: "Updated a split with you",
  split_removed: "Declined your split",
  transaction_deleted: "Deleted a transaction you were part of",
  split_suggestion: "Suggested changes to a transaction",
  split_suggestion_response: "Responded to your suggestion",
  missing_wage_for_split: "Action required: Wage missing for split",
}

export default function NotificationItem({ notification, onAction }: Props) {
  const [responding, setResponding] = useState(false)

  const tx = notification.transaction
  const label = TYPE_LABELS[notification.type] ?? notification.type

  async function respond(action: string) {
    if (!notification.suggestion) return
    setResponding(true)
    await fetch(
      `/api/transactions/${notification.transactionId}/suggestions/${notification.suggestion.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    )
    setResponding(false)
    onAction?.()
  }

  return (
    <div className={`px-4 py-3 space-y-2 ${!notification.read ? "bg-muted/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1">
          <p className="text-sm font-medium">{label}</p>
          {tx && (
            <p className="text-sm text-muted-foreground">
              {tx.merchantName} — {formatAmount(tx.totalAmount)}
            </p>
          )}
          {notification.message && (
            <p className="text-xs text-muted-foreground italic">{notification.message}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
        </div>
        {!notification.read && (
          <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
        )}
      </div>

      {/* Missing wage action */}
      {notification.type === "missing_wage_for_split" && (
        <div className="pt-1">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => { window.location.href = "/settings" }}
          >
            Update Profile
          </Button>
        </div>
      )}

      {/* Suggestion diff — shown on split_suggestion notifications for the owner */}
      {notification.type === "split_suggestion" && notification.suggestion && (
        <div className="space-y-2 rounded-md border p-3 bg-background text-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Suggested changes
          </p>
          {Object.entries(JSON.parse(notification.suggestion.suggestedChanges) as Record<string, { was: unknown; suggested: unknown }>).map(([field, diff]) => (
            <div key={field} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-28 shrink-0 capitalize">
                {field.replace(/([A-Z])/g, " $1").toLowerCase()}
              </span>
              <span className="line-through text-muted-foreground">{String(diff.was)}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="font-medium">{String(diff.suggested)}</span>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => respond("accept")}
              disabled={responding}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={async () => {
                await respond("manually_resolved")
                window.location.href = "/transactions"
              }}
              disabled={responding}
            >
              Edit manually
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => respond("decline")}
              disabled={responding}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
