/**
 * @jest-environment node
 */
import { GET } from "@/app/api/search/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("GET /api/search", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/search?q=amazon")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns empty array when query is missing or empty", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/search")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it("returns empty array for blank query string", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/search?q=")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it("calls $queryRaw and returns shaped results", async () => {
    auth.mockResolvedValue(session)
    prisma.$queryRaw.mockResolvedValue([
      {
        id: "tx1",
        date: new Date("2026-04-01"),
        merchantName: "Amazon",
        merchantRaw: "AMZN MKTPL",
        totalAmount: -50.0,
        createdById: "u1",
        importBatchId: null,
        myAmount: -50.0,
        myTagId: "t1",
        tagName: "Groceries",
        tagColour: "#22c55e",
        splitCount: 1,
      },
    ])
    const req = new Request("http://localhost/api/search?q=amazon")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].merchantName).toBe("Amazon")
    expect(body[0].myAmount).toBe(-50.0)
    expect(body[0].isOwner).toBe(true)
    expect(body[0].myTag).toEqual({ name: "Groceries", colour: "#22c55e" })
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it("returns 500 with error json when the FTS query fails", async () => {
    auth.mockResolvedValue(session)
    prisma.$queryRaw.mockRejectedValue(new Error("no such column: fts"))
    const req = new Request("http://localhost/api/search?q=amazon")
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
