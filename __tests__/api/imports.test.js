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
    importBatch: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    importRow: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

const CSV_TEXT = `Date,Description,Amount
01/04/2026,TESCO STORES,42.50
15/04/2026,AMAZON MKTPL,18.99`

const DEBIT_CREDIT_CSV = `Date,Description,Debit,Credit
01/04/2026,TESCO STORES,42.50,
15/04/2026,AMAZON MKTPL,18.99,
20/04/2026,SALARY,,2000.00`

const DUAL_VALUE_CSV = `Date,Description,Debit,Credit
01/04/2026,STRANGE,10.00,5.00`

const NEGATIVE_CSV = `Date,Description,Amount
01/04/2026,TESCO STORES,42.50
15/04/2026,REFUND FROM AMAZON,-18.99`

function makeTransactionMock() {
  const rowCreates = []
  prisma.$transaction.mockImplementation(async (cb) =>
    cb({
      importBatch: { create: jest.fn().mockResolvedValue({ id: "batch-1" }) },
      importRow: { create: jest.fn().mockImplementation(async ({ data }) => { rowCreates.push(data); return data }) },
    })
  )
  return rowCreates
}

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

  it("creates an import batch and returns 201 with the batch id", async () => {
    auth.mockResolvedValue(session)
    prisma.$transaction.mockImplementation(async (cb) =>
      cb({
        importBatch: { create: jest.fn().mockResolvedValue({ id: "batch-1" }) },
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

  it("computes Credit minus Debit when creditColumn is provided", async () => {
    auth.mockResolvedValue(session)
    const rowCreates = makeTransactionMock()
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText: DEBIT_CREDIT_CSV,
        dateColumn: "Date",
        merchantColumn: "Description",
        amountColumn: "Debit",
        creditColumn: "Credit",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(rowCreates[0].amount).toBe(-42.50)   // debit only -> negative
    expect(rowCreates[1].amount).toBe(-18.99)   // debit only -> negative
    expect(rowCreates[2].amount).toBe(2000)     // credit only -> positive
  })

  it("flags dual amount values as red confidence", async () => {
    auth.mockResolvedValue(session)
    const rowCreates = makeTransactionMock()
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText: DUAL_VALUE_CSV,
        dateColumn: "Date",
        merchantColumn: "Description",
        amountColumn: "Debit",
        creditColumn: "Credit",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(rowCreates[0].amount).toBe(-5) // 5 - 10 = -5
    expect(rowCreates[0].confidenceLevel).toBe("red")
    expect(rowCreates[0].confidenceReasons).toContain("dual_amount_values")
  })

  it("inverts signs when invertSigns flag is true", async () => {
    auth.mockResolvedValue(session)
    const rowCreates = makeTransactionMock()
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText: CSV_TEXT,
        dateColumn: "Date",
        merchantColumn: "Description",
        amountColumn: "Amount",
        invertSigns: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(rowCreates[0].amount).toBe(-42.50) // Original 42.50 -> -42.50
  })

  it("preserves negative amounts in a single-column CSV", async () => {
    auth.mockResolvedValue(session)
    const rowCreates = makeTransactionMock()
    const req = new Request("http://localhost/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText: NEGATIVE_CSV,
        dateColumn: "Date",
        merchantColumn: "Description",
        amountColumn: "Amount",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(rowCreates[1].amount).toBe(-18.99)
  })
})

describe("GET /api/imports/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

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
