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
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    splitSuggestion: { deleteMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
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
    parentId: null,
    isSystemLine: false,
    _count: { children: 0 },
  },
}

describe("GET /api/transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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

  it("filters by a specific tag id", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    prisma.transactionSplit.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/transactions?tagId=t1")
    await GET(req)
    const call = (prisma.transactionSplit.findMany as jest.Mock).mock.calls[0][0]
    expect(call.where.tagId).toBe("t1")
  })

  it("filters by null tagId when tagId=__untagged__ sentinel is passed", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    prisma.transactionSplit.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/transactions?tagId=__untagged__")
    await GET(req)
    const call = (prisma.transactionSplit.findMany as jest.Mock).mock.calls[0][0]
    expect(call.where.tagId).toBeNull()
  })

  it("does not filter by tag when tagId is not supplied", async () => {
    auth.mockResolvedValue(session)
    prisma.transactionSplit.findMany.mockResolvedValue([])
    prisma.transactionSplit.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/transactions")
    await GET(req)
    const call = (prisma.transactionSplit.findMany as jest.Mock).mock.calls[0][0]
    expect(call.where.tagId).toBeUndefined()
  })
})

describe("POST /api/transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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

describe("GET /api/transactions/[id] — paymentFromUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("includes paymentFromUserId and paymentFrom in response", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "tx1",
      date: new Date("2026-04-01"),
      merchantName: "Bank Transfer",
      merchantRaw: "BACS PAYMENT",
      totalAmount: 200,
      notes: null,
      createdById: "u1",
      importBatchId: null,
      paymentFromUserId: "u2",
      paymentFrom: { id: "u2", name: "Jane" },
      splits: [{ id: "sp1", userId: "u1", amount: 200, status: "active", tagId: null, splitMethod: "equal", tag: null }],
    })
    const req = new Request("http://localhost/api/transactions/tx1")
    const { params } = { params: Promise.resolve({ id: "tx1" }) }
    const res = await GET_DETAIL(req, { params })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.paymentFromUserId).toBe("u2")
    expect(body.paymentFrom).toEqual({ id: "u2", name: "Jane" })
  })
})

describe("PUT /api/transactions/[id] — paymentFromUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("saves paymentFromUserId when provided", async () => {
    auth.mockResolvedValue(session)
    const mockTx = {
      id: "tx1",
      date: new Date("2026-04-01"),
      merchantName: "Bank Transfer",
      merchantRaw: "BACS",
      totalAmount: 200,
      notes: null,
      createdById: "u1",
      importBatchId: null,
      paymentFromUserId: null,
      paymentFrom: null,
      splits: [{ id: "sp1", userId: "u1", amount: 200, status: "active", tagId: null, splitMethod: "equal", tag: null }],
    }
    prisma.transaction.findUnique.mockResolvedValue(mockTx)
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transaction.update.mockResolvedValue({ ...mockTx, paymentFromUserId: "u2" })

    const req = new Request("http://localhost/api/transactions/tx1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentFromUserId: "u2" }),
    })
    const { params } = { params: Promise.resolve({ id: "tx1" }) }
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentFrom: { connect: { id: "u2" } } }),
      })
    )
  })

  it("clears paymentFromUserId when null is passed", async () => {
    auth.mockResolvedValue(session)
    const mockTx = {
      id: "tx1",
      date: new Date("2026-04-01"),
      merchantName: "Bank Transfer",
      merchantRaw: "BACS",
      totalAmount: 200,
      notes: null,
      createdById: "u1",
      importBatchId: null,
      paymentFromUserId: "u2",
      paymentFrom: { id: "u2", name: "Jane" },
      splits: [{ id: "sp1", userId: "u1", amount: 200, status: "active", tagId: null, splitMethod: "equal", tag: null }],
    }
    prisma.transaction.findUnique.mockResolvedValue(mockTx)
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transaction.update.mockResolvedValue({ ...mockTx, paymentFromUserId: null })

    const req = new Request("http://localhost/api/transactions/tx1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentFromUserId: null }),
    })
    const { params } = { params: Promise.resolve({ id: "tx1" }) }
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentFrom: { disconnect: true } }),
      })
    )
  })
})

