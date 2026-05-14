"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ImportRow } from "@prisma/client"
import type { TagWithChildren } from "@/lib/tag-utils"
import { toCalendarDateInTZ } from "@/lib/date"
import { apiFetch, ApiError } from "@/lib/api-client"

interface FlatTag {
  id: string
  name: string
  colour: string
  parentId: string | null
}

interface Props {
  row: ImportRow
  batchId: string
  onClose: () => void
  onSaved?: () => void
}

export default function ImportRowDialog({ row, batchId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    merchantResolved: row.merchantResolved ?? "",
    date: row.date ? toCalendarDateInTZ(row.date, "UTC") : "",
    amount: row.amount != null ? String(row.amount) : "",
    tagId: row.tagId ?? "",
    status: row.status ?? "pending",
  })
  const [tags, setTags] = useState<FlatTag[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then((tree: TagWithChildren[]) => {
      const flat: FlatTag[] = []
      for (const p of tree) { flat.push(p); for (const c of p.children) flat.push(c) }
      setTags(flat)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      await apiFetch(`/api/imports/${batchId}/rows/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantResolved: form.merchantResolved,
          date: form.date || null,
          amount: form.amount ? Number(form.amount) : null,
          tagId: form.tagId || null,
          status: form.status,
        }),
      })
      onSaved?.()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || `Server error (${err.status}). Please try again.`)
      } else {
        setError("Network error. Please check your connection.")
      }
    } finally {
      setSaving(false)
    }
  }

  const reasons: string[] = row.confidenceReasons ? JSON.parse(row.confidenceReasons) : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit row</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {reasons.map(r => (
                <Badge key={r} variant="destructive" className="text-xs">{r.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Raw merchant name (from bank)</Label>
            <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{row.merchantRaw}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Merchant name</Label>
            <Input
              value={form.merchantResolved}
              onChange={e => setForm(f => ({ ...f, merchantResolved: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tag</Label>
            <Select value={form.tagId || "none"} onValueChange={v => setForm(f => ({ ...f, tagId: v === "none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Untagged" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Untagged</SelectItem>
                {tags.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.colour }} />
                      {t.parentId ? "  " : ""}{t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip"
              checked={form.status === "skipped"}
              onChange={e => setForm(f => ({ ...f, status: e.target.checked ? "skipped" : "pending" }))}
              className="h-4 w-4"
            />
            <Label htmlFor="skip" className="font-normal cursor-pointer text-sm">Skip this row (won&apos;t be imported)</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
