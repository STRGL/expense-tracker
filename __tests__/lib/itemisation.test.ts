import { upsertSystemLine, applyDistributeCost } from "@/lib/itemisation"

// Build a minimal mock prisma transaction client
function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    transaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "sys1" }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    transactionSplit: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  } as unknown as Parameters<typeof upsertSystemLine>[0]
}

const parentBase = {
  id: "parent1",
  date: new Date("2026-04-01"),
  merchantRaw: "AMAZON",
  merchantName: "Amazon",
  totalAmount: -100,
  createdById: "u1",
  splits: [
    { id: "sp1", userId: "u1", amount: -60, splitMethod: "equal", status: "active", hiddenAt: null },
    { id: "sp2", userId: "u2", amount: -40, splitMethod: "equal", status: "active", hiddenAt: null },
  ],
}

describe("upsertSystemLine", () => {
  beforeEach(() => jest.clearAllMocks())

  it("creates a system line with proportional splits when remainder exists", async () => {
    const tx = makeTx()
    ;(tx.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...parentBase,
      children: [{ id: "c1", totalAmount: -60, isSystemLine: false }],
    })
    ;(tx.transaction.findFirst as jest.Mock).mockResolvedValue(null)

    await upsertSystemLine(tx, "parent1")

    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchantName: "Other",
          totalAmount: -40,
          isSystemLine: true,
          parentId: "parent1",
        }),
      })
    )
    // Two splits created (one per parent split user)
    expect(tx.transactionSplit.create).toHaveBeenCalledTimes(2)
    // u1 gets 60% of -40 = -24
    expect(tx.transactionSplit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", amount: expect.closeTo(-24, 1) }) })
    )
    // u2 gets 40% of -40 = -16
    expect(tx.transactionSplit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u2", amount: expect.closeTo(-16, 1) }) })
    )
  })

  it("updates existing system line amount and recreates splits", async () => {
    const tx = makeTx()
    ;(tx.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...parentBase,
      children: [{ id: "c1", totalAmount: -70, isSystemLine: false }],
    })
    ;(tx.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "sys1" })

    await upsertSystemLine(tx, "parent1")

    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: "sys1" },
      data: { totalAmount: -30 },
    })
    expect(tx.transactionSplit.deleteMany).toHaveBeenCalledWith({ where: { transactionId: "sys1" } })
    expect(tx.transactionSplit.create).toHaveBeenCalledTimes(2)
  })

  it("deletes existing system line when children sum equals parent total", async () => {
    const tx = makeTx()
    ;(tx.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...parentBase,
      children: [{ id: "c1", totalAmount: -100, isSystemLine: false }],
    })
    ;(tx.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "sys1" })

    await upsertSystemLine(tx, "parent1")

    expect(tx.transactionSplit.deleteMany).toHaveBeenCalledWith({ where: { transactionId: "sys1" } })
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: "sys1" } })
    expect(tx.transaction.create).not.toHaveBeenCalled()
  })

  it("does nothing when parent not found", async () => {
    const tx = makeTx()
    ;(tx.transaction.findUnique as jest.Mock).mockResolvedValue(null)

    await upsertSystemLine(tx, "missing")

    expect(tx.transaction.create).not.toHaveBeenCalled()
    expect(tx.transaction.update).not.toHaveBeenCalled()
  })
})

describe("applyDistributeCost", () => {
  beforeEach(() => jest.clearAllMocks())

  it("splits cost equally across unique users from non-distribute siblings", async () => {
    const tx = makeTx()
    ;(tx.transaction.findMany as jest.Mock).mockResolvedValue([
      { id: "c1", splits: [{ userId: "u1", status: "active" }] },
      { id: "c2", splits: [{ userId: "u2", status: "active" }] },
    ])
    ;(tx.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: "shipping",
      totalAmount: -10,
    })

    await applyDistributeCost(tx, "shipping", "parent1")

    expect(tx.transactionSplit.create).toHaveBeenCalledTimes(2)
    expect(tx.transactionSplit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", amount: expect.closeTo(-5, 1) }) })
    )
    expect(tx.transactionSplit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u2", amount: expect.closeTo(-5, 1) }) })
    )
  })

  it("does nothing when no non-distribute siblings exist", async () => {
    const tx = makeTx()
    ;(tx.transaction.findMany as jest.Mock).mockResolvedValue([])

    await applyDistributeCost(tx, "shipping", "parent1")

    expect(tx.transactionSplit.create).not.toHaveBeenCalled()
  })
})
