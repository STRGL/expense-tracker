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
  const [total, setTotal] = useState(0)
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
    page: 1,
    limit: 25,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (k === "page") {
        params.set("offset", (filters.page - 1) * filters.limit)
      } else if (v) {
        params.set(k, v)
      }
    })
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.transactions || [])
    setTotal(data.total || 0)
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

  function handleFilterChange(updates) {
    setFilters((f) => {
      const next = { ...f, ...updates }
      // Reset page to 1 if any filter other than page changes
      if (!updates.page) {
        next.page = 1
      }
      return next
    })
  }

  function handleSortChange(field) {
    handleFilterChange({
      sortBy: field,
      sortOrder: filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc",
    })
  }

  function SortIcon({ field }) {
    if (filters.sortBy !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>
    return <span className="ml-1">{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
  }

  const hasFilters = Object.entries(filters).some(([k, v]) => !["sortBy", "sortOrder", "page", "limit"].includes(k) && v)
  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search merchant..."
          className="h-8 w-44 text-sm"
          value={filters.merchant}
          onChange={(e) => handleFilterChange({ merchant: e.target.value })}
        />
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.dateFrom}
          onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
          title="From date"
        />
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.dateTo}
          onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
          title="To date"
        />
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={filters.tagId}
          onChange={(e) => handleFilterChange({ tagId: e.target.value })}
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
          onChange={(e) => handleFilterChange({ minAmount: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Max £"
          className="h-8 w-24 text-sm"
          value={filters.maxAmount}
          onChange={(e) => handleFilterChange({ maxAmount: e.target.value })}
        />
        <div className="h-8 border-l mx-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Show</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={filters.limit}
            onChange={(e) => handleFilterChange({ limit: Number(e.target.value) })}
          >
            {[25, 50, 75].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleFilterChange({ merchant: "", dateFrom: "", dateTo: "", tagId: "", minAmount: "", maxAmount: "", sortBy: "date", sortOrder: "desc" })}
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
        <div className="space-y-3">
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-1 py-1">
            <div className="text-xs text-muted-foreground">
              Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, total)} of {total} transactions
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleFilterChange({ page: filters.page - 1 })}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1
                  // Simple sliding window for page numbers
                  if (totalPages > 5 && filters.page > 3) {
                    p = filters.page - 2 + i
                    if (p + (4 - i) > totalPages) p = totalPages - 4 + i
                  }
                  if (p <= 0 || p > totalPages) return null

                  return (
                    <Button
                      key={p}
                      variant={filters.page === p ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => handleFilterChange({ page: p })}
                    >
                      {p}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleFilterChange({ page: filters.page + 1 })}
                disabled={filters.page === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
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
