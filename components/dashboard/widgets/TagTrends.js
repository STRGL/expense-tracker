import WidgetContainer from "../WidgetContainer"

function formatAmount(n) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

export default function TagTrends({ data, direction }) {
  const trends = direction === "increase"
    ? (data?.tagTrends?.increases ?? [])
    : (data?.tagTrends?.decreases ?? [])

  const title = direction === "increase" ? "Top 3 tag increases" : "Top 3 tag decreases"
  const hasPrev = data?.tagTrends !== undefined
  const insufficient = hasPrev && trends.length === 0 && (data?.summary?.totalSpend ?? 0) > 0

  return (
    <WidgetContainer title={title} empty={trends.length === 0 && !insufficient} insufficient={insufficient}>
      <div className="space-y-2">
        {trends.map((t, i) => (
          <div key={t.tagId} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-4 shrink-0">{i + 1}.</span>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.colour }} />
            <span className="text-sm flex-1 truncate">{t.tagName}</span>
            <span className={`text-xs font-medium tabular-nums ${direction === "increase" ? "text-red-600" : "text-green-600"}`}>
              {t.change !== null ? `${direction === "increase" ? "+" : ""}${t.change.toFixed(0)}%` : "new"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{formatAmount(t.currentAmount)}</span>
          </div>
        ))}
      </div>
    </WidgetContainer>
  )
}
