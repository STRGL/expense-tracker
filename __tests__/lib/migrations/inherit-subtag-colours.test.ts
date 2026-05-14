/**
 * @jest-environment node
 */
import {
  migrateSubtagColours,
  MIGRATION_NAME,
  DEFAULT_COLOUR,
} from "@/lib/migrations/inherit-subtag-colours"

type MockPrisma = {
  appliedDataMigration: { findUnique: jest.Mock; create: jest.Mock }
  tag: { findMany: jest.Mock; update: jest.Mock }
  $transaction: jest.Mock
}

const mockPrisma: MockPrisma = {
  appliedDataMigration: { findUnique: jest.fn(), create: jest.fn() },
  tag: { findMany: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(mockPrisma)),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.appliedDataMigration.findUnique.mockResolvedValue(null)
  mockPrisma.tag.findMany.mockResolvedValue([])
})

describe("migrateSubtagColours", () => {
  it("skips if migration already applied", async () => {
    mockPrisma.appliedDataMigration.findUnique.mockResolvedValue({ name: MIGRATION_NAME })
    const result = await migrateSubtagColours(mockPrisma as never)
    expect(result.skipped).toBe(true)
    expect(mockPrisma.tag.findMany).not.toHaveBeenCalled()
  })

  it("updates a subtag with default colour to its parent's colour", async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      {
        id: "child1",
        colour: DEFAULT_COLOUR,
        parent: { colour: "#22c55e" },
      },
    ])
    await migrateSubtagColours(mockPrisma as never)
    expect(mockPrisma.tag.update).toHaveBeenCalledWith({
      where: { id: "child1" },
      data: { colour: "#22c55e" },
    })
  })

  it("does not update if parent also has the default colour", async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      {
        id: "child1",
        colour: DEFAULT_COLOUR,
        parent: { colour: DEFAULT_COLOUR },
      },
    ])
    await migrateSubtagColours(mockPrisma as never)
    expect(mockPrisma.tag.update).not.toHaveBeenCalled()
  })

  it("does not touch subtags whose colour was already customised", async () => {
    mockPrisma.tag.findMany.mockResolvedValue([])
    await migrateSubtagColours(mockPrisma as never)
    expect(mockPrisma.tag.update).not.toHaveBeenCalled()
  })

  it("records the migration as applied and returns the count", async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: "c1", colour: DEFAULT_COLOUR, parent: { colour: "#aaa" } },
      { id: "c2", colour: DEFAULT_COLOUR, parent: { colour: "#bbb" } },
    ])
    const result = await migrateSubtagColours(mockPrisma as never)
    expect(mockPrisma.appliedDataMigration.create).toHaveBeenCalledWith({
      data: { name: MIGRATION_NAME },
    })
    expect(result).toEqual({ tagsUpdated: 2 })
  })

  it("filters the findMany query to subtags with the default colour", async () => {
    await migrateSubtagColours(mockPrisma as never)
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: { not: null }, colour: DEFAULT_COLOUR },
        include: { parent: { select: { colour: true } } },
      }),
    )
  })
})
