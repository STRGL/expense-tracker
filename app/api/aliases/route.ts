import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const aliases = await prisma.merchantAlias.findMany({
    where: { OR: [{ isShared: true }, { createdById: session.user.id }] },
    orderBy: { rawName: "asc" },
  })
  return NextResponse.json(aliases)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { rawName, niceName, isShared } = await request.json()
  if (!rawName?.trim() || !niceName?.trim()) {
    return NextResponse.json({ error: "rawName and niceName are required" }, { status: 400 })
  }
  const alias = await prisma.merchantAlias.create({
    data: { rawName: rawName.trim(), niceName: niceName.trim(), isShared: isShared ?? false, createdById: session.user.id },
  })
  return NextResponse.json(alias, { status: 201 })
}
