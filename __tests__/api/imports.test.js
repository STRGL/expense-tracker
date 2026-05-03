/**
 * @jest-environment node
 */
import { POST } from "@/app/api/imports/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    merchantAlias: { findMany: jest.fn().mockResolvedValue([]) },
    importRule: { findMany: jest.fn().mockResolvedValue([]) },
    transaction: { findMany: jest.fn().mockResolvedValue([]) },
    importBatch: { findUnique: jest.fn(), update: jest.fn() },
    importRow: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

const CSV_TEXT = `Date,Description,Amount
01/04/2026,TESCO STORES,42.50
15/04/2026,AMAZON MKTPL,18.99`

describe("POST /api/imports", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: CSV_TEXT, dateColumn: "Date", merchantColumn: "Description", amountColumn: "Amount" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: CSV_TEXT }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when column name not found in CSV headers", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: CSV_TEXT, dateColumn: "WrongColumn", merchantColumn: "Description", amountColumn: "Amount" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates an import batch and returns 201 with the batch id", async () => {
    auth.mockResolvedValue(session)
    const mockBatch = { id: "batch-1" }
    prisma.$transaction.mockImplementation(async (cb) =>
      cb({
        importBatch: { create: jest.fn().mockResolvedValue(mockBatch) },
        importRow: { create: jest.fn() },
      })
    )
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: CSV_TEXT, dateColumn: "Date", merchantColumn: "Description", amountColumn: "Amount" }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.id).toBe("batch-1")
  })
})

describe("GET /api/imports/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const { GET: GET_BATCH } = await import("@/app/api/imports/[id]/route")
    const req = new Request("http://localhost/api/imports/batch-1")
    const res = await GET_BATCH(req, { params: Promise.resolve({ id: "batch-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when batch not found", async () => {
    auth.mockResolvedValue(session)
    prisma.importBatch.findUnique.mockResolvedValue(null)
    const { GET: GET_BATCH } = await import("@/app/api/imports/[id]/route")
    const req = new Request("http://localhost/api/imports/batch-1")
    const res = await GET_BATCH(req, { params: Promise.resolve({ id: "batch-1" }) })
    expect(res.status).toBe(404)
  })

  it("returns the batch with its rows", async () => {
    auth.mockResolvedValue(session)
    prisma.importBatch.findUnique.mockResolvedValue({ id: "batch-1", uploadedById: "u1", status: "pending", rows: [] })
    const { GET: GET_BATCH } = await import("@/app/api/imports/[id]/route")
    const req = new Request("http://localhost/api/imports/batch-1")
    const res = await GET_BATCH(req, { params: Promise.resolve({ id: "batch-1" }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.id).toBe("batch-1")
  })
})

describe("PUT /api/imports/[id]/rows/[rowId]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("updates the row and returns 200", async () => {
    auth.mockResolvedValue(session)
    prisma.importBatch.findUnique.mockResolvedValue({ id: "batch-1", uploadedById: "u1" })
    prisma.importRow.findUnique.mockResolvedValue({ id: "row-1", batchId: "batch-1" })
    prisma.importRow.update.mockResolvedValue({ id: "row-1", merchantResolved: "Amazon" })
    const { PUT: PUT_ROW } = await import("@/app/api/imports/[id]/rows/[rowId]/route")
    const req = new Request("http://localhost/api/imports/batch-1/rows/row-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantResolved: "Amazon" }),
    })
    const res = await PUT_ROW(req, { params: Promise.resolve({ id: "batch-1", rowId: "row-1" }) })
    expect(res.status).toBe(200)
  })
})

describe("POST /api/imports/[id]/confirm", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const { POST: POST_CONFIRM } = await import("@/app/api/imports/[id]/confirm/route")
    const req = new Request("http://localhost/api/imports/batch-1/confirm", { method: "POST" })
    const res = await POST_CONFIRM(req, { params: Promise.resolve({ id: "batch-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when batch not found", async () => {
    auth.mockResolvedValue(session)
    prisma.importBatch.findUnique.mockResolvedValue(null)
    const { POST: POST_CONFIRM } = await import("@/app/api/imports/[id]/confirm/route")
    const req = new Request("http://localhost/api/imports/batch-1/confirm", { method: "POST" })
    const res = await POST_CONFIRM(req, { params: Promise.resolve({ id: "batch-1" }) })
    expect(res.status).toBe(404)
  })
})
