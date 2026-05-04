// app/(authenticated)/search/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Search — Expense Tracker" }

import { Suspense } from "react"
import SearchPage from "@/components/search/SearchPage"

export default function SearchRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>}>
      <SearchPage />
    </Suspense>
  )
}
