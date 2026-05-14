import type { PrismaClient } from "@prisma/client"

export const MIGRATION_NAME = "inherit-subtag-colours"
export const DEFAULT_COLOUR = "#6b7280"

type MigrationResult =
  | { skipped: true; tagsUpdated: 0 }
  | { tagsUpdated: number; skipped?: false }

export async function migrateSubtagColours(prisma: PrismaClient): Promise<MigrationResult> {
  const existing = await prisma.appliedDataMigration.findUnique({
    where: { name: MIGRATION_NAME },
  })
  if (existing) return { skipped: true, tagsUpdated: 0 }

  let tagsUpdated = 0

  await prisma.$transaction(
    async (tx) => {
      const subtags = await tx.tag.findMany({
        where: { parentId: { not: null }, colour: DEFAULT_COLOUR },
        include: { parent: { select: { colour: true } } },
      })

      for (const child of subtags) {
        if (!child.parent || child.parent.colour === DEFAULT_COLOUR) continue
        await tx.tag.update({
          where: { id: child.id },
          data: { colour: child.parent.colour },
        })
        tagsUpdated++
      }

      await tx.appliedDataMigration.create({ data: { name: MIGRATION_NAME } })
    },
    { timeout: 60_000, maxWait: 10_000 },
  )

  return { tagsUpdated }
}
