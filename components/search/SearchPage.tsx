"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TransactionDialog from "@/components/transactions/TransactionDialog"
import type { TransactionListItem } from "@/types/api"
import type { TagWithChildren } from "@/lib/tag-utils"
import type { FormEvent } from "react"

interface FlatTag {
  id: string
  name: string
  colour: string
  parentId: string | null
}

interface SearchFilters {
  dateFrom: string
  dateTo: string
  tagId: string
  minAmount: string
  maxAmount: string
  source: string
  split: string
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""

  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<TransactionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<TransactionListItem | null>(null)
  const [tags, setTags] = useState<FlatTag[]>([])

  const [filters, setFilters] = useState<SearchFilters>({
    dateFrom: "", dateTo: "",
    tagId: "",
    minAmount: "", maxAmount: "",
    source: "",
    split: "",
  })

  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then((tree: TagWithChildren[]) => {
      const flat: FlatTag[] = []
      for (const p of tree) { flat.push(p); for (const c of p.children) flat.push(c) }
      setTags(flat)
    })
  }, [])

  const runSearch = useCallback(async (q: string, f: SearchFilters) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, limit: "50" })
      if (f.dateFrom) params.set("dateFrom", f.dateFrom)
      if (f.dateTo) params.set("dateTo", f.dateTo)
      if (f.tagId) params.set("tagId", f.tagId)
      if (f.minAmount) params.set("minAmount", f.minAmount)
      if (f.maxAmount) params.set("maxAmount", f.maxAmount)
      if (f.source) params.set("source", f.source)
      if (f.split) params.set("split", f.split)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQ) runSearch(initialQ, filters)
  }, [])

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    router.replace(`/search?q=${encodeURIComponent(query)}`)
    runSearch(query, filters)
  }

  function handleFilterChange(key: keyof SearchFilters, value: string) {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    if (query.trim()) runSearch(query, updated)
  }

  function viewInMonth(tx: TransactionListItem) {
    const d = new Date(tx.date)
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    router.push(`/transactions?dateFrom=${from}&dateTo=${to}`)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Find transactions across your history</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            placeholder="Search merchant names, notes..."
            className="pl-8"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button type="button" variant="outline" onClick={() => setShowFilters(f => !f)}>
          {showFilters ? "Hide filters" : "Advanced filters"}
        </Button>
      </form>

      {showFilters && (
        <div className="border rounded-md p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From date</label>
              <Input type="date" className="h-8 text-sm" value={filters.dateFrom}
                onChange={e => handleFilterChange("dateFrom", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To date</label>
              <Input type="date" className="h-8 text-sm" value={filters.dateTo}
                onChange={e => handleFilterChange("dateTo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Min amount (£)</label>
              <Input type="number" className="h-8 text-sm" placeholder="0.00" value={filters.minAmount}
                onChange={e => handleFilterChange("minAmount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Max amount (£)</label>
              <Input type="number" className="h-8 text-sm" placeholder="No limit" value={filters.maxAmount}
                onChange={e => handleFilterChange("maxAmount", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tag</label>
              <Select value={filters.tagId || "all"} onValueChange={v => handleFilterChange("tagId", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any tag</SelectItem>
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Source</label>
              <Select value={filters.source || "all"} onValueChange={v => handleFilterChange("source", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any source</SelectItem>
                  <SelectItem value="manual">Manually entered</SelectItem>
                  <SelectItem value="imported">Imported from CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Split</label>
              <Select value={filters.split || "all"} onValueChange={v => handleFilterChange("split", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All transactions</SelectItem>
                  <SelectItem value="split">Split with others</SelectItem>
                  <SelectItem value="not_split">Not split</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground py-4 text-center">Searching...</p>}

      {!loading && query && results.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">No results for &ldquo;{query}&rdquo;.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Date</th>
                <th className="text-left px-3 py-2 font-medium">Merchant</th>
                <th className="text-left px-3 py-2 font-medium">Tag</th>
                <th className="text-right px-3 py-2 font-medium">My amount</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(tx)}>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                    {tx.merchantName}
                    {tx.splitCount > 1 && (
                      <Badge variant="outline" className="ml-1.5 text-xs py-0 h-4">÷{tx.splitCount}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {tx.myTag ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.myTag.colour }} />
                        <span className="text-xs">{tx.myTag.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Untagged</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatAmount(tx.myAmount)}</td>
                  <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                        onClick={() => viewInMonth(tx)}
                      >Month</button>
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                        onClick={() => router.push(`/search?q=${encodeURIComponent(tx.merchantName)}`)}
                      >All</button>
                    </div>
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
          onSaved={() => setSelected(null)}
        />
      )}
    </div>
  )
}
