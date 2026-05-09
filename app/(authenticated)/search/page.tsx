// app/(authenticated)/search/page.js
export const dynamic = "force-dynamic"
export const metadata = { title: "Search — Expense Tracker" }

import { Suspense } from "react"
import SearchPage from "@/components/search/SearchPage"
import Spinner from "@/components/ui/Spinner"

export default function SearchRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchPage />
    </Suspense>
  )
}
