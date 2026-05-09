// app/api/transactions/[id]/route.js
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

async function getAccessibleTransaction(id: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      splits: {
        include: { tag: { select: { id: true, name: true, colour: true } } },
      },
      paymentFrom: { select: { id: true, name: true } },
      children: {
        include: { splits: { where: { status: "active" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!transaction) {
    return { transaction: null, userSplit: null, isOwner: false, error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const
  }
  const userSplit = transaction.splits.find(
    (s) => s.userId === userId && s.status === "active"
  )
  const isOwner = transaction.createdById === userId
  if (!userSplit && !isOwner) {
    return { transaction: null, userSplit: null, isOwner: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }
  return { transaction, userSplit: userSplit ?? null, isOwner, error: null } as const
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, userSplit, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error

  const allChildren = transaction.children ?? []
  const realChildren = allChildren.filter((c) => !c.isSystemLine)
  const systemLine = allChildren.find((c) => c.isSystemLine) ?? null

  return NextResponse.json({
    id: transaction.id,
    date: transaction.date,
    merchantName: transaction.merchantName,
    merchantRaw: transaction.merchantRaw,
    totalAmount: transaction.totalAmount,
    notes: transaction.notes,
    createdById: transaction.createdById,
    importBatchId: transaction.importBatchId,
    paymentFromUserId: transaction.paymentFromUserId,
    paymentFrom: transaction.paymentFrom,
    parentId: transaction.parentId,
    isSystemLine: transaction.isSystemLine,
    distributeCost: transaction.distributeCost,
    isOwner,
    mySplit: userSplit ?? null,
    splits: isOwner
      ? transaction.splits
      : transaction.splits.filter((s) => s.userId === session.user.id),
    children: realChildren,
    systemLine,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { date, merchantRaw, merchantName, totalAmount, notes, splits, paymentFromUserId } = await request.json()
  const data: Prisma.TransactionUpdateInput = {}
  if (date) data.date = new Date(date)
  if (merchantRaw?.trim()) data.merchantRaw = merchantRaw.trim()
  if (merchantName?.trim()) data.merchantName = merchantName.trim()
  if (totalAmount != null) data.totalAmount = Number(totalAmount)
  if (notes !== undefined) data.notes = notes?.trim() || null
  if (paymentFromUserId !== undefined) {
    data.paymentFromUserId = paymentFromUserId ?? null
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.update({ where: { id }, data })

    if (splits) {
      const effectiveTotal = (data.totalAmount as number | undefined) ?? transaction.totalAmount
      const splitSum = splits.reduce((s: number, sp: { amount: number }) => s + sp.amount, 0)
      if (Math.abs(splitSum - effectiveTotal) > 0.011) {
        throw new Error("Split amounts must sum to total amount")
      }
      const oldSplits = transaction.splits
      await tx.transactionSplit.deleteMany({ where: { transactionId: id } })
      for (const split of splits) {
        await tx.transactionSplit.create({
          data: {
            transactionId: id,
            userId: split.userId,
            amount: split.amount,
            splitMethod: split.splitMethod,
            tagId: split.tagId ?? null,
            status: "active",
          },
        })
        const oldSplit = oldSplits.find((s) => s.userId === split.userId)
        if (split.userId !== session.user.id && (!oldSplit || oldSplit.amount !== split.amount)) {
          await tx.notification.create({
            data: {
              userId: split.userId,
              transactionId: id,
              type: "split_updated",
              read: false,
            },
          })
        }
      }
    }

    return t
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    await tx.transactionSplit.updateMany({
      where: { transactionId: id, userId, hiddenAt: null },
      data: { hiddenAt: new Date() },
    })

    const allSplits = await tx.transactionSplit.findMany({
      where: { transactionId: id },
    })

    const otherVisible = allSplits.filter(s => s.userId !== userId && s.hiddenAt === null)
    if (otherVisible.length > 0) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
      for (const split of otherVisible) {
        await tx.notification.create({
          data: {
            userId: split.userId,
            transactionId: id,
            type: "transaction_hidden",
            message: `${user?.name ?? "Someone"} removed ${transaction.merchantName} from their records. Your copy is unaffected.`,
            read: false,
          },
        })
      }
    }

    if (allSplits.every(s => s.hiddenAt !== null)) {
      await tx.splitSuggestion.deleteMany({ where: { transactionId: id } })
      await tx.transaction.delete({ where: { id } })
    }
  })

  return NextResponse.json({ success: true })
}
