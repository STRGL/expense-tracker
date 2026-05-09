"use client"

import { useState, useCallback, Suspense } from "react"
import TransactionList from "./TransactionList"
import NewTransactionButton from "./NewTransactionButton"
import Spinner from "@/components/ui/Spinner"

export default function TransactionListContainer() {
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewTransactionButton onSaved={reload} />
      </div>
      <Suspense fallback={<Spinner />}>
        <TransactionList key={reloadKey} onReload={reload} />
      </Suspense>
    </div>
  )
}
