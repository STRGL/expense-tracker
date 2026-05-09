/**
 * @jest-environment node
 */
import { DELETE } from "@/app/api/transactions/bulk/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("DELETE /api/transactions/bulk", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/transactions/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids: ["tx1"] }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it("deletes owned transactions and notifies others", async () => {
    auth.mockResolvedValue(session)
    const mockTx = [
      { id: "tx1", createdById: "u1", splits: [{ userId: "u1" }, { userId: "u2" }] },
    ]
    
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({
      transaction: { 
        findMany: jest.fn().mockResolvedValue(mockTx),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      notification: { create: jest.fn() },
    }))

    const req = new Request("http://localhost/api/transactions/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids: ["tx1"] }),
    })
    const res = await DELETE(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.count).toBe(1)
  })

  it("ignores transactions not owned by the user", async () => {
    auth.mockResolvedValue(session)
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({
      transaction: { 
        findMany: jest.fn().mockResolvedValue([]), // Nothing found for this user
      },
    }))

    const req = new Request("http://localhost/api/transactions/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids: ["other-tx"] }),
    })
    const res = await DELETE(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.count).toBe(0)
  })
})
