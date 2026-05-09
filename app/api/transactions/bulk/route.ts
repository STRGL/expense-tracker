import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function PUT(request: Request) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { ids, merchantName } = await request.json()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 })
  }
  if (!merchantName?.trim()) {
    return NextResponse.json({ error: "merchantName is required" }, { status: 400 })
  }

  const result = await prisma.transaction.updateMany({
    where: { id: { in: ids }, createdById: session.user.id },
    data: { merchantName: merchantName.trim() },
  })

  return NextResponse.json({ success: true, count: result.count })
}

export async function DELETE(request: Request) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { ids } = await request.json()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs array is required" }, { status: 400 })
  }

  try {
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Find all transactions to check ownership and get split info for notifications
      const transactions = await tx.transaction.findMany({
        where: {
          id: { in: ids },
          createdById: session.user.id,
        },
        include: { splits: true },
      })

      if (transactions.length === 0) return 0

      const foundIds = transactions.map((t) => t.id)

      for (const transaction of transactions) {
        for (const split of transaction.splits) {
          if (split.userId !== session.user.id) {
            await tx.notification.create({
              data: {
                userId: split.userId,
                transactionId: transaction.id,
                type: "transaction_deleted",
                read: false,
              },
            })
          }
        }
      }

      const result = await tx.transaction.deleteMany({
        where: { id: { in: foundIds } },
      })

      return result.count
    })

    return NextResponse.json({ success: true, count: deletedCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
