"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

const COLOURS = ["#f97316", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899", "#eab308", "#6b7280", "#ef4444"]

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)
}

interface TooltipPayloadItem {
  name?: string
  value?: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-background border rounded-md px-2 py-1.5 text-xs shadow">
      <p className="font-medium">{name}</p>
      <p>{formatAmount(value ?? 0)}</p>
    </div>
  )
}

interface Props {
  data: DashboardData | null | undefined
  chartType?: "donut" | "bar"
}

export default function SpendByTag({ data, chartType = "donut" }: Props) {
  const [drillTarget, setDrillTarget] = useState<string | null>(null)

  const allTags = data?.spendByTag ?? []
  const empty = allTags.length === 0

  const topLevel = allTags.filter(t => !t.parentId)
  const chartData = (drillTarget
    ? allTags.filter(t => t.parentId === drillTarget)
    : topLevel
  ).map((t, i) => ({
    name: t.tagName,
    value: Math.round(t.amount * 100) / 100,
    fill: t.colour ?? COLOURS[i % COLOURS.length],
    tagId: t.tagId,
  }))

  const drillLabel = drillTarget
    ? topLevel.find(t => t.tagId === drillTarget)?.tagName ?? ""
    : null

  return (
    <WidgetContainer title={drillLabel ? `Spending — ${drillLabel}` : "Spending by tag"} empty={empty} insufficient={false}>
      <div className="flex flex-col gap-2">
        {drillTarget && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground mb-1 text-left"
            onClick={() => setDrillTarget(null)}
          >
            ← Back to categories
          </button>
        )}

        <div className="h-[240px]">
          {chartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(data: unknown) => { const d = data as { tagId?: string | null } | null; if (!drillTarget && d?.tagId) setDrillTarget(d.tagId) }}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={chartType === "donut" ? "50%" : 0}
                  outerRadius="80%"
                  dataKey="value"
                  onClick={(data: unknown) => { const d = data as { tagId?: string | null } | null; if (!drillTarget && d?.tagId) setDrillTarget(d.tagId) }}
                  style={{ cursor: drillTarget ? "default" : "pointer" }}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 shrink-0">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-muted-foreground truncate max-w-[80px]">{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetContainer>
  )
}
