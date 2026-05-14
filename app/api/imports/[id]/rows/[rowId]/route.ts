// app/api/imports/[id]/rows/[rowId]/route.js
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { parseCalendarDate } from "@/lib/date"

export const dynamic = "force-dynamic"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id, rowId } = await params

  const batch = await prisma.importBatch.findUnique({ where: { id, uploadedById: session.user.id } })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const row = await prisma.importRow.findUnique({ where: { id: rowId, batchId: id } })
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 })

  const { merchantResolved, date, amount, tagId, splitData, status } = await request.json()
  const data: Prisma.ImportRowUncheckedUpdateInput = {}
  if (merchantResolved !== undefined) data.merchantResolved = merchantResolved
  if (date !== undefined) data.date = date ? parseCalendarDate(date) : null
  if (amount !== undefined) data.amount = amount != null ? Number(amount) : null
  if (tagId !== undefined) data.tagId = tagId
  if (splitData !== undefined) data.splitData = splitData ? JSON.stringify(splitData) : null
  if (status !== undefined) data.status = status

  const updated = await prisma.importRow.update({
    where: { id: rowId },
    data,
  })

  return NextResponse.json(updated)
}
