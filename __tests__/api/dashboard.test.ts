/**
 * @jest-environment node
 */
import { GET } from "@/app/api/dashboard/route"
import { GET as GET_CONFIG, PUT as PUT_CONFIG } from "@/app/api/dashboard/config/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transactionSplit: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

const makeSplit = (amount: number, tagName: string | null, tagColour: string | null, merchantName: string, date: string) => ({
  amount,
  tagId: tagName ? `tag-${tagName}` : null,
  tag: tagName ? { id: `tag-${tagName}`, name: tagName, colour: tagColour, parentId: null } : null,
  transaction: { id: `tx-${merchantName}`, date: new Date(date), merchantName, totalAmount: amount },
})

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when dateFrom or dateTo is missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns dashboard data with correct totalIn, totalOut, balance", async () => {
    auth.mockResolvedValue(session)
    const currentSplits = [
      makeSplit(-100, "Groceries", "#22c55e", "Tesco", "2026-04-01"),
      makeSplit(-50, "Transport", "#3b82f6", "TfL", "2026-04-15"),
      makeSplit(200, "Salary", "#a855f7", "Employer", "2026-04-01"),
    ]
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce(currentSplits)
      .mockResolvedValueOnce([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.totalIn).toBeCloseTo(200, 2)
    expect(body.summary.totalOut).toBeCloseTo(150, 2)
    expect(body.summary.balance).toBeCloseTo(50, 2)
    expect(body.summary.totalInChange).toBeNull()
    expect(body.summary.totalOutChange).toBeNull()
    expect(body.summary.balanceChange).toBeNull()
    expect(body.topMerchants).toHaveLength(2)
    expect(body.spendByTag).toHaveLength(2)
  })

  it("computes period-over-period deltas when previous data exists", async () => {
    auth.mockResolvedValue(session)
    const currentSplits = [
      makeSplit(-100, "Groceries", "#22c55e", "Tesco", "2026-04-01"),
      makeSplit(200, "Salary", "#a855f7", "Employer", "2026-04-01"),
    ]
    const prevSplits = [
      makeSplit(-50, "Groceries", "#22c55e", "Tesco", "2026-03-01"),
      makeSplit(100, "Salary", "#a855f7", "Employer", "2026-03-01"),
    ]
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce(currentSplits)
      .mockResolvedValueOnce(prevSplits)
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.totalInChange).toBeCloseTo(100, 1)   // 200 vs 100 = +100%
    expect(body.summary.totalOutChange).toBeCloseTo(100, 1)  // 100 vs 50 = +100%
    expect(body.summary.balanceChange).toBeCloseTo(100, 1)   // balance 100 vs 50 = +100%
  })

  it("returns zeros when no transactions in period", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.totalIn).toBe(0)
    expect(body.summary.totalOut).toBe(0)
    expect(body.summary.balance).toBe(0)
    expect(body.topMerchants).toHaveLength(0)
    expect(body.topTransactions).toHaveLength(0)
  })

  it("excludes splits where hiddenAt is set", async () => {
    auth.mockResolvedValue(session)
    const currentSplits = [
      makeSplit(-100, "Groceries", "#22c55e", "Tesco", "2026-04-01"),
    ]
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce(currentSplits)
      .mockResolvedValueOnce([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    await GET(req)
    expect(prisma.transactionSplit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hiddenAt: null }),
      })
    )
  })

  it("excludes parent transactions that have real children from calculations", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    await GET(req)
    const call = (prisma.transactionSplit.findMany as jest.Mock).mock.calls[0][0]
    expect(call.where.transaction).toBeDefined()
    expect(call.where.transaction.isSystemLine).toBe(false)
    expect(call.where.transaction.OR).toBeDefined()
  })

  it("orders topTransactions by absolute amount and preserves signed myAmount", async () => {
    auth.mockResolvedValue(session)
    const splits = [
      makeSplit(50, null, null, "SmallCredit", "2026-04-02"),
      makeSplit(-200, null, null, "BigExpense", "2026-04-03"),
      makeSplit(-30, null, null, "SmallExpense", "2026-04-04"),
      makeSplit(150, null, null, "MediumCredit", "2026-04-05"),
    ]
    prisma.transactionSplit.findMany.mockResolvedValueOnce(splits).mockResolvedValueOnce([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(body.topTransactions.map((t: { merchantName: string }) => t.merchantName)).toEqual([
      "BigExpense",
      "MediumCredit",
      "SmallCredit",
      "SmallExpense",
    ])
    expect(body.topTransactions[0].myAmount).toBe(-200)
    expect(body.topTransactions[1].myAmount).toBe(150)
  })
})

describe("GET /api/dashboard/config", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET_CONFIG()
    expect(res.status).toBe(401)
  })

  it("returns default config when user has no saved config", async () => {
    auth.mockResolvedValue(session)
    prisma.user.findUnique.mockResolvedValue({ dashboardConfig: null })
    const res = await GET_CONFIG()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(body.widgets)).toBe(true)
    expect(body.widgets.length).toBeGreaterThan(0)
  })

  it("returns saved config when user has one", async () => {
    auth.mockResolvedValue(session)
    const savedConfig = { widgets: [{ id: "summary", type: "summary_cards" }], layout: [] }
    prisma.user.findUnique.mockResolvedValue({ dashboardConfig: JSON.stringify(savedConfig) })
    const res = await GET_CONFIG()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.widgets).toHaveLength(1)
  })
})

describe("PUT /api/dashboard/config", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("saves config and returns success", async () => {
    auth.mockResolvedValue(session)
    prisma.user.update.mockResolvedValue({ id: "u1" })
    const config = { widgets: [], layout: [] }
    const req = new Request("http://localhost/api/dashboard/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    const res = await PUT_CONFIG(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dashboardConfig: JSON.stringify(config) }) })
    )
  })
})
