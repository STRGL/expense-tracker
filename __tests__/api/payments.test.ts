/**
 * @jest-environment node
 */
import { GET } from "@/app/api/payments/route"
import { GET as GET_PERSON } from "@/app/api/payments/[slug]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transactionSplit: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: "u2", name: "Jane" }]) },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("GET /api/payments", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns balance summaries per user", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([
      {
        id: "sp1",
        userId: "u2",
        amount: -100,
        status: "active",
        transaction: { createdById: "u1" },
        user: { id: "u2", name: "Jane", isActive: true },
      },
      {
        id: "sp2",
        userId: "u1",
        amount: -30,
        status: "active",
        transaction: { createdById: "u2" },
        user: { id: "u1", name: "Me", isActive: true },
      },
    ])
    prisma.transaction.findMany.mockResolvedValue([
      { paymentFromUserId: "u2", totalAmount: 20, paymentFrom: { id: "u2", name: "Jane", isActive: true } },
    ])

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].userId).toBe("u2")
    expect(body[0].owedByThem).toBeCloseTo(100, 2)
    expect(body[0].owedByMe).toBeCloseTo(30, 2)
    expect(body[0].paidByThem).toBeCloseTo(20, 2)
    expect(body[0].net).toBeCloseTo(50, 2)
  })

  it("returns empty array when no splits or payments exist", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    prisma.transaction.findMany.mockResolvedValue([])
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(0)
  })
})

describe("GET /api/payments/[userId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const params = Promise.resolve({ slug: "u2" })
    const res = await GET_PERSON({} as Request, { params })
    expect(res.status).toBe(401)
  })

  it("returns 400 when userId is own user", async () => {
    auth.mockResolvedValue(session)
    const params = Promise.resolve({ slug: "u1" })
    const res = await GET_PERSON({} as Request, { params })
    expect(res.status).toBe(400)
  })

  it("returns detailed balance for a person", async () => {
    auth.mockResolvedValue(session)
    prisma.user.findUnique.mockResolvedValue({ id: "u2", name: "Jane", isActive: true })
    prisma.transactionSplit.findMany
      .mockResolvedValueOnce([
        {
          id: "sp1",
          amount: -100,
          transaction: { id: "tx1", merchantName: "Tesco", date: new Date("2026-04-01") },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "sp2",
          amount: -30,
          transaction: { id: "tx2", merchantName: "Amazon", date: new Date("2026-04-05") },
        },
      ])
    prisma.transaction.findMany.mockResolvedValue([
      { id: "tx3", merchantName: "Bank Transfer", date: new Date("2026-04-10"), totalAmount: 20 },
    ])

    const params = Promise.resolve({ slug: "u2" })
    const res = await GET_PERSON({} as Request, { params })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.net).toBeCloseTo(50, 2)
    expect(body.outstandingSplits).toHaveLength(2)
    expect(body.payments).toHaveLength(1)
    expect(body.outstandingSplits[0].direction).toBe("owedByThem")
    expect(body.outstandingSplits[1].direction).toBe("owedByMe")
  })
})
