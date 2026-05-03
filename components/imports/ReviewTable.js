// components/imports/ReviewTable.js
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import ConfidenceDot from "@/components/transactions/ConfidenceDot"
import ImportRowDialog from "./ImportRowDialog"

function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatAmount(a) {
  if (a == null) return "—"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(a)
}

export default function ReviewTable({ batchId }) {
  const router = useRouter()
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [allTags, setAllTags] = useState([])
  const [bulkTagId, setBulkTagId] = useState("")
  const [confirming, setConfirming] = useState(false)

  async function load() {
    setLoading(true)
    const [batchRes, tagsRes] = await Promise.all([
      fetch(`/api/imports/${batchId}`),
      fetch("/api/tags"),
    ])
    const batchData = await batchRes.json()
    setBatch(batchData)
    const tagTree = await tagsRes.json()
    const flat = []
    for (const p of tagTree) { flat.push(p); for (const c of p.children) flat.push(c) }
    setAllTags(flat)
    setLoading(false)
  }

  useEffect(() => { load() }, [batchId])

  async function handleBulkTag() {
    if (!bulkTagId || !batch) return
    const untaggedPending = batch.rows.filter(r => !r.tagId && r.status === "pending")
    await Promise.all(untaggedPending.map(r =>
      fetch(`/api/imports/${batchId}/rows/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: bulkTagId }),
      })
    ))
    load()
  }

  async function handleConfirm() {
    setConfirming(true)
    const res = await fetch(`/api/imports/${batchId}/confirm`, { method: "POST" })
    setConfirming(false)
    if (res.ok) router.push("/transactions")
  }

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
  if (!batch) return <p className="text-sm text-destructive py-8 text-center">Import not found.</p>

  const filteredRows = filter === "all" ? batch.rows : batch.rows.filter(r => r.confidenceLevel === filter)
  const pendingRows = batch.rows.filter(r => r.status === "pending")
  const redPendingCount = pendingRows.filter(r => r.confidenceLevel === "red").length
  const canConfirm = batch.status !== "confirmed" && pendingRows.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{batch.rows.length} rows</span>
        <span>·</span>
        <span>{batch.rows.filter(r => r.confidenceLevel === "red").length} red</span>
        <span>·</span>
        <span>{batch.rows.filter(r => r.status === "skipped").length} skipped</span>
        {batch.status === "confirmed" && <Badge variant="secondary">Confirmed</Badge>}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All rows</option>
          <option value="red">Red only</option>
          <option value="amber">Amber only</option>
          <option value="green">Green only</option>
        </select>

        <div className="flex items-center gap-1">
          <Select value={bulkTagId || "none"} onValueChange={v => setBulkTagId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Bulk tag untagged rows" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— select tag —</SelectItem>
              {allTags.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.colour }} />
                    {t.parentId ? "  " : ""}{t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkTag} disabled={!bulkTagId}>
            Apply
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {redPendingCount > 0 && (
            <p className="text-xs text-destructive">
              {redPendingCount} red row{redPendingCount !== 1 ? "s" : ""} need attention
            </p>
          )}
          <Button size="sm" onClick={handleConfirm} disabled={!canConfirm || confirming}>
            {confirming ? "Confirming..." : `Confirm ${pendingRows.length} rows`}
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-4 px-3 py-2" />
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Merchant</th>
              <th className="text-left px-3 py-2 font-medium">Tag</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRows.map(row => {
              const rowReasons = row.confidenceReasons ? JSON.parse(row.confidenceReasons) : []
              const hasLowConfidence = row.confidenceLevel === "amber" && rowReasons.includes("low_confidence_merchant")
              const hasSuggestion = hasLowConfidence && row.merchantResolved !== row.merchantRaw

              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${row.status === "skipped" ? "opacity-50" : ""}`}
                  onClick={() => setSelected(row)}
                >
                  <td className="px-3 py-2.5">
                    <ConfidenceDot level={row.confidenceLevel} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-3 py-2.5 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{row.merchantResolved || row.merchantRaw}</span>
                      {hasSuggestion && (
                        <span className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                            title="Accept this merchant name"
                            onClick={() => {
                              fetch(`/api/imports/${batchId}/rows/${row.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ merchantResolved: row.merchantResolved }),
                              }).then(load)
                            }}
                          >✓</button>
                          <button
                            className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200"
                            title="Reject — keep raw name"
                            onClick={() => {
                              fetch(`/api/imports/${batchId}/rows/${row.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ merchantResolved: row.merchantRaw }),
                              }).then(load)
                            }}
                          >✕</button>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.tag ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.tag.colour }} />
                        <span className="text-xs">{row.tag.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Untagged</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatAmount(row.amount)}</td>
                  <td className="px-3 py-2.5">
                    {row.status === "skipped" && <Badge variant="outline" className="text-xs">Skipped</Badge>}
                    {row.status === "confirmed" && <Badge variant="secondary" className="text-xs">Confirmed</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <ImportRowDialog
          row={selected}
          batchId={batchId}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
