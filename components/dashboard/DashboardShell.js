// components/dashboard/DashboardShell.js
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { getDefaultPeriod, computeDateRange } from "@/lib/period-utils"
import PeriodSelector from "./PeriodSelector"
import WidgetGrid from "./WidgetGrid"
import SummaryCards from "./widgets/SummaryCards"
import SpendByTag from "./widgets/SpendByTag"
import SpendOverTime from "./widgets/SpendOverTime"
import TagTrends from "./widgets/TagTrends"
import TopMerchants from "./widgets/TopMerchants"
import TopTransactions from "./widgets/TopTransactions"

const WIDGET_COMPONENTS = {
  summary_cards: (data) => <SummaryCards data={data} />,
  spend_by_tag: (data, w) => <SpendByTag data={data} chartType={w.chartType ?? "donut"} />,
  spend_over_time: (data, w) => <SpendOverTime data={data} chartType={w.chartType ?? "bar"} />,
  tag_trends_increase: (data) => <TagTrends data={data} direction="increase" />,
  tag_trends_decrease: (data) => <TagTrends data={data} direction="decrease" />,
  top_merchants: (data) => <TopMerchants data={data} />,
  top_transactions: (data) => <TopTransactions data={data} />,
}

export default function DashboardShell() {
  const defaultPeriod = getDefaultPeriod()
  const [period, setPeriod] = useState(defaultPeriod)
  const [dashData, setDashData] = useState(null)
  const [config, setConfig] = useState(null)
  const [locked, setLocked] = useState(true)
  const [loading, setLoading] = useState(true)

  const periodRange = period.preset === "custom" && period.customFrom && period.customTo
    ? {
        dateFrom: new Date(period.customFrom),
        dateTo: new Date(period.customTo + "T23:59:59"),
        label: `${period.customFrom} – ${period.customTo}`,
      }
    : computeDateRange(period.preset, period.year, period.month)

  const { dateFrom, dateTo, label } = periodRange ?? { dateFrom: null, dateTo: null, label: "" }

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    const from = dateFrom.toISOString().slice(0, 10)
    const to = dateTo.toISOString().slice(0, 10)
    fetch(`/api/dashboard?dateFrom=${from}&dateTo=${to}`)
      .then(r => r.json())
      .then(data => { setDashData(data); setLoading(false) })
  }, [period.preset, period.year, period.month, period.customFrom, period.customTo])

  useEffect(() => {
    fetch("/api/dashboard/config").then(r => r.json()).then(setConfig)
  }, [])

  const handleWidgetReorder = useCallback(async (newWidgets) => {
    if (!config) return
    const updated = { ...config, widgets: newWidgets }
    setConfig(updated)
    await fetch("/api/dashboard/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
  }, [config])

  if (!config) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading dashboard...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PeriodSelector
          preset={period.preset}
          year={period.year}
          month={period.month}
          label={label}
          customFrom={period.customFrom}
          customTo={period.customTo}
          onChange={setPeriod}
        />
        <Button
          variant={locked ? "outline" : "default"}
          size="sm"
          onClick={() => setLocked(l => !l)}
        >
          {locked ? "Edit layout" : "Lock layout"}
        </Button>
      </div>

      {!locked && (
        <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
          Layout unlocked — drag widgets to reorder. Changes save automatically.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <WidgetGrid
          widgets={config.widgets}
          locked={locked}
          onReorder={handleWidgetReorder}
        >
          {config.widgets.map(widget => {
            const renderFn = WIDGET_COMPONENTS[widget.type]
            if (!renderFn) return null
            return renderFn(dashData, widget)
          })}
        </WidgetGrid>
      )}
    </div>
  )
}
