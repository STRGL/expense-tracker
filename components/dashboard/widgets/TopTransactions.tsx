import WidgetContainer from "../WidgetContainer"
import type { DashboardData } from "@/types/dashboard"

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

interface Props {
  data: DashboardData | null | undefined
}

export default function TopTransactions({ data }: Props) {
  const transactions = data?.topTransactions ?? []
  return (
    <WidgetContainer title="Top 15 transactions" empty={transactions.length === 0} insufficient={false}>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="border-b">
            <tr>
              <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Merchant</th>
              <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Tag</th>
              <th className="text-right py-1 font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                <td className="py-1 pr-2 truncate max-w-[120px] font-medium">{tx.merchantName}</td>
                <td className="py-1 pr-2">
                  {tx.myTag ? (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.myTag.colour }} />
                      <span className="truncate">{tx.myTag.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-1 text-right tabular-nums font-medium">{formatAmount(tx.myAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetContainer>
  )
}
