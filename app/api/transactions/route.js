// app/api/transactions/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const tagId = searchParams.get("tagId")
  const merchant = searchParams.get("merchant")
  const minAmount = searchParams.get("minAmount")
  const maxAmount = searchParams.get("maxAmount")
  const sortBy = searchParams.get("sortBy") ?? "date"
  const sortOrder = searchParams.get("sortOrder") ?? "desc"

  const txWhere = {}
  if (dateFrom) txWhere.date = { ...txWhere.date, gte: new Date(dateFrom) }
  if (dateTo) txWhere.date = { ...txWhere.date, lte: new Date(dateTo) }
  if (merchant) txWhere.merchantName = { contains: merchant }
  if (minAmount) txWhere.totalAmount = { ...txWhere.totalAmount, gte: Number(minAmount) }
  if (maxAmount) txWhere.totalAmount = { ...txWhere.totalAmount, lte: Number(maxAmount) }

  const orderBy =
    sortBy === "amount"
      ? { amount: sortOrder }
      : sortBy === "merchant"
      ? { transaction: { merchantName: sortOrder } }
      : { transaction: { date: sortOrder } }

  const splits = await prisma.transactionSplit.findMany({
    where: {
      userId: session.user.id,
      status: "active",
      ...(tagId ? { tagId } : {}),
      transaction: txWhere,
    },
    include: {
      transaction: {
        include: {
          splits: {
            where: { status: "active" },
            select: { userId: true, amount: true },
          },
        },
      },
      tag: { select: { id: true, name: true, colour: true } },
    },
    orderBy,
  })

  const result = splits.map((split) => ({
    id: split.transaction.id,
    date: split.transaction.date,
    merchantName: split.transaction.merchantName,
    merchantRaw: split.transaction.merchantRaw,
    totalAmount: split.transaction.totalAmount,
    notes: split.transaction.notes,
    createdById: split.transaction.createdById,
    isOwner: split.transaction.createdById === session.user.id,
    myAmount: split.amount,
    mySplitId: split.id,
    myTagId: split.tagId,
    myTag: split.tag,
    splitMethod: split.splitMethod,
    splitCount: split.transaction.splits.length,
    importBatchId: split.transaction.importBatchId,
  }))

  return NextResponse.json(result)
}

export async function POST(request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { date, merchantRaw, merchantName, totalAmount, notes, splits } = await request.json()

  if (!date || !merchantRaw || !merchantName || totalAmount == null) {
    return NextResponse.json(
      { error: "date, merchantRaw, merchantName, and totalAmount are required" },
      { status: 400 }
    )
  }

  if (!splits?.length) {
    return NextResponse.json({ error: "At least one split is required" }, { status: 400 })
  }

  const splitSum = splits.reduce((sum, s) => sum + s.amount, 0)
  if (Math.abs(splitSum - totalAmount) > 0.011) {
    return NextResponse.json({ error: "Split amounts must sum to total amount" }, { status: 400 })
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        date: new Date(date),
        merchantRaw: merchantRaw.trim(),
        merchantName: merchantName.trim(),
        totalAmount: Number(totalAmount),
        notes: notes?.trim() || null,
        createdById: session.user.id,
      },
    })

    for (const split of splits) {
      await tx.transactionSplit.create({
        data: {
          transactionId: t.id,
          userId: split.userId,
          amount: split.amount,
          splitMethod: split.splitMethod,
          tagId: split.tagId ?? null,
          status: "active",
        },
      })
      if (split.userId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: split.userId,
            transactionId: t.id,
            type: "split_created",
            read: false,
          },
        })
      }
    }

    return t
  })

  return NextResponse.json(transaction, { status: 201 })
}
