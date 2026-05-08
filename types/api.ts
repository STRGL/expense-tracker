export interface TagSummary {
  id: string
  name: string
  colour: string
}

export interface TransactionListItem {
  id: string
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
}

export interface SplitInput {
  userId: string
  amount: number
  splitMethod: string
  tagId?: string | null
}
