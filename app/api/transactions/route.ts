// app/api/transactions/route.js
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { upsertSystemLine, applyDistributeCost } from "@/lib/itemisation"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
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
  const rawSortOrder = searchParams.get("sortOrder") ?? "desc"
  const sortOrder: Prisma.SortOrder = rawSortOrder === "asc" ? "asc" : "desc"
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : null
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0

  const txWhere: Prisma.TransactionWhereInput = {}
  const dateFilter: Prisma.DateTimeFilter = {}
  if (dateFrom) dateFilter.gte = new Date(dateFrom)
  if (dateTo) dateFilter.lte = new Date(dateTo)
  if (dateFrom || dateTo) txWhere.date = dateFilter
  if (merchant) txWhere.merchantName = { contains: merchant }
  const amountFilter: Prisma.FloatFilter = {}
  if (minAmount) amountFilter.gte = Number(minAmount)
  if (maxAmount) amountFilter.lte = Number(maxAmount)
  if (minAmount || maxAmount) txWhere.totalAmount = amountFilter

  const splitWhere = {
    userId: session.user.id,
    status: "active",
    hiddenAt: null,
    ...(tagId ? { tagId } : {}),
    transaction: {
      ...txWhere,
      isSystemLine: false,
      OR: [
        { parentId: null },
        {
          parentId: { not: null },
          parent: {
            splits: {
              none: { userId: session.user.id, status: "active", hiddenAt: null },
            },
          },
        },
      ],
    },
  } satisfies Prisma.TransactionSplitWhereInput

  const total = await prisma.transactionSplit.count({ where: splitWhere })

  const splits = await prisma.transactionSplit.findMany({
    where: splitWhere,
    include: {
      transaction: {
        include: {
          splits: {
            where: { status: "active" },
            select: { userId: true, amount: true },
          },
          _count: {
            select: { children: { where: { isSystemLine: false } } },
          },
        },
      },
      tag: { select: { id: true, name: true, colour: true } },
    },
    orderBy:
      sortBy === "amount"
        ? { amount: sortOrder }
        : sortBy === "merchant"
        ? { transaction: { merchantName: sortOrder } }
        : { transaction: { date: sortOrder } },
    take: limit || undefined,
    skip: offset,
  })

  const transactions = splits.map((split) => ({
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
    parentId: split.transaction.parentId,
    isSystemLine: split.transaction.isSystemLine,
    hasChildren: split.transaction._count.children > 0,
  }))

  return NextResponse.json({ transactions, total })
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { date, merchantRaw, merchantName, totalAmount, notes, splits, parentId, distributeCost } = await request.json()

  if (!date || !merchantRaw || !merchantName || totalAmount == null) {
    return NextResponse.json(
      { error: "date, merchantRaw, merchantName, and totalAmount are required" },
      { status: 400 }
    )
  }

  // Validate parent if creating a child
  let parentTx: { date: Date; merchantRaw: string; createdById: string } | null = null
  if (parentId) {
    const parent = await prisma.transaction.findUnique({
      where: { id: parentId },
      include: { children: { where: { isSystemLine: false } } },
    })

    if (!parent) {
      return NextResponse.json({ error: "Parent transaction not found" }, { status: 404 })
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "Cannot nest children more than one level deep" }, { status: 400 })
    }
    if (parent.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existingChildSum = parent.children.reduce((s: number, c: { totalAmount: number }) => s + Math.abs(c.totalAmount), 0)
    if (existingChildSum + Math.abs(Number(totalAmount)) > Math.abs(parent.totalAmount) + 0.005) {
      return NextResponse.json({ error: "Child amounts would exceed parent total" }, { status: 400 })
    }

    parentTx = parent
  }

  // Validate splits (skip for distributeCost children — splits are auto-generated)
  const isProportional = splits?.every((s: { splitMethod: string }) => s.splitMethod === "proportional") ?? false
  const splitSum = splits?.reduce((sum: number, s: { amount: number }) => sum + s.amount, 0) ?? 0
  const isPending = isProportional && splitSum === 0 && (splits?.length ?? 0) > 1

  if (!distributeCost) {
    if (!splits?.length) {
      return NextResponse.json({ error: "At least one split is required" }, { status: 400 })
    }
    if (!isPending && Math.abs(splitSum - totalAmount) > 0.011) {
      return NextResponse.json({ error: "Split amounts must sum to total amount" }, { status: 400 })
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        date: parentId ? (parentTx?.date ?? new Date(date)) : new Date(date),
        merchantRaw: parentId ? (parentTx?.merchantRaw ?? merchantRaw.trim()) : merchantRaw.trim(),
        merchantName: merchantName.trim(),
        totalAmount: Number(totalAmount),
        notes: notes?.trim() || null,
        createdById: session.user.id,
        parentId: parentId ?? null,
        distributeCost: distributeCost ?? false,
        isSystemLine: false,
      },
    })

    if (!distributeCost && splits?.length) {
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
          const user = await tx.user.findUnique({ where: { id: split.userId }, select: { wage: true } })
          const type = isPending && user?.wage === null ? "missing_wage_for_split" : "split_created"
          await tx.notification.create({
            data: { userId: split.userId, transactionId: t.id, type, read: false },
          })
        }
      }
    }

    if (parentId) {
      await upsertSystemLine(tx as any, parentId)
      if (distributeCost) {
        await applyDistributeCost(tx as any, t.id, parentId)
      }
    }

    return t
  })

  return NextResponse.json(transaction, { status: 201 })
}
