import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { parseCalendarDate } from "@/lib/date"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()

  if (!q) return NextResponse.json([])

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const tagId = searchParams.get("tagId")
  const minAmount = searchParams.get("minAmount")
  const maxAmount = searchParams.get("maxAmount")
  const source = searchParams.get("source")
  const split = searchParams.get("split")

  // Build FTS5 query: each word gets a prefix match
  const ftsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map(w => `"${w.replace(/"/g, '""')}"*`)
    .join(" ")

  let rows
  try {
    rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          t.id,
          t.date,
          t.merchantName,
          t.merchantRaw,
          t.totalAmount,
          t.createdById,
          t.importBatchId,
          ts.amount        AS myAmount,
          ts.tagId         AS myTagId,
          tag.name         AS tagName,
          tag.colour       AS tagColour,
          (
            SELECT COUNT(*)
            FROM "TransactionSplit" ts2
            WHERE ts2.transactionId = t.id AND ts2.status = 'active'
          ) AS splitCount
        FROM "TransactionFts"
        JOIN "Transaction"      AS t   ON t.id  = "TransactionFts".transactionId
        JOIN "TransactionSplit" AS ts  ON ts.transactionId = t.id
                                      AND ts.userId = ${session.user.id}
                                      AND ts.status = 'active'
        LEFT JOIN "Tag"         AS tag ON tag.id = ts.tagId
        WHERE "TransactionFts" MATCH ${ftsQuery}
          ${dateFrom ? Prisma.sql`AND t.date >= ${parseCalendarDate(dateFrom)}` : Prisma.empty}
          ${dateTo   ? Prisma.sql`AND t.date <= ${parseCalendarDate(dateTo)}`   : Prisma.empty}
          ${tagId    ? Prisma.sql`AND ts.tagId = ${tagId}`             : Prisma.empty}
          ${minAmount ? Prisma.sql`AND ts.amount >= ${Number(minAmount)}` : Prisma.empty}
          ${maxAmount ? Prisma.sql`AND ts.amount <= ${Number(maxAmount)}` : Prisma.empty}
          ${source === "imported" ? Prisma.sql`AND t.importBatchId IS NOT NULL` : Prisma.empty}
          ${source === "manual"   ? Prisma.sql`AND t.importBatchId IS NULL`     : Prisma.empty}
          ${split === "split"     ? Prisma.sql`AND (SELECT COUNT(*) FROM "TransactionSplit" sx WHERE sx.transactionId = t.id AND sx.status = 'active') > 1` : Prisma.empty}
          ${split === "not_split" ? Prisma.sql`AND (SELECT COUNT(*) FROM "TransactionSplit" sx WHERE sx.transactionId = t.id AND sx.status = 'active') = 1` : Prisma.empty}
        ORDER BY rank
        LIMIT ${limit}
      `
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Search FTS error:", message)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }

  const results = (rows as Array<Record<string, unknown>>).map((row) => ({
    id: row.id,
    date: row.date,
    merchantName: row.merchantName,
    merchantRaw: row.merchantRaw,
    totalAmount: Number(row.totalAmount),
    myAmount: Number(row.myAmount),
    myTagId: row.myTagId,
    myTag: row.tagName ? { name: row.tagName, colour: row.tagColour } : null,
    splitCount: Number(row.splitCount),
    importBatchId: row.importBatchId,
    isOwner: row.createdById === session.user.id,
  }))

  return NextResponse.json(results)
}
