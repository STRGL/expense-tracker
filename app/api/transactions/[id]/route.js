// app/api/transactions/[id]/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

async function getAccessibleTransaction(id, userId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      splits: {
        include: { tag: { select: { id: true, name: true, colour: true } } },
      },
    },
  })
  if (!transaction) {
    return { transaction: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  const userSplit = transaction.splits.find(
    (s) => s.userId === userId && s.status === "active"
  )
  const isOwner = transaction.createdById === userId
  if (!userSplit && !isOwner) {
    return { transaction: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { transaction, userSplit, isOwner, error: null }
}

export async function GET(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, userSplit, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error

  return NextResponse.json({
    id: transaction.id,
    date: transaction.date,
    merchantName: transaction.merchantName,
    merchantRaw: transaction.merchantRaw,
    totalAmount: transaction.totalAmount,
    notes: transaction.notes,
    createdById: transaction.createdById,
    importBatchId: transaction.importBatchId,
    isOwner,
    mySplit: userSplit ?? null,
    splits: isOwner
      ? transaction.splits
      : transaction.splits.filter((s) => s.userId === session.user.id),
  })
}

export async function PUT(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { date, merchantRaw, merchantName, totalAmount, notes, splits } = await request.json()
  const data = {}
  if (date) data.date = new Date(date)
  if (merchantRaw?.trim()) data.merchantRaw = merchantRaw.trim()
  if (merchantName?.trim()) data.merchantName = merchantName.trim()
  if (totalAmount != null) data.totalAmount = Number(totalAmount)
  if (notes !== undefined) data.notes = notes?.trim() || null

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.update({ where: { id }, data })

    if (splits) {
      const effectiveTotal = data.totalAmount ?? transaction.totalAmount
      const splitSum = splits.reduce((s, sp) => s + sp.amount, 0)
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

export async function DELETE(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { transaction, isOwner, error } = await getAccessibleTransaction(id, session.user.id)
  if (error) return error
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.$transaction(async (tx) => {
    for (const split of transaction.splits) {
      if (split.userId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: split.userId,
            transactionId: id,
            type: "transaction_deleted",
            read: false,
          },
        })
      }
    }
    await tx.transaction.delete({ where: { id } })
  })

  return NextResponse.json({ success: true })
}
