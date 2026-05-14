/**
 * @jest-environment node
 */
import { POST } from "@/app/api/transactions/[id]/suggestions/route"
import { PUT } from "@/app/api/transactions/[id]/suggestions/[suggestionId]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: { findUnique: jest.fn() },
    splitSuggestion: { findUnique: jest.fn(), update: jest.fn() },
    transactionSplit: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }
const ownerSession = { user: { id: "owner1", role: "user" } }

describe("POST /api/transactions/[id]/suggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/tx1/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedChanges: { totalAmount: { was: 100, suggested: 80 } } }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 400 when suggestedChanges is empty", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({ id: "tx1", createdById: "owner1" })
    const req = new Request("http://localhost/api/transactions/tx1/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedChanges: {} }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(400)
  })

  it("returns 403 when the owner tries to suggest changes to their own transaction", async () => {
    auth.mockResolvedValue(ownerSession)
    prisma.transaction.findUnique.mockResolvedValue({ id: "tx1", createdById: "owner1" })
    const req = new Request("http://localhost/api/transactions/tx1/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedChanges: { totalAmount: { was: 100, suggested: 80 } } }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(403)
  })

  it("creates suggestion and returns 201", async () => {
    auth.mockResolvedValue(session)
    prisma.transaction.findUnique.mockResolvedValue({ id: "tx1", createdById: "owner1" })
    const mockSuggestion = { id: "s1", status: "pending" }
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        splitSuggestion: { create: jest.fn().mockResolvedValue(mockSuggestion) },
        notification: { create: jest.fn() },
      })
    )
    const req = new Request("http://localhost/api/transactions/tx1/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedChanges: { totalAmount: { was: 100, suggested: 80 } } }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(201)
  })
})

describe("PUT /api/transactions/[id]/suggestions/[suggestionId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 400 for invalid action", async () => {
    auth.mockResolvedValue(ownerSession)
    prisma.splitSuggestion.findUnique.mockResolvedValue({
      id: "s1", toUserId: "owner1", fromUserId: "u1",
      suggestedChanges: "{}", transactionId: "tx1",
    })
    const req = new Request("http://localhost/api/transactions/tx1/suggestions/s1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "tx1", suggestionId: "s1" }) })
    expect(res.status).toBe(400)
  })

  it("returns 403 when user is not the suggestion recipient (owner)", async () => {
    auth.mockResolvedValue(session)
    prisma.splitSuggestion.findUnique.mockResolvedValue({
      id: "s1", toUserId: "owner1", fromUserId: "u1",
      suggestedChanges: "{}", transactionId: "tx1",
    })
    const req = new Request("http://localhost/api/transactions/tx1/suggestions/s1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "tx1", suggestionId: "s1" }) })
    expect(res.status).toBe(403)
  })

  it("accepts suggestion and notifies the suggester", async () => {
    auth.mockResolvedValue(ownerSession)
    prisma.splitSuggestion.findUnique.mockResolvedValue({
      id: "s1", toUserId: "owner1", fromUserId: "u1",
      suggestedChanges: JSON.stringify({ totalAmount: { was: 100, suggested: 80 } }),
      transactionId: "tx1",
    })
    const mockCreate = jest.fn()
    const mockUpdate = jest.fn()
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        splitSuggestion: { update: mockUpdate },
        transaction: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: "tx1", totalAmount: 100, splits: [] }) },
        transactionSplit: { findFirst: jest.fn().mockResolvedValue(null) },
        notification: { create: mockCreate },
      })
    )
    const req = new Request("http://localhost/api/transactions/tx1/suggestions/s1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "tx1", suggestionId: "s1" }) })
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", type: "split_suggestion_response" }) })
    )
  })
})
