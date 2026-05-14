import { PrismaClient } from "@prisma/client"
import { migrateDates } from "../lib/migrations/normalize-dates"
import { migrateSubtagColours } from "../lib/migrations/inherit-subtag-colours"

// Chained one-time data migrations. Each is gated by an AppliedDataMigration
// marker so re-running is a no-op after success. The script name is historical
// (started as a date-only migration); it now runs every data migration in order.
async function main() {
  const prisma = new PrismaClient()
  try {
    const dates = await migrateDates(prisma)
    if ("skipped" in dates && dates.skipped) {
      console.log("[migrate-dates] already applied, skipping")
    } else {
      console.log(`[migrate-dates] updated ${dates.importRowsUpdated} import rows and ${dates.transactionsUpdated} transactions`)
    }

    const colours = await migrateSubtagColours(prisma)
    if ("skipped" in colours && colours.skipped) {
      console.log("[migrate-subtag-colours] already applied, skipping")
    } else {
      console.log(`[migrate-subtag-colours] updated ${colours.tagsUpdated} subtags`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("[migrate-data] failed:", err)
  process.exit(1)
})
