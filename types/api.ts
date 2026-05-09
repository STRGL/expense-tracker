import type { ConfidenceLevel } from "./imports"

export type { ConfidenceLevel }

export interface TagSummary {
  id: string
  name: string
  colour: string
}

export interface TransactionListItem {
  id: string
  /** ISO date string (serialized from Prisma Date by NextResponse.json) */
  date: string
  merchantName: string
  merchantRaw: string
  totalAmount: number
  notes: string | null
  createdById: string
  isOwner: boolean
  myAmount: number
  mySplitId: string
  myTagId: string | null
  myTag: TagSummary | null
  splitMethod: string
  splitCount: number
  importBatchId: string | null
  confidenceLevel?: ConfidenceLevel
}

export interface SplitInput {
  userId: string
  amount: number
  splitMethod: string
  tagId?: string | null
}
