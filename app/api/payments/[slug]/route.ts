// app/api/payments/[slug]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { generateUserSlugs } from "@/lib/slug"
import type { PersonPaymentDetail, OutstandingSplit, PaymentRecord } from "@/types/payments"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { slug: rawParam } = await params
  const currentId = session.user.id

  // Resolve slug to userId (slugs contain hyphens or don't match cuid format)
  let targetId = rawParam
  if (!/^c[a-z0-9]{20,}$/.test(rawParam)) {
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } })
    const slugMap = generateUserSlugs(allUsers)
    const resolved = [...slugMap.entries()].find(([, slug]) => slug === rawParam)
    if (resolved) targetId = resolved[0]
  }

  if (targetId === currentId) {
    return NextResponse.json({ error: "Cannot view payments for yourself" }, { status: 400 })
  }

  const [targetUser, theyOweMe, iOweThem, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.transactionSplit.findMany({
      where: {
        userId: targetId,
        status: "active",
        transaction: { createdById: currentId },
      },
      include: {
        transaction: { select: { id: true, merchantName: true, date: true } },
      },
      orderBy: { transaction: { date: "desc" } },
    }),
    prisma.transactionSplit.findMany({
      where: {
        userId: currentId,
        status: "active",
        transaction: { createdById: targetId },
      },
      include: {
        transaction: { select: { id: true, merchantName: true, date: true } },
      },
      orderBy: { transaction: { date: "desc" } },
    }),
    prisma.transaction.findMany({
      where: { paymentFromUserId: targetId },
      select: { id: true, merchantName: true, date: true, totalAmount: true },
      orderBy: { date: "desc" },
    }),
  ])

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const owedByThem = theyOweMe.reduce((s, sp) => s + Math.abs(sp.amount), 0)
  const owedByMe = iOweThem.reduce((s, sp) => s + Math.abs(sp.amount), 0)
  const paidByThem = payments.reduce((s, t) => s + Math.abs(t.totalAmount), 0)
  const net = owedByThem - owedByMe - paidByThem

  const outstandingSplits: OutstandingSplit[] = [
    ...theyOweMe.map(sp => ({
      splitId: sp.id,
      transactionId: sp.transaction.id,
      merchantName: sp.transaction.merchantName,
      date: sp.transaction.date.toISOString(),
      amount: Math.abs(sp.amount),
      direction: "owedByThem" as const,
    })),
    ...iOweThem.map(sp => ({
      splitId: sp.id,
      transactionId: sp.transaction.id,
      merchantName: sp.transaction.merchantName,
      date: sp.transaction.date.toISOString(),
      amount: Math.abs(sp.amount),
      direction: "owedByMe" as const,
    })),
  ]

  const paymentRecords: PaymentRecord[] = payments.map(t => ({
    transactionId: t.id,
    merchantName: t.merchantName || "Manual payment",
    date: t.date.toISOString(),
    amount: Math.abs(t.totalAmount),
  }))

  const detail: PersonPaymentDetail = {
    user: targetUser,
    net,
    outstandingSplits,
    payments: paymentRecords,
  }

  return NextResponse.json(detail)
}
