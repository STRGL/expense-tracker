// app/(authenticated)/imports/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Import — Expense Tracker" }

import UploadForm from "@/components/imports/UploadForm"

export default function ImportsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import transactions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload a CSV from your bank to import transactions in bulk.
        </p>
      </div>
      <UploadForm />
    </div>
  )
}
