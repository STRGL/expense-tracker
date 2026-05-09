// app/api/transactions/bulk-tag/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

// Bulk-update the current user's tag on their split for multiple transactions.
// Works for owners AND non-owners — tags the user's own split, not the transaction.
export async function PUT(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { ids, tagId } = await request.json()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 })
  }

  const updated = await prisma.transactionSplit.updateMany({
    where: {
      transactionId: { in: ids },
      userId: session.user.id,
      status: "active",
      hiddenAt: null,
    },
    data: { tagId: tagId ?? null },
  })

  return NextResponse.json({ success: true, count: updated.count })
}
