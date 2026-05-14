import { PrismaClient } from "@prisma/client"
import { migrateDates } from "../lib/migrations/normalize-dates"

async function main() {
  const prisma = new PrismaClient()
  try {
    const result = await migrateDates(prisma)
    if ("skipped" in result && result.skipped) {
      console.log("[migrate-dates] already applied, skipping")
    } else {
      console.log(`[migrate-dates] updated ${result.importRowsUpdated} import rows and ${result.transactionsUpdated} transactions`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("[migrate-dates] failed:", err)
  process.exit(1)
})
