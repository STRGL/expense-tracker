import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function DeltaLine({ change, invert = false }: { change: number | null | undefined; invert?: boolean }) {
  if (change == null) return <p className="text-xs text-muted-foreground">—</p>
  const positive = change >= 0
  const good = invert ? !positive : positive
  const sign = positive ? "+" : "−"
  return (
    <p className={`text-xs ${good ? "text-green-600" : "text-red-600"}`}>
      {sign}{Math.abs(change).toFixed(1)}% vs prev. period
    </p>
  )
}

interface Props {
  data: DashboardData | null | undefined
}

export default function SummaryCards({ data }: Props) {
  const { totalIn, totalOut, balance, totalInChange, totalOutChange, balanceChange, mostUsedTag } = data?.summary ?? {}
  const hasData = totalIn != null || totalOut != null
  return (
    <WidgetContainer title="Summary" empty={!hasData} insufficient={false}>
      <div className="grid grid-cols-4 gap-3 h-full">
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Total in</p>
          <p className="text-2xl font-semibold tabular-nums">{formatAmount(totalIn ?? 0)}</p>
          <DeltaLine change={totalInChange} />
        </div>
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Total out</p>
          <p className="text-2xl font-semibold tabular-nums">{formatAmount(totalOut ?? 0)}</p>
          <DeltaLine change={totalOutChange} invert />
        </div>
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className={`text-2xl font-semibold tabular-nums ${(balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatAmount(balance ?? 0)}
          </p>
          <DeltaLine change={balanceChange} />
        </div>
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Most used tag</p>
          {mostUsedTag ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: mostUsedTag.colour }} />
              <p className="text-sm font-medium truncate">{mostUsedTag.name}</p>
              <p className="text-xs text-muted-foreground">({mostUsedTag.count}×)</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </WidgetContainer>
  )
}
