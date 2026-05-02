// components/transactions/SplitPanel.js
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateSplits } from "@/lib/split-calculator"

export default function SplitPanel({ totalAmount, currentUserId, onChange }) {
  const [splitting, setSplitting] = useState(false)
  const [method, setMethod] = useState("equal")
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [amounts, setAmounts] = useState({})

  useEffect(() => {
    fetch("/api/users/active")
      .then((r) => r.json())
      .then(setUsers)
  }, [])

  useEffect(() => {
    if (!splitting) {
      onChange([{ userId: currentUserId, amount: totalAmount, splitMethod: "equal", tagId: null }])
      return
    }
    const uniqueIds = [...new Set([currentUserId, ...selectedIds])]
    if (method === "equal" || method === "proportional") {
      try {
        const userObjs = uniqueIds.map((id) => {
          const u = users.find((u) => u.id === id)
          return { id, wage: u?.wage ?? 0 }
        })
        const computed = calculateSplits(totalAmount, method, userObjs)
        const newAmounts = Object.fromEntries(computed.map((s) => [s.userId, s.amount]))
        setAmounts(newAmounts)
        onChange(computed.map((s) => ({ userId: s.userId, amount: s.amount, splitMethod: method, tagId: null })))
      } catch {
        onChange([])
      }
    } else {
      const splits = uniqueIds.map((id) => ({
        userId: id,
        amount: amounts[id] ?? 0,
        splitMethod: "specified",
        tagId: null,
      }))
      onChange(splits)
    }
  }, [splitting, method, selectedIds, totalAmount, users, currentUserId])

  function toggleUser(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const otherUsers = users.filter((u) => u.id !== currentUserId)
  const allIncluded = [...new Set([currentUserId, ...selectedIds])]

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
            {["equal", "proportional", "specified"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  method === m
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {m === "equal" ? "Equal" : m === "proportional" ? "By wage" : "Custom"}
              </button>
            ))}
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
                    {u.wage && (
                      <span className="text-muted-foreground text-xs ml-1">
                        (£{u.wage.toLocaleString()}/yr)
                      </span>
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
                    £{(amounts[u.id] ?? 0).toFixed(2)}
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
                £{(amounts[currentUserId] ?? totalAmount).toFixed(2)}
              </span>
            )}
          </div>

          {method === "proportional" && allIncluded.some((id) => {
            const u = users.find((u) => u.id === id)
            return !u?.wage
          }) && (
            <p className="text-xs text-amber-600">
              Some users have no wage set — set wages in Settings for proportional splits.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
