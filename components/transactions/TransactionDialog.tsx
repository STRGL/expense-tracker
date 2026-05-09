"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import TransactionForm from "./TransactionForm"
import SuggestChangeForm from "./SuggestChangeForm"
import LineItemForm from "./LineItemForm"
import type { TransactionListItem } from "@/types/api"
import type { TagWithChildren } from "@/lib/tag-utils"

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}

interface SplitDetail {
  id: string
  userId: string
  userName?: string
  amount: number
  splitMethod: string
  tagId: string | null
}

export interface ChildItem {
  id: string
  merchantName: string
  totalAmount: number
  isSystemLine: boolean
  distributeCost: boolean
  splits: SplitDetail[]
  mySplit?: SplitDetail | null
}

export interface TransactionDetail {
  id: string
  date: string
  merchantRaw: string
  merchantName: string
  totalAmount: number
  notes: string | null
  isOwner: boolean
  createdById: string
  splits: SplitDetail[]
  mySplit: SplitDetail | null
  parentId: string | null
  isSystemLine: boolean
  distributeCost: boolean
  children: ChildItem[]
  systemLine: ChildItem | null
}

interface FlatTag {
  id: string
  name: string
  colour: string
  parentId: string | null
}

interface Props {
  transaction: TransactionListItem | null
  onClose: () => void
  onSaved?: () => void
}

