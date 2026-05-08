import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

const VALID_ACTIONS = ["accept", "decline", "manually_resolved"]

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id, suggestionId } = await params
  const { action } = await request.json()

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    )
  }

  const suggestion = await prisma.splitSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (suggestion.toUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    const statusMap: Record<string, string> = { accept: "accepted", decline: "rejected", manually_resolved: "manually_resolved" }
    await tx.splitSuggestion.update({
      where: { id: suggestionId },
      data: { status: statusMap[action], resolvedAt: new Date() },
    })

    if (action === "accept") {
      const changes = JSON.parse(suggestion.suggestedChanges)
      const txData: Prisma.TransactionUpdateInput = {}
      if (changes.date) txData.date = new Date(changes.date.suggested)
      if (changes.merchantName) txData.merchantName = changes.merchantName.suggested
      if (changes.totalAmount) txData.totalAmount = Number(changes.totalAmount.suggested)
      if (changes.notes !== undefined) txData.notes = changes.notes?.suggested ?? null

      if (Object.keys(txData).length > 0) {
        await tx.transaction.update({ where: { id }, data: txData })
      }

      if (changes.mySplitAmount) {
        const recipientSplit = await tx.transactionSplit.findFirst({
          where: { transactionId: id, userId: suggestion.fromUserId, status: "active" },
        })
        if (recipientSplit) {
          await tx.transactionSplit.update({
            where: { id: recipientSplit.id },
            data: { amount: Number(changes.mySplitAmount.suggested) },
          })
          const transaction = await tx.transaction.findUnique({
            where: { id },
            include: { splits: { where: { status: "active" } } },
          })
          const ownerSplit = transaction?.splits.find((s) => s.userId === session.user.id)
          if (ownerSplit && transaction) {
            const newTotal = (txData.totalAmount as number | undefined) ?? transaction.totalAmount
            const ownerNewAmount = Math.max(0, Math.round((newTotal - Number(changes.mySplitAmount.suggested)) * 100) / 100)
            await tx.transactionSplit.update({
              where: { id: ownerSplit.id },
              data: { amount: ownerNewAmount },
            })
          }
        }
      }
    }

    const responseMessage =
      action === "accept" ? "Your suggestion was accepted."
      : action === "decline" ? "Your suggestion was declined."
      : "The owner made manual changes."

    await tx.notification.create({
      data: {
        userId: suggestion.fromUserId,
        transactionId: id,
        type: "split_suggestion_response",
        message: responseMessage,
        read: false,
      },
    })
  })

  return NextResponse.json({ success: true })
}
