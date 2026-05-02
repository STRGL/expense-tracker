import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

async function getOwnedAlias(id, userId) {
  const alias = await prisma.merchantAlias.findUnique({ where: { id } })
  if (!alias) return { alias: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (alias.createdById !== userId) {
    return { alias: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { alias, error: null }
}

export async function PUT(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError
  const { id } = await params
  const { alias, error } = await getOwnedAlias(id, session.user.id)
  if (error) return error
  const { rawName, niceName, isShared } = await request.json()
  const data = {}
  if (rawName?.trim()) data.rawName = rawName.trim()
  if (niceName?.trim()) data.niceName = niceName.trim()
  if (isShared !== undefined) data.isShared = isShared
  const updated = await prisma.merchantAlias.update({ where: { id: alias.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError
  const { id } = await params
  const { alias, error } = await getOwnedAlias(id, session.user.id)
  if (error) return error
  await prisma.merchantAlias.delete({ where: { id: alias.id } })
  return NextResponse.json({ success: true })
}
