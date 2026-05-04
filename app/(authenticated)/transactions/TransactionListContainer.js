"use client"

import { useState, useCallback, Suspense } from "react"
import TransactionList from "./TransactionList"
import NewTransactionButton from "./NewTransactionButton"

export default function TransactionListContainer() {
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewTransactionButton onSaved={reload} />
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>}>
        <TransactionList key={reloadKey} onReload={reload} />
      </Suspense>
    </div>
  )
}
