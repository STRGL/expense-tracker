// app/api/payments/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import type { PaymentUserSummary } from "@/types/payments"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session.user.id

  const [splits, paymentTxns] = await Promise.all([
    prisma.transactionSplit.findMany({
      where: {
        status: "active",
        OR: [
          { userId: { not: userId }, transaction: { createdById: userId } },
          { userId, transaction: { createdById: { not: userId } } },
        ],
      },
      include: {
        transaction: { select: { createdById: true } },
        user: { select: { id: true, name: true, isActive: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { paymentFromUserId: { not: null } },
      select: {
        paymentFromUserId: true,
        totalAmount: true,
        paymentFrom: { select: { id: true, name: true, isActive: true } },
      },
    }),
  ])

  type UserMeta = { name: string; isActive: boolean }
  const users: Record<string, UserMeta> = {}
  const owedByThem: Record<string, number> = {}
  const owedByMe: Record<string, number> = {}
  const paidByThem: Record<string, number> = {}

  for (const split of splits) {
    const isTheirSplitOnMine = split.userId !== userId
    const otherId = isTheirSplitOnMine ? split.userId : split.transaction.createdById
    if (!users[otherId]) users[otherId] = { name: split.user.name, isActive: split.user.isActive }
    const abs = Math.abs(split.amount)
    if (isTheirSplitOnMine) {
      owedByThem[otherId] = (owedByThem[otherId] ?? 0) + abs
    } else {
      owedByMe[otherId] = (owedByMe[otherId] ?? 0) + abs
    }
  }

  for (const txn of paymentTxns) {
    const otherId = txn.paymentFromUserId!
    if (txn.paymentFrom && !users[otherId]) {
      users[otherId] = { name: txn.paymentFrom.name, isActive: txn.paymentFrom.isActive }
    }
    paidByThem[otherId] = (paidByThem[otherId] ?? 0) + Math.abs(txn.totalAmount)
  }

  const summaries: PaymentUserSummary[] = Object.entries(users).map(([id, meta]) => {
    const owed = owedByThem[id] ?? 0
    const iOwe = owedByMe[id] ?? 0
    const paid = paidByThem[id] ?? 0
    return {
      userId: id,
      name: meta.name,
      isActive: meta.isActive,
      owedByThem: owed,
      owedByMe: iOwe,
      paidByThem: paid,
      net: owed - iOwe - paid,
    }
  })

  return NextResponse.json(summaries)
}
