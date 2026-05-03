import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function POST(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { suggestedChanges } = await request.json()

  if (!suggestedChanges || Object.keys(suggestedChanges).length === 0) {
    return NextResponse.json({ error: "No changes suggested" }, { status: 400 })
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (transaction.createdById === session.user.id) {
    return NextResponse.json(
      { error: "Owners cannot suggest changes to their own transactions" },
      { status: 403 }
    )
  }

  const suggestion = await prisma.$transaction(async (tx) => {
    const s = await tx.splitSuggestion.create({
      data: {
        transactionId: id,
        fromUserId: session.user.id,
        toUserId: transaction.createdById,
        suggestedChanges: JSON.stringify(suggestedChanges),
        status: "pending",
      },
    })
    await tx.notification.create({
      data: {
        userId: transaction.createdById,
        transactionId: id,
        type: "split_suggestion",
        read: false,
      },
    })
    return s
  })

  return NextResponse.json(suggestion, { status: 201 })
}
