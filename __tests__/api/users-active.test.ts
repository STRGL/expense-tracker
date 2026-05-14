/**
 * @jest-environment node
 */
import { GET } from "@/app/api/users/active/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

beforeEach(() => {
  jest.clearAllMocks()
  prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
})

describe("GET /api/users/active", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns id, name, and hasWage flag — never the wage value", async () => {
    auth.mockResolvedValue(session)
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Alice", wage: 50000 },
      { id: "u2", name: "Bob", wage: null },
    ])
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual([
      { id: "u1", name: "Alice", hasWage: true },
      { id: "u2", name: "Bob", hasWage: false },
    ])
    expect(body[0]).not.toHaveProperty("wage")
    expect(body[1]).not.toHaveProperty("wage")
  })
})
