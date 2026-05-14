/**
 * @jest-environment node
 */
import { migrateDates, MIGRATION_NAME } from "@/lib/migrations/normalize-dates"

const mockPrisma = {
  appliedDataMigration: { findUnique: jest.fn(), create: jest.fn() },
  importRow: { findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  transaction: { findMany: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.appliedDataMigration.findUnique.mockResolvedValue(null)
  mockPrisma.importRow.findMany.mockResolvedValue([])
  mockPrisma.transaction.findMany.mockResolvedValue([])
})

describe("migrateDates", () => {
  it("skips if migration already applied", async () => {
    mockPrisma.appliedDataMigration.findUnique.mockResolvedValue({ name: MIGRATION_NAME })
    const result = await migrateDates(mockPrisma as never)
    expect(result.skipped).toBe(true)
    expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled()
  })

  it("normalises an ImportRow from BST-local-midnight to UTC midnight", async () => {
    const buggy = new Date("2026-03-31T23:00:00.000Z")
    mockPrisma.importRow.findMany.mockResolvedValue([{ id: "r1", date: buggy }])
    await migrateDates(mockPrisma as never)
    expect(mockPrisma.importRow.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { date: new Date("2026-04-01T00:00:00.000Z") },
    })
  })

  it("leaves an already-UTC-midnight ImportRow untouched", async () => {
    const ok = new Date("2026-04-01T00:00:00.000Z")
    mockPrisma.importRow.findMany.mockResolvedValue([{ id: "r1", date: ok }])
    await migrateDates(mockPrisma as never)
    expect(mockPrisma.importRow.update).not.toHaveBeenCalled()
  })

  it("restores a bug-edited transaction's date from its matching ImportRow", async () => {
    const wrong = new Date("2026-03-31T00:00:00.000Z")
    const restored = new Date("2026-04-01T00:00:00.000Z")
    mockPrisma.transaction.findMany.mockResolvedValue([{
      id: "t1",
      date: wrong,
      importBatchId: "b1",
      merchantRaw: "TESCO",
      totalAmount: -50,
    }])
    mockPrisma.importRow.findFirst.mockResolvedValue({ id: "r1", date: restored })
    await migrateDates(mockPrisma as never)
    expect(mockPrisma.importRow.findFirst).toHaveBeenCalledWith({
      where: {
        batchId: "b1",
        merchantRaw: "TESCO",
        amount: { gte: -50.005, lte: -49.995 },
      },
    })
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { date: restored },
    })
  })

  it("normalises a manual transaction (no importBatchId) using its own date", async () => {
    const buggy = new Date("2026-03-31T23:00:00.000Z")
    mockPrisma.transaction.findMany.mockResolvedValue([{
      id: "t1",
      date: buggy,
      importBatchId: null,
      merchantRaw: "CASH",
      totalAmount: -10,
    }])
    await migrateDates(mockPrisma as never)
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { date: new Date("2026-04-01T00:00:00.000Z") },
    })
  })

  it("records the migration as applied on success", async () => {
    await migrateDates(mockPrisma as never)
    expect(mockPrisma.appliedDataMigration.create).toHaveBeenCalledWith({
      data: { name: MIGRATION_NAME },
    })
  })

  it("returns counts of rows updated", async () => {
    mockPrisma.importRow.findMany.mockResolvedValue([
      { id: "r1", date: new Date("2026-03-31T23:00:00.000Z") },
    ])
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: "t1", date: new Date("2026-03-31T23:00:00.000Z"), importBatchId: null, merchantRaw: "X", totalAmount: -1 },
    ])
    const result = await migrateDates(mockPrisma as never)
    expect(result).toEqual({ importRowsUpdated: 1, transactionsUpdated: 1 })
  })
})
