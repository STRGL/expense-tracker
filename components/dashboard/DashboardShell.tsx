"use client"

import { useState, useEffect, useCallback } from "react"
import Spinner from "@/components/ui/Spinner"
import { Button } from "@/components/ui/button"
import { getDefaultPeriod, computeDateRange, type Preset } from "@/lib/period-utils"
import PeriodSelector, { type DashboardPeriod } from "./PeriodSelector"
import WidgetGrid from "./WidgetGrid"
import SummaryCards from "./widgets/SummaryCards"
import SpendByTag from "./widgets/SpendByTag"
import SpendOverTime from "./widgets/SpendOverTime"
import TagTrends from "./widgets/TagTrends"
import TopMerchants from "./widgets/TopMerchants"
import TopTransactions from "./widgets/TopTransactions"
import type { DashboardConfig, DashboardData, DashboardWidget, DashboardWidgetType } from "@/types/dashboard"

type WidgetRenderer = (data: DashboardData | null, w: DashboardWidget) => React.ReactNode

const WIDGET_COMPONENTS: Record<DashboardWidgetType, WidgetRenderer> = {
  summary_cards: (data) => <SummaryCards data={data} />,
  spend_by_tag: (data, w) => <SpendByTag data={data} chartType={(w.chartType as "donut" | "bar") ?? "donut"} />,
  spend_over_time: (data, w) => <SpendOverTime data={data} chartType={(w.chartType as "bar" | "line") ?? "bar"} />,
  tag_trends_increase: (data) => <TagTrends data={data} direction="increase" />,
  tag_trends_decrease: (data) => <TagTrends data={data} direction="decrease" />,
  top_merchants: (data) => <TopMerchants data={data} />,
  top_transactions: (data) => <TopTransactions data={data} />,
}

export default function DashboardShell() {
  const defaultPeriod = getDefaultPeriod()
  const [period, setPeriod] = useState<DashboardPeriod>(defaultPeriod)
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [locked, setLocked] = useState(true)
  const [loading, setLoading] = useState(true)

  const periodRange = period.preset === "custom" && period.customFrom && period.customTo
    ? {
        dateFrom: new Date(period.customFrom),
        dateTo: new Date(period.customTo + "T23:59:59"),
        label: `${period.customFrom} – ${period.customTo}`,
      }
    : computeDateRange(period.preset as Preset, period.year, period.month)

  const { dateFrom, dateTo, label } = periodRange ?? { dateFrom: null as Date | null, dateTo: null as Date | null, label: "" }

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    
    let ignore = false
    const fetchData = async () => {
      setLoading(true)
      const from = dateFrom.toISOString().slice(0, 10)
      const to = dateTo.toISOString().slice(0, 10)
      const r = await fetch(`/api/dashboard?dateFrom=${from}&dateTo=${to}`)
      const data = await r.json()
      if (!ignore) {
        setDashData(data)
        setLoading(false)
      }
    }
    
    fetchData()
    return () => { ignore = true }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetch("/api/dashboard/config").then(r => r.json()).then(setConfig)
  }, [])

  const handleWidgetReorder = useCallback(async (newWidgets: DashboardWidget[]) => {
    if (!config) return
    const updated: DashboardConfig = { ...config, widgets: newWidgets }
    setConfig(updated)
    await fetch("/api/dashboard/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
  }, [config])

  if (!config) {
    return <Spinner />
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
        <Spinner />
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
