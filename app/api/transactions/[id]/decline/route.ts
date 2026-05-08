import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  let notFound = false

  await prisma.$transaction(async (tx) => {
    const mySplit = await tx.transactionSplit.findFirst({
      where: { transactionId: id, userId: session.user.id, status: "active" },
    })

    if (!mySplit) {
      notFound = true
      return
    }

    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { splits: { where: { status: "active" } } },
    })

    if (!transaction) {
      notFound = true
      return
    }

    await tx.transactionSplit.update({
      where: { id: mySplit.id },
      data: { status: "removed" },
    })

    const ownerSplit = transaction.splits.find(
      (s) => s.userId === transaction.createdById && s.id !== mySplit.id
    )
    if (ownerSplit) {
      await tx.transactionSplit.update({
        where: { id: ownerSplit.id },
        data: { amount: transaction.totalAmount },
      })
    }

    await tx.notification.create({
      data: {
        userId: transaction.createdById,
        transactionId: id,
        type: "split_removed",
        read: false,
      },
    })
  })

  if (notFound) {
    return NextResponse.json({ error: "No active split found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
