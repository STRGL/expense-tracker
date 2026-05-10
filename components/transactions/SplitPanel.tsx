"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateSplits, type SplitResult, type ProportionalResult } from "@/lib/split-calculator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type SplitMethod = "equal" | "proportional" | "specified"

export interface Split {
  userId: string
  amount: number
  splitMethod: string
  tagId: string | null
}

interface ActiveUser {
  id: string
  name: string
  wage?: number | null
}

interface Props {
  totalAmount: number
  currentUserId: string
  onChange: (splits: Split[]) => void
  initialSplits?: Split[]
}

export default function SplitPanel({ totalAmount, currentUserId, onChange, initialSplits }: Props) {
  const hasInitialSplit = initialSplits && (initialSplits.length > 1 || initialSplits.some(s => s.userId !== currentUserId))
  const [splitting, setSplitting] = useState(hasInitialSplit ?? false)
  const [method, setMethod] = useState<SplitMethod>(
    hasInitialSplit ? (initialSplits[0]?.splitMethod as SplitMethod ?? "equal") : "equal"
  )
  const [users, setUsers] = useState<ActiveUser[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(
    hasInitialSplit ? initialSplits.filter(s => s.userId !== currentUserId).map(s => s.userId) : []
  )
  const [amounts, setAmounts] = useState<Record<string, number>>(
    hasInitialSplit ? Object.fromEntries(initialSplits.map(s => [s.userId, Math.abs(s.amount)])) : {}
  )
  const [isPending, setIsPending] = useState(false)
  
  const lastSplitsRef = useRef<string>("")

  useEffect(() => {
    fetch("/api/users/active")
      .then((r) => r.json())
      .then(setUsers)
  }, [])

  // 1. Automatic calculation based on method/selection
  useEffect(() => {
    const update = async () => {
      if (!splitting) {
        const splits = [{ userId: currentUserId, amount: totalAmount, splitMethod: "equal", tagId: null }]
        const sig = JSON.stringify(splits)
        if (sig !== lastSplitsRef.current) {
          lastSplitsRef.current = sig
          onChange(splits)
        }
        await Promise.resolve()
        setIsPending(false)
        return
      }

      if (method === "equal" || method === "proportional") {
        const uniqueIds = [...new Set([currentUserId, ...selectedIds])]
        try {
          const userObjs = uniqueIds.map((id) => {
            const u = users.find((u) => u.id === id)
            return { id, wage: u?.wage }
          })
          const result: SplitResult[] | ProportionalResult = calculateSplits(totalAmount, method, userObjs)
          const computedSplits: SplitResult[] = Array.isArray(result) ? result : result.splits
          const pending = Array.isArray(result) ? false : result.pendingData

          const newAmounts = Object.fromEntries(computedSplits.map((s) => [s.userId, s.amount]))
          
          // Update local amounts state if changed
          setAmounts(prev => {
            const changed = Object.keys(newAmounts).length !== Object.keys(prev).length ||
              Object.keys(newAmounts).some(k => Math.abs(newAmounts[k] - prev[k]) > 0.005)
            return changed ? newAmounts : prev
          })
          
          await Promise.resolve()
          setIsPending(pending)
          
          const splits = computedSplits.map((s) => ({ userId: s.userId, amount: s.amount, splitMethod: method, tagId: null }))
          const sig = JSON.stringify(splits)
          if (sig !== lastSplitsRef.current) {
            lastSplitsRef.current = sig
            onChange(splits)
          }
        } catch {
          const splits: Split[] = []
          const sig = JSON.stringify(splits)
          if (sig !== lastSplitsRef.current) {
            lastSplitsRef.current = sig
            onChange(splits)
          }
          await Promise.resolve()
          setIsPending(false)
        }
      }
    }
    update()
  }, [splitting, method, selectedIds, totalAmount, users, currentUserId, onChange])

  // 2. Manual calculation for "specified" method
  useEffect(() => {
    const update = async () => {
      if (splitting && method === "specified") {
        const uniqueIds = [...new Set([currentUserId, ...selectedIds])]
        const splits = uniqueIds.map((id) => ({
          userId: id,
          amount: amounts[id] ?? 0,
          splitMethod: "specified",
          tagId: null,
        }))
        const sig = JSON.stringify(splits)
        if (sig !== lastSplitsRef.current) {
          lastSplitsRef.current = sig
          onChange(splits)
        }
        await Promise.resolve()
        setIsPending(false)
      }
    }
    update()
  }, [splitting, method, selectedIds, amounts, currentUserId, onChange])

  function toggleUser(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const otherUsers = users.filter((u) => u.id !== currentUserId)
  const allIncluded = [...new Set([currentUserId, ...selectedIds])]
  const canProportional = users.length > 1

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="font-normal">Split this transaction?</Label>
        <button
          type="button"
          onClick={() => setSplitting((s) => !s)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            splitting ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              splitting ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {splitting && (
        <div className="space-y-3 pl-2 border-l-2 border-muted">
          <div className="flex gap-2">
            <TooltipProvider>
              {(["equal", "proportional", "specified"] as SplitMethod[]).map((m) => {
                const label = m === "equal" ? "Equal" : m === "proportional" ? "By wage" : "Custom"
                const disabled = m === "proportional" && !canProportional
                const button = (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMethod(m)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      method === m
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-foreground"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {label}
                  </button>
                )

                if (disabled) {
                  return (
                    <Tooltip key={m}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent>Proportional split requires at least 2 active users.</TooltipContent>
                    </Tooltip>
                  )
                }
                return button
              })}
            </TooltipProvider>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Split with</Label>
            {otherUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">No other active users.</p>
            )}
            {otherUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`split-${u.id}`}
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor={`split-${u.id}`} className="font-normal text-sm cursor-pointer">
                    {u.name}
                    {u.wage ? (
                      <span className="text-muted-foreground text-xs ml-1">
                        (£{u.wage.toLocaleString()}/yr)
                      </span>
                    ) : (
                      allIncluded.includes(u.id) && method === "proportional" && (
                        <span className="text-amber-600 text-[10px] font-medium ml-1 uppercase tracking-wider">
                          Pending Wage
                        </span>
                      )
                    )}
                  </Label>
                </div>
                {method === "specified" && selectedIds.includes(u.id) && (
                  <Input
                    type="number"
                    className="h-7 w-24 text-sm text-right"
                    min="0"
                    step="0.01"
                    value={amounts[u.id] ?? ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setAmounts((a) => ({ ...a, [u.id]: val }))
                    }}
                  />
                )}
                {method !== "specified" && allIncluded.includes(u.id) && (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {isPending && !u.wage ? "—" : `£${(amounts[u.id] ?? 0).toFixed(2)}`}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm border-t pt-2">
            <span className="font-medium">Your share</span>
            {method === "specified" ? (
              <Input
                type="number"
                className="h-7 w-24 text-sm text-right"
                min="0"
                step="0.01"
                value={amounts[currentUserId] ?? ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setAmounts((a) => ({ ...a, [currentUserId]: val }))
                }}
              />
            ) : (
              <span className="tabular-nums font-medium">
                {isPending ? "—" : `£${(amounts[currentUserId] ?? totalAmount).toFixed(2)}`}
              </span>
            )}
          </div>

          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              <p className="text-[11px] text-amber-800 leading-tight">
                <strong>Calculation Pending:</strong> Some users haven&apos;t set their wage. We&apos;ll notify them to update their profile so the split can be completed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