describe("PUT /api/transactions/[id]/my-split", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

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

describe("PUT /api/transactions/[id] — system line recalculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("calls upsertSystemLine when child amount changes", async () => {
    auth.mockResolvedValue(session)
    const mockChild = {
      id: "child1",
      merchantName: "Headphones",
      merchantRaw: "AMAZON",
      totalAmount: -50,
      notes: null,
      createdById: "u1",
      importBatchId: null,
      paymentFromUserId: null,
      paymentFrom: null,
      parentId: "parent1",
      isSystemLine: false,
      distributeCost: false,
      splits: [{ id: "sp1", userId: "u1", amount: -50, status: "active", hiddenAt: null, tag: null }],
      children: [],
    }
    prisma.transaction.findUnique.mockResolvedValue(mockChild)
    const txMock = {
      transaction: {
        update: jest.fn().mockResolvedValue(mockChild),
        findUnique: jest.fn().mockResolvedValue({
          id: "parent1",
          date: new Date(),
          merchantRaw: "AMAZON",
          merchantName: "Amazon",
          totalAmount: -100,
          createdById: "u1",
          splits: [{ id: "sp1", userId: "u1", amount: -100, splitMethod: "equal", status: "active", hiddenAt: null }],
          children: [{ id: "child1", totalAmount: -60, isSystemLine: false }],
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "sys1" }),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      transactionSplit: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      notification: { create: jest.fn() },
    }
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(txMock))

    const req = new Request("http://localhost/api/transactions/child1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAmount: -60 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "child1" }) })
    expect(res.status).toBe(200)
    // upsertSystemLine called — confirmed by findUnique being called with parent1 inside $transaction
    expect(txMock.transaction.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "parent1" } })
    )
  })
})

describe("GET /api/transactions/[id] — children", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns children and systemLine in response", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "tx1",
      date: new Date("2026-04-01"),
      merchantName: "Amazon",
      merchantRaw: "AMAZON",
      totalAmount: -100,
      notes: null,
      createdById: "u1",
      importBatchId: null,
      paymentFromUserId: null,
      paymentFrom: null,
      parentId: null,
      isSystemLine: false,
      distributeCost: false,
      splits: [{ id: "sp1", userId: "u1", amount: -100, status: "active", hiddenAt: null, tag: null }],
      children: [
        { id: "c1", merchantName: "Headphones", totalAmount: -60, isSystemLine: false, distributeCost: false, splits: [] },
        { id: "sys1", merchantName: "Other", totalAmount: -40, isSystemLine: true, distributeCost: false, splits: [] },
      ],
    })

    const req = new Request("http://localhost/api/transactions/tx1")
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: "tx1" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.children).toHaveLength(1)
    expect(body.children[0].id).toBe("c1")
    expect(body.systemLine).not.toBeNull()
    expect(body.systemLine.id).toBe("sys1")
    expect(body.parentId).toBeNull()
    expect(body.isSystemLine).toBe(false)
  })
})

