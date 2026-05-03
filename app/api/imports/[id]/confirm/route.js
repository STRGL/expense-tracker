// app/api/imports/[id]/confirm/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function POST(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  const batch = await prisma.importBatch.findUnique({
    where: { id, uploadedById: session.user.id },
    include: { rows: { where: { status: "pending" } } },
  })

  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (batch.status === "confirmed") {
    return NextResponse.json({ error: "Batch already confirmed" }, { status: 400 })
  }

  let created = 0

  await prisma.$transaction(async (tx) => {
    for (const row of batch.rows) {
      if (!row.date || row.amount == null) continue

      const splitData = row.splitData ? JSON.parse(row.splitData) : null
      const splits = splitData ?? [{
        userId: session.user.id,
        amount: row.amount,
        splitMethod: "equal",
        tagId: row.tagId ?? null,
      }]

      const transaction = await tx.transaction.create({
        data: {
          date: row.date,
          merchantRaw: row.merchantRaw,
          merchantName: row.merchantResolved || row.merchantRaw,
          totalAmount: row.amount,
          notes: null,
          createdById: session.user.id,
          importBatchId: id,
        },
      })

      for (const split of splits) {
        await tx.transactionSplit.create({
          data: {
            transactionId: transaction.id,
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
              transactionId: transaction.id,
              type: "split_created",
              read: false,
            },
          })
        }
      }

      await tx.importRow.update({ where: { id: row.id }, data: { status: "confirmed" } })
      created++
    }

    await tx.importBatch.update({
      where: { id },
      data: { status: "confirmed", confirmedAt: new Date() },
    })
  })

  return NextResponse.json({ success: true, transactionsCreated: created })
}
