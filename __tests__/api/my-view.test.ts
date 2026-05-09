/**
 * @jest-environment node
 */
import { DELETE } from "@/app/api/transactions/[id]/my-view/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transactionSplit: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    splitSuggestion: { deleteMany: jest.fn() },
    transaction: { delete: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("DELETE /api/transactions/[id]/my-view", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await DELETE({} as Request, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 idempotently when split is already hidden", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findFirst.mockResolvedValue(null)
    const res = await DELETE({} as Request, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(200)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("sets hiddenAt on user's split and keeps transaction when others are visible", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findFirst.mockResolvedValue({ id: "sp1", userId: "u1", hiddenAt: null })
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transactionSplit.update.mockResolvedValue({})
    prisma.transactionSplit.findMany.mockResolvedValue([
      { id: "sp1", userId: "u1", hiddenAt: new Date() },
      { id: "sp2", userId: "u2", hiddenAt: null },
    ])

    const res = await DELETE({} as Request, { params: Promise.resolve({ id: "tx1" }) })

    expect(res.status).toBe(200)
    expect(prisma.transactionSplit.update).toHaveBeenCalledWith({
      where: { id: "sp1" },
      data: expect.objectContaining({ hiddenAt: expect.any(Date) }),
    })
    expect(prisma.transaction.delete).not.toHaveBeenCalled()
  })

  it("hard-deletes transaction when all splits are now hidden", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findFirst.mockResolvedValue({ id: "sp1", userId: "u1", hiddenAt: null })
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transactionSplit.update.mockResolvedValue({})
    prisma.transactionSplit.findMany.mockResolvedValue([
      { id: "sp1", userId: "u1", hiddenAt: new Date() },
    ])
    prisma.splitSuggestion.deleteMany.mockResolvedValue({ count: 0 })
    prisma.transaction.delete.mockResolvedValue({})

    const res = await DELETE({} as Request, { params: Promise.resolve({ id: "tx1" }) })

    expect(res.status).toBe(200)
    expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } })
  })
})
