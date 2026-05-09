// "use client" required — Recharts uses browser APIs
"use client"

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)
}

function formatPeriod(p: string) {
  const [y, m] = p.split("-")
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
}

interface TooltipPayloadItem {
  value?: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-background border rounded-md px-2 py-1.5 text-xs shadow">
      <p className="font-medium">{formatPeriod(label)}</p>
      <p>{formatAmount(payload[0].value ?? 0)}</p>
    </div>
  )
}

interface Props {
  data: DashboardData | null | undefined
  chartType?: "bar" | "line"
}

export default function SpendOverTime({ data, chartType = "bar" }: Props) {
  const rawData = data?.spendOverTime ?? []
  const empty = rawData.length === 0
  const chartData = rawData.map(d => ({ period: d.period, amount: Math.round(d.amount * 100) / 100 }))

  return (
    <WidgetContainer title="Spending over time" empty={empty} insufficient={false}>
      <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" ? (
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
    </WidgetContainer>
  )
}
