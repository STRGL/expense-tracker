"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toLocalISODate } from "@/lib/date"
import SplitPanel, { type Split } from "./SplitPanel"
import { apiFetch, ApiError } from "@/lib/api-client"

interface Props {
  parentId: string
  parentTotal: number
  currentUserId: string
  onSaved: () => void
  onCancel: () => void
  existingChildren: Array<{ totalAmount: number; isSystemLine: boolean }>
}

export default function LineItemForm({
  parentId, parentTotal, currentUserId, onSaved, onCancel, existingChildren,
}: Props) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [distributeCost, setDistributeCost] = useState(false)
  const [splits, setSplits] = useState<Split[]>([
    { userId: currentUserId, amount: 0, splitMethod: "equal", tagId: null },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const usedAmount = existingChildren
    .filter(c => !c.isSystemLine)
    .reduce((s, c) => s + Math.abs(c.totalAmount), 0)
  const maxAmount = Math.abs(parentTotal) - usedAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const absAmt = Math.abs(Number(amount))
    if (!name.trim()) { setError("Item name is required."); return }
    if (!absAmt) { setError("Amount is required."); return }
    if (absAmt > maxAmount + 0.005) {
      setError(`Amount cannot exceed the remaining £${maxAmount.toFixed(2)}.`); return
    }

    setSaving(true)
    const signedAmount = parentTotal < 0 ? -absAmt : absAmt
    const signedSplits = splits.map(s => ({
      ...s,
      amount: parentTotal < 0 ? -Math.abs(s.amount) : Math.abs(s.amount),
    }))

    try {
      await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: toLocalISODate(new Date()),
          merchantRaw: name.trim(),
          merchantName: name.trim(),
          totalAmount: signedAmount,
          parentId,
          distributeCost,
          splits: distributeCost ? [] : signedSplits,
        }),
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="item-name">Item name</Label>
        <Input
          id="item-name"
          name="item-name"
          required
          placeholder="e.g. Headphones, Shipping..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="item-amount">
          Amount (£) <span className="text-muted-foreground text-xs">max £{maxAmount.toFixed(2)}</span>
        </Label>
        <Input
          id="item-amount"
          name="item-amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="distribute"
          type="checkbox"
          className="h-3.5 w-3.5"
          checked={distributeCost}
          onChange={e => setDistributeCost(e.target.checked)}
        />
        <Label htmlFor="distribute" className="text-sm font-normal cursor-pointer">
          Distribute cost equally across other items
        </Label>
      </div>
      {!distributeCost && (
        <SplitPanel
          totalAmount={Math.abs(Number(amount)) || 0}
          currentUserId={currentUserId}
          onChange={setSplits}
        />
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : "Add item"}
        </Button>
      </div>
    </form>
  )
}
