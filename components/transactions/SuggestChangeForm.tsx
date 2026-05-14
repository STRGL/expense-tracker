"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toCalendarDateInTZ } from "@/lib/date"
import type { TransactionDetail } from "./TransactionDialog"

type FieldKey = "date" | "merchantName" | "totalAmount" | "notes" | "mySplitAmount"

interface MySplit {
  amount: number
}

interface Props {
  transaction: TransactionDetail
  mySplit: MySplit | null
  onClose: () => void
  onSubmitted?: () => void
}

export default function SuggestChangeForm({ transaction, mySplit, onClose, onSubmitted }: Props) {
  const [unlocked, setUnlocked] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [values, setValues] = useState<Record<FieldKey, string>>({
    date: transaction.date ? toCalendarDateInTZ(transaction.date, "UTC") : "",
    merchantName: transaction.merchantName ?? "",
    totalAmount: String(transaction.totalAmount ?? ""),
    notes: transaction.notes ?? "",
    mySplitAmount: String(mySplit?.amount ?? ""),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function toggle(field: FieldKey) {
    setUnlocked((u) => ({ ...u, [field]: !u[field] }))
  }

  const FIELDS: Array<{ key: FieldKey; label: string; type: string }> = [
    { key: "date", label: "Date", type: "date" },
    { key: "merchantName", label: "Merchant name", type: "text" },
    { key: "totalAmount", label: "Total amount (£)", type: "number" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "mySplitAmount", label: "My split amount (£)", type: "number" },
  ]

  const originalValues: Record<FieldKey, string> = {
    date: transaction.date ? toCalendarDateInTZ(transaction.date, "UTC") : "",
    merchantName: transaction.merchantName ?? "",
    totalAmount: String(transaction.totalAmount ?? ""),
    notes: transaction.notes ?? "",
    mySplitAmount: String(mySplit?.amount ?? ""),
  }

  async function handleSubmit() {
    setError("")
    const diff: Partial<Record<FieldKey, { was: string; suggested: string }>> = {}
    for (const { key } of FIELDS) {
      if (unlocked[key] && values[key] !== originalValues[key]) {
        diff[key] = { was: originalValues[key], suggested: values[key] }
      }
    }

    if (Object.keys(diff).length === 0) {
      setError("Please unlock and change at least one field.")
      return
    }

    setSubmitting(true)
    const res = await fetch(`/api/transactions/${transaction.id}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedChanges: diff }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to submit suggestion.")
      return
    }

    onSubmitted?.()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a change</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Check a field to unlock it and enter your suggested value. Only changed fields will be sent.
        </p>

        <div className="space-y-3 py-1">
          {FIELDS.map(({ key, label, type }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`unlock-${key}`}
                checked={!!unlocked[key]}
                onChange={() => toggle(key)}
                className="h-4 w-4 shrink-0"
              />
              <div className="flex-1">
                <Label htmlFor={`unlock-${key}`} className="text-xs text-muted-foreground cursor-pointer">
                  {label}
                </Label>
                <Input
                  type={type}
                  value={values[key]}
                  disabled={!unlocked[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className={`h-8 text-sm mt-0.5 ${!unlocked[key] ? "opacity-60" : ""}`}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending..." : "Send suggestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
