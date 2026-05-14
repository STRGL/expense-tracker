import type { PrismaClient } from "@prisma/client"
import { toCalendarDateInTZ, parseCalendarDate, HOUSEHOLD_TZ } from "@/lib/date"

export const MIGRATION_NAME = "normalize-dates-to-utc-midnight"

type MigrationResult =
  | { skipped: true; importRowsUpdated: 0; transactionsUpdated: 0 }
  | { importRowsUpdated: number; transactionsUpdated: number; skipped?: false }

function normalise(d: Date): Date {
  return parseCalendarDate(toCalendarDateInTZ(d, HOUSEHOLD_TZ))
}

export async function migrateDates(prisma: PrismaClient): Promise<MigrationResult> {
  const existing = await prisma.appliedDataMigration.findUnique({
    where: { name: MIGRATION_NAME },
  })
  if (existing) return { skipped: true, importRowsUpdated: 0, transactionsUpdated: 0 }

  let importRowsUpdated = 0
  let transactionsUpdated = 0

  await prisma.$transaction(async (tx) => {
    const rows = await tx.importRow.findMany({ where: { date: { not: null } } })
    for (const row of rows) {
      if (!row.date) continue
      const target = normalise(row.date)
      if (row.date.getTime() !== target.getTime()) {
        await tx.importRow.update({ where: { id: row.id }, data: { date: target } })
        importRowsUpdated++
      }
    }

    const transactions = await tx.transaction.findMany()
    for (const txn of transactions) {
      let target: Date | null = null

      if (txn.importBatchId) {
        const match = await tx.importRow.findFirst({
          where: {
            batchId: txn.importBatchId,
            merchantRaw: txn.merchantRaw,
            amount: { gte: txn.totalAmount - 0.005, lte: txn.totalAmount + 0.005 },
          },
        })
        if (match?.date) target = match.date
      }

      if (!target) target = normalise(txn.date)

      if (txn.date.getTime() !== target.getTime()) {
        await tx.transaction.update({ where: { id: txn.id }, data: { date: target } })
        transactionsUpdated++
      }
    }

    await tx.appliedDataMigration.create({ data: { name: MIGRATION_NAME } })
  })

  return { importRowsUpdated, transactionsUpdated }
}
