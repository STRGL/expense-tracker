import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: batchId } = await params
  const { rowIds, data: updateData } = await request.json()

  if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
    return NextResponse.json({ error: "rowIds array is required" }, { status: 400 })
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId, uploadedById: session.user.id },
  })
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

  const data: Prisma.ImportRowUncheckedUpdateManyInput = {}
  if (updateData.merchantResolved !== undefined) data.merchantResolved = updateData.merchantResolved
  if (updateData.tagId !== undefined) data.tagId = updateData.tagId || null
  if (updateData.status !== undefined) data.status = updateData.status

  const updated = await prisma.importRow.updateMany({
    where: {
      id: { in: rowIds },
      batchId,
    },
    data,
  })

  return NextResponse.json({ success: true, count: updated.count })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: batchId } = await params
  const { rowIds } = await request.json()

  if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
    return NextResponse.json({ error: "rowIds array is required" }, { status: 400 })
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId, uploadedById: session.user.id },
  })
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

  // Mark rows as 'skipped' so they stay in history but aren't imported
  const updated = await prisma.importRow.updateMany({
    where: {
      id: { in: rowIds },
      batchId,
    },
    data: { status: "skipped" },
  })

  return NextResponse.json({ success: true, count: updated.count })
}
