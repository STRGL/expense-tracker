// components/dashboard/PeriodSelector.js
"use client"

import { Button } from "@/components/ui/button"
import { isAtCurrentMonth, navigatePeriod } from "@/lib/period-utils"

const PRESETS = ["monthly", "quarterly", "yearly", "custom"]
const PRESET_LABELS = { monthly: "Month", quarterly: "Quarter", yearly: "Year", custom: "Custom" }

export default function PeriodSelector({ preset, year, month, label, customFrom, customTo, onChange }) {
  const atCurrent = preset !== "custom" && isAtCurrentMonth(preset, year, month)

  function nav(direction) {
    const next = navigatePeriod(preset, year, month, direction)
    onChange({ preset, ...next })
  }

  function setPreset(p) {
    onChange({ preset: p, year, month, customFrom, customTo })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-md border overflow-hidden">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              preset === p
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom ?? ""}
            onChange={e => onChange({ preset, year, month, customFrom: e.target.value, customTo })}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo ?? ""}
            onChange={e => onChange({ preset, year, month, customFrom, customTo: e.target.value })}
            className="h-7 rounded-md border bg-background px-2 text-xs"
            min={customFrom ?? undefined}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => nav(-1)}>←</Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{label}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => nav(1)}
            disabled={atCurrent}
          >
            →
          </Button>
        </div>
      )}
    </div>
  )
}
