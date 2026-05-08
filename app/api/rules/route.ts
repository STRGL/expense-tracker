import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const rules = await prisma.importRule.findMany({
    where: { OR: [{ isShared: true }, { createdById: session.user.id }] },
    orderBy: { merchantPattern: "asc" },
    include: { tag: { select: { id: true, name: true, colour: true } } },
  })
  return NextResponse.json(rules)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { merchantPattern, tagId, isShared } = await request.json()
  if (!merchantPattern?.trim() || !tagId) {
    return NextResponse.json({ error: "merchantPattern and tagId are required" }, { status: 400 })
  }
  const rule = await prisma.importRule.create({
    data: { merchantPattern: merchantPattern.trim(), tagId, isShared: isShared ?? false, createdById: session.user.id },
    include: { tag: { select: { id: true, name: true, colour: true } } },
  })
  return NextResponse.json(rule, { status: 201 })
}
