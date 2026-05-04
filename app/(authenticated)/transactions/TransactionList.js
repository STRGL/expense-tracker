"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ConfidenceDot from "@/components/transactions/ConfidenceDot"
import TransactionDialog from "@/components/transactions/TransactionDialog"

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tags, setTags] = useState([])
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState({
    merchant: searchParams.get("merchant") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    tagId: searchParams.get("tagId") ?? "",
    minAmount: searchParams.get("minAmount") ?? "",
    maxAmount: searchParams.get("maxAmount") ?? "",
    sortBy: searchParams.get("sortBy") ?? "date",
    sortOrder: searchParams.get("sortOrder") ?? "desc",
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((tree) => {
      const flat = []
      for (const parent of tree) { flat.push(parent); for (const c of parent.children) flat.push(c) }
      setTags(flat)
    })
  }, [])

  function handleSortChange(field) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
    }))
  }

  function SortIcon({ field }) {
    if (filters.sortBy !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>
    return <span className="ml-1">{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
  }

  const hasFilters = Object.entries(filters).some(([k, v]) => k !== "sortBy" && k !== "sortOrder" && v)

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search merchant..."
          className="h-8 w-44 text-sm"
          value={filters.merchant}
          onChange={(e) => setFilters((f) => ({ ...f, merchant: e.target.value }))}
        />
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          title="From date"
        />
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          title="To date"
        />
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={filters.tagId}
          onChange={(e) => setFilters((f) => ({ ...f, tagId: e.target.value }))}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.parentId ? "  " : ""}{t.name}</option>
          ))}
        </select>
        <Input
          type="number"
          placeholder="Min £"
          className="h-8 w-24 text-sm"
          value={filters.minAmount}
          onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
        />
        <Input
          type="number"
          placeholder="Max £"
          className="h-8 w-24 text-sm"
          value={filters.maxAmount}
          onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilters({ merchant: "", dateFrom: "", dateTo: "", tagId: "", minAmount: "", maxAmount: "", sortBy: "date", sortOrder: "desc" })}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No transactions found.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="w-4 px-3 py-2" />
                <th
                  className="text-left px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSortChange("date")}
                >
                  Date <SortIcon field="date" />
                </th>
                <th
                  className="text-left px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSortChange("merchant")}
                >
                  Merchant <SortIcon field="merchant" />
                </th>
                <th className="text-left px-3 py-2 font-medium">Tag</th>
                <th
                  className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSortChange("amount")}
                >
                  My amount <SortIcon field="amount" />
                </th>
                <th className="text-right px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(tx)}
                >
                  <td className="px-3 py-2.5">
                    <ConfidenceDot level={tx.confidenceLevel} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                    {tx.merchantName}
                  </td>
                  <td className="px-3 py-2.5">
                    {tx.myTag ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: tx.myTag.colour }}
                        />
                        <span className="text-xs">{tx.myTag.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Untagged</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                    {formatAmount(tx.myAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                    {tx.splitCount > 1 ? (
                      <span className="flex items-center justify-end gap-1.5">
                        {formatAmount(tx.totalAmount)}
                        <Badge variant="outline" className="text-xs py-0 h-4">
                          ÷{tx.splitCount}
                        </Badge>
                      </span>
                    ) : (
                      formatAmount(tx.totalAmount)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <TransactionDialog
          transaction={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
