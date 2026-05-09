import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

interface Props {
  data: DashboardData | null | undefined
}

export default function TopMerchants({ data }: Props) {
  const merchants = data?.topMerchants ?? []
  return (
    <WidgetContainer title="Top 3 merchants" empty={merchants.length === 0} insufficient={false}>
      <div className="space-y-2">
        {merchants.map((m, i) => (
          <div key={m.merchantName} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-4 shrink-0">{i + 1}.</span>
            <span className="text-sm flex-1 truncate font-medium">{m.merchantName}</span>
            <span className="text-sm tabular-nums font-medium">{formatAmount(m.amount)}</span>
          </div>
        ))}
      </div>
    </WidgetContainer>
  )
}