describe("POST /api/transactions — child creation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 404 when parent not found", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "AMAZON",
        merchantName: "Headphones",
        totalAmount: -50,
        parentId: "missing",
        splits: [{ userId: "u1", amount: -50, splitMethod: "equal", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 when parent already has a parentId (depth exceeded)", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "child1",
      parentId: "grandparent",
      createdById: "u1",
      totalAmount: -100,
      children: [],
    })
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "AMAZON",
        merchantName: "Headphones",
        totalAmount: -30,
        parentId: "child1",
        splits: [{ userId: "u1", amount: -30, splitMethod: "equal", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when children would exceed parent total", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      id: "parent1",
      parentId: null,
      createdById: "u1",
      totalAmount: -100,
      merchantRaw: "AMAZON",
      children: [{ id: "c1", totalAmount: -80, isSystemLine: false }],
    })
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "AMAZON",
        merchantName: "Keyboard",
        totalAmount: -30,
        parentId: "parent1",
        splits: [{ userId: "u1", amount: -30, splitMethod: "equal", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates child transaction and returns 201", async () => {
    auth.mockResolvedValue(session)
    const mockParent = {
      id: "parent1",
      parentId: null,
      createdById: "u1",
      totalAmount: -100,
      merchantRaw: "AMAZON",
      children: [],
    }
    prisma.transaction.findUnique.mockResolvedValue(mockParent)
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({
      transaction: {
        create: jest.fn().mockResolvedValue({ id: "child1", merchantName: "Headphones" }),
        findUnique: jest.fn().mockResolvedValue({ ...mockParent, splits: [], children: [] }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      transactionSplit: { create: jest.fn(), deleteMany: jest.fn() },
      notification: { create: jest.fn() },
      user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    }))

    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        merchantRaw: "AMAZON",
        merchantName: "Headphones",
        totalAmount: -50,
        parentId: "parent1",
        splits: [{ userId: "u1", amount: -50, splitMethod: "equal", tagId: null }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe("DELETE /api/transactions/[id] — soft hide", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  const mockTxBase = {
    id: "tx1",
    merchantName: "Tesco",
    totalAmount: 100,
    createdById: "u1",
    importBatchId: null,
    paymentFromUserId: null,
    paymentFrom: null,
  }

  it("sets hiddenAt on owner's split and sends notification to others", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      ...mockTxBase,
      splits: [
        { id: "sp1", userId: "u1", status: "active", hiddenAt: null, tag: null },
        { id: "sp2", userId: "u2", status: "active", hiddenAt: null, tag: null },
      ],
    })
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transactionSplit.updateMany.mockResolvedValue({ count: 1 })
    prisma.transactionSplit.findMany.mockResolvedValue([
      { id: "sp1", userId: "u1", hiddenAt: new Date() },
      { id: "sp2", userId: "u2", hiddenAt: null },
    ])
    prisma.user.findUnique.mockResolvedValue({ name: "Alice" })
    prisma.notification.create.mockResolvedValue({})

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "tx1" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.transactionSplit.updateMany).toHaveBeenCalledWith({
      where: { transactionId: "tx1", userId: "u1", hiddenAt: null },
      data: expect.objectContaining({ hiddenAt: expect.any(Date) }),
    })
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u2", type: "transaction_hidden" }),
      })
    )
    expect(prisma.transaction.delete).not.toHaveBeenCalled()
  })

  it("hard-deletes transaction when all splits are now hidden", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      ...mockTxBase,
      splits: [
        { id: "sp1", userId: "u1", status: "active", hiddenAt: null, tag: null },
      ],
    })
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    prisma.transactionSplit.updateMany.mockResolvedValue({ count: 1 })
    prisma.transactionSplit.findMany.mockResolvedValue([
      { id: "sp1", userId: "u1", hiddenAt: new Date() },
    ])
    prisma.splitSuggestion.deleteMany.mockResolvedValue({ count: 0 })
    prisma.transaction.delete.mockResolvedValue({})

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "tx1" }) })

    expect(res.status).toBe(200)
    expect(prisma.splitSuggestion.deleteMany).toHaveBeenCalledWith({ where: { transactionId: "tx1" } })
    expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } })
    expect(prisma.notification.create).not.toHaveBeenCalled()
  })

  it("returns 403 when user is not owner", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({
      ...mockTxBase,
      createdById: "u99",
      splits: [
        { id: "sp1", userId: "u1", status: "active", hiddenAt: null, tag: null },
      ],
    })
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(403)
  })
})
