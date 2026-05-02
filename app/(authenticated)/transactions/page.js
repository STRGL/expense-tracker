export const dynamic = "force-dynamic"
export const metadata = { title: "Transactions — Expense Tracker" }

import TransactionListContainer from "./TransactionListContainer"

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your spending history</p>
      </div>
      <TransactionListContainer />
    </div>
  )
}
