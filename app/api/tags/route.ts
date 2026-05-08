import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTagTree } from "@/lib/tag-utils"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const tags = await prisma.tag.findMany({
    where: { OR: [{ isShared: true }, { createdById: session.user.id }] },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(buildTagTree(tags))
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { name, colour, parentId, isShared } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  if (parentId) {
    const parent = await prisma.tag.findUnique({ where: { id: parentId } })
    if (!parent) return NextResponse.json({ error: "Parent tag not found" }, { status: 400 })
    if (parent.parentId) {
      return NextResponse.json({ error: "Maximum two levels of nesting" }, { status: 400 })
    }
  }

  const tag = await prisma.tag.create({
    data: {
      name: name.trim(),
      colour: colour ?? "#6b7280",
      parentId: parentId ?? null,
      isShared: isShared ?? false,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(tag, { status: 201 })
}
