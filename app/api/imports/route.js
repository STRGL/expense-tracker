// app/api/imports/route.js
import { NextResponse } from "next/server"
import Papa from "papaparse"
import Fuse from "fuse.js"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { normalizeMerchant } from "@/lib/merchant-normalizer"
import { detectDateFormat, parseDate } from "@/lib/date-detector"
import { computeBatchStats, scoreRow } from "@/lib/confidence-scorer"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const batches = await prisma.importBatch.findMany({
    where: { uploadedById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fileName: true, bankName: true, status: true, createdAt: true,
      _count: { select: { rows: true } },
    },
  })

  return NextResponse.json(batches)
}

export async function POST(request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { csvText, dateColumn, merchantColumn, amountColumn, creditColumn, invertSigns, bankName } = await request.json()

  if (!csvText || !dateColumn || !merchantColumn || !amountColumn) {
    return NextResponse.json(
      { error: "csvText, dateColumn, merchantColumn, and amountColumn are required" },
      { status: 400 }
    )
  }

  const { data: rows, meta } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const headers = meta.fields ?? []

  if (![dateColumn, merchantColumn, amountColumn].every(c => headers.includes(c))) {
    return NextResponse.json({ error: "One or more specified columns not found in CSV headers" }, { status: 400 })
  }
  if (creditColumn && !headers.includes(creditColumn)) {
    return NextResponse.json({ error: "Credit column not found in CSV headers" }, { status: 400 })
  }

  const dateSamples = rows.slice(0, 10).map(r => r[dateColumn]).filter(Boolean)
  const dateFormat = detectDateFormat(dateSamples) ?? "DD/MM/YYYY"

  const [aliases, rules, existingTx] = await Promise.all([
    prisma.merchantAlias.findMany({
      where: { OR: [{ isShared: true }, { createdById: session.user.id }] },
    }),
    prisma.importRule.findMany({
      where: { OR: [{ isShared: true }, { createdById: session.user.id }] },
    }),
    prisma.transaction.findMany({
      where: { splits: { some: { userId: session.user.id, status: "active" } } },
      select: { date: true, merchantRaw: true, totalAmount: true },
    }),
  ])

  const fuse = aliases.length
    ? new Fuse(aliases, { keys: ["rawName", "niceName"], threshold: 0.5, includeScore: true })
    : null

  const parsedRows = rows.map(r => {
    let amount
    let isDual = false
    if (creditColumn) {
      const debit = parseFloat(r[amountColumn])
      const credit = parseFloat(r[creditColumn])
      if (isNaN(debit) && isNaN(credit)) {
        amount = NaN
      } else {
        const dVal = isNaN(debit) ? 0 : debit
        const cVal = isNaN(credit) ? 0 : credit
        amount = cVal - dVal
        if (dVal !== 0 && cVal !== 0) isDual = true
      }
    } else {
      amount = parseFloat(r[amountColumn])
    }

    if (invertSigns && !isNaN(amount)) amount *= -1

    return { 
      amount, 
      date: parseDate(r[dateColumn], dateFormat),
      isDual
    }
  })
  const batchStats = computeBatchStats(parsedRows)

  const batch = await prisma.$transaction(async (tx) => {
    const b = await tx.importBatch.create({
      data: {
        uploadedById: session.user.id,
        fileName: "upload.csv",
        bankName: bankName?.trim() || null,
        columnMapping: JSON.stringify({ 
          date: dateColumn, 
          merchant: merchantColumn, 
          amount: amountColumn,
          credit: creditColumn || null,
          inverted: !!invertSigns
        }),
        status: "pending",
      },
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rawMerchant = row[merchantColumn] ?? ""
      const normalizedMerchant = normalizeMerchant(rawMerchant)
      const date   = parsedRows[i].date
      const amount = parsedRows[i].amount
      const isDual = parsedRows[i].isDual

      let merchantResolved = rawMerchant
      let fuseScore = null
      if (fuse && normalizedMerchant) {
        const results = fuse.search(normalizedMerchant)
        if (results.length > 0) {
          fuseScore = results[0].score ?? 1
          if (fuseScore < 0.3) merchantResolved = results[0].item.niceName
        }
      }

      let tagId = null
      const norm = normalizedMerchant.toLowerCase()
      const matched = rules.find(r =>
        norm.includes(r.merchantPattern.toLowerCase()) ||
        merchantResolved.toLowerCase().includes(r.merchantPattern.toLowerCase())
      )
      if (matched) tagId = matched.tagId

      const isDuplicate = existingTx.some(et => {
        if (!date) return false
        const sameDate = new Date(et.date).toDateString() === date.toDateString()
        const sameMerchant = et.merchantRaw.toLowerCase() === rawMerchant.toLowerCase()
        const sameAmount = !isNaN(amount) && Math.abs(et.totalAmount - amount) < 0.01
        return sameDate && sameMerchant && sameAmount
      })

      const { level, reasons } = scoreRow(
        { amount: isNaN(amount) ? null : amount, date, isDuplicate },
        batchStats,
        fuseScore
      )

      if (isDual) {
        reasons.push("dual_amount_values")
      }

      await tx.importRow.create({
        data: {
          batchId: b.id,
          rawData: JSON.stringify(row),
          date: date ?? null,
          merchantRaw: rawMerchant,
          merchantResolved,
          amount: isNaN(amount) ? null : amount,
          tagId,
          splitData: null,
          confidenceLevel: isDual || level === "red" ? "red" : level,
          confidenceReasons: JSON.stringify(reasons),
          isDuplicate,
          status: "pending",
        },
      })
    }

    return b
  })

  return NextResponse.json({ id: batch.id }, { status: 201 })
}
