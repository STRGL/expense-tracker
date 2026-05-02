"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import TransactionForm from "@/components/transactions/TransactionForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function NewTransactionButton({ onSaved }) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((p) => setUserId(p.id))
  }, [])

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New transaction</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New transaction</DialogTitle>
          </DialogHeader>
          {userId && (
            <TransactionForm
              currentUserId={userId}
              onSaved={() => { setOpen(false); onSaved?.() }}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
