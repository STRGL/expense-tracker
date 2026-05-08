import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

async function getOwnedTag(id: string, userId: string) {
  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag) return { tag: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (tag.createdById !== userId) {
    return { tag: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { tag, error: null }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { tag, error } = await getOwnedTag(id, session.user.id)
  if (error) return error

  const { name, colour, isShared } = await request.json()
  const data: Prisma.TagUpdateInput = {}
  if (name?.trim()) data.name = name.trim()
  if (colour) data.colour = colour
  if (isShared !== undefined) data.isShared = isShared

  const updated = await prisma.tag.update({ where: { id: tag.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { tag, error } = await getOwnedTag(id, session.user.id)
  if (error) return error

  await prisma.tag.delete({ where: { id: tag.id } })
  return NextResponse.json({ success: true })
}
