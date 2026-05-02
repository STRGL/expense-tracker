// components/transactions/TransactionForm.js
"use client"

import { useState, useEffect, useRef } from "react"
import Fuse from "fuse.js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import SplitPanel from "./SplitPanel"

export default function TransactionForm({ initial, currentUserId, onSaved, onCancel }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    date: initial?.date ? new Date(initial.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    merchantRaw: initial?.merchantRaw ?? "",
    merchantName: initial?.merchantName ?? "",
    totalAmount: initial?.totalAmount ?? "",
    notes: initial?.notes ?? "",
  })
  const [splits, setSplits] = useState(
    initial?.splits ?? [{ userId: currentUserId, amount: Number(initial?.totalAmount ?? 0), splitMethod: "equal", tagId: null }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [aliases, setAliases] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const fuseRef = useRef(null)

  useEffect(() => {
    fetch("/api/aliases")
      .then((r) => r.json())
      .then((data) => {
        setAliases(data)
        fuseRef.current = new Fuse(data, { keys: ["rawName", "niceName"], threshold: 0.4 })
      })
  }, [])

  function handleMerchantChange(value) {
    setForm((f) => ({ ...f, merchantRaw: value, merchantName: value }))
    if (fuseRef.current && value.length > 1) {
      const results = fuseRef.current.search(value).slice(0, 5)
      setSuggestions(results.map((r) => r.item))
      setShowSuggestions(results.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(alias) {
    setForm((f) => ({ ...f, merchantName: alias.niceName }))
    setShowSuggestions(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (!splits.length) {
      setError("Please configure the split.")
      return
    }

    const splitSum = splits.reduce((s, sp) => s + sp.amount, 0)
    if (Math.abs(splitSum - Number(form.totalAmount)) > 0.011) {
      setError("Split amounts must add up to the total amount.")
      return
    }

    setSaving(true)
    const url = isEdit ? `/api/transactions/${initial.id}` : "/api/transactions"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        totalAmount: Number(form.totalAmount),
        splits,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to save transaction.")
      return
    }

    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (£)</Label>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            value={form.totalAmount}
            onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5 relative">
        <Label htmlFor="merchant">Merchant</Label>
        <Input
          id="merchant"
          required
          placeholder="e.g. Tesco, Amazon..."
          value={form.merchantName}
          onChange={(e) => handleMerchantChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          autoComplete="off"
        />
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-0.5 bg-background border rounded-md shadow-md">
            {suggestions.map((alias) => (
              <button
                key={alias.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
                onMouseDown={() => selectSuggestion(alias)}
              >
                <span>{alias.niceName}</span>
                <span className="text-muted-foreground text-xs font-mono">{alias.rawName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notes <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="notes"
          placeholder="Optional notes..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <Separator />

      <SplitPanel
        totalAmount={Number(form.totalAmount) || 0}
        currentUserId={currentUserId}
        onChange={setSplits}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  )
}
