"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onAcknowledge: () => void
}

export default function SplitWarningModal({ open, onAcknowledge }: Props) {
  async function handleAcknowledge() {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasAcknowledgedSplitWarning: true }),
    })
    onAcknowledge()
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Before you split</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Splits belong to each person. If you remove a transaction later, it only
          disappears from your view — the other person keeps their copy and will be
          notified.
        </p>
        <DialogFooter>
          <Button onClick={handleAcknowledge}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