export default function TransactionDialog({ transaction, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userWage, setUserWage] = useState<number | null | undefined>(undefined)
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [tags, setTags] = useState<FlatTag[]>([])
  const [myTagId, setMyTagId] = useState<string | null>(transaction?.myTagId ?? null)
  const [savingTag, setSavingTag] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)

  useEffect(() => {
    if (!transaction) return
    const ok = (r: Response) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }
    Promise.all([
      fetch(`/api/transactions/${transaction.id}`).then(ok) as Promise<TransactionDetail>,
      fetch("/api/profile").then(ok) as Promise<{ id: string; wage: number | null }>,
      fetch("/api/tags").then(ok) as Promise<TagWithChildren[]>,
    ]).then(([det, profile, tagTree]) => {
      setDetail({
        ...det,
        children: det.children ?? [],
        systemLine: det.systemLine ?? null,
        parentId: det.parentId ?? null,
        isSystemLine: det.isSystemLine ?? false,
        distributeCost: det.distributeCost ?? false,
        createdById: det.createdById ?? "",
      })
      setUserId(profile.id)
      setUserWage(profile.wage)
      setMyTagId(det.mySplit?.tagId ?? null)
      const flat: FlatTag[] = []
      for (const parent of tagTree) {
        flat.push(parent)
        for (const child of parent.children) flat.push(child)
      }
      setTags(flat)
    }).catch(() => {
      toast.error("Failed to load transaction. Please try again.")
      onClose()
    })
  }, [transaction])

  async function handleTagSave() {
    if (!transaction) return
    setSavingTag(true)
    const res = await fetch(`/api/transactions/${transaction.id}/my-split`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: myTagId }),
    })
    setSavingTag(false)
    if (res.ok) {
      toast.success("Tag saved.")
      onSaved?.()
    } else {
      toast.error("Failed to save tag.")
    }
  }

  async function handleDelete() {
    if (!transaction) return
    if (!confirm("Delete this transaction? This cannot be undone.")) return
    setDeleting(true)
    const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" })
    setDeleting(false)
    if (res.ok) {
      toast.success("Transaction deleted.")
      onSaved?.()
    } else {
      toast.error("Failed to delete transaction.")
    }
  }

  if (!detail || !userId || !transaction) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle className="sr-only">Loading transaction</DialogTitle>
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const isOwner = detail.isOwner

  if (isOwner && mode === "edit") {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            initial={{ ...detail, splits: detail.splits }}
            currentUserId={userId}
            onSaved={onSaved}
            onCancel={() => setMode("view")}
          />

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Line items</p>

            {detail.children.length > 0 && (
              <div className="space-y-1">
                {detail.children.map(child => (
                  <div key={child.id} className="flex items-center justify-between py-1.5 px-2 rounded-md border text-sm">
                    <span>{child.merchantName}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-muted-foreground">
                        {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(child.totalAmount))}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!confirm("Remove this line item? This will remove it from your records.")) return
                          const res = await fetch(`/api/transactions/${child.id}`, { method: "DELETE" })
                          if (res.ok) {
                            onSaved?.()
                          } else {
                            toast.error("Failed to remove line item.")
                          }
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detail.systemLine && (
              <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <span className="italic">🔒 Other (unallocated)</span>
                <span className="tabular-nums">
                  {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(detail.systemLine.totalAmount))}
                </span>
              </div>
            )}

            {showAddItem ? (
              <LineItemForm
                parentId={detail.id}
                parentTotal={detail.totalAmount}
                currentUserId={userId}
                existingChildren={[...detail.children, ...(detail.systemLine ? [detail.systemLine] : [])]}
                onSaved={() => { setShowAddItem(false); onSaved?.() }}
                onCancel={() => setShowAddItem(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAddItem(true)}
              >
                + Add line item
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detail.merchantName}
            {detail.splits.some(s => s.splitMethod === "proportional") && (
              <span className="text-sm font-normal italic text-muted-foreground">(Pending)</span>
            )}
            {!isOwner && (
              <Badge variant="outline" className="text-xs font-normal">Shared with you</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Date</p>
              <p className="font-medium">{formatDate(detail.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total amount</p>
              <p className="font-medium">{formatAmount(detail.totalAmount)}</p>
            </div>
          </div>

          {detail.merchantRaw !== detail.merchantName && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-0.5">Raw merchant name</p>
              <p className="font-mono text-xs text-muted-foreground">{detail.merchantRaw}</p>
            </div>
          )}

          {detail.notes && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
              <p>{detail.notes}</p>
            </div>
          )}

          {detail.splits.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Split</p>
              <div className="space-y-1 text-sm">
                {detail.splits.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span className={s.userId === userId ? "font-medium" : "text-muted-foreground"}>
                      {s.userId === userId ? "You" : (s.userName ?? s.userId)}
                    </span>
                    {s.userId !== userId && s.splitMethod === "proportional" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className="tabular-nums">{formatAmount(s.amount)}</span>
                    )}
                  </div>
                ))}
              </div>
              {detail.mySplit?.splitMethod === "proportional" && (detail.mySplit?.amount ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {userWage
                    ? "Amounts are pending — waiting for other participants to set their wage."
                    : <>Your share will calculate once you{" "}
                        <a href="/settings" className="underline hover:text-foreground transition-colors">set your annual wage</a>
                        {" "}in Settings.</>
                  }
                </p>
              )}
            </div>
          )}

          {detail.children.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Line items</p>
              <div className="space-y-1 text-sm">
                {detail.children.map(child => (
                  <div key={child.id} className="flex justify-between">
                    <span>{child.merchantName}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(child.totalAmount))}
                    </span>
                  </div>
                ))}
                {detail.systemLine && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="italic">Other (unallocated)</span>
                    <span className="tabular-nums">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(detail.systemLine.totalAmount))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Your tag for this transaction</Label>
            <Select
              value={myTagId ?? "none"}
              onValueChange={(v) => setMyTagId(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Untagged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Untagged</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: t.colour }}
                      />
                      {t.parentId ? "  " : ""}{t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isOwner && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Dispute this split</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={declining}
                  onClick={async () => {
                    if (!confirm("Remove yourself from this split? The transaction will become 100% the owner's responsibility.")) return
                    setDeclining(true)
                    await fetch(`/api/transactions/${transaction.id}/decline`, { method: "POST" })
                    setDeclining(false)
                    onSaved?.()
                  }}
                >
                  {declining ? "Declining..." : "Decline"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowSuggest(true)}
                >
                  Suggest a change
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isOwner && (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
                Edit
              </Button>
            </>
          )}
          <Button size="sm" onClick={handleTagSave} disabled={savingTag}>
            {savingTag ? "Saving..." : "Save tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
      {showSuggest && (
        <SuggestChangeForm
          transaction={detail}
          mySplit={detail.mySplit}
          onClose={() => setShowSuggest(false)}
          onSubmitted={() => { setShowSuggest(false); onSaved?.() }}
        />
      )}
    </Dialog>
  )
}
