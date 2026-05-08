// app/api/imports/[id]/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  const batch = await prisma.importBatch.findUnique({
    where: { id, uploadedById: session.user.id },
    include: {
      rows: { orderBy: { id: "asc" } },
    },
  })

  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(batch)
}
