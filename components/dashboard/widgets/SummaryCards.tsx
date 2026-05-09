import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

interface Props {
  data: DashboardData | null | undefined
}

export default function SummaryCards({ data }: Props) {
  const { totalSpend, biggestTransaction, mostUsedTag } = data?.summary ?? {}
  return (
    <WidgetContainer title="Summary" empty={!totalSpend && totalSpend !== 0} insufficient={false}>
      <div className="grid grid-cols-3 gap-3 h-full">
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Total spend</p>
          <p className="text-xl font-semibold tabular-nums">{formatAmount(totalSpend ?? 0)}</p>
        </div>
        <div className="flex flex-col justify-center space-y-0.5">
          <p className="text-xs text-muted-foreground">Biggest transaction</p>
          {biggestTransaction ? (
            <>
              <p className="text-xl font-semibold tabular-nums">{formatAmount(biggestTransaction.amount)}</p>
              <p className="text-xs text-muted-foreground truncate">{biggestTransaction.merchantName} · {formatDate(biggestTransaction.date)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
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
