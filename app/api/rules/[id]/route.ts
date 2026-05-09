import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

async function getOwnedRule(id: string, userId: string) {
  const rule = await prisma.importRule.findUnique({ where: { id } })
  if (!rule) return { rule: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (rule.createdById !== userId) {
    return { rule: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { rule, error: null }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError
  const { id } = await params
  const { rule, error } = await getOwnedRule(id, session.user.id)
  if (error) return error
  const { merchantPattern, tagId, isShared } = await request.json()
  // UncheckedUpdateInput required: tagId is assigned as a raw FK string
  const data: Prisma.ImportRuleUncheckedUpdateInput = {}
  if (merchantPattern?.trim()) data.merchantPattern = merchantPattern.trim()
  if (tagId) data.tagId = tagId
  if (isShared !== undefined) data.isShared = isShared
  const updated = await prisma.importRule.update({
    where: { id: rule.id }, data,
    include: { tag: { select: { id: true, name: true, colour: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError
  const { id } = await params
  const { rule, error } = await getOwnedRule(id, session.user.id)
  if (error) return error
  await prisma.importRule.delete({ where: { id: rule.id } })
  return NextResponse.json({ success: true })
}
