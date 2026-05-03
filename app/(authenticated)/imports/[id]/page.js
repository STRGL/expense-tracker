// app/(authenticated)/imports/[id]/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Review Import — Expense Tracker" }

import ReviewTable from "@/components/imports/ReviewTable"

export default async function ImportReviewPage({ params }) {
  const { id } = await params
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review import</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Check each transaction before confirming. Red rows need attention.
        </p>
      </div>
      <ReviewTable batchId={id} />
    </div>
  )
}
