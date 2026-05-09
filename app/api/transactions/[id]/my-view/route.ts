// app/api/transactions/[id]/my-view/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const userId = session.user.id

  const split = await prisma.transactionSplit.findFirst({
    where: { transactionId: id, userId, hiddenAt: null },
  })

  if (!split) {
    return NextResponse.json({ success: true })
  }

  await prisma.$transaction(async (tx) => {
    await tx.transactionSplit.update({
      where: { id: split.id },
      data: { hiddenAt: new Date() },
    })

    const allSplits = await tx.transactionSplit.findMany({
      where: { transactionId: id },
    })

    if (allSplits.every(s => s.hiddenAt !== null)) {
      await tx.splitSuggestion.deleteMany({ where: { transactionId: id } })
      await tx.transaction.delete({ where: { id } })
    }
  })

  return NextResponse.json({ success: true })
}
