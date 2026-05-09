"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { PersonPaymentDetail } from "@/types/payments"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
  userId: string
}

export default function PersonPayments({ userId }: Props) {
  const [detail, setDetail] = useState<PersonPaymentDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/payments/${userId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => { if (data) setDetail(data) })
  }, [userId])

  if (notFound) {
    return <p className="text-sm text-muted-foreground py-8 text-center">User not found.</p>
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
  }

  const positive = detail.net >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/payments" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{detail.user.name}</h1>
          {!detail.user.isActive && (
            <span className="text-xs text-muted-foreground">inactive account</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-1">
          {positive ? "Owes you" : "You owe"}
        </p>
        <p className={`text-4xl font-semibold tabular-nums ${positive ? "text-green-600" : "text-red-600"}`}>
          {formatAmount(Math.abs(detail.net))}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Outstanding splits</h2>
        {detail.outstandingSplits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No outstanding splits.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {detail.outstandingSplits.map(s => (
              <div key={s.splitId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{s.merchantName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium tabular-nums ${s.direction === "owedByThem" ? "text-green-600" : "text-red-600"}`}>
                    {s.direction === "owedByThem" ? "+" : "−"}{formatAmount(s.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.direction === "owedByThem" ? "they owe you" : "you owe them"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Payments received</h2>
        {detail.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {detail.payments.map(p => (
              <div key={p.transactionId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{p.merchantName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                </div>
                <p className="text-sm font-medium tabular-nums text-green-600">
                  +{formatAmount(p.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
