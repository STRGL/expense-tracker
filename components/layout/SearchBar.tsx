// components/layout/SearchBar.js
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import TransactionDialog from "@/components/transactions/TransactionDialog"
import type { TransactionListItem } from "@/types/api"
import type { ChangeEvent, KeyboardEvent } from "react"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TransactionListItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<TransactionListItem | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setResults(data)
          setOpen(true)
        }
      } catch {
        // silently fail — dropdown stays closed
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    search(q)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur() }
    if (e.key === "Enter" && query.trim()) {
      setOpen(false)
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function viewInMonth(tx: TransactionListItem) {
    const d = new Date(tx.date)
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    setOpen(false)
    router.push(`/transactions?dateFrom=${from}&dateTo=${to}`)
  }

  function allFromMerchant(tx: TransactionListItem) {
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(tx.merchantName)}`)
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        placeholder="Search transactions..."
        className="pl-8 h-9 text-sm"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        autoComplete="off"
      />

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 overflow-hidden">
          {loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
          )}

          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results found.</p>
          )}

          {results.map(tx => (
            <div key={tx.id} className="group px-3 py-2 border-b last:border-0 hover:bg-muted/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.date)} · {formatAmount(tx.myAmount)}
                    {tx.myTag && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.myTag.colour }} />
                        {tx.myTag.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                    onClick={() => { setOpen(false); setSelected(tx) }}
                    title="Open transaction"
                  >
                    Open
                  </button>
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                    onClick={() => viewInMonth(tx)}
                    title="View in month"
                  >
                    Month
                  </button>
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                    onClick={() => allFromMerchant(tx)}
                    title="All from this merchant"
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && (
            <div className="px-3 py-1.5 border-t bg-muted/20">
              <button
                className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
                onClick={() => {
                  setOpen(false)
                  router.push(`/search?q=${encodeURIComponent(query)}`)
                }}
              >
                Advanced search →
              </button>
            </div>
          )}
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
