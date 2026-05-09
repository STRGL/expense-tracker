// types/payments.ts

export interface PaymentUserSummary {
  userId: string
  name: string
  slug: string
  isActive: boolean
  net: number
  owedByThem: number
  owedByMe: number
  paidByThem: number
}

export interface OutstandingSplit {
  splitId: string
  transactionId: string
  merchantName: string
  date: string
  amount: number
  direction: "owedByThem" | "owedByMe"
}

export interface PaymentRecord {
  transactionId: string
  merchantName: string
  date: string
  amount: number
}

export interface PersonPaymentDetail {
  user: { id: string; name: string; isActive: boolean }
  net: number
  outstandingSplits: OutstandingSplit[]
  payments: PaymentRecord[]
}
