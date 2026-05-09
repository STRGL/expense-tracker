"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { PaymentUserSummary } from "@/types/payments"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(n))
}

export default function PaymentsOverview() {
  const [summaries, setSummaries] = useState<PaymentUserSummary[] | null>(null)

  useEffect(() => {
    fetch("/api/payments")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setSummaries)
      .catch(() => setSummaries([]))
  }, [])

  if (!summaries) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
  }

  const nonZero = summaries.filter(s => Math.abs(s.net) >= 0.01)

  if (nonZero.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No outstanding balances. Add other users to start tracking shared payments.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {nonZero.map(s => {
        const positive = s.net >= 0
        return (
          <Link
            key={s.userId}
            href={`/payments/${s.userId}`}
            className="block rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{s.name}</p>
              {!s.isActive && (
                <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">inactive</span>
              )}
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${positive ? "text-green-600" : "text-red-600"}`}>
              {formatAmount(s.net)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {positive ? "owes you" : "you owe"}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
