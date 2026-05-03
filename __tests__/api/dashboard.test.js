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

const makeSplit = (amount, tagName, tagColour, merchantName, date) => ({
  amount,
  tagId: tagName ? `tag-${tagName}` : null,
  tag: tagName ? { id: `tag-${tagName}`, name: tagName, colour: tagColour, parentId: null } : null,
  transaction: { id: `tx-${merchantName}`, date: new Date(date), merchantName, totalAmount: amount },
})

describe("GET /api/dashboard", () => {
  beforeEach(() => jest.clearAllMocks())

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

  it("returns dashboard data with correct total spend", async () => {
    auth.mockResolvedValue(session)
    const currentSplits = [
      makeSplit(100, "Groceries", "#22c55e", "Tesco", "2026-04-01"),
      makeSplit(50, "Transport", "#3b82f6", "TfL", "2026-04-15"),
    ]
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce(currentSplits)
      .mockResolvedValueOnce([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.totalSpend).toBeCloseTo(150, 2)
    expect(body.topMerchants).toHaveLength(2)
    expect(body.spendByTag).toHaveLength(2)
  })

  it("returns empty arrays when no transactions in period", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    const req = new Request("http://localhost/api/dashboard?dateFrom=2026-04-01&dateTo=2026-04-30")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.totalSpend).toBe(0)
    expect(body.topMerchants).toHaveLength(0)
    expect(body.topTransactions).toHaveLength(0)
  })
})

describe("GET /api/dashboard/config", () => {
  beforeEach(() => jest.clearAllMocks())

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
    expect(Array.isArray(body.layout)).toBe(true)
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
  beforeEach(() => jest.clearAllMocks())

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
