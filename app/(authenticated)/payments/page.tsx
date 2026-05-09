export const dynamic = "force-dynamic"
export const metadata = { title: "Payments — Expense Tracker" }

import PaymentsOverview from "@/components/payments/PaymentsOverview"

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Outstanding balances and payment history</p>
      </div>
      <PaymentsOverview />
    </div>
  )
}
