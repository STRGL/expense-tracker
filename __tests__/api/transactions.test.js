/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/transactions/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transactionSplit: { findMany: jest.fn() },
    transaction: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

const mockSplit = {
  id: "sp1",
  amount: 50,
  tagId: "t1",
  splitMethod: "equal",
  tag: { id: "t1", name: "Groceries", colour: "#22c55e" },
  transaction: {
    id: "tx1",
    date: new Date("2026-04-01"),
    merchantName: "Tesco",
    merchantRaw: "TESCO STORES",
    totalAmount: 100,
    notes: null,
    createdById: "u1",
    importBatchId: null,
    splits: [{ userId: "u1", amount: 50 }, { userId: "u2", amount: 50 }],
  },
}

describe("GET /api/transactions", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns transactions shaped for the current user's view", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([mockSplit])
    const req = new Request("http://localhost/api/transactions")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe("tx1")
    expect(body[0].myAmount).toBe(50)
    expect(body[0].isOwner).toBe(true)
    expect(body[0].splitCount).toBe(2)
  })
})

describe("POST /api/transactions", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantRaw: "Tesco" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when split amounts do not sum to total", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "Tesco",
        merchantName: "Tesco",
        totalAmount: 100,
        splits: [{ userId: "u1", amount: 60, splitMethod: "specified", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates transaction and returns 201 on valid request", async () => {
    auth.mockResolvedValue(session)
    const mockCreated = { id: "tx2", merchantName: "Tesco", totalAmount: 100 }
    prisma.$transaction.mockImplementation(async (cb) => cb({
      transaction: { create: jest.fn().mockResolvedValue(mockCreated) },
      transactionSplit: { create: jest.fn() },
      notification: { create: jest.fn() },
    }))

    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "Tesco",
        merchantName: "Tesco",
        totalAmount: 100,
        splits: [{ userId: "u1", amount: 100, splitMethod: "equal", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
