// app/api/transactions/[id]/my-split/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { tagId } = await request.json()

  const split = await prisma.transactionSplit.findFirst({
    where: { transactionId: id, userId: session.user.id, status: "active" },
  })

  if (!split) {
    return NextResponse.json(
      { error: "No active split found for this transaction" },
      { status: 404 }
    )
  }

  const updated = await prisma.transactionSplit.update({
    where: { id: split.id },
    data: { tagId: tagId ?? null },
    include: { tag: { select: { id: true, name: true, colour: true } } },
  })

  return NextResponse.json(updated)
}
