/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/transactions/route"
import { GET as GET_DETAIL, PUT, DELETE } from "@/app/api/transactions/[id]/route"
import { PUT as PUT_MY_SPLIT } from "@/app/api/transactions/[id]/my-split/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transactionSplit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: { create: jest.fn() },
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

  it("returns transactions and total count shaped for the current user's view", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([mockSplit])
    prisma.transactionSplit.count.mockResolvedValue(1)
    const req = new Request("http://localhost/api/transactions")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.transactions).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.transactions[0].id).toBe("tx1")
  })

  it("passes limit and offset to prisma findMany", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    prisma.transactionSplit.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/transactions?limit=10&offset=20")
    await GET(req)
    expect(prisma.transactionSplit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    )
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
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({
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

describe("GET /api/transactions/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/tx1")
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when transaction not found", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/tx1")
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(404)
  })

  it("returns 403 when user has no split in transaction", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "tx1",
      createdById: "other",
      splits: [],
    })
    const req = new Request("http://localhost/api/transactions/tx1")
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(403)
  })
})

describe("PUT /api/transactions/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 403 when user is not the owner", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "tx1",
      createdById: "other",
      splits: [],
    })
    const req = new Request("http://localhost/api/transactions/tx1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantName: "Updated" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/transactions/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 403 when user is not the owner", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "tx1",
      createdById: "other",
      splits: [],
    })
    const req = new Request("http://localhost/api/transactions/tx1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(403)
  })
})

describe("PUT /api/transactions/[id]/my-split", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 404 when user has no active split", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/tx1/my-split", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: "t1" }),
    })
    const res = await PUT_MY_SPLIT(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(404)
  })

  it("updates the tag on the user's split", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findFirst.mockResolvedValue({ id: "sp1", userId: "u1" })
    prisma.transactionSplit.update.mockResolvedValue({ id: "sp1", tagId: "t1" })
    const req = new Request("http://localhost/api/transactions/tx1/my-split", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: "t1" }),
    })
    const res = await PUT_MY_SPLIT(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(200)
    expect(prisma.transactionSplit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tagId: "t1" } })
    )
  })
})
