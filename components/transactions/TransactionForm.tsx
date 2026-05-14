"use client"

import { useState, useEffect, useRef } from "react"
import Fuse from "fuse.js"
import { cn } from "@/lib/utils"
import { toLocalISODate, toCalendarDateInTZ } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SplitPanel, { type Split } from "./SplitPanel"
import SplitWarningModal from "./SplitWarningModal"
import type { TagWithChildren } from "@/lib/tag-utils"
import type { FormEvent } from "react"
import { apiFetch, ApiError } from "@/lib/api-client"

interface TransactionInitial {
  id?: string
  date?: string | Date
  merchantRaw?: string
  merchantName?: string
  totalAmount?: number
  notes?: string | null
  splits?: Split[]
  paymentFromUserId?: string | null
}

interface OtherUser {
  id: string
  name: string
}

interface MerchantAlias {
  id: string
  rawName: string
  niceName: string
}

interface Props {
  initial?: TransactionInitial | null
  currentUserId: string
  onSaved?: () => void
  onCancel?: () => void
}

export default function TransactionForm({ initial, currentUserId, onSaved, onCancel }: Props) {
  const isEdit = !!initial
  const initialIsCredit = (initial?.totalAmount ?? 0) > 0
  const [transactionType, setTransactionType] = useState(initialIsCredit ? "credit" : "debit")
  const [form, setForm] = useState({
    date: initial?.date ? toCalendarDateInTZ(initial.date, "UTC") : toLocalISODate(new Date()),
    merchantRaw: initial?.merchantRaw ?? "",
    merchantName: initial?.merchantName ?? "",
    totalAmount: initial?.totalAmount ? String(Math.abs(initial.totalAmount)) : "",
    notes: initial?.notes ?? "",
  })
  const [splits, setSplits] = useState<Split[]>(
    initial?.splits
      ? initial.splits.map(s => ({ ...s, amount: Math.abs(s.amount) }))
      : [{ userId: currentUserId, amount: Math.abs(Number(initial?.totalAmount ?? 0)), splitMethod: "equal", tagId: null }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([])
  const [showSplitWarning, setShowSplitWarning] = useState(false)
  const [splitWarningAcknowledged, setSplitWarningAcknowledged] = useState(false)
  const [paymentFromUserId, setPaymentFromUserId] = useState<string | null>(
    initial?.paymentFromUserId ?? null
  )
  const [myTagId, setMyTagId] = useState<string | null>(
    initial?.splits?.find((s) => s.userId === currentUserId)?.tagId ?? null
  )
  const [tags, setTags] = useState<Array<{ id: string; name: string; colour: string; parentId: string | null }>>([])

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tree: TagWithChildren[]) => {
        const flat: Array<{ id: string; name: string; colour: string; parentId: string | null }> = []
        for (const parent of tree) {
          flat.push({ id: parent.id, name: parent.name, colour: parent.colour, parentId: parent.parentId })
          for (const child of parent.children) {
            flat.push({ id: child.id, name: child.name, colour: child.colour, parentId: child.parentId })
          }
        }
        setTags(flat)
      })
      .catch(() => {
        // silently fail — tag picker stays empty
      })
  }, [])

  const [, setAliases] = useState<MerchantAlias[]>([])
  const [suggestions, setSuggestions] = useState<MerchantAlias[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const fuseRef = useRef<Fuse<MerchantAlias> | null>(null)

  useEffect(() => {
    fetch("/api/aliases")
      .then((r) => r.json())
      .then((data: MerchantAlias[]) => {
        setAliases(data)
        fuseRef.current = new Fuse<MerchantAlias>(data, { keys: ["rawName", "niceName"], threshold: 0.4 })
      })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    fetch("/api/users/active")
      .then(r => r.json())
      .then((users: OtherUser[]) => setOtherUsers(users.filter((u: OtherUser) => u.id !== currentUserId)))
  }, [isEdit, currentUserId])

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then((data: { hasAcknowledgedSplitWarning?: boolean }) => {
        if (data.hasAcknowledgedSplitWarning) setSplitWarningAcknowledged(true)
      })
      .catch(() => setSplitWarningAcknowledged(true))
  }, [])

  function handleMerchantChange(value: string) {
    setForm((f) => ({
      ...f,
      merchantName: value,
      merchantRaw: initial?.merchantRaw ? f.merchantRaw : value,
    }))
    if (fuseRef.current && value.length > 1) {
      const results = fuseRef.current.search(value).slice(0, 5)
      setSuggestions(results.map((r) => r.item))
      setShowSuggestions(results.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(alias: MerchantAlias) {
    setForm((f) => ({ ...f, merchantName: alias.niceName }))
    setShowSuggestions(false)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!splits.length) {
      setError("Please configure the split.")
      return
    }

    const absAmount = Math.abs(Number(form.totalAmount))
    const signedTotal = transactionType === "debit" ? -absAmount : absAmount
    const splitSum = splits.reduce((s, sp) => s + sp.amount, 0)
    const allProportional = splits.length > 0 && splits.every(s => s.splitMethod === "proportional")
    if (!allProportional && Math.abs(splitSum - absAmount) > 0.011) {
      setError("Split amounts must add up to the total amount.")
      return
    }

    const hasOtherSplits = splits.some(s => s.userId !== currentUserId)
    if (hasOtherSplits && !splitWarningAcknowledged) {
      setShowSplitWarning(true)
      return
    }

    setSaving(true)
    const url = isEdit && initial ? `/api/transactions/${initial.id}` : "/api/transactions"
    const method = isEdit ? "PUT" : "POST"

    const signedSplits = splits.map(s => ({
      ...s,
      amount: transactionType === "debit" ? -Math.abs(s.amount) : Math.abs(s.amount),
      tagId: s.userId === currentUserId ? myTagId : s.tagId,
    }))

    try {
      await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalAmount: signedTotal,
          splits: signedSplits,
          ...(isEdit && { paymentFromUserId }),
        }),
      })
      onSaved?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save transaction.")
    } finally {
      setSaving(false)
    }
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
          <Label>Type</Label>
          <div className="flex h-8 rounded-md border overflow-hidden text-sm font-medium">
            <button
              type="button"
              className={cn("flex-1 transition-colors", transactionType === "debit" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
              onClick={() => setTransactionType("debit")}
            >Debit</button>
            <button
              type="button"
              className={cn("flex-1 border-l transition-colors", transactionType === "credit" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
              onClick={() => setTransactionType("credit")}
            >Credit</button>
          </div>
        </div>
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
        {initial?.merchantRaw && initial.merchantRaw !== form.merchantName && (
          <p className="text-xs text-muted-foreground font-mono pl-1">
            Original: <span aria-label="Original merchant name">{initial.merchantRaw}</span>
          </p>
        )}
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
        <Label htmlFor="tag">Your tag <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Select
          value={myTagId ?? "none"}
          onValueChange={(v) => setMyTagId(v === "none" ? null : v)}
        >
          <SelectTrigger id="tag" className="h-9 text-sm">
            <SelectValue placeholder="Untagged" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Untagged</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.colour }} />
                  <span>{t.parentId ? "  " : ""}{t.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {isEdit && otherUsers.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="paymentFrom">
            Payment from <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <select
            id="paymentFrom"
            name="paymentFrom"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={paymentFromUserId ?? ""}
            onChange={e => setPaymentFromUserId(e.target.value || null)}
          >
            <option value="">— None —</option>
            {otherUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Mark this transaction as a payment received from someone
          </p>
        </div>
      )}

      <Separator />

      <SplitPanel
        totalAmount={Number(form.totalAmount) || 0}
        currentUserId={currentUserId}
        onChange={setSplits}
        initialSplits={initial?.splits as Split[] | undefined}
      />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

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
      <SplitWarningModal
        open={showSplitWarning}
        onAcknowledge={() => {
          setSplitWarningAcknowledged(true)
          setShowSplitWarning(false)
        }}
      />
    </form>
  )
}
