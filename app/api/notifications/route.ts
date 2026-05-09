import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transaction: {
        select: { id: true, merchantName: true, totalAmount: true, date: true },
      },
    },
  })

  const enriched = await Promise.all(
    notifications.map(async (n) => {
      if (n.type === "split_suggestion" && n.transactionId) {
        const suggestion = await prisma.splitSuggestion.findFirst({
          where: { transactionId: n.transactionId, toUserId: session.user.id, status: "pending" },
        })
        return { ...n, suggestion: suggestion ?? null }
      }
      return { ...n, suggestion: null }
    })
  )

  return NextResponse.json(enriched)
}

export async function PUT() {
  const { session, error } = await requireAuth()
  if (error) return error

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
