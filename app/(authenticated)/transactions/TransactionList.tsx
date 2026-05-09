"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react"
import type { TransactionDetail } from "@/components/transactions/TransactionDialog"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Spinner from "@/components/ui/Spinner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ConfidenceDot from "@/components/transactions/ConfidenceDot"
import TransactionDialog from "@/components/transactions/TransactionDialog"
import BulkActionBar from "@/components/ui/BulkActionBar"
import type { TransactionListItem, TagSummary } from "@/types/api"

interface FlatTag extends TagSummary {
  parentId: string | null
}

interface Filters {
  merchant: string
  dateFrom: string
  dateTo: string
  tagId: string
  minAmount: string
  maxAmount: string
  sortBy: string
  sortOrder: string
  page: number
  limit: number
}

interface Props {
  onReload?: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(amount))
}

function AmountCell({ amount, className = "" }: { amount: number; className?: string }) {
  const isCredit = amount > 0
  return (
    <span className={`${isCredit ? "text-green-600" : ""} ${className}`}>
      {isCredit ? "+" : "-"}{formatAmount(amount)}
      {isCredit && <span className="ml-1 text-xs font-normal">CR</span>}
    </span>
  )
}

export default function TransactionList({ onReload: _onReload }: Props = {}) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TransactionListItem | null>(null)
  const [tags, setTags] = useState<FlatTag[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [childrenMap, setChildrenMap] = useState<Record<string, TransactionDetail[]>>({})
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Filters>({
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
        params.set("offset", String((filters.page - 1) * filters.limit))
      } else if (v) {
        params.set(k, String(v))
      }
    })
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.transactions || [])
    setTotal(data.total || 0)
    setLoading(false)
    setSelectedIds(new Set())
  }, [filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((tree: Array<FlatTag & { children: FlatTag[] }>) => {
      const flat: FlatTag[] = []
      for (const parent of tree) { flat.push(parent); for (const c of parent.children) flat.push(c) }
      setTags(flat)
    })
  }, [])

  function handleFilterChange(updates: Partial<Filters>) {
    setFilters((f) => {
      const next = { ...f, ...updates }
      if (!updates.page) {
        next.page = 1
      }
      return next
    })
  }

  function handleSortChange(field: string) {
    handleFilterChange({
      sortBy: field,
      sortOrder: filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc",
    })
  }

  function SortIcon({ field }: { field: string }) {
    if (filters.sortBy !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>
    return <span className="ml-1">{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map(tx => tx.id)))
    }
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/transactions/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    })
    if (res.ok) load()
  }

  async function handleBulkTagChange(tagId: string | null) {
    const res = await fetch("/api/transactions/bulk-tag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), tagId }),
    })
    if (res.ok) load()
  }

  async function handleBulkRenameMerchant(name: string) {
    const res = await fetch("/api/transactions/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), merchantName: name }),
    })
    if (res.ok) load()
  }

  async function toggleChildren(txId: string) {
    if (expandedIds.has(txId)) {
      setExpandedIds(prev => { const n = new Set(prev); n.delete(txId); return n })
      return
    }
    if (!childrenMap[txId]) {
      setLoadingChildren(prev => new Set(prev).add(txId))
      const res = await fetch(`/api/transactions/${txId}`)
      if (res.ok) {
        const data = await res.json()
        setChildrenMap(prev => ({ ...prev, [txId]: data.children ?? [] }))
      }
      setLoadingChildren(prev => { const n = new Set(prev); n.delete(txId); return n })
    }
    setExpandedIds(prev => new Set(prev).add(txId))
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
        <Spinner />
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No transactions found.</p>
      ) : (
        <div className="space-y-3">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="w-8 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={selectedIds.size > 0 && selectedIds.size === transactions.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="w-4 px-1 py-2" />
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
                  <React.Fragment key={tx.id}>
                    <tr
                      key={`row-${tx.id}`}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${selectedIds.has(tx.id) ? "bg-muted/50" : ""}`}
                      onClick={() => setSelected(tx)}
                    >
                      <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        {tx.hasChildren ? (
                          <button
                            type="button"
                            className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); void toggleChildren(tx.id) }}
                            aria-label={expandedIds.has(tx.id) ? "Collapse line items" : "Expand line items"}
                          >
                            {loadingChildren.has(tx.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : expandedIds.has(tx.id) ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : (
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={selectedIds.has(tx.id)}
                            onChange={() => toggleSelection(tx.id)}
                          />
                        )}
                      </td>
                      <td className="px-1 py-2.5">
                        <ConfidenceDot level={tx.confidenceLevel} />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                        {tx.merchantName}
                        {tx.splitMethod === "proportional" && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal italic">(Pending)</span>
                        )}
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
                        <AmountCell amount={tx.myAmount} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                        {tx.splitCount > 1 ? (
                          <span className="flex items-center justify-end gap-1.5">
                            <AmountCell amount={tx.totalAmount} />
                            <Badge variant="outline" className="text-xs py-0 h-4">
                              ÷{tx.splitCount}
                            </Badge>
                          </span>
                        ) : (
                          <AmountCell amount={tx.totalAmount} />
                        )}
                      </td>
                    </tr>
                    {expandedIds.has(tx.id) && (childrenMap[tx.id] ?? []).map((child) => (
                      <tr
                        key={child.id}
                        className="bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => {
                          const listItem: TransactionListItem = {
                            id: child.id,
                            date: typeof child.date === "string" ? child.date : new Date(child.date).toISOString(),
                            merchantName: child.merchantName,
                            merchantRaw: child.merchantRaw,
                            totalAmount: child.totalAmount,
                            notes: child.notes,
                            createdById: "",
                            isOwner: child.isOwner,
                            myAmount: child.mySplit?.amount ?? child.totalAmount,
                            mySplitId: child.mySplit?.id ?? "",
                            myTagId: null,
                            myTag: null,
                            splitMethod: child.mySplit?.splitMethod ?? "equal",
                            splitCount: child.splits.length,
                            importBatchId: null,
                            parentId: tx.id,
                            isSystemLine: false,
                            hasChildren: false,
                          }
                          setSelected(listItem)
                        }}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input type="checkbox" className="h-3.5 w-3.5" disabled />
                        </td>
                        <td className="px-1 py-2.5" />
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDate(typeof child.date === "string" ? child.date : new Date(child.date).toISOString())}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] truncate">
                          <span className="text-xs text-muted-foreground mr-1">↳</span>
                          <span className="text-sm">{child.merchantName}</span>
                        </td>
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          <AmountCell amount={child.mySplit?.amount ?? child.totalAmount} />
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                          <AmountCell amount={child.totalAmount} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
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

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={handleBulkDelete}
        onTagChange={handleBulkTagChange}
        onRenameMerchant={handleBulkRenameMerchant}
        tags={tags}
      />

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
