import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function DELETE(request) {
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
