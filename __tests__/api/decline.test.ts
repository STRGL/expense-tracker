/**
 * @jest-environment node
 */
import { POST } from "@/app/api/transactions/[id]/decline/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    transactionSplit: { findFirst: jest.fn() },
    transaction: { findUnique: jest.fn() },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("POST /api/transactions/[id]/decline", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/tx1/decline", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when user has no active split", async () => {
    auth.mockResolvedValue(session)
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        transactionSplit: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
        transaction: { findUnique: jest.fn() },
        notification: { create: jest.fn() },
      })
    )
    const req = new Request("http://localhost/api/transactions/tx1/decline", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(404)
  })

  it("removes user from split and notifies owner", async () => {
    auth.mockResolvedValue(session)
    const mockCreate = jest.fn()
    const mockUpdate = jest.fn()
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        transactionSplit: {
          findFirst: jest.fn().mockResolvedValue({ id: "sp1", userId: "u1" }),
          update: mockUpdate,
        },
        transaction: {
          findUnique: jest.fn().mockResolvedValue({
            id: "tx1",
            totalAmount: 100,
            createdById: "owner1",
            splits: [
              { id: "sp1", userId: "u1", status: "active" },
              { id: "sp2", userId: "owner1", status: "active" },
            ],
          }),
        },
        notification: { create: mockCreate },
      })
    )

    const req = new Request("http://localhost/api/transactions/tx1/decline", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "tx1" }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "split_removed", userId: "owner1" }) })
    )
  })
})
